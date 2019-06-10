/**
 * This service provides operations of educational institutions.
 */

const Joi = require('joi')
const config = require('config')
const uuid = require('uuid/v4')
const helper = require('../common/helper')
const logger = require('../common/logger')

/**
 * List educational institutions.
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
  return helper.scan(config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE, options)
}

list.schema = {
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage(),
    name: Joi.string()
  })
}

/**
 * Get educational institution entity by id.
 * @param {String} id the educational institution id
 * @returns {Object} the educational institution of given id
 */
async function getEntity (id) {
  return helper.getById(config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE, id)
}

getEntity.schema = {
  id: Joi.id()
}

/**
 * Create educational institution.
 * @param {Object} data the data to create educational institution
 * @returns {Object} the created educational institution
 */
async function create (data) {
  await helper.validateDuplicate(config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE, 'name', data.name)
  data.id = uuid()
  return helper.create(config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE, data)
}

create.schema = {
  data: Joi.object().keys({
    name: Joi.string().required()
  }).required()
}

/**
 * Partially update educational institution.
 * @param {String} id the educational institution id
 * @param {Object} data the data to update educational institution
 * @returns {Object} the updated educational institution
 */
async function partiallyUpdate (id, data) {
  const ei = await helper.getById(config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE, id)
  if (data.name && ei.name !== data.name) {
    await helper.validateDuplicate(config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE, 'name', data.name)
    return helper.update(ei, data)
  } else {
    // data are not changed
    return ei
  }
}

partiallyUpdate.schema = {
  id: Joi.id(),
  data: Joi.object().keys({
    name: Joi.string()
  }).required()
}

/**
 * Update educational institution.
 * @param {String} id the educational institution id
 * @param {Object} data the data to update educational institution
 * @returns {Object} the updated educational institution
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
 * Remove educational institution.
 * @param {String} id the educational institution id to remove
 */
async function remove (id) {
  const ei = await helper.getById(config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE, id)
  await helper.remove(ei)
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
