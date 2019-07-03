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
  logger.info(`Re-create index ${config.ES.COUNTRY_INDEX} in Elasticsearch.`)
  await helper.createESIndex(config.ES.COUNTRY_INDEX)

  logger.info(`Re-create index ${config.ES.EDUCATIONAL_INSTITUTION_INDEX} in Elasticsearch.`)
  await helper.createESIndex(config.ES.EDUCATIONAL_INSTITUTION_INDEX)
}

initES().then(() => {
  logger.info('Done!')
  process.exit()
}).catch((e) => {
  logger.logFullError(e)
  process.exit()
})
