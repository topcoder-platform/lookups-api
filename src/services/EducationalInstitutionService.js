/**
 * This service provides operations of educational institutions.
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
 * List educational institutions in Elasticsearch.
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
// async function listES (criteria) {
//   // construct ES query
//   const esQuery = {
//     index: config.ES.EDUCATIONAL_INSTITUTION_INDEX,
//     type: config.ES.EDUCATIONAL_INSTITUTION_TYPE,
//     size: criteria.perPage,
//     from: (criteria.page - 1) * criteria.perPage, // Es Index starts from 0
//     body: {
//       sort: [{ name: { order: 'asc' } }],
//       query: {
//         bool: {
//           must: []
//         }
//       }
//     }
//   }
//   // filtering for name
//   if (criteria.name) {
//     esQuery.body.query.bool.must.push({
//       term: {
//         name: criteria.name
//       }
//     })
//   }

//   // Search with constructed query
//   const docs = await esClient.search(esQuery)
//   // Extract data from hits
//   let total = docs.hits.total
//   if (_.isObject(total)) {
//     total = total.value || 0
//   }
//   const result = _.map(docs.hits.hits, (item) => item._source)
//   return { total, page: criteria.page, perPage: criteria.perPage, result }
// }

/**
 * List educational institutions.
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function list (criteria) {
  // first try to get from ES
  let result
  // try {
  //   result = await listES(criteria)
  // } catch (e) {
  //   // log and ignore
  //   logger.logFullError(e)
  // }
  if (result && result.result.length > 0) {
    return result
  }

  // then try to get from DB
  let options
  if (criteria.name) {
    options = {
      name: { eq: criteria.name }
    }
  }
  // ignore pagination, scan all matched records
  result = await helper.scan(config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE, options)
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
 * Get educational institution entity by id.
 * @param {String} id the educational institution id
 * @returns {Object} the educational institution of given id
 */
async function getEntity (id) {
  // first try to get from ES
  try {
    return await esClient.getSource({
      index: config.ES.EDUCATIONAL_INSTITUTION_INDEX,
      type: config.ES.EDUCATIONAL_INSTITUTION_TYPE,
      id
    })
  } catch (e) {
    // log and ignore
    logger.logFullError(e)
  }

  // then try to get from DB
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
  // create record in db
  const res = await helper.create(config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE, data)

  // Send Kafka message using bus api
  await helper.postEvent(config.LOOKUP_CREATE_TOPIC, _.assign({ resource: Resources.EducationalInstitution }, res))

  return res
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
  // get data in DB
  const ei = await helper.getById(config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE, id)
  if (data.name && ei.name !== data.name) {
    // ensure name is not used already
    await helper.validateDuplicate(config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE, 'name', data.name)

    // then update data in DB
    const res = await helper.update(ei, data)

    // Send Kafka message using bus api
    await helper.postEvent(config.LOOKUP_UPDATE_TOPIC, _.assign({ resource: Resources.EducationalInstitution, id }, data))

    return res
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
  // remove data in DB
  const ei = await helper.getById(config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE, id)
  await helper.remove(ei)

  // Send Kafka message using bus api
  await helper.postEvent(config.LOOKUP_DELETE_TOPIC, { resource: Resources.EducationalInstitution, id })
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
