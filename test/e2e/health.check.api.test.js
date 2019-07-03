/*
 * E2E tests of health check API
 */

// During the test the env variable is set to test
process.env.NODE_ENV = 'test'

require('../../app-bootstrap')
const config = require('config')
const chai = require('chai')
const chaiHttp = require('chai-http')
const app = require('../../app')

chai.should()
chai.use(chaiHttp)

describe('health check API tests', () => {
  it('Call health check API successfully', async () => {
    const response = await chai.request(app)
      .get(`${config.API_VERSION}/health`)
    response.status.should.be.eql(200)
    response.body.checksRun.should.be.eql(1)
  })
})
