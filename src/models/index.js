/**
 * Initialize and export all model schemas.
 */

const config = require('config')
const dynamoose = require('dynamoose')

dynamoose.AWS.config.update({
  accessKeyId: config.AMAZON.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.AMAZON.AWS_SECRET_ACCESS_KEY,
  region: config.AMAZON.AWS_REGION
})

if (config.AMAZON.IS_LOCAL_DB) {
  dynamoose.local(config.AMAZON.DYNAMODB_URL)
}

dynamoose.setDefaults({
  create: false,
  update: false,
  waitForActive: false
})

const exportObj = {}
// table name is model name
exportObj[config.AMAZON.DYNAMODB_COUNTRY_TABLE] =
  dynamoose.model(config.AMAZON.DYNAMODB_COUNTRY_TABLE, require('./Country'))
exportObj[config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE] =
  dynamoose.model(config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE, require('./EducationalInstitution'))

module.exports = exportObj
