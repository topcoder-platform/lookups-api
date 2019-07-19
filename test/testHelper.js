/**
 * This file defines common helper methods used for tests
 */
const config = require('config')
const helper = require('../src/common/helper')
const CountryService = require('../src/services/CountryService')
const EducationalInstitutionService = require('../src/services/EducationalInstitutionService')

/**
 * Clear data in database
 */
async function clearDBData () {
  const tables = [config.AMAZON.DYNAMODB_COUNTRY_TABLE, config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE]
  for (const table of tables) {
    const records = await helper.scan(table)
    for (const record of records) {
      await record.delete()
    }
  }
}

/**
 * Insert test data
 */
async function insertTestData () {
  const services = [CountryService, EducationalInstitutionService]
  for (let index = 0; index <= 1; index++) {
    const service = services[index]
    for (let i = 1; i <= 5; i += 1) {
      const res = await service.create({ name: `a test${i} b` })
      await helper.getESClient().create({
        index: index === 0 ? config.ES.COUNTRY_INDEX : config.ES.EDUCATIONAL_INSTITUTION_INDEX,
        type: index === 0 ? config.ES.COUNTRY_TYPE : config.ES.EDUCATIONAL_INSTITUTION_TYPE,
        id: res.id,
        body: res,
        refresh: 'true' // refresh ES so that it is visible for read operations instantly
      })
    }
  }
}

/**
 * Re-create ES indices.
 */
async function recreateESIndices () {
  await helper.createESIndex(config.ES.COUNTRY_INDEX)
  await helper.createESIndex(config.ES.EDUCATIONAL_INSTITUTION_INDEX)
}

module.exports = {
  clearDBData,
  insertTestData,
  recreateESIndices
}
