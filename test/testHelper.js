/**
 * This file defines common helper methods used for tests
 */
const config = require('config')
const uuid = require('uuid/v4')
const helper = require('../src/common/helper')

const tables = [config.AMAZON.DYNAMODB_COUNTRY_TABLE, config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE]

/**
 * Clear data in database
 */
async function clearData () {
  for (const table of tables) {
    const records = await helper.scan(table)
    for (const record of records) {
      await record.delete()
    }
  }
}

/**
 * Insert test data in database
 */
async function insertTestData () {
  for (const table of tables) {
    for (let i = 1; i <= 5; i += 1) {
      await helper.create(table, { id: uuid(), name: `test${i}` })
    }
  }
}

module.exports = {
  clearData,
  insertTestData
}
