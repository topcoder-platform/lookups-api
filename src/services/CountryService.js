/**
 * This service provides operations of countries.
 */
const _ = require('lodash')
const Joi = require('joi')
const config = require('config')
const uuid = require('uuid/v4')
const helper = require('../common/helper')
const logger = require('../common/logger')
const { Resources } = require('../../app-constants')
const error = require('../common/errors')

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
  // construct ES query
  const esQuery = {
    index: config.ES.COUNTRY_INDEX,
    type: config.ES.COUNTRY_TYPE,
    size: criteria.perPage,
    from: (criteria.page - 1) * criteria.perPage, // Es Index starts from 0
    body: {
      sort: [{ name: { order: 'asc' } }],
      query: {
        bool: {
          must: []
        }
      }
    },
    _source_excludes: (isAdmin && !_.isNil(criteria.includeSoftDeleted)) ? [] : ['isDeleted']
  }
  // filtering for name
  if (criteria.name) {
    esQuery.body.query.bool.must.push({
      term: {
        name: criteria.name
      }
    })
  }
  // filtering for countryCode
  if (criteria.countryCode) {
    esQuery.body.query.bool.must.push({
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
    esQuery.body.query.bool.must.push({
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
  data.id = uuid()
  data.isDeleted = false
  // create record in db
  const res = await helper.create(config.AMAZON.DYNAMODB_COUNTRY_TABLE, data)

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
  const country = await helper.getById(config.AMAZON.DYNAMODB_COUNTRY_TABLE, id)
  if ((data.name && country.name !== data.name) ||
     (data.countryFlag && country.countryFlag !== data.countryFlag) ||
     (data.countryCode && country.countryCode !== data.countryCode)) {
    if (data.name && country.name !== data.name) {
      // ensure name is not used already
      await helper.validateDuplicate(config.AMAZON.DYNAMODB_COUNTRY_TABLE, 'name', data.name)
    }
    // then update data in DB
    const res = await helper.update(country, data)

    // Send Kafka message using bus api
    await helper.postEvent(config.LOOKUP_UPDATE_TOPIC, _.assign({ resource: Resources.Country, id }, data))

    return helper.sanitizeResult(res)
  } else {
    // data are not changed
    return helper.sanitizeResult(country)
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
  // remove data in DB
  const country = await helper.getById(config.AMAZON.DYNAMODB_COUNTRY_TABLE, id)
  await helper.remove(country, query.destroy)

  // Send Kafka message using bus api
  await helper.postEvent(config.LOOKUP_DELETE_TOPIC, { resource: Resources.Country, id, isSoftDelete: !query.destroy })
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
