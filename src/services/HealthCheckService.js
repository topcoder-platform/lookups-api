/**
 * This service provides a method to check health.
 */
const config = require('config')
const helper = require('../common/helper')
const logger = require('../common/logger')
const errors = require('../common/errors')

/**
 * Check health.
 * @returns {Object} the health check result
 */
async function check () {
  // check ES connection
  try {
    await helper.getESClient().ping({ requestTimeout: 10000 })
  } catch (e) {
    throw new errors.ServiceUnavailableError(`Elasticsearch is unavailable, ${e.message}`)
  }

  // check DB connection by a simple query
  try {
    await helper.scan(config.AMAZON.DYNAMODB_COUNTRY_TABLE)
  } catch (e) {
    throw new errors.ServiceUnavailableError(`DynamoDB is unavailable, ${e.message}`)
  }

  // ok
  return { checksRun: 1 }
}

module.exports = {
  check
}

logger.buildService(module.exports)
