/**
 * Migrate data in Amazon DynamoDB
 */

const _ = require('lodash')
const config = require('config')
const AWS = require('aws-sdk')
require('../app-bootstrap')
const logger = require('../src/common/logger')

const scriptHelper = require('./helpers')
const helper = require('../src/common/helper')

const migrateConfig = {
  accessKeyId: config.MIGRATE_DB.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.MIGRATE_DB.AWS_SECRET_ACCESS_KEY,
  region: config.MIGRATE_DB.AWS_REGION
}
if (config.MIGRATE_DB.IS_LOCAL_DB) {
  migrateConfig.endpoint = config.MIGRATE_DB.DYNAMODB_URL
}
const dbInstance = new AWS.DynamoDB(migrateConfig)

var esClient
(async function () {
  esClient = await helper.getESClient()
})()

/**
 * Migrate data from the development db to the production db and es.
 *
 * @param {String} lookupName
 */
const migrateData = async (lookupName) => {
  let duplicatesCount = 0
  let successfulsCount = 0
  let errorsCount = 0

  const [getTableName, esIndex, esType] = await scriptHelper.getLookupKey(lookupName)
  const scanParam = {
    TableName: lookupName,
    Limit: config.MIGRATE_DB.BATCH_COUNT
  }
  while (true) {
    // query record from source db
    let data = await dbInstance.scan(scanParam).promise()
    for (const item of data.Items) {
      const entity = _.mapValues(item, v => v.S)
      try {
        // create record in db
        const res = await helper.create(getTableName, entity)

        // create record in es
        await esClient.create({
          index: esIndex,
          type: esType,
          id: res.id,
          body: res,
          refresh: 'true' // refresh ES so that it is visible for read operations instantly
        })
        successfulsCount += 1
      } catch (e) {
        if (e.name === 'ConflictError') {
          logger.error(`Duplicate Entity: ${JSON.stringify(entity)} in table: ${lookupName}`)
          duplicatesCount += 1
        } else {
          logger.error(`Error in Entity: ${JSON.stringify(entity)} in table: ${lookupName}`)
          logger.error(e)
          errorsCount += 1
        }
      }
    }
    // specify next batch
    if (data.LastEvaluatedKey) {
      scanParam.ExclusiveStartKey = data.LastEvaluatedKey
    } else {
      break
    }
  }
  return [successfulsCount, duplicatesCount, errorsCount]
}

(async function () {
  if (!config.MIGRATE_DB) {
    logger.error(`Migrate data should be executed after config the MIGRATE_DB`)
    process.exit()
  }
  Object.keys(require('../src/models')).forEach(function (key) {
    logger.info(`Migrate Data for lookup ${key}`)
    migrateData(key).then((res) => {
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
