/**
 * Initialize elastic search.
 * It will re-create configured indices in elasticsearch.
 * Usage:
 * node script/initES
 */
const config = require('config')
const logger = require('../src/common/logger')
const helper = require('../src/common/helper')

const initES = async () => {
  logger.info(`Re-create index ${config.ES.COUNTRY_INDEX} with mapping ${config.ES.COUNTRY_TYPE} in Elasticsearch.`)
  await helper.createESIndex(config.ES.COUNTRY_INDEX, config.ES.COUNTRY_TYPE, ['name', 'countryCode', 'countryFlag'])

  logger.info(`Re-create index ${config.ES.EDUCATIONAL_INSTITUTION_INDEX} with mapping ${config.ES.EDUCATIONAL_INSTITUTION_TYPE} in Elasticsearch.`)
  await helper.createESIndex(config.ES.EDUCATIONAL_INSTITUTION_INDEX, config.ES.EDUCATIONAL_INSTITUTION_TYPE, ['name'])

  logger.info(`Re-create index ${config.ES.DEVICE_INDEX} with mapping ${config.ES.DEVICE_TYPE} in Elasticsearch.`)
  await helper.createESIndex(config.ES.DEVICE_INDEX, config.ES.DEVICE_TYPE, ['type', 'manufacturer', 'model', 'operatingSystem', 'operatingSystemVersion'])
}

initES().then(() => {
  logger.info('Done!')
  process.exit()
}).catch((e) => {
  logger.logFullError(e)
  process.exit()
})
