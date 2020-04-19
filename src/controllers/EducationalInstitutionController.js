/**
 * Controller for educational institution endpoints
 */
const HttpStatus = require('http-status-codes')
const service = require('../services/EducationalInstitutionService')
const helper = require('../common/helper')

/**
 * List educational institutions
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function list (req, res) {
  const result = await service.list(req.query)
  result.result.forEach(entity => {
    delete entity.isDeleted
  })
  helper.setResHeaders(req, res, result)
  res.send(result.result)
}

/**
 * List educational institutions head
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function listHead (req, res) {
  const result = await service.list(req.query)
  helper.setResHeaders(req, res, result)
  res.end()
}

/**
 * Create educational institution
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function create (req, res) {
  const result = await service.create(req.body)
  delete result.isDeleted
  res.status(HttpStatus.CREATED).send(result)
}

/**
 * Get educational institution
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getEntity (req, res) {
  const result = await service.getEntity(req.params.id, req.excludeSoftDeleted)
  delete result.isDeleted
  res.send(result)
}

/**
 * Get educational institution head
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getEntityHead (req, res) {
  await service.getEntity(req.params.id, req.excludeSoftDeleted)
  res.end()
}

/**
 * Update educational institution
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function update (req, res) {
  const result = await service.update(req.params.id, req.body)
  delete result.isDeleted
  res.send(result)
}

/**
 * Partially update educational institution
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function partiallyUpdate (req, res) {
  const result = await service.partiallyUpdate(req.params.id, req.body)
  delete result.isDeleted
  res.send(result)
}

/**
 * Remove educational institution
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function remove (req, res) {
  await service.remove(req.params.id, req.query.destroy)
  res.status(HttpStatus.NO_CONTENT).end()
}

module.exports = {
  list,
  listHead,
  getEntity,
  getEntityHead,
  create,
  update,
  partiallyUpdate,
  remove
}
