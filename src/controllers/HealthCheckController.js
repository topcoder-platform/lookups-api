/**
 * Controller for health check endpoint
 */
const service = require('../services/HealthCheckService')

/**
 * Do health check
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function check (req, res) {
  const result = await service.check()
  res.send(result)
}

module.exports = {
  check
}
