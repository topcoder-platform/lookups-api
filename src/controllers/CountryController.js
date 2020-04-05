/**
 * Controller for country endpoints
 */
const HttpStatus = require('http-status-codes')
const service = require('../services/CountryService')
const helper = require('../common/helper')

/**
 * List countries
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function list (req, res) {
  const result = await service.list(req.query)
  helper.setResHeaders(req, res, result)
  res.send(result.result)
}

/**
 * List countries head
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function listHead (req, res) {
  const result = await service.list(req.query)
  helper.setResHeaders(req, res, result)
  res.end()
}

/**
 * Create country
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function create (req, res) {
  const result = await service.create(req.body)
  res.status(HttpStatus.CREATED).send(result)
}

/**
 * Get country
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getEntity (req, res) {
  const result = await service.getEntity(req.params.id)
  res.send(result)
}

/**
 * Get country head
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getEntityHead (req, res) {
  await service.getEntity(req.params.id)
  res.end()
}

/**
 * Update country
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function update (req, res) {
  const result = await service.update(req.params.id, req.body)
  res.send(result)
}

/**
 * Partially update country
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function partiallyUpdate (req, res) {
  const result = await service.partiallyUpdate(req.params.id, req.body)
  res.send(result)
}

/**
 * Remove country
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
