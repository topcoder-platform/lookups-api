/*
 * E2E tests of country APIs
 */

// During the test the env variable is set to test
process.env.NODE_ENV = 'test'

require('../../app-bootstrap')
const config = require('config')
const e2eTestHelper = require('./e2eTestHelper')

e2eTestHelper.generateLookupE2ETests(`${config.API_VERSION}/lookups/devices`,
  config.AMAZON.DYNAMODB_DEVICE_TABLE,
  ['type', 'manufacturer', 'model', 'operatingSystem', 'operatingSystemVersion'],
  ['type', 'manufacturer', 'model', 'operatingSystem', 'operatingSystemVersion'])
