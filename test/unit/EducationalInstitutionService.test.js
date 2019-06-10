/*
 * Unit tests of educational institution service
 */

// During the test the env variable is set to test
process.env.NODE_ENV = 'test'

require('../../app-bootstrap')
const config = require('config')
const unitTestHelper = require('./unitTestHelper')
const service = require('../../src/services/EducationalInstitutionService')

unitTestHelper.generateLookupUnitTests(service, config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE)
