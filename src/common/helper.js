/**
 * This file defines helper methods
 */
const _ = require('lodash')
const querystring = require('querystring')
const config = require('config')
const AWS = require('aws-sdk')
const elasticsearch = require('elasticsearch')
const models = require('../models')
const errors = require('./errors')
const logger = require('./logger')
const busApi = require('tc-bus-api-wrapper')
const busApiClient = busApi(_.pick(config, ['AUTH0_URL', 'AUTH0_AUDIENCE', 'TOKEN_CACHE_TIME', 'AUTH0_CLIENT_ID',
  'AUTH0_CLIENT_SECRET', 'BUSAPI_URL', 'KAFKA_ERROR_TOPIC']))

// AWS DynamoDB instance
let dbInstance

// Elasticsearch client
let esClient

AWS.config.update({
  // accessKeyId: config.AMAZON.AWS_ACCESS_KEY_ID,
  // secretAccessKey: config.AMAZON.AWS_SECRET_ACCESS_KEY,
  region: config.AMAZON.AWS_REGION
})

/**
 * Wrap async function to standard express function
 * @param {Function} fn the async function
 * @returns {Function} the wrapped function
 */
function wrapExpress (fn) {
  return function (req, res, next) {
    fn(req, res, next).catch(next)
  }
}

/**
 * Wrap all functions from object
 * @param obj the object (controller exports)
 * @returns {Object|Array} the wrapped object
 */
function autoWrapExpress (obj) {
  if (_.isArray(obj)) {
    return obj.map(autoWrapExpress)
  }
  if (_.isFunction(obj)) {
    if (obj.constructor.name === 'AsyncFunction') {
      return wrapExpress(obj)
    }
    return obj
  }
  _.each(obj, (value, key) => {
    obj[key] = autoWrapExpress(value)
  })
  return obj
}

/**
 * Get DynamoDB Connection Instance
 * @return {Object} DynamoDB Connection Instance
 */
function getDb () {
  // cache it for better performance
  if (!dbInstance) {
    if (config.AMAZON.IS_LOCAL_DB) {
      dbInstance = new AWS.DynamoDB({ endpoint: config.AMAZON.DYNAMODB_URL })
    } else {
      dbInstance = new AWS.DynamoDB()
    }
  }
  return dbInstance
}

/**
 * Creates table in DynamoDB
 * @param     {object} model Table structure in JSON format
 * @return    {promise} the result
 */
async function createTable (model) {
  const db = getDb()
  return new Promise((resolve, reject) => {
    db.createTable(model, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

/**
 * Deletes table in DynamoDB
 * @param     {String} tableName Name of the table to be deleted
 * @return    {promise} the result
 */
async function deleteTable (tableName) {
  const db = getDb()
  const item = {
    TableName: tableName
  }
  return new Promise((resolve, reject) => {
    db.deleteTable(item, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

/**
 * Get Data by model id
 * @param {String} modelName The dynamoose model name
 * @param {String} id The id value
 * @returns found record
 */
async function getById (modelName, id) {
  return new Promise((resolve, reject) => {
    models[modelName].query('id').eq(id).exec((err, result) => {
      if (err) {
        reject(err)
      } else if (result.length > 0) {
        resolve(result[0])
      } else {
        reject(new errors.NotFoundError(`${modelName} with id: ${id} doesn't exist`))
      }
    })
  })
}

/**
 * Create item in database
 * @param {Object} modelName The dynamoose model name
 * @param {Object} data The create data object
 * @returns created entity
 */
async function create (modelName, data) {
  return new Promise((resolve, reject) => {
    const dbItem = new models[modelName](data)
    dbItem.save((err) => {
      if (err) {
        reject(err)
      } else {
        resolve(dbItem)
      }
    })
  })
}

/**
 * Update item in database
 * @param {Object} dbItem The Dynamo database item
 * @param {Object} data The updated data object
 * @returns updated entity
 */
async function update (dbItem, data) {
  Object.keys(data).forEach((key) => {
    dbItem[key] = data[key]
  })
  return new Promise((resolve, reject) => {
    dbItem.save((err) => {
      if (err) {
        reject(err)
      } else {
        resolve(dbItem)
      }
    })
  })
}

/**
 * Remove item in database
 * @param {Object} dbItem The Dynamo database item to remove
 */
async function remove (dbItem) {
  return new Promise((resolve, reject) => {
    dbItem.delete((err) => {
      if (err) {
        reject(err)
      } else {
        resolve(dbItem)
      }
    })
  })
}

/**
 * Get data collection by scan parameters
 * @param {Object} modelName The dynamoose model name
 * @param {Object} scanParams The scan parameters object
 * @returns found records
 */
async function scan (modelName, scanParams) {
  return new Promise((resolve, reject) => {
    models[modelName].scan(scanParams).exec((err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(result.count === 0 ? [] : result)
      }
    })
  })
}

/**
 * Validate the data to ensure no duplication
 * @param {Object} modelName The dynamoose model name
 * @param {String} keys The attribute name of dynamoose model
 * @param {String} values The attribute value to be validated
 */
async function validateDuplicate (modelName, keys, values) {
  const options = {}
  if (Array.isArray(keys)) {
    if (keys.length !== values.length) {
      throw new errors.BadRequestError(`size of ${keys} and ${values} do not match.`)
    }

    keys.forEach(function (key, index) {
      options[key] = { eq: values[index] }
    })
  } else {
    options[keys] = { eq: values }
  }

  const records = await scan(modelName, options)
  if (records.length > 0) {
    if (Array.isArray(keys)) {
      let str = `${modelName} with [ `

      for (const i in keys) {
        const key = keys[i]
        const value = values[i]

        str += `${key}: ${value}`
        if (i < keys.length - 1) { str += ', ' }
      }

      throw new errors.ConflictError(`${str} ] already exists`)
    } else {
      throw new errors.ConflictError(`${modelName} with ${keys}: ${values} already exists`)
    }
  }
}

/**
 * Get ES Client
 * @return {Object} Elasticsearch Client Instance
 */
function getESClient () {
  if (esClient) {
    return esClient
  }
  const hosts = config.ES.HOST
  const apiVersion = config.ES.API_VERSION
  esClient = new elasticsearch.Client({
    apiVersion,
    hosts
  })
  return esClient
}

/**
 * Create Elasticsearch index, it will be deleted and re-created if present.
 * @param {String} indexName the ES index name
 * @param {String} typeName the ES index type name
 * @param {Array} fields the indexed fields
 */
async function createESIndex (indexName, typeName, fields) {
  const client = getESClient()
  // delete index if present
  try {
    await client.indices.delete({ index: indexName })
  } catch (err) {
    // ignore
  }

  // prepare props
  const props = {}
  for (const field of fields) {
    props[field] = {
      type: 'keyword'
    }
  }

  const ind = {
    index: indexName,
    body: {
      mappings: {
        [typeName]: {
          properties: props
        }
      }
    }
  }
  // create index
  await client.indices.create(ind)
}

/**
 * Get link for a given page.
 * @param {Object} req the HTTP request
 * @param {Number} page the page number
 * @returns {String} link for the page
 */
function getPageLink (req, page) {
  const q = _.assignIn({}, req.query, { page })
  return `${req.protocol}://${req.get('Host')}${req.baseUrl}${req.path}?${querystring.stringify(q)}`
}

/**
 * Set HTTP response headers from result.
 * @param {Object} req the HTTP request
 * @param {Object} res the HTTP response
 * @param {Object} result the operation result
 */
function setResHeaders (req, res, result) {
  // if result is got from db, then do not set response headers
  if (result.fromDB) {
    return
  }

  const totalPages = Math.ceil(result.total / result.perPage)
  if (result.page > 1) {
    res.set('X-Prev-Page', result.page - 1)
  }
  if (result.page < totalPages) {
    res.set('X-Next-Page', result.page + 1)
  }
  res.set('X-Page', result.page)
  res.set('X-Per-Page', result.perPage)
  res.set('X-Total', result.total)
  res.set('X-Total-Pages', totalPages)
  // set Link header
  if (totalPages > 0) {
    let link = `<${getPageLink(req, 1)}>; rel="first", <${getPageLink(req, totalPages)}>; rel="last"`
    if (result.page > 1) {
      link += `, <${getPageLink(req, result.page - 1)}>; rel="prev"`
    }
    if (result.page < totalPages) {
      link += `, <${getPageLink(req, result.page + 1)}>; rel="next"`
    }
    res.set('Link', link)
  }

  // Allow browsers access pagination data in headers
  let accessControlExposeHeaders = res.get('Access-Control-Expose-Headers') || ''
  accessControlExposeHeaders += accessControlExposeHeaders ? ', ' : ''
  // append new values, to not override values set by someone else
  accessControlExposeHeaders += 'X-Page, X-Per-Page, X-Total, X-Total-Pages, X-Prev-Page, X-Next-Page'

  res.set('Access-Control-Expose-Headers', accessControlExposeHeaders)
}

/**
 * Send Kafka event message
 * @params {String} topic the topic name
 * @params {Object} payload the payload
 */
async function postEvent (topic, payload) {
  logger.info(`Publish event to Kafka topic ${topic}`)
  const message = {
    topic,
    originator: config.KAFKA_MESSAGE_ORIGINATOR,
    timestamp: new Date().toISOString(),
    'mime-type': 'application/json',
    payload
  }
  await busApiClient.postEvent(message)
}

module.exports = {
  wrapExpress,
  autoWrapExpress,
  createTable,
  deleteTable,
  getById,
  create,
  update,
  remove,
  scan,
  validateDuplicate,
  getESClient,
  createESIndex,
  setResHeaders,
  postEvent
}
