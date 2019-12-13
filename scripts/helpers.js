
const devicesService = require('../src/services/DeviceService')
const countriesService = require('../src/services/CountryService')
const educationalInstitutionService = require('../src/services/EducationalInstitutionService')
const config = require('config')
/**
 * Return true if lookName is valid (one of the models)
 * @param {String} lookupName
 */
async function lookupCheck (lookupName) {
  const allowedLookups = Object.keys(require('../src/models'))
  if (!allowedLookups.includes(lookupName)) {
    return false
  } else {
    return true
  }
}
/**
 * Get service object based on lookupName.
 * @param {String} lookupName
 */
async function getLookupService (lookupName) {
  let service = null

  switch (lookupName) {
    case 'devices':
      service = devicesService
      break
    case 'educationalInstitutions':
      service = educationalInstitutionService
      break
    case 'countries':
      service = countriesService
      break
    default:
      break
  }
  return service
}
/**
 * Get the table based on the lookupName
 * @param {String} lookupName
 */
async function getTableName (lookupName) {
  let table = null
  switch (lookupName) {
    case 'devices':
      table = config.AMAZON.DYNAMODB_DEVICE_TABLE
      break
    case 'educationalInstitutions':
      table = config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE
      break
    case 'countries':
      table = config.AMAZON.DYNAMODB_COUNTRY_TABLE
      break
    default:
      break
  }
  return table
}

module.exports = {
  lookupCheck,
  getLookupService,
  getTableName
}
