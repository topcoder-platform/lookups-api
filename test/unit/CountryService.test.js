/*
 * Unit tests of country service
 */

// During the test the env variable is set to test
process.env.NODE_ENV = 'test'

require('../../app-bootstrap')
const config = require('config')
const unitTestHelper = require('./unitTestHelper')
const service = require('../../src/services/CountryService')

unitTestHelper.generateLookupUnitTests(service,
  config.AMAZON.DYNAMODB_COUNTRY_TABLE,
  ['name', 'countryCode', 'countryFlag'],
  ['name', 'countryCode'],
  ['name', 'countryCode', 'countryFlag'])
