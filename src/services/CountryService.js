/**
 * This service provides operations of countries.
 */
const _ = require('lodash')
const Joi = require('joi')
const config = require('config')
const uuid = require('uuid/v4')
const helper = require('../common/helper')
const logger = require('../common/logger')
const HttpStatus = require('http-status-codes')

const esClient = helper.getESClient()

/**
 * List countries in Elasticsearch.
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function listES (criteria) {
  // construct ES query
  const esQuery = {
    index: config.ES.COUNTRY_INDEX,
    type: config.ES.COUNTRY_TYPE,
    size: criteria.perPage,
    from: (criteria.page - 1) * criteria.perPage, // Es Index starts from 0
    body: {
      sort: [{ name: { order: 'asc' } }]
    }
  }
  if (criteria.name) {
    esQuery.body.query = {
      bool: {
        filter: [{ match_phrase: { name: criteria.name } }]
      }
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
 * List countries.
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
  let options
  if (criteria.name) {
    options = {
      name: { contains: criteria.name }
    }
  }
  // ignore pagination, scan all matched records
  const result = await helper.scan(config.AMAZON.DYNAMODB_COUNTRY_TABLE, options)
  // return fromDB:true to indicate it is got from db,
  // and response headers ('X-Total', 'X-Page', etc.) are not set in this case
  return { fromDB: true, result }
}

list.schema = {
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage(),
    name: Joi.string()
  })
}

/**
 * Get country entity by id.
 * @param {String} id the country id
 * @returns {Object} the country of given id
 */
async function getEntity (id) {
  // first try to get from ES
  try {
    return await esClient.getSource({
      index: config.ES.COUNTRY_INDEX,
      type: config.ES.COUNTRY_TYPE,
      id
    })
  } catch (e) {
    // log and ignore
    logger.logFullError(e)
  }

  // then try to get from DB
  return helper.getById(config.AMAZON.DYNAMODB_COUNTRY_TABLE, id)
}

getEntity.schema = {
  id: Joi.id()
}

/**
 * Create country.
 * @param {Object} data the data to create country
 * @returns {Object} the created country
 */
async function create (data) {
  await helper.validateDuplicate(config.AMAZON.DYNAMODB_COUNTRY_TABLE, 'name', data.name)
  data.id = uuid()
  // create record in db
  const res = await helper.create(config.AMAZON.DYNAMODB_COUNTRY_TABLE, data)
  // create record in Elasticsearch
  await esClient.create({
    index: config.ES.COUNTRY_INDEX,
    type: config.ES.COUNTRY_TYPE,
    id: data.id,
    body: data,
    refresh: 'true' // refresh ES so that it is visible for read operations instantly
  })
  return res
}

create.schema = {
  data: Joi.object().keys({
    name: Joi.string().required()
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
  if (data.name && country.name !== data.name) {
    // ensure name is not used already
    await helper.validateDuplicate(config.AMAZON.DYNAMODB_COUNTRY_TABLE, 'name', data.name)

    // update data in ES, if it is not found in ES, then create it in ES
    try {
      await esClient.update({
        index: config.ES.COUNTRY_INDEX,
        type: config.ES.COUNTRY_TYPE,
        id,
        body: { doc: data },
        refresh: 'true' // refresh ES so that it is visible for read operations instantly
      })
    } catch (e) {
      if (e.statusCode === HttpStatus.NOT_FOUND) {
        // not found in ES, then create data in ES
        await esClient.create({
          index: config.ES.COUNTRY_INDEX,
          type: config.ES.COUNTRY_TYPE,
          id,
          body: _.assignIn({ id }, data),
          refresh: 'true' // refresh ES so that it is visible for read operations instantly
        })
      } else {
        // re-throw other errors
        throw e
      }
    }

    // then update data in DB
    return helper.update(country, data)
  } else {
    // data are not changed
    return country
  }
}

partiallyUpdate.schema = {
  id: Joi.id(),
  data: Joi.object().keys({
    name: Joi.string()
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
    name: Joi.string().required()
  }).required()
}

/**
 * Remove country.
 * @param {String} id the country id to remove
 */
async function remove (id) {
  // remove data in ES
  try {
    await esClient.delete({
      index: config.ES.COUNTRY_INDEX,
      type: config.ES.COUNTRY_TYPE,
      id,
      refresh: 'true' // refresh ES so that it is visible for read operations instantly
    })
  } catch (e) {
    // if not found in ES, then continue to remove data in db, otherwise re-throw the error
    if (e.statusCode !== HttpStatus.NOT_FOUND) {
      throw e
    }
  }

  // remove data in DB
  const country = await helper.getById(config.AMAZON.DYNAMODB_COUNTRY_TABLE, id)
  await helper.remove(country)
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
