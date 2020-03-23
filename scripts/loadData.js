/**
 * Create tables in Amazon DynamoDB
 */

require('../app-bootstrap')
const logger = require('../src/common/logger')

const fs = require('fs')
const uuid = require('uuid/v4')
const scriptHelper = require('./helpers')
const servicesHelper = require('../src/common/helper')
/**
 * Add data from the given file to the db and es.
 *
 * @param {String} lookupName
 * @param {String} lookupFilePath
 */
const loadData = async (lookupName, lookupFilePath) => {
  let duplicatesCount = 0
  let successfulsCount = 0
  let errorsCount = 0
  let rawdata = fs.readFileSync(lookupFilePath)
  let entities = JSON.parse(rawdata)

  const [getTableName, esIndex, esType] = await scriptHelper.getLookupKey(lookupName)
  for (const entity of entities) {
    try {
      // create record in db
      if (!entity.hasOwnProperty("id")) {
        entity.id = uuid()
      }
      if (getTableName === "devices") {
        if (!entity.operatingSystemVersion) {
          entity.operatingSystemVersion = 'ANY'
        }
      }
      const res = await servicesHelper.create(getTableName, entity)

      // create record in es
      await servicesHelper.getESClient().create({
        index: esIndex,
        type: esType,
        id: res.id,
        body: res,
        refresh: 'true' // refresh ES so that it is visible for read operations instantly
      })
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
  if (process.env.NODE_ENV !== 'development') {
    logger.error(`Load data should be executed in development env`)
    process.exit()
  }

  Object.keys(require('../src/models')).forEach(function (key) {
    const fileName = key === 'educationalInstitutions' ? 'educational_institutions' : key
    logger.info(`Load Data for lookup ${key} using file ./resources/${fileName}.json`)
    loadData(key, `./resources/${fileName}.json`).then((res) => {
      let str = `Loaded: ${res[0]}, Duplicates: ${res[1]}`
      if (res[2] > 0) {
        str = `${str}, Errors: ${res[2]}`
      }
      logger.info(str)
    }).catch((e) => {
      logger.logFullError(e)
    })
  })
})()
