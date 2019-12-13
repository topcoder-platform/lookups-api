/**
 * Create tables in Amazon DynamoDB
 */

require('../app-bootstrap')
const logger = require('../src/common/logger')

const fs = require('fs')
const scriptHelper = require('./helpers')
/**
 * Add data from the given file to the service.
 *
 * @param {*} service : One of the services.
 * @param {String} lookupFilePath
 */
const loadData = async (service, lookupFilePath) => {
  let duplicatesCount = 0
  let successfulsCount = 0
  let errorsCount = 0
  let rawdata = fs.readFileSync(lookupFilePath)
  let entities = JSON.parse(rawdata)
  for (const entity of entities) {
    try {
      await service.create(entity)
      successfulsCount += 1
    } catch (e) {
      if (e.name === 'ConflictError') {
        logger.error(`Duplicate Entity: ${JSON.stringify(entity)}`)
        duplicatesCount += 1
      } else {
        logger.error(`Error in Entity: ${JSON.stringify(entity)}`)
        errorsCount += 1
      }
    }
  }
  return [successfulsCount, duplicatesCount, errorsCount]
}
(async function () {
  const lookupName = process.env.npm_config_lookup
  const lookupFilePath = process.env.npm_config_file
  if (!lookupFilePath) {
    logger.error(`file argument should be provided`)
    process.exit()
  }

  if (!lookupName) {
    logger.error(`Lookup argument should be provided`)
    process.exit()
  }

  const checked = await scriptHelper.lookupCheck(lookupName)
  if (!checked) {
    logger.error(`The lookup ${lookupName} is not supported`)
    process.exit()
  }

  let service = await scriptHelper.getLookupService(lookupName)
  logger.info(`Load Data for lookup ${lookupName} using file ${lookupFilePath}`)

  loadData(service, lookupFilePath).then((res) => {
    let str = `Loaded: ${res[0]}, Duplicates: ${res[1]}`
    if (res[2] > 0) {
      str = `${str}, Errors: ${res[2]}`
    }
    logger.info(str)

    process.exit()
  }).catch((e) => {
    logger.logFullError(e)
    process.exit()
  })
})()
