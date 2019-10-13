/*
 * E2E tests of educational institution APIs
 */

// During the test the env variable is set to test
process.env.NODE_ENV = 'test'

require('../../app-bootstrap')
const config = require('config')
const e2eTestHelper = require('./e2eTestHelper')

e2eTestHelper.generateLookupE2ETests(`${config.API_VERSION}/lookups/educationalInstitutions`,
  config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE, ['name'], ['name'])
