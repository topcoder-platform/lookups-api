/**
 * Clean Data
 */

require('../app-bootstrap')
const logger = require('../src/common/logger')

const scriptHelper = require('./helpers')
const servicesHelper = require('../src/common/helper')
/**
 * Remove all data in the table based on lookupName
 * @param {String} lookupName
 */
const cleanData = async (lookupName) => {
  const getTableName = await scriptHelper.getTableName(lookupName)
  const records = await servicesHelper.scan(getTableName)
  for (const record of records) {
    await record.delete()
  }
}
(async function () {
  const lookupName = process.env.npm_config_lookup
  if (!lookupName) {
    logger.error(`Lookup argument should be provided`)
    process.exit()
  }
  const checked = await scriptHelper.lookupCheck(lookupName)
  if (!checked) {
    logger.error(`The lookup ${lookupName} is not supported`)
    process.exit()
  }

  cleanData(lookupName).then((res) => {
    logger.info(`Deleted data from lookup ${lookupName}`)
    process.exit()
  }).catch((e) => {
    logger.logFullError(e)
    process.exit()
  })
})()
