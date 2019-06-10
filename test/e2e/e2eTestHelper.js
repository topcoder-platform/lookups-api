/**
 * This file defines helper methods used for E2E tests
 */
const _ = require('lodash')
const chai = require('chai')
const chaiHttp = require('chai-http')
const config = require('config')
const testHelper = require('../testHelper')
const app = require('../../app')

chai.should()
chai.use(chaiHttp)
chai.use(require('chai-as-promised'))

/**
 * Generate E2E tests for lookup APIs.
 * @param {String} basePath the API base path
 * @param {String} modelName the model name
 */
function generateLookupE2ETests (basePath, modelName) {
  describe(`E2E tests for ${modelName} APIs`, () => {
    // created entity id
    let id
    const notFoundId = '4ef609c7-d81c-4684-80a1-06b7d74d0eab'

    before(async () => {
      await testHelper.clearData()
      await testHelper.insertTestData()
    })

    after(async () => {
      await testHelper.clearData()
    })

    describe('list API tests', () => {
      it('Call list API successfully 1', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
        response.status.should.be.eql(200)
        response.body.length.should.be.eql(5)
        for (let i = 1; i <= 5; i += 1) {
          const name = `test${i}`
          const found = !!_.find(response.body, (item) => item.name === name)
          found.should.be.eql(true)
        }
      })

      it('Call list API successfully 2', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', `Bearer ${config.USER_TOKEN}`)
          .query({ name: 'est3' })
        response.status.should.be.eql(200)
        response.body.length.should.be.eql(1)
        response.body[0].name.should.be.eql('test3')
      })

      it('list API - invalid page', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .query({ page: -1 })
        response.status.should.be.eql(400)
        response.body.message.should.be.eql('"page" must be larger than or equal to 1')
      })

      it('list API - missing token', async () => {
        const response = await chai.request(app)
          .get(basePath)
        response.status.should.be.eql(401)
        response.body.message.should.be.eql('No token provided.')
      })

      it('list API - invalid bearer format', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', 'invalid format')
        response.status.should.be.eql(401)
        response.body.message.should.be.eql('No token provided.')
      })

      it('list API - invalid token', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', `Bearer ${config.INVALID_TOKEN}`)
        response.status.should.be.eql(401)
        response.body.message.should.be.eql('Failed to authenticate token.')
      })

      it('list API - expired token', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', `Bearer ${config.EXPIRED_TOKEN}`)
        response.status.should.be.eql(401)
        response.body.message.should.be.eql('Failed to authenticate token.')
      })

      it('list API - not allowed token', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        response.status.should.be.eql(403)
        response.body.message.should.be.eql('You are not allowed to perform this action!')
      })

      it('list API - invalid perPage', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .query({ perPage: 'abc' })
        response.status.should.be.eql(400)
        response.body.message.should.be.eql('"perPage" must be a number')
      })

      it('list API - unexpected field', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .query({ other: 123 })
        response.status.should.be.eql(400)
        response.body.message.should.be.eql('"other" is not allowed')
      })
    })

    describe('list head API tests', () => {
      it('Call list head API successfully 1', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        response.status.should.be.eql(200)
        _.isEmpty(response.body).should.be.eql(true)
      })

      it('Call list head API successfully 2', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .set('Authorization', `Bearer ${config.USER_TOKEN}`)
          .set('Content-Type', 'application/json')
          .query({ name: 'est3' })
        response.status.should.be.eql(200)
        _.isEmpty(response.body).should.be.eql(true)
      })

      it('list head API - invalid page', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .query({ page: -1 })
        response.status.should.be.eql(400)
        _.isEmpty(response.body).should.be.eql(true)
      })

      it('list head API - missing token', async () => {
        const response = await chai.request(app)
          .head(basePath)
        response.status.should.be.eql(401)
        _.isEmpty(response.body).should.be.eql(true)
      })

      it('list head API - invalid token', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .set('Authorization', `Bearer ${config.INVALID_TOKEN}`)
        response.status.should.be.eql(401)
        _.isEmpty(response.body).should.be.eql(true)
      })

      it('list head API - expired token', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .set('Authorization', `Bearer ${config.EXPIRED_TOKEN}`)
        response.status.should.be.eql(401)
        _.isEmpty(response.body).should.be.eql(true)
      })

      it('list head API - not allowed token', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        response.status.should.be.eql(403)
        _.isEmpty(response.body).should.be.eql(true)
      })

      it('list head API - invalid perPage', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .query({ perPage: 'abc' })
        response.status.should.be.eql(400)
        _.isEmpty(response.body).should.be.eql(true)
      })

      it('list head API - unexpected field', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .query({ other: 123 })
        response.status.should.be.eql(400)
        _.isEmpty(response.body).should.be.eql(true)
      })
    })

    describe('create API tests', () => {
      it('Call create API successfully', async () => {
        const response = await chai.request(app)
          .post(basePath)
          .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
          .send({ name: 'testing' })
        response.status.should.be.eql(201)
        response.body.name.should.be.eql('testing')
        id = response.body.id
      })

      it('create API - name already used', async () => {
        const response = await chai.request(app)
          .post(basePath)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
          .send({ name: 'testing' })
        response.status.should.be.eql(409)
        response.body.message.should.be.eql(`${modelName} with name: testing already exists`)
      })

      it('create API - forbidden', async () => {
        const response = await chai.request(app)
          .post(basePath)
          .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
          .send({ name: 'abcdef' })
        response.status.should.be.eql(403)
        response.body.message.should.be.eql('You are not allowed to perform this action!')
      })

      it('create API - missing name', async () => {
        const response = await chai.request(app)
          .post(basePath)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
          .send({})
        response.status.should.be.eql(400)
        response.body.message.should.be.eql('"name" is required')
      })

      it('create API - invalid name', async () => {
        const response = await chai.request(app)
          .post(basePath)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
          .send({ name: ['xx'] })
        response.status.should.be.eql(400)
        response.body.message.should.be.eql('"name" must be a string')
      })

      it('create API - unexpected field', async () => {
        const response = await chai.request(app)
          .post(basePath)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
          .send({ name: 'abc', other: 'def' })
        response.status.should.be.eql(400)
        response.body.message.should.be.eql('"other" is not allowed')
      })
    })

    describe('get entity API tests', () => {
      it('Call get entity API successfully', async () => {
        const response = await chai.request(app)
          .get(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.USER_TOKEN}`)
        response.status.should.be.eql(200)
        response.body.id.should.be.eql(id)
        response.body.name.should.be.eql('testing')
      })

      it('get entity API - forbidden', async () => {
        const response = await chai.request(app)
          .get(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        response.status.should.be.eql(403)
        response.body.message.should.be.eql('You are not allowed to perform this action!')
      })

      it('get entity API - not found', async () => {
        const response = await chai.request(app)
          .get(`${basePath}/${notFoundId}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        response.status.should.be.eql(404)
        response.body.message.should.be.eql(`${modelName} with id: ${notFoundId} doesn't exist`)
      })

      it('get entity API - invalid id', async () => {
        const response = await chai.request(app)
          .get(`${basePath}/invalid`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        response.status.should.be.eql(400)
        response.body.message.should.be.eql('"id" must be a valid GUID')
      })
    })

    describe('get entity head API tests', () => {
      it('Call get entity head API successfully', async () => {
        const response = await chai.request(app)
          .head(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        response.status.should.be.eql(200)
        _.isEmpty(response.body).should.be.eql(true)
      })

      it('get entity head API - forbidden', async () => {
        const response = await chai.request(app)
          .head(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        response.status.should.be.eql(403)
        _.isEmpty(response.body).should.be.eql(true)
      })

      it('get entity head API - not found', async () => {
        const response = await chai.request(app)
          .head(`${basePath}/${notFoundId}`)
          .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        response.status.should.be.eql(404)
        _.isEmpty(response.body).should.be.eql(true)
      })

      it('get entity head API - invalid id', async () => {
        const response = await chai.request(app)
          .head(`${basePath}/invalid`)
          .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        response.status.should.be.eql(400)
        _.isEmpty(response.body).should.be.eql(true)
      })
    })

    describe('update API tests', () => {
      it('Call update API successfully', async () => {
        const response = await chai.request(app)
          .put(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: 'testing2' })
        response.status.should.be.eql(200)
        response.body.id.should.be.eql(id)
        response.body.name.should.be.eql('testing2')
      })

      it('update API - name already used', async () => {
        const response = await chai.request(app)
          .put(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
          .send({ name: 'test4' })
        response.status.should.be.eql(409)
        response.body.message.should.be.eql(`${modelName} with name: test4 already exists`)
      })

      it('update API - forbidden', async () => {
        const response = await chai.request(app)
          .put(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
          .send({ name: 'testing2' })
        response.status.should.be.eql(403)
        response.body.message.should.be.eql('You are not allowed to perform this action!')
      })

      it('update API - not found', async () => {
        const response = await chai.request(app)
          .put(`${basePath}/${notFoundId}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: 'testing2' })
        response.status.should.be.eql(404)
        response.body.message.should.be.eql(`${modelName} with id: ${notFoundId} doesn't exist`)
      })

      it('update API - invalid id', async () => {
        const response = await chai.request(app)
          .put(`${basePath}/invalid`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: 'testing2' })
        response.status.should.be.eql(400)
        response.body.message.should.be.eql('"id" must be a valid GUID')
      })

      it('update API - null name', async () => {
        const response = await chai.request(app)
          .put(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: null })
        response.status.should.be.eql(400)
        response.body.message.should.be.eql('"name" must be a string')
      })

      it('update API - invalid name', async () => {
        const response = await chai.request(app)
          .put(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: { invalid: 123 } })
        response.status.should.be.eql(400)
        response.body.message.should.be.eql('"name" must be a string')
      })

      it('update API - empty name', async () => {
        const response = await chai.request(app)
          .put(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: '' })
        response.status.should.be.eql(400)
        response.body.message.should.be.eql('"name" is not allowed to be empty')
      })
    })

    describe('partially update API tests', () => {
      it('Call partially update API successfully 1', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
          .send({ name: 'testing3' })
        response.status.should.be.eql(200)
        response.body.id.should.be.eql(id)
        response.body.name.should.be.eql('testing3')
      })

      it('Call partially update API successfully 2', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
          .send({})
        response.status.should.be.eql(200)
        response.body.id.should.be.eql(id)
        response.body.name.should.be.eql('testing3')
      })

      it('partially update API - name already used', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
          .send({ name: 'test5' })
        response.status.should.be.eql(409)
        response.body.message.should.be.eql(`${modelName} with name: test5 already exists`)
      })

      it('partially update API - forbidden', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
          .send({ name: 'testing2' })
        response.status.should.be.eql(403)
        response.body.message.should.be.eql('You are not allowed to perform this action!')
      })

      it('partially update API - not found', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/${notFoundId}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: 'testing2' })
        response.status.should.be.eql(404)
        response.body.message.should.be.eql(`${modelName} with id: ${notFoundId} doesn't exist`)
      })

      it('partially update API - invalid id', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/invalid`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: 'testing2' })
        response.status.should.be.eql(400)
        response.body.message.should.be.eql('"id" must be a valid GUID')
      })

      it('partially update API - null name', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: null })
        response.status.should.be.eql(400)
        response.body.message.should.be.eql('"name" must be a string')
      })

      it('partially update API - invalid name', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: { invalid: 123 } })
        response.status.should.be.eql(400)
        response.body.message.should.be.eql('"name" must be a string')
      })

      it('partially update API - empty name', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: '' })
        response.status.should.be.eql(400)
        response.body.message.should.be.eql('"name" is not allowed to be empty')
      })
    })

    describe('remove API tests', () => {
      it('remove API - forbidden', async () => {
        const response = await chai.request(app)
          .delete(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.USER_TOKEN}`)
        response.status.should.be.eql(403)
        response.body.message.should.be.eql('You are not allowed to perform this action!')
      })

      it('Call remove API successfully', async () => {
        const response = await chai.request(app)
          .delete(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        response.status.should.be.eql(204)
        _.isEmpty(response.body).should.be.eql(true)
      })

      it('remove API - not found', async () => {
        const response = await chai.request(app)
          .delete(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        response.status.should.be.eql(404)
        response.body.message.should.be.eql(`${modelName} with id: ${id} doesn't exist`)
      })

      it('remove API - invalid id', async () => {
        const response = await chai.request(app)
          .delete(`${basePath}/invalid`)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        response.status.should.be.eql(400)
        response.body.message.should.be.eql('"id" must be a valid GUID')
      })
    })
  })
}

module.exports = {
  generateLookupE2ETests
}
