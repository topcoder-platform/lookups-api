/**
 * This service provides operations of devices.
 */
const _ = require('lodash')
const Joi = require('joi')
const config = require('config')
const uuid = require('uuid/v4')
const helper = require('../common/helper')
const logger = require('../common/logger')
const { Resources } = require('../../app-constants')

var esClient
(async function () {
  esClient = await helper.getESClient()
})()

/**
 * List devices in Elasticsearch.
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function listES (criteria) {
  // construct ES query
  const esQuery = {
    index: config.ES.DEVICE_INDEX,
    type: config.ES.DEVICE_TYPE,
    size: criteria.perPage,
    from: (criteria.page - 1) * criteria.perPage, // Es Index starts from 0
    body: {
      sort: [{ type: { order: 'asc' } }], // sort by device type
      query: {
        bool: {
          must: []
        }
      }
    }
  }

  // filtering for type
  if (criteria.type) {
    esQuery.body.query.bool.must.push({
      term: {
        type: criteria.type
      }
    })
  }

  // filtering for manufacturer
  if (criteria.manufacturer) {
    esQuery.body.query.bool.must.push({
      term: {
        manufacturer: criteria.manufacturer
      }
    })
  }

  // filtering for model
  if (criteria.model) {
    esQuery.body.query.bool.must.push({
      term: {
        model: criteria.model
      }
    })
  }

  // filtering for operatingSystem
  if (criteria.operatingSystem) {
    esQuery.body.query.bool.must.push({
      term: {
        operatingSystem: criteria.operatingSystem
      }
    })
  }

  // filtering for operatingSystemVersion
  if (criteria.operatingSystemVersion) {
    esQuery.body.query.bool.must.push({
      term: {
        operatingSystemVersion: criteria.operatingSystemVersion
      }
    })
  }

  // Search with constructed query
  const docs = await esClient.search(esQuery)
  // Extract data from hits
  let total = docs.hits.total
  if (_.isObject(total)) {
    total = total.value || 0
  }
  const result = _.map(docs.hits.hits, (item) => item._source)
  return { total, page: criteria.page, perPage: criteria.perPage, result }
}

/**
 * List devices.
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function list (criteria) {
  // first try to get from ES
  let result
  try {
    result = await listES(criteria)
  } catch (e) {
    // log and ignore
    logger.logFullError(e)
  }
  if (result && result.result.length > 0) {
    return result
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
  // ignore pagination, scan all matched records
  result = await helper.scan(config.AMAZON.DYNAMODB_DEVICE_TABLE, options)
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
    operatingSystemVersion: Joi.string()
  })
}

/**
 * Get device entity by id.
 * @param {String} id the device id
 * @returns {Object} the device of given id
 */
async function getEntity (id) {
  // first try to get from ES
  try {
    return await esClient.getSource({
      index: config.ES.DEVICE_INDEX,
      type: config.ES.DEVICE_TYPE,
      id
    })
  } catch (e) {
    // log and ignore
    logger.logFullError(e)
  }

  // then try to get from DB
  return helper.getById(config.AMAZON.DYNAMODB_DEVICE_TABLE, id)
}

getEntity.schema = {
  id: Joi.id()
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

  data.id = uuid()
  // create record in db
  const res = await helper.create(config.AMAZON.DYNAMODB_DEVICE_TABLE, data)

  // Send Kafka message using bus api
  await helper.postEvent(config.LOOKUP_CREATE_TOPIC, _.assign({ resource: Resources.Device }, res))

  return res
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
    // then update data in DB
    const res = await helper.update(device, data)

    // Send Kafka message using bus api
    await helper.postEvent(config.LOOKUP_UPDATE_TOPIC, _.assign({ resource: Resources.Device, id }, data))

    return res
  } else {
    // data are not changed
    return device
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
 */
async function remove (id) {
  // remove data in DB
  const device = await helper.getById(config.AMAZON.DYNAMODB_DEVICE_TABLE, id)
  await helper.remove(device)

  // Send Kafka message using bus api
  await helper.postEvent(config.LOOKUP_DELETE_TOPIC, { resource: Resources.Device, id })
}

remove.schema = {
  id: Joi.id()
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
  await iterateDevices({}, (device) => {
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
  await iterateDevices(criteria, (device) => {
    if (!_.includes(result, device.manufacturer)) {
      result.push(device.manufacturer)
    }
  })
  return result
}

getManufacturers.schema = {
  criteria: Joi.object().keys({
    type: Joi.string().required()
  }).required()
}

/**
 * Get distinct device models.
 * @returns {Array} the distinct device models
 */
async function getDeviceModels () {
  const result = []
  await iterateDevices({}, (device) => {
    if (!_.includes(result, device.model)) {
      result.push(device.model)
    }
  })
  return result
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
