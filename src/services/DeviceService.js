/**
 * This service provides operations of devices.
 */
const _ = require('lodash')
const Joi = require('joi')
const config = require('config')
const { v4: uuidv4 } = require('uuid')
const helper = require('../common/helper')
const logger = require('../common/logger')
const { Resources } = require('../../app-constants')
const error = require('../common/errors')
const HttpStatus = require('http-status-codes')

// ES index and type
const index = helper.index
const type = helper.type
let esClient
(async function () {
  esClient = await helper.getESClient()
})()

/**
 * List devices in Elasticsearch.
 * @param {Object} criteria the search criteria
 * @param {Boolean} isAdmin Is the user an admin
 * @returns {Object} the search result
 */
async function listES (criteria, isAdmin) {
  // construct ES query
  const esQuery = {
    size: criteria.perPage,
    from: (criteria.page - 1) * criteria.perPage, // Es Index starts from 0
    sort: [{ type: { order: 'asc' } }], // sort by device type
    query: {
      bool: {
        must: []
      }
    },
    _source: {
      excludes: (isAdmin && !_.isNil(criteria.includeSoftDeleted)) ? [] : ['isDeleted']
    }
  }

  // filtering for type
  if (criteria.type) {
    esQuery.query.bool.must.push({
      term: {
        type: criteria.type
      }
    })
  }

  // filtering for manufacturer
  if (criteria.manufacturer) {
    esQuery.query.bool.must.push({
      term: {
        manufacturer: criteria.manufacturer
      }
    })
  }

  // filtering for model
  if (criteria.model) {
    esQuery.query.bool.must.push({
      term: {
        model: criteria.model
      }
    })
  }

  // filtering for operatingSystem
  if (criteria.operatingSystem) {
    esQuery.query.bool.must.push({
      term: {
        operatingSystem: criteria.operatingSystem
      }
    })
  }

  // filtering for operatingSystemVersion
  if (criteria.operatingSystemVersion) {
    esQuery.query.bool.must.push({
      term: {
        operatingSystemVersion: criteria.operatingSystemVersion
      }
    })
  }

  // If user is not an admin or user has not specified
  // whether they need soft deleted records, do not return
  // soft deleted records
  if (
    !isAdmin ||
    _.isNil(criteria.includeSoftDeleted) ||
    (isAdmin && !criteria.includeSoftDeleted)) {
    esQuery.query.bool.must.push({
      bool: {
        must_not: [{
          term: {
            isDeleted: true
          }
        }]
      }
    })
  }
  // Search with constructed query
  const docs = await esClient.search({
    index: config.ES.DEVICE_INDEX,
    body: esQuery
  })
  // Extract data from hits
  let total = docs.body.hits.total
  if (_.isObject(total)) {
    total = total.value || 0
  }
  const result = _.map(docs.body.hits.hits, (item) => item._source)
  return { total, page: criteria.page, perPage: criteria.perPage, result }
}

/**
 * List devices.
 * @param {Object} criteria the search criteria
 * @param {Object} authUser the user making the request
 * @returns {Object} the search result
 */
async function list (criteria, authUser) {
  // first try to get from ES
  let result

  const isAdmin = helper.isAdmin(authUser)

  if (!_.isNil(criteria.includeSoftDeleted) && criteria.includeSoftDeleted) {
    // Only admin can request for deleted records
    if (!isAdmin) {
      throw new error.ForbiddenError('You are not allowed to perform that action')
    }
  }

  try {
    result = await listES(criteria, isAdmin)
  } catch (e) {
    // log and ignore
    logger.logFullError(e)
  }
  if (result && result.result.length > 0) {
    return result
  } else if (criteria.page) {
    // Elastic search limits the number of records that can be fetched to 10,000
    // More than that and we have to use scroll instead. At the time of writing this
    // less than 10,000 records seems reasonable
    if (criteria.page * criteria.perPage >= 10000) {
      throw new error.BadRequestError('You cannot fetch more than 10,000 records at a time')
    } else if (criteria.page * criteria.perPage > result.total) {
      // There are no more records. Pagination exceeded
      return result
    }
  }

  // then try to get from DB
  const options = {}
  if (criteria.type) {
    options.type = { eq: criteria.type }
  }
  if (criteria.manufacturer) {
    options.manufacturer = { eq: criteria.manufacturer }
  }
  if (criteria.model) {
    options.model = { eq: criteria.model }
  }
  if (criteria.operatingSystem) {
    options.operatingSystem = { eq: criteria.operatingSystem }
  }
  if (criteria.operatingSystemVersion) {
    options.operatingSystemVersion = { eq: criteria.operatingSystemVersion }
  }
  if (!criteria.includeSoftDeleted) {
    options.isDeleted = { ne: true }
  }
  // ignore pagination, scan all matched records
  result = await helper.scan(config.AMAZON.DYNAMODB_DEVICE_TABLE, options)

  if (!criteria.includeSoftDeleted) {
    result = helper.sanitizeResult(result, true)
  }
  // return fromDB:true to indicate it is got from db,
  // and response headers ('X-Total', 'X-Page', etc.) are not set in this case
  return { fromDB: true, result }
}

list.schema = {
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage(),
    type: Joi.string(),
    manufacturer: Joi.string(),
    model: Joi.string(),
    operatingSystem: Joi.string(),
    operatingSystemVersion: Joi.string(),
    includeSoftDeleted: Joi.boolean()
  }),
  authUser: Joi.object()
}

/**
 * Get device entity by id.
 * @param {String} id the device id
 * @param {Object} query The query params
 * @param {Object} authUser The user making the request
 * @returns {Object} the device of given id
 */
async function getEntity (id, query, authUser) {
  return helper.getEntity(config.AMAZON.DYNAMODB_DEVICE_TABLE, id, query, authUser)
}

getEntity.schema = {
  id: Joi.id(),
  query: Joi.object().keys({
    includeSoftDeleted: Joi.boolean()
  }),
  authUser: Joi.object()
}

/**
 * Create device.
 * @param {Object} data the data to create device
 * @returns {Object} the created device
 */
async function create (data) {
  await helper.validateDuplicate(config.AMAZON.DYNAMODB_DEVICE_TABLE,
    ['type', 'manufacturer', 'model', 'operatingSystem', 'operatingSystemVersion'],
    [data.type, data.manufacturer, data.model, data.operatingSystem, data.operatingSystemVersion])

  data.id = uuidv4()
  data.isDeleted = false
  let res
  try {
    await esClient.index({
      index: index[Resources.Device],
      type: type[Resources.Device],
      id: data.id,
      body: data,
      refresh: 'true'
    })
  } catch (e) {
    logger.info(`Elasticsearch operation failed:  ${e.message}`)
    // publish error
    helper.publishError(config.LOOKUP_ERROR_TOPIC, { ...data }, 'device.create')
    throw new error.TransactionFailureError(`Elasticsearch operation failed, ${e.message}`)
  }
  try {
    // create record in db
    res = await helper.create(config.AMAZON.DYNAMODB_DEVICE_TABLE, data)
  } catch (e) {
    try {
      await esClient.delete({
        index: index[Resources.Device],
        type: type[Resources.Device],
        id: data.id,
        refresh: 'true'
      })
    } catch (ee) {
      logger.info(`ES Rollback operation failed:  ${ee.message}`)
      throw new error.TransactionFailureError(` ES Rollback operation failed, ${e.message}`)
    }
    logger.info(`DynamoDB operation failed:  ${e.message}`)
    helper.publishError(config.LOOKUP_ERROR_TOPIC, { ...data }, 'device.create')
    throw new error.TransactionFailureError(`DynamoDB operation failed, ${e.message}`)
  }

  // Send Kafka message using bus api
  await helper.postEvent(config.LOOKUP_CREATE_TOPIC, _.assign({ resource: Resources.Device }, res))

  return helper.sanitizeResult(res)
}

create.schema = {
  data: Joi.object().keys({
    type: Joi.string().required(),
    manufacturer: Joi.string().required(),
    model: Joi.string().required(),
    operatingSystem: Joi.string().required(),
    operatingSystemVersion: Joi.string().allow('', null).empty(['', null]).default('ANY')
  }).required()
}

/**
 * Partially update device.
 * @param {String} id the device id
 * @param {Object} data the data to update device
 * @returns {Object} the updated device
 */
async function partiallyUpdate (id, data) {
  // get data in DB
  const device = await helper.getById(config.AMAZON.DYNAMODB_DEVICE_TABLE, id)
  data.id = id
  if ((data.type && device.type !== data.type) ||
     (data.manufacturer && device.manufacturer !== data.manufacturer) ||
     (data.model && device.model !== data.model) ||
     (data.operatingSystem && device.operatingSystem !== data.operatingSystem) ||
     (data.operatingSystemVersion && device.operatingSystemVersion !== data.operatingSystemVersion)) {
    // ensure same device not exists

    await helper.validateDuplicate(config.AMAZON.DYNAMODB_DEVICE_TABLE,
      ['type', 'manufacturer', 'model', 'operatingSystem', 'operatingSystemVersion'],
      [data.type || device.type,
        data.manufacturer || device.manufacturer,
        data.model || device.model,
        data.operatingSystem || device.operatingSystem,
        data.operatingSystemVersion || device.operatingSystemVersion])

    let res
    const originalRecord = _.cloneDeep(device)
    try {
      await esClient.update({
        index: index[Resources.Device],
        type: type[Resources.Device],
        id,
        body: { doc: { ...data, id } },
        refresh: 'true'
      })
    } catch (e) {
      if (e.statusCode === HttpStatus.NOT_FOUND) {
        // not found in ES, then create data in ES
        try {
          await esClient.create({
            index: index[Resources.Device],
            type: type[Resources.Device],
            id,
            body: { doc: { ...data, id } },
            refresh: 'true'
          })
        } catch (ee) {
          logger.info(`ES operation failed:  ${ee.message}`)
          helper.publishError(config.LOOKUP_ERROR_TOPIC, { ...data, id }, 'device.update')
          throw new error.TransactionFailureError(`ES operation failed, ${e.message}`)
        }
      } else {
        logger.info(`Elasticsearch operation failed:  ${e.message}`)
        helper.publishError(config.LOOKUP_ERROR_TOPIC, { ...data, id }, 'device.update')
        throw new error.TransactionFailureError(`Elasticsearch operation failed, ${e.message}`)
      }
    }
    try {
      // then update data in DB
      res = await helper.update(device, data)
    } catch (e) {
      // ES Rollback
      try {
        await esClient.update({
          index: index[Resources.Device],
          type: type[Resources.Device],
          id,
          body: { doc: { ...originalRecord } },
          refresh: 'true'
        })
      } catch (ee) {
        logger.info(`ES Rollback operation failed:  ${ee.message}`)
        throw new error.TransactionFailureError(`DynamoDB & ES Rollback operation failed, ${e.message}`)
      }
      logger.info(`DynamoDB operation failed:  ${e.message}`)
      helper.publishError(config.LOOKUP_ERROR_TOPIC, { ...data, id }, 'device.update')
      throw new error.TransactionFailureError(`DynamoDB operation failed, ${e.message}`)
    }

    // Send Kafka message using bus api
    await helper.postEvent(config.LOOKUP_UPDATE_TOPIC, _.assign({ resource: Resources.Device, id }, data))

    return helper.sanitizeResult(res)
  } else {
    // data are not changed
    return helper.sanitizeResult(device)
  }
}

partiallyUpdate.schema = {
  id: Joi.id(),
  data: Joi.object().keys({
    type: Joi.string(),
    manufacturer: Joi.string(),
    model: Joi.string(),
    operatingSystem: Joi.string(),
    operatingSystemVersion: Joi.string()
  }).required()
}

/**
 * Update device.
 * @param {String} id the device id
 * @param {Object} data the data to update device
 * @returns {Object} the updated device
 */
async function update (id, data) {
  return partiallyUpdate(id, data)
}

update.schema = {
  id: Joi.id(),
  data: Joi.object().keys({
    type: Joi.string().required(),
    manufacturer: Joi.string().required(),
    model: Joi.string().required(),
    operatingSystem: Joi.string().required(),
    operatingSystemVersion: Joi.string().allow('', null).empty(['', null]).default('ANY')
  }).required()
}

/**
 * Remove device.
 * @param {String} id the device id to remove
 * @param {Object} query the query param
 */
async function remove (id, query) {
  // remove data in DB
  const device = await helper.getById(config.AMAZON.DYNAMODB_DEVICE_TABLE, id)
  const originalObj = _.cloneDeep(device)
  try {
    if (query.destroy) {
      await esClient.delete({
        index: index[Resources.Device],
        type: type[Resources.Device],
        id,
        refresh: 'true'
      })
    } else {
      originalObj.isDeleted = true
      await esClient.update({
        index: index[Resources.Device],
        type: type[Resources.Device],
        id,
        body: { doc: originalObj },
        refresh: 'true'
      })
    }
  } catch (e) {
    logger.info(`Elasticsearch operation failed:  ${e.message}`)
    helper.publishError(config.LOOKUP_ERROR_TOPIC, { id }, 'device.delete')
    throw new error.TransactionFailureError(`Elasticsearch operation failed, ${e.message}`)
  }

  try {
    await helper.remove(device, query.destroy)
  } catch (e) {
    try {
      if (!query.destroy) {
        originalObj.isDeleted = false
        await esClient.update({
          index: index[Resources.Device],
          type: type[Resources.Device],
          id: originalObj.id,
          body: { doc: originalObj },
          refresh: 'true'
        })
      } else {
      // re-create record in ES
        await esClient.create({
          index: index[Resources.Device],
          type: type[Resources.Device],
          id: originalObj.id,
          body: originalObj,
          refresh: 'true'
        })
      }
    } catch (ee) {
      logger.info(`ES Rollback operation failed:  ${ee.message}`)
      throw new error.TransactionFailureError(`DynamoDB & ES Rollback operation failed, ${e.message}`)
    }
    logger.info(`DynamoDB operation failed:  ${e.message}`)
    helper.publishError(config.LOOKUP_ERROR_TOPIC, { id }, 'device.delete')
    throw new error.TransactionFailureError(`DynamoDB operation failed, ${e.message}`)
  }

  // Send Kafka message using bus api
  await helper.postEvent(config.LOOKUP_DELETE_TOPIC, { resource: Resources.Device, id, isSoftDelete: !query.destroy })
}

remove.schema = {
  id: Joi.id(),
  query: Joi.object().keys({
    destroy: Joi.boolean()
  })
}

/**
 * Iterate devices of given criteria, call deviceHandler function for each iterated device
 * @param {Object} criteria the search criteria
 * @param {Function} deviceHandler the device handler function
 */
async function iterateDevices (criteria, deviceHandler) {
  // it will delegate to the list function;
  // the list function will first try Elasticsearch, if failed then try DB;
  // so this iterateDevices also has the functionality to try ES first then if failed try DB

  const perPage = 100
  let page = 1
  let total = 1
  // query each page of devices
  while ((page - 1) * perPage < total) {
    const res = await list(_.assignIn({ page, perPage }, criteria))
    // handle each device
    _.forEach(res.result, (device) => deviceHandler(device))

    if (res.fromDB) {
      // if devices are got from DB, then all matched devices are returned, no pagination is used, no next pages
      return
    }
    // prepare for next page
    page += 1
    total = res.total
  }
}

/**
 * Get distinct device types.
 * @returns {Array} the distinct device types
 */
async function getTypes () {
  const result = []
  await iterateDevices({ includeSoftDeleted: false }, (device) => {
    if (!_.includes(result, device.type)) {
      result.push(device.type)
    }
  })
  return result
}

/**
 * Get distinct device manufacturers.
 * @param {Object} criteria the search criteria
 * @returns {Array} the distinct device manufacturers
 */
async function getManufacturers (criteria) {
  const result = []
  await iterateDevices(_.assignIn({ includeSoftDeleted: false }, criteria), (device) => {
    if (!_.includes(result, device.manufacturer)) {
      result.push(device.manufacturer)
    }
  })
  return result
}

getManufacturers.schema = {
  criteria: Joi.object().keys({
    type: Joi.string()
  })
}

/**
 * Get distinct device models.
 * @param {Object} criteria the search criteria
 * @returns {Array} the distinct device models
 */
async function getDeviceModels (criteria) {
  const result = []
  await iterateDevices(_.assignIn({ includeSoftDeleted: false }, criteria), (device) => {
    if (!_.includes(result, device.model)) {
      result.push(device.model)
    }
  })
  return result
}

getDeviceModels.schema = {
  criteria: Joi.object().keys({
    type: Joi.string(),
    manufacturer: Joi.string()
  })
}

module.exports = {
  list,
  getEntity,
  create,
  partiallyUpdate,
  update,
  remove,
  getTypes,
  getManufacturers,
  getDeviceModels
}

logger.buildService(module.exports)
