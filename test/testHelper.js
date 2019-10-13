/**
 * This file defines common helper methods used for tests
 */
const config = require('config')
const helper = require('../src/common/helper')
const countryService = require('../src/services/CountryService')
const educationalInstitutionService = require('../src/services/EducationalInstitutionService')
const sinon = require('sinon')

/**
 * Clear data in the specified table in the database
 *
 * @param tableName The table name from which to clean the data
 */
async function clearDBData (tableName) {
  const records = await helper.scan(tableName)
  for (const record of records) {
    await record.delete()
  }
}

/**
 * Insert Educational Institutions test data
 */
async function insertEducationalInstitutionsTestData () {
  // This is used to prevent sending events for creating the test data to Kafka
  sinon.stub(helper, 'postEvent').resolves([])
  for (let i = 1; i <= 5; i += 1) {
    const res = await educationalInstitutionService.create({ name: `a test${i} b` })
    await helper.getESClient().create({
      index: config.ES.EDUCATIONAL_INSTITUTION_INDEX,
      type: config.ES.EDUCATIONAL_INSTITUTION_TYPE,
      id: res.id,
      body: res,
      refresh: 'true' // refresh ES so that it is visible for read operations instantly
    })
  }
}

/**
 * Insert countries test data
 */
async function insertCountryTestData () {
  // This is used to prevent sending events for creating the test data to Kafka
  sinon.stub(helper, 'postEvent').resolves([])
  for (let i = 1; i <= 5; i += 1) {
    const res = await countryService.create({
      name: `a test${i} b`,
      countryFlag: `a test${i} b`,
      countryCode: `a test${i} b`
    })
    await helper.getESClient().create({
      index: config.ES.COUNTRY_INDEX,
      type: config.ES.COUNTRY_TYPE,
      id: res.id,
      body: res,
      refresh: 'true' // refresh ES so that it is visible for read operations instantly
    })
  }
}

/**
 * Re-create ES indices.
 */
async function recreateESIndex (indexName) {
  await helper.createESIndex(indexName)
}

module.exports = {
  clearDBData,
  insertEducationalInstitutionsTestData,
  insertCountryTestData,
  recreateESIndex
}
