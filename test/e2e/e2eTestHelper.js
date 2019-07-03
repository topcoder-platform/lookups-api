/**
 * This file defines helper methods used for E2E tests
 */
const _ = require('lodash')
const chai = require('chai')
const chaiHttp = require('chai-http')
const config = require('config')
const testHelper = require('../testHelper')
const app = require('../../app')

const should = chai.should()
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
      await testHelper.recreateESIndices()
      await testHelper.clearDBData()
      await testHelper.insertTestData()
    })

    after(async () => {
      await testHelper.recreateESIndices()
      await testHelper.clearDBData()
    })

    describe('list API tests', () => {
      it('Call list API successfully 1', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
        should.equal(response.status, 200)
        should.equal(response.headers['x-page'], '1')
        should.equal(response.headers['x-per-page'], '20')
        should.equal(response.headers['x-total'], '5')
        should.equal(response.headers['x-total-pages'], '1')
        should.exist(response.headers['link'])

        should.equal(response.body.length, 5)
        for (let i = 1; i <= 5; i += 1) {
          const name = `a test${i} b`
          const found = _.find(response.body, (item) => item.name === name)
          should.exist(found)
        }
      })

      it('Call list API successfully 2', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
          .query({ page: 2, perPage: 2 })
        should.equal(response.status, 200)
        should.equal(response.headers['x-page'], '2')
        should.equal(response.headers['x-per-page'], '2')
        should.equal(response.headers['x-total'], '5')
        should.equal(response.headers['x-total-pages'], '3')
        should.exist(response.headers['link'])
        should.equal(response.headers['x-prev-page'], '1')
        should.equal(response.headers['x-next-page'], '3')

        should.equal(response.body.length, 2)
        for (let i = 3; i <= 4; i += 1) {
          const name = `a test${i} b`
          const found = _.find(response.body, (item) => item.name === name)
          should.exist(found)
        }
      })

      it('Call list API successfully 3', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', `Bearer ${config.USER_TOKEN}`)
          .query({ name: 'TEst3' })
        should.equal(response.status, 200)
        should.equal(response.headers['x-page'], '1')
        should.equal(response.headers['x-per-page'], '20')
        should.equal(response.headers['x-total'], '1')
        should.equal(response.headers['x-total-pages'], '1')
        should.exist(response.headers['link'])
        should.equal(response.body.length, 1)
        should.equal(response.body[0].name, 'a test3 b')
      })

      it('Call list API successfully 4', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', `Bearer ${config.USER_TOKEN}`)
          .query({ name: 'a b' })
        should.equal(response.status, 200)
        should.equal(response.headers['x-page'], '1')
        should.equal(response.headers['x-per-page'], '20')
        should.equal(response.headers['x-total'], '0')
        should.equal(response.headers['x-total-pages'], '0')
        should.equal(response.body.length, 0)
      })

      it('list API - invalid page', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .query({ page: -1 })
        should.equal(response.status, 400)
        should.equal(response.body.message, '"page" must be larger than or equal to 1')
      })

      it('list API - missing token', async () => {
        const response = await chai.request(app)
          .get(basePath)
        should.equal(response.status, 401)
        should.equal(response.body.message, 'No token provided.')
      })

      it('list API - invalid bearer format', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', 'invalid format')
        should.equal(response.status, 401)
        should.equal(response.body.message, 'No token provided.')
      })

      it('list API - invalid token', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', `Bearer ${config.INVALID_TOKEN}`)
        should.equal(response.status, 401)
        should.equal(response.body.message, 'Failed to authenticate token.')
      })

      it('list API - expired token', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', `Bearer ${config.EXPIRED_TOKEN}`)
        should.equal(response.status, 401)
        should.equal(response.body.message, 'Failed to authenticate token.')
      })

      it('list API - not allowed token', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        should.equal(response.status, 403)
        should.equal(response.body.message, 'You are not allowed to perform this action!')
      })

      it('list API - invalid perPage', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .query({ perPage: 'abc' })
        should.equal(response.status, 400)
        should.equal(response.body.message, '"perPage" must be a number')
      })

      it('list API - unexpected field', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .query({ other: 123 })
        should.equal(response.status, 400)
        should.equal(response.body.message, '"other" is not allowed')
      })
    })

    describe('list head API tests', () => {
      it('Call list head API successfully 1', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
        should.equal(response.status, 200)
        should.equal(response.headers['x-page'], '1')
        should.equal(response.headers['x-per-page'], '20')
        should.equal(response.headers['x-total'], '5')
        should.equal(response.headers['x-total-pages'], '1')
        should.exist(response.headers['link'])
        should.equal(_.isEmpty(response.body), true)
      })

      it('Call list head API successfully 2', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
          .query({ page: 2, perPage: 2 })
        should.equal(response.status, 200)
        should.equal(response.headers['x-page'], '2')
        should.equal(response.headers['x-per-page'], '2')
        should.equal(response.headers['x-total'], '5')
        should.equal(response.headers['x-total-pages'], '3')
        should.exist(response.headers['link'])
        should.equal(response.headers['x-prev-page'], '1')
        should.equal(response.headers['x-next-page'], '3')
        should.equal(_.isEmpty(response.body), true)
      })

      it('Call list head API successfully 3', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .set('Authorization', `Bearer ${config.USER_TOKEN}`)
          .query({ name: 'TEst3' })
        should.equal(response.status, 200)
        should.equal(response.headers['x-page'], '1')
        should.equal(response.headers['x-per-page'], '20')
        should.equal(response.headers['x-total'], '1')
        should.equal(response.headers['x-total-pages'], '1')
        should.exist(response.headers['link'])
        should.equal(_.isEmpty(response.body), true)
      })

      it('Call list head API successfully 4', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .set('Authorization', `Bearer ${config.USER_TOKEN}`)
          .query({ name: 'a b' })
        should.equal(response.status, 200)
        should.equal(response.headers['x-page'], '1')
        should.equal(response.headers['x-per-page'], '20')
        should.equal(response.headers['x-total'], '0')
        should.equal(response.headers['x-total-pages'], '0')
        should.equal(_.isEmpty(response.body), true)
      })

      it('list head API - invalid page', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .query({ page: -1 })
        should.equal(response.status, 400)
        should.equal(_.isEmpty(response.body), true)
      })

      it('list head API - missing token', async () => {
        const response = await chai.request(app)
          .head(basePath)
        should.equal(response.status, 401)
        should.equal(_.isEmpty(response.body), true)
      })

      it('list head API - invalid token', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .set('Authorization', `Bearer ${config.INVALID_TOKEN}`)
        should.equal(response.status, 401)
        should.equal(_.isEmpty(response.body), true)
      })

      it('list head API - expired token', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .set('Authorization', `Bearer ${config.EXPIRED_TOKEN}`)
        should.equal(response.status, 401)
        should.equal(_.isEmpty(response.body), true)
      })

      it('list head API - not allowed token', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        should.equal(response.status, 403)
        should.equal(_.isEmpty(response.body), true)
      })

      it('list head API - invalid perPage', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .query({ perPage: 'abc' })
        should.equal(response.status, 400)
        should.equal(_.isEmpty(response.body), true)
      })

      it('list head API - unexpected field', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .query({ other: 123 })
        should.equal(response.status, 400)
        should.equal(_.isEmpty(response.body), true)
      })
    })

    describe('create API tests', () => {
      it('Call create API successfully', async () => {
        const response = await chai.request(app)
          .post(basePath)
          .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
          .send({ name: 'testing' })
        should.equal(response.status, 201)
        should.equal(response.body.name, 'testing')
        id = response.body.id
      })

      it('create API - name already used', async () => {
        const response = await chai.request(app)
          .post(basePath)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
          .send({ name: 'testing' })
        should.equal(response.status, 409)
        should.equal(response.body.message, `${modelName} with name: testing already exists`)
      })

      it('create API - forbidden', async () => {
        const response = await chai.request(app)
          .post(basePath)
          .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
          .send({ name: 'abcdef' })
        should.equal(response.status, 403)
        should.equal(response.body.message, 'You are not allowed to perform this action!')
      })

      it('create API - missing name', async () => {
        const response = await chai.request(app)
          .post(basePath)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
          .send({})
        should.equal(response.status, 400)
        should.equal(response.body.message, '"name" is required')
      })

      it('create API - invalid name', async () => {
        const response = await chai.request(app)
          .post(basePath)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
          .send({ name: ['xx'] })
        should.equal(response.status, 400)
        should.equal(response.body.message, '"name" must be a string')
      })

      it('create API - unexpected field', async () => {
        const response = await chai.request(app)
          .post(basePath)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
          .send({ name: 'abc', other: 'def' })
        should.equal(response.status, 400)
        should.equal(response.body.message, '"other" is not allowed')
      })
    })

    describe('get entity API tests', () => {
      it('Call get entity API successfully', async () => {
        const response = await chai.request(app)
          .get(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.USER_TOKEN}`)
        should.equal(response.status, 200)
        should.equal(response.body.id, id)
        should.equal(response.body.name, 'testing')
      })

      it('get entity API - forbidden', async () => {
        const response = await chai.request(app)
          .get(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        should.equal(response.status, 403)
        should.equal(response.body.message, 'You are not allowed to perform this action!')
      })

      it('get entity API - not found', async () => {
        const response = await chai.request(app)
          .get(`${basePath}/${notFoundId}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        should.equal(response.status, 404)
        should.equal(response.body.message, `${modelName} with id: ${notFoundId} doesn't exist`)
      })

      it('get entity API - invalid id', async () => {
        const response = await chai.request(app)
          .get(`${basePath}/invalid`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        should.equal(response.status, 400)
        should.equal(response.body.message, '"id" must be a valid GUID')
      })
    })

    describe('get entity head API tests', () => {
      it('Call get entity head API successfully', async () => {
        const response = await chai.request(app)
          .head(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        should.equal(response.status, 200)
        should.equal(_.isEmpty(response.body), true)
      })

      it('get entity head API - forbidden', async () => {
        const response = await chai.request(app)
          .head(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        should.equal(response.status, 403)
        should.equal(_.isEmpty(response.body), true)
      })

      it('get entity head API - not found', async () => {
        const response = await chai.request(app)
          .head(`${basePath}/${notFoundId}`)
          .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        should.equal(response.status, 404)
        should.equal(_.isEmpty(response.body), true)
      })

      it('get entity head API - invalid id', async () => {
        const response = await chai.request(app)
          .head(`${basePath}/invalid`)
          .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        should.equal(response.status, 400)
        should.equal(_.isEmpty(response.body), true)
      })
    })

    describe('update API tests', () => {
      it('Call update API successfully', async () => {
        const response = await chai.request(app)
          .put(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: 'testing2' })
        should.equal(response.status, 200)
        should.equal(response.body.id, id)
        should.equal(response.body.name, 'testing2')
      })

      it('update API - name already used', async () => {
        const response = await chai.request(app)
          .put(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
          .send({ name: 'a test4 b' })
        should.equal(response.status, 409)
        should.equal(response.body.message, `${modelName} with name: a test4 b already exists`)
      })

      it('update API - forbidden', async () => {
        const response = await chai.request(app)
          .put(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
          .send({ name: 'testing2' })
        should.equal(response.status, 403)
        should.equal(response.body.message, 'You are not allowed to perform this action!')
      })

      it('update API - not found', async () => {
        const response = await chai.request(app)
          .put(`${basePath}/${notFoundId}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: 'testing2' })
        should.equal(response.status, 404)
        should.equal(response.body.message, `${modelName} with id: ${notFoundId} doesn't exist`)
      })

      it('update API - invalid id', async () => {
        const response = await chai.request(app)
          .put(`${basePath}/invalid`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: 'testing2' })
        should.equal(response.status, 400)
        should.equal(response.body.message, '"id" must be a valid GUID')
      })

      it('update API - null name', async () => {
        const response = await chai.request(app)
          .put(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: null })
        should.equal(response.status, 400)
        should.equal(response.body.message, '"name" must be a string')
      })

      it('update API - invalid name', async () => {
        const response = await chai.request(app)
          .put(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: { invalid: 123 } })
        should.equal(response.status, 400)
        should.equal(response.body.message, '"name" must be a string')
      })

      it('update API - empty name', async () => {
        const response = await chai.request(app)
          .put(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: '' })
        should.equal(response.status, 400)
        should.equal(response.body.message, '"name" is not allowed to be empty')
      })
    })

    describe('partially update API tests', () => {
      it('Call partially update API successfully 1', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
          .send({ name: 'testing3' })
        should.equal(response.status, 200)
        should.equal(response.body.id, id)
        should.equal(response.body.name, 'testing3')
      })

      it('Call partially update API successfully 2', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
          .send({})
        should.equal(response.status, 200)
        should.equal(response.body.id, id)
        should.equal(response.body.name, 'testing3')
      })

      it('partially update API - name already used', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
          .send({ name: 'a test5 b' })
        should.equal(response.status, 409)
        should.equal(response.body.message, `${modelName} with name: a test5 b already exists`)
      })

      it('partially update API - forbidden', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
          .send({ name: 'testing2' })
        should.equal(response.status, 403)
        should.equal(response.body.message, 'You are not allowed to perform this action!')
      })

      it('partially update API - not found', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/${notFoundId}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: 'testing2' })
        should.equal(response.status, 404)
        should.equal(response.body.message, `${modelName} with id: ${notFoundId} doesn't exist`)
      })

      it('partially update API - invalid id', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/invalid`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: 'testing2' })
        should.equal(response.status, 400)
        should.equal(response.body.message, '"id" must be a valid GUID')
      })

      it('partially update API - null name', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: null })
        should.equal(response.status, 400)
        should.equal(response.body.message, '"name" must be a string')
      })

      it('partially update API - invalid name', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: { invalid: 123 } })
        should.equal(response.status, 400)
        should.equal(response.body.message, '"name" must be a string')
      })

      it('partially update API - empty name', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send({ name: '' })
        should.equal(response.status, 400)
        should.equal(response.body.message, '"name" is not allowed to be empty')
      })
    })

    describe('remove API tests', () => {
      it('remove API - forbidden', async () => {
        const response = await chai.request(app)
          .delete(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.USER_TOKEN}`)
        should.equal(response.status, 403)
        should.equal(response.body.message, 'You are not allowed to perform this action!')
      })

      it('Call remove API successfully', async () => {
        const response = await chai.request(app)
          .delete(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        should.equal(response.status, 204)
        should.equal(_.isEmpty(response.body), true)
      })

      it('remove API - not found', async () => {
        const response = await chai.request(app)
          .delete(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        should.equal(response.status, 404)
        should.equal(response.body.message, `${modelName} with id: ${id} doesn't exist`)
      })

      it('remove API - invalid id', async () => {
        const response = await chai.request(app)
          .delete(`${basePath}/invalid`)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        should.equal(response.status, 400)
        should.equal(response.body.message, '"id" must be a valid GUID')
      })
    })
  })
}

module.exports = {
  generateLookupE2ETests
}
