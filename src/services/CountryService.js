/**
 * This service provides operations of countries.
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
 * List countries in Elasticsearch.
 * @param {Object} criteria the search criteria
 * @param {Boolean} isAdmin Is the user an admin
 * @returns {Object} the search result
 */
async function listES (criteria, isAdmin) {
  const esQuery = {
    size: criteria.perPage,
    from: (criteria.page - 1) * criteria.perPage, // Es Index starts from 0
    sort: [{ name: { order: 'asc' } }],
    query: {
      bool: {
        must: []
      }
    },
    _source: {
      excludes: (isAdmin && !_.isNil(criteria.includeSoftDeleted)) ? [] : ['isDeleted']
    }
  }
  // filtering for name
  if (criteria.name) {
    esQuery.query.bool.must.push({
      term: {
        name: criteria.name
      }
    })
  }
  // filtering for countryCode
  if (criteria.countryCode) {
    esQuery.query.bool.must.push({
      term: {
        countryCode: criteria.countryCode
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
    index: config.ES.COUNTRY_INDEX,
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
 * List countries.
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
  if (criteria.name) {
    options.name = { eq: criteria.name }
  }
  if (criteria.countryCode) {
    options.countryCode = { eq: criteria.countryCode }
  }
  if (!criteria.includeSoftDeleted) {
    options.isDeleted = { ne: true }
  }
  // ignore pagination, scan all matched records
  result = await helper.scan(config.AMAZON.DYNAMODB_COUNTRY_TABLE, options)

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
    name: Joi.string(),
    countryFlag: Joi.string(),
    countryCode: Joi.string(),
    includeSoftDeleted: Joi.boolean()
  }),
  authUser: Joi.object()
}

/**
 * Get country entity by id.
 * @param {String} id the country id
 * @param {Object} query The query params
 * @param {Object} authUser The user making the request
 * @returns {Object} the country of given id
 */
async function getEntity (id, query, authUser) {
  return helper.getEntity(config.AMAZON.DYNAMODB_COUNTRY_TABLE, id, query, authUser)
}

getEntity.schema = {
  id: Joi.id(),
  query: Joi.object().keys({
    includeSoftDeleted: Joi.boolean()
  }),
  authUser: Joi.object()
}

/**
 * Create country.
 * @param {Object} data the data to create country
 * @returns {Object} the created country
 */
async function create (data) {
  await helper.validateDuplicate(config.AMAZON.DYNAMODB_COUNTRY_TABLE, 'name', data.name)
  data.id = uuidv4()
  data.isDeleted = false
  let res
  try {
    await esClient.index({
      index: index[Resources.Country],
      type: type[Resources.Country],
      id: data.id,
      body: data,
      refresh: 'true'
    })
  } catch (e) {
    logger.info(`Elasticsearch operation failed:  ${e.message}`)
    // Publish error
    helper.publishError(config.LOOKUP_ERROR_TOPIC, { ...data }, 'country.create')
    throw new error.TransactionFailureError(`Elasticsearch operation failed, ${e.message}`)
  }

  try {
    // uncomment below line  to simulate DB error
    // delete  data.name

    // create record in db
    res = await helper.create(config.AMAZON.DYNAMODB_COUNTRY_TABLE, data)
  } catch (e) {
    // ES Rollback
    try {
      await esClient.delete({
        index: index[Resources.Country],
        type: type[Resources.Country],
        id: data.id,
        refresh: 'true'
      })
    } catch (ee) {
      logger.info(`ES Rollback operation failed:  ${ee.message}`)
      throw new error.TransactionFailureError(`DynamoDB & ES Rollback operation failed, ${e.message}`)
    }
    logger.info(`DynamoDB operation failed:  ${e.message}`)
    helper.publishError(config.LOOKUP_ERROR_TOPIC, { ...data }, 'country.create')
    throw new error.TransactionFailureError(`DynamoDB operation failed, ${e.message}`)
  }

  // Send Kafka message using bus api
  await helper.postEvent(config.LOOKUP_CREATE_TOPIC, _.assign({ resource: Resources.Country }, res))

  return helper.sanitizeResult(res)
}

create.schema = {
  data: Joi.object().keys({
    name: Joi.string().required(),
    countryFlag: Joi.string().required(),
    countryCode: Joi.string().required()
  }).required()
}

/**
 * Partially update country.
 * @param {String} id the country id
 * @param {Object} data the data to update country
 * @returns {Object} the updated country
 */
async function partiallyUpdate (id, data) {
  // get data in DB
  try {
    const country = await helper.getById(config.AMAZON.DYNAMODB_COUNTRY_TABLE, id)
    data.id = id
    if ((data.name && country.name !== data.name) ||
      (data.countryFlag && country.countryFlag !== data.countryFlag) ||
      (data.countryCode && country.countryCode !== data.countryCode)) {
      if (data.name && country.name !== data.name) {
        // ensure name is not used already
        await helper.validateDuplicate(config.AMAZON.DYNAMODB_COUNTRY_TABLE, 'name', data.name)
      }
      let res
      const originalEsRecord = _.cloneDeep(country)
      try {
        await esClient.update({
          index: index[Resources.Country],
          type: type[Resources.Country],
          id,
          // body: { } for simulating update error, keep body blank
          body: { doc: { ...data, id } },
          refresh: 'true'
        })
      } catch (e) {
        if (e.statusCode === HttpStatus.NOT_FOUND) {
          // not found in ES, then create data in ES
          try {
            await esClient.create({
              index: index[Resources.Country],
              type: type[Resources.Country],
              id,
              body: data,
              refresh: 'true'
            })
          } catch (ee) {
            logger.info(`ES  operation failed:  ${ee.message}`)
            helper.publishError(config.LOOKUP_ERROR_TOPIC, { ...data, id }, 'country.update')
            throw new error.TransactionFailureError(`ES operation failed, ${e.message}`)
          }
        } else {
          logger.info(`Elasticsearch operation failed:  ${e.message}`)
          // publish to error topic
          helper.publishError(config.LOOKUP_ERROR_TOPIC, { ...data, id }, 'country.update')
          throw new error.TransactionFailureError(`Elasticsearch operation failed, ${e.message}`)
        }
      }

      try {
        // then update data in DB

        // to simulate error uncomment below line
        // data.isDeleted = 123
        res = await helper.update(country, data)
      } catch (e) {
        // ES Rollback
        try {
          await esClient.update({
            index: index[Resources.Country],
            type: type[Resources.Country],
            id,
            body: { doc: { ...originalEsRecord } },
            refresh: 'true'
          })
        } catch (ee) {
          logger.info(`ES Rollback operation failed:  ${ee.message}`)
          throw new error.TransactionFailureError(`DynamoDB & ES Rollback operation failed, ${e.message}`)
        }
        logger.info(`DynamoDB operation failed:  ${e.message}`)
        helper.publishError(config.LOOKUP_ERROR_TOPIC, { ...data }, 'country.update')
        throw new error.TransactionFailureError(`DynamoDB operation failed, ${e.message}`)
      }

      // Send Kafka message using bus api
      await helper.postEvent(config.LOOKUP_UPDATE_TOPIC, _.assign({ resource: Resources.Country, id }, data))

      return helper.sanitizeResult(res)
    } else {
      // data are not changed
      return helper.sanitizeResult(country)
    }
  } catch (ee) {
    logger.info(`Error:  ${ee.message}`)
    throw ee
  }
}

partiallyUpdate.schema = {
  id: Joi.id(),
  data: Joi.object().keys({
    name: Joi.string(),
    countryFlag: Joi.string(),
    countryCode: Joi.string()
  }).required()
}

/**
 * Update country.
 * @param {String} id the country id
 * @param {Object} data the data to update country
 * @returns {Object} the updated country
 */
async function update (id, data) {
  return partiallyUpdate(id, data)
}

update.schema = {
  id: Joi.id(),
  data: Joi.object().keys({
    name: Joi.string().required(),
    countryFlag: Joi.string().required(),
    countryCode: Joi.string().required()
  }).required()
}

/**
 * Remove country.
 * @param {String} id the country id to remove
 * @param {Object} query the query param
 */
async function remove (id, query) {
  try {
  // remove data in DB
    const country = await helper.getById(config.AMAZON.DYNAMODB_COUNTRY_TABLE, id)
    const originalObj = _.cloneDeep(country)

    try {
      if (query.destroy) {
        await esClient.delete({
          index: index[Resources.Country],
          type: type[Resources.Country],
          id,
          refresh: 'true'
        })
      } else {
        originalObj.isDeleted = true
        await esClient.update({
          index: index[Resources.Country],
          type: type[Resources.Country],
          id: originalObj.id,
          body: { doc: originalObj },
          refresh: 'true'
        })
      }
    } catch (e) {
      logger.info(`Elasticsearch operation failed:  ${e.message}`)
      helper.publishError(config.LOOKUP_ERROR_TOPIC, { id }, 'country.delete')
      throw new error.TransactionFailureError(`Elasticsearch operation failed, ${e.message}`)
    }

    try {
    // uncomment below line to simulate DB error and ES rollback
    // delete country.id
      await helper.remove(country, query.destroy)
    } catch (e) {
      try {
        if (!query.destroy) {
          originalObj.isDeleted = false
          await esClient.update({
            index: index[Resources.Country],
            type: type[Resources.Country],
            id: originalObj.id,
            body: { doc: originalObj },
            refresh: 'true'
          })
        } else {
          // re-create record in ES
          await esClient.create({
            index: index[Resources.Country],
            type: type[Resources.Country],
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
      helper.publishError(config.LOOKUP_ERROR_TOPIC, { id }, 'country.delete')
      throw new error.TransactionFailureError(`DynamoDB operation failed, ${e.message}`)
    }
    // Send Kafka message using bus api
    await helper.postEvent(config.LOOKUP_DELETE_TOPIC, { resource: Resources.Country, id, isSoftDelete: !query.destroy })
  } catch (eer) {
    logger.info(`Error:  ${eer.message}`)
    throw eer
  }
}

remove.schema = {
  id: Joi.id(),
  query: Joi.object().keys({
    destroy: Joi.boolean()
  })
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
