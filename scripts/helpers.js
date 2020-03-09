const config = require('config')

/**
 * Get the table, esIndex and esType based on the lookupName
 * @param {String} lookupName
 */
async function getLookupKey (lookupName) {
  let table = []
  switch (lookupName) {
    case 'devices':
      table = [config.AMAZON.DYNAMODB_DEVICE_TABLE, config.ES.DEVICE_INDEX, config.ES.DEVICE_TYPE]
      break
    case 'educationalInstitutions':
      table = [config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE, config.ES.EDUCATIONAL_INSTITUTION_INDEX, config.ES.EDUCATIONAL_INSTITUTION_TYPE]
      break
    case 'countries':
      table = [config.AMAZON.DYNAMODB_COUNTRY_TABLE, config.ES.COUNTRY_INDEX, config.ES.COUNTRY_TYPE]
      break
    default:
      break
  }
  return table
}

module.exports = {
  getLookupKey
}
