/*
 * Unit tests of health check service
 */

// During the test the env variable is set to test
process.env.NODE_ENV = 'test'

require('../../app-bootstrap')
const chai = require('chai')
const service = require('../../src/services/HealthCheckService')

const should = chai.should()

describe('health check service tests', () => {
  it('check health successfully', async () => {
    const result = await service.check()
    should.equal(result.checksRun, 1)
  })
})
