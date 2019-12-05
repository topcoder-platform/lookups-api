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

const esClient = helper.getESClient()

/**
 * List devices in Elasticsearch.
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function listES (criteria) {
  // construct ES query
  const esQuery = {
    index: config.ES.DEVICE_INDEX,
    name: config.ES.DEVICE_TYPE,
    size: criteria.perPage,
    from: (criteria.page - 1) * criteria.perPage, // Es Index starts from 0
    body: {
      sort: [{ name: { order: 'asc' } }] // sort by device type
    }
  }

  // filtering for type
  if (criteria.name) {
    esQuery.body.query = {
      bool: {
        filter: [{ match_phrase: { name: criteria.name } }]
      }
    }
  }

  // filtering for manufacturer
  if (criteria.manufacturer) {
    if (!esQuery.body.query) {
      esQuery.body.query = {
        bool: { filter: [{ match_phrase: { manufacturer: criteria.manufacturer } }] }
      }
    } else {
      _.merge(esQuery.body.query, {
        bool: { filter: [{ match_phrase: { manufacturer: criteria.manufacturer } }] }
      })
    }
  }

  // filtering for model
  if (criteria.model) {
    if (!esQuery.body.query) {
      esQuery.body.query = {
        bool: { filter: [{ match_phrase: { model: criteria.model } }] }
      }
    } else {
      _.merge(esQuery.body.query, {
        bool: { filter: [{ match_phrase: { model: criteria.model } }] }
      })
    }
  }

  // filtering for operatingSystem
  if (criteria.operatingSystem) {
    if (!esQuery.body.query) {
      esQuery.body.query = {
        bool: { filter: [{ match_phrase: { operatingSystem: criteria.operatingSystem } }] }
      }
    } else {
      _.merge(esQuery.body.query, {
        bool: { filter: [{ match_phrase: { operatingSystem: criteria.operatingSystem } }] }
      })
    }
  }

  // filtering for operatingSystemVersion
  if (criteria.operatingSystemVersion) {
    if (!esQuery.body.query) {
      esQuery.body.query = {
        bool: { filter: [{ match_phrase: { operatingSystemVersion: criteria.operatingSystemVersion } }] }
      }
    } else {
      _.merge(esQuery.body.query, {
        bool: { filter: [{ match_phrase: { operatingSystemVersion: criteria.operatingSystemVersion } }] }
      })
    }
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
  try {
    return await listES(criteria)
  } catch (e) {
    // log and ignore
    logger.logFullError(e)
  }

  // then try to get from DB
  const options = {}
  if (criteria.name) {
    options.name = { contains: criteria.name }
  }
  if (criteria.manufacturer) {
    options.manufacturer = { contains: criteria.manufacturer }
  }
  if (criteria.model) {
    options.model = { contains: criteria.model }
  }
  if (criteria.operatingSystem) {
    options.operatingSystem = { contains: criteria.operatingSystem }
  }
  if (criteria.operatingSystemVersion) {
    options.operatingSystemVersion = { contains: criteria.operatingSystemVersion }
  }
  // ignore pagination, scan all matched records
  const result = await helper.scan(config.AMAZON.DYNAMODB_DEVICE_TABLE, options)
  // return fromDB:true to indicate it is got from db,
  // and response headers ('X-Total', 'X-Page', etc.) are not set in this case
  return { fromDB: true, result }
}

list.schema = {
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage(),
    name: Joi.string(),
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
      name: config.ES.DEVICE_TYPE,
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
    ['name', 'manufacturer', 'model', 'operatingSystem', 'operatingSystemVersion'],
    [data.name, data.manufacturer, data.model, data.operatingSystem, data.operatingSystemVersion])
  data.id = uuid()
  // create record in db
  const res = await helper.create(config.AMAZON.DYNAMODB_DEVICE_TABLE, data)

  // Send Kafka message using bus api
  await helper.postEvent(config.LOOKUP_CREATE_TOPIC, _.assign({ resource: Resources.Device }, res))

  return res
}

create.schema = {
  data: Joi.object().keys({
    name: Joi.string().required(),
    manufacturer: Joi.string().required(),
    model: Joi.string().required(),
    operatingSystem: Joi.string().required(),
    operatingSystemVersion: Joi.string().required()
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
  if ((data.name && device.name !== data.name) ||
     (data.manufacturer && device.manufacturer !== data.manufacturer) ||
     (data.model && device.model !== data.model) ||
     (data.operatingSystem && device.operatingSystem !== data.operatingSystem) ||
     (data.operatingSystemVersion && device.operatingSystemVersion !== data.operatingSystemVersion)) {
    // ensure same device not exists
    await helper.validateDuplicate(config.AMAZON.DYNAMODB_DEVICE_TABLE,
      ['name', 'manufacturer', 'model', 'operatingSystem', 'operatingSystemVersion'],
      [data.name, data.manufacturer, data.model, data.operatingSystem, data.operatingSystemVersion])

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
    name: Joi.string(),
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
    name: Joi.string().required(),
    manufacturer: Joi.string().required(),
    model: Joi.string().required(),
    operatingSystem: Joi.string().required(),
    operatingSystemVersion: Joi.string().required()
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

module.exports = {
  list,
  getEntity,
  create,
  partiallyUpdate,
  update,
  remove
}

logger.buildService(module.exports)
