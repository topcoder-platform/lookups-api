/**
 * Controller for Device endpoints
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
 * List devices head
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function listHead (req, res) {
  const result = await service.list(req.query)
  helper.setResHeaders(req, res, result)
  res.end()
}

/**
 * Create device
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function create (req, res) {
  const result = await service.create(req.body)
  res.status(HttpStatus.CREATED).send(result)
}

/**
 * Get device
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getEntity (req, res) {
  const result = await service.getEntity(req.params.id)
  res.send(result)
}

/**
 * Get device head
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getEntityHead (req, res) {
  await service.getEntity(req.params.id)
  res.end()
}

/**
 * Update device
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function update (req, res) {
  const result = await service.update(req.params.id, req.body)
  res.send(result)
}

/**
 * Partially update device
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function partiallyUpdate (req, res) {
  const result = await service.partiallyUpdate(req.params.id, req.body)
  res.send(result)
}

/**
 * Remove device
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function remove (req, res) {
  await service.remove(req.params.id)
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
