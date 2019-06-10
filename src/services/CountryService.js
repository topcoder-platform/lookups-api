/**
 * This service provides operations of countries.
 */

const Joi = require('joi')
const config = require('config')
const uuid = require('uuid/v4')
const helper = require('../common/helper')
const logger = require('../common/logger')

/**
 * List countries.
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function list (criteria) {
  let options
  if (criteria.name) {
    options = {
      name: { contains: criteria.name }
    }
  }
  return helper.scan(config.AMAZON.DYNAMODB_COUNTRY_TABLE, options)
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
  return helper.create(config.AMAZON.DYNAMODB_COUNTRY_TABLE, data)
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
  const country = await helper.getById(config.AMAZON.DYNAMODB_COUNTRY_TABLE, id)
  if (data.name && country.name !== data.name) {
    await helper.validateDuplicate(config.AMAZON.DYNAMODB_COUNTRY_TABLE, 'name', data.name)
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
