/**
 * This file defines helper methods used for E2E tests
 */
const _ = require('lodash')
const chai = require('chai')
const chaiHttp = require('chai-http')
const config = require('config')
const helper = require('../../src/common/helper')
const sinon = require('sinon')
const testHelper = require('../testHelper')
const app = require('../../app')

const should = chai.should()
const expect = chai.expect
chai.use(chaiHttp)
chai.use(require('chai-as-promised'))

/**
 * Generate E2E tests for lookup APIs.
 * @param {String} basePath the API base path
 * @param {String} modelName the model name
 */
function generateLookupE2ETests (basePath, modelName, fields, searchByFields, indexedFields) {
  describe(`E2E tests for ${modelName} APIs`, () => {
    // created entity id
    let id
    const notFoundId = '4ef609c7-d81c-4684-80a1-06b7d74d0eab'
    const validationTestsEntity = {}
    let postEventBusStub
    let esClient

    before(async () => {
      for (const field of fields) {
        validationTestsEntity[field] = 'ValidationTest'
      }
      await testHelper.clearDBData(modelName)

      if (modelName === config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE) {
        await testHelper.recreateESIndex(config.ES.EDUCATIONAL_INSTITUTION_INDEX,
          config.ES.EDUCATIONAL_INSTITUTION_TYPE, indexedFields)
        await testHelper.insertEducationalInstitutionsTestData()
      } else if (modelName === config.AMAZON.DYNAMODB_COUNTRY_TABLE) {
        await testHelper.recreateESIndex(config.ES.COUNTRY_INDEX, config.ES.COUNTRY_TYPE, indexedFields)
        await testHelper.insertCountryTestData()
      } else if (modelName === config.AMAZON.DYNAMODB_DEVICE_TABLE) {
        await testHelper.recreateESIndex(config.ES.DEVICE_INDEX, config.ES.DEVICE_TYPE, indexedFields)
        await testHelper.insertDeviceTestData()
      }

      esClient = await helper.getESClient()
    })

    after(async () => {
      if (modelName === config.AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE) {
        await testHelper.recreateESIndex(config.ES.EDUCATIONAL_INSTITUTION_INDEX,
          config.ES.EDUCATIONAL_INSTITUTION_TYPE, indexedFields)
      } else if (modelName === config.AMAZON.DYNAMODB_COUNTRY_TABLE) {
        await testHelper.recreateESIndex(config.ES.COUNTRY_INDEX, config.ES.COUNTRY_TYPE, indexedFields)
      } else if (modelName === config.AMAZON.DYNAMODB_DEVICE_TABLE) {
        await testHelper.recreateESIndex(config.ES.DEVICE_INDEX, config.ES.DEVICE_TYPE, indexedFields)
      }

      await testHelper.clearDBData(modelName)
    })

    afterEach(() => {
      sinon.restore()
    })

    describe('list API tests', () => {
      it('Call list API from ES successfully 1', async () => {
        const response = await chai.request(app)
          .get(basePath)
        should.equal(response.status, 200)
        should.equal(response.headers['x-page'], '1')
        should.equal(response.headers['x-per-page'], '20')
        should.equal(response.headers['x-total'], '5')
        should.equal(response.headers['x-total-pages'], '1')
        should.exist(response.headers.link)

        should.equal(response.body.length, 5)
        for (let i = 1; i <= 5; i += 1) {
          let value, found
          for (const field of fields) {
            value = `a test${i} b`
            found = _.find(response.body, (item) => item[field] === value)
            should.exist(found)
          }
        }
      })

      it('Call list API from ES successfully 2', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .query({ page: 2, perPage: 2 })
        should.equal(response.status, 200)
        should.equal(response.headers['x-page'], '2')
        should.equal(response.headers['x-per-page'], '2')
        should.equal(response.headers['x-total'], '5')
        should.equal(response.headers['x-total-pages'], '3')
        should.exist(response.headers.link)
        should.equal(response.headers['x-prev-page'], '1')
        should.equal(response.headers['x-next-page'], '3')
        should.equal(response.body.length, 2)
      })

      for (const fieldParam of searchByFields) {
        it(`Call list from ES successfully 3 - by ${fieldParam}`, async () => {
          const response = await chai.request(app)
            .get(basePath)
            .query({ [fieldParam]: 'TEst3' })
          should.equal(response.status, 200)
          should.equal(response.headers['x-page'], '1')
          should.equal(response.headers['x-per-page'], '20')
          should.equal(response.headers['x-total'], '1')
          should.equal(response.headers['x-total-pages'], '1')
          should.exist(response.headers.link)
          should.equal(response.body.length, 1)
          for (const field of fields) {
            should.equal(response.body[0][field], 'a test3 b')
          }
        })

        it(`Call list from ES successfully 4 - by ${fieldParam}`, async () => {
          const response = await chai.request(app)
            .get(basePath)
            .query({ [fieldParam]: 'a b' })
          should.equal(response.status, 200)
          should.equal(response.body.length, 0)
        })
      }

      it('Call list from ES successfully by all fields', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .query(validationTestsEntity)
        should.equal(response.status, 200)
        should.equal(response.body.length, 0)
      })

      describe('list from Database tests', () => {
        beforeEach(() => {
          sinon.stub(esClient, 'search').rejects(new Error('error'))
        })

        it('Call list API from DB successfully 1', async () => {
          const response = await chai.request(app)
            .get(basePath)
          should.equal(response.status, 200)
          should.equal(response.body.length, 5)
          for (let i = 1; i <= 5; i += 1) {
            let value, found
            for (const field of fields) {
              value = `a test${i} b`
              found = _.find(response.body, (item) => item[field] === value)
              should.exist(found)
            }
          }
        })

        it('Call list API from DB successfully 2', async () => {
          const response = await chai.request(app)
            .get(basePath)
            .query({ page: 2, perPage: 2 })
          should.equal(response.status, 200)

          should.equal(response.body.length, 5)
          for (let i = 3; i <= 4; i += 1) {
            let value, found
            for (const field of fields) {
              value = `a test${i} b`
              found = _.find(response.body, (item) => item[field] === value)
              should.exist(found)
            }
          }
        })

        for (const fieldParam of searchByFields) {
          it(`Call list from DB successfully 3 - by ${fieldParam}`, async () => {
            const response = await chai.request(app)
              .get(basePath)
              .query({ [fieldParam]: 'test3' })
            should.equal(response.status, 200)

            should.equal(response.body.length, 1)
            for (const field of fields) {
              should.equal(response.body[0][field], 'a test3 b')
            }
          })

          it(`Call list from DB successfully 4 - by ${fieldParam}`, async () => {
            const response = await chai.request(app)
              .get(basePath)
              .query({ [fieldParam]: 'a b' })
            should.equal(response.status, 200)
            should.equal(response.body.length, 0)
          })
        }

        it('Call list head API successfully', async () => {
          const response = await chai.request(app)
            .head(basePath).query({ [searchByFields[0]]: 'a b' })
          should.equal(response.status, 200)
        })
      })

      it('list API - invalid page', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .query({ page: -1 })
        should.equal(response.status, 400)
        should.equal(response.body.message, '"page" must be larger than or equal to 1')
      })

      it('list API - invalid perPage', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .query({ perPage: 'abc' })
        should.equal(response.status, 400)
        should.equal(response.body.message, '"perPage" must be a number')
      })

      it('list API - unexpected field', async () => {
        const response = await chai.request(app)
          .get(basePath)
          .query({ other: 123 })
        should.equal(response.status, 400)
        should.equal(response.body.message, '"other" is not allowed')
      })
    })

    describe('list head API tests', () => {
      it('Call list head API successfully 1', async () => {
        const response = await chai.request(app)
          .head(basePath)
        should.equal(response.status, 200)
        should.equal(response.headers['x-page'], '1')
        should.equal(response.headers['x-per-page'], '20')
        should.equal(response.headers['x-total'], '5')
        should.equal(response.headers['x-total-pages'], '1')
        should.exist(response.headers.link)
        should.equal(_.isEmpty(response.body), true)
      })

      it('Call list head API successfully 2', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .query({ page: 2, perPage: 2 })
        should.equal(response.status, 200)
        should.equal(response.headers['x-page'], '2')
        should.equal(response.headers['x-per-page'], '2')
        should.equal(response.headers['x-total'], '5')
        should.equal(response.headers['x-total-pages'], '3')
        should.exist(response.headers.link)
        should.equal(response.headers['x-prev-page'], '1')
        should.equal(response.headers['x-next-page'], '3')
        should.equal(_.isEmpty(response.body), true)
      })

      for (const fieldParam of searchByFields) {
        it('Call list head API successfully 3', async () => {
          const response = await chai.request(app)
            .head(basePath)
            .query({ [fieldParam]: 'TEst3' })
          should.equal(response.status, 200)
          should.equal(response.headers['x-page'], '1')
          should.equal(response.headers['x-per-page'], '20')
          should.equal(response.headers['x-total'], '1')
          should.equal(response.headers['x-total-pages'], '1')
          should.exist(response.headers.link)
          should.equal(_.isEmpty(response.body), true)
        })
      }

      for (const fieldParam of searchByFields) {
        it('Call list head API successfully 4', async () => {
          const response = await chai.request(app)
            .head(basePath)
            .query({ [fieldParam]: 'a b' })
          should.equal(response.status, 200)
          should.equal(_.isEmpty(response.body), true)
        })
      }
      it('list head API - invalid page', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .query({ page: -1 })
        should.equal(response.status, 400)
        should.equal(_.isEmpty(response.body), true)
      })

      it('list head API - invalid perPage', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .query({ perPage: 'abc' })
        should.equal(response.status, 400)
        should.equal(_.isEmpty(response.body), true)
      })

      it('list head API - unexpected field', async () => {
        const response = await chai.request(app)
          .head(basePath)
          .query({ other: 123 })
        should.equal(response.status, 400)
        should.equal(_.isEmpty(response.body), true)
      })
    })

    describe('create API tests', () => {
      beforeEach(() => {
        postEventBusStub = sinon.stub(helper, 'postEvent').resolves([])
      })

      it('Call create API successfully', async () => {
        const entity = {}
        for (const field of fields) {
          entity[field] = 'testing'
        }

        const response = await chai.request(app)
          .post(basePath)
          .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
          .send(entity)
        should.equal(response.status, 201)

        for (const field of fields) {
          should.equal(response.body[field], 'testing')
        }
        should.equal(postEventBusStub.callCount, 1)
        id = response.body.id
      })

      it('create API - already used', async () => {
        const entity = {}
        for (const field of fields) {
          entity[field] = 'testing'
        }

        const response = await chai.request(app)
          .post(basePath)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
          .send(entity)
        should.equal(response.status, 409)
        expect(response.body.message).to.have.string('already exists')
        should.equal(postEventBusStub.callCount, 0)
      })

      it('create API - forbidden', async () => {
        const response = await chai.request(app)
          .post(basePath)
          .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
          .send({ [searchByFields[0]]: 'abcdef' })
        should.equal(response.status, 403)
        should.equal(response.body.message, 'You are not allowed to perform this action!')
        should.equal(postEventBusStub.callCount, 0)
      })

      it('create API - missing required fields', async () => {
        const response = await chai.request(app)
          .post(basePath)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
          .send({})
        should.equal(response.status, 400)
        should.equal(response.body.message.indexOf('is required') >= 0, true)
        should.equal(postEventBusStub.callCount, 0)
      })

      for (const fieldParam of fields) {
        it(`create API - invalid ${fieldParam}`, async () => {
          const entity = _.cloneDeep(validationTestsEntity)
          entity[fieldParam] = ['xx']

          const response = await chai.request(app)
            .post(basePath)
            .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
            .send(entity)
          should.equal(response.status, 400)
          should.equal(response.body.message, `"${fieldParam}" must be a string`)
          should.equal(postEventBusStub.callCount, 0)
        })
      }

      it('create API - unexpected field', async () => {
        const entity = _.cloneDeep(validationTestsEntity)
        entity.other = 123

        const response = await chai.request(app)
          .post(basePath)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
          .send(entity)
        should.equal(response.status, 400)
        should.equal(response.body.message, '"other" is not allowed')
        should.equal(postEventBusStub.callCount, 0)
      })
    })

    describe('get entity API tests', () => {
      it('Call get entity API successfully', async () => {
        const response = await chai.request(app)
          .get(`${basePath}/${id}`)
        should.equal(response.status, 200)
        should.equal(response.body.id, id)
        for (const field of fields) {
          should.equal(response.body[field], 'testing')
        }
      })

      it('get entity API - not found', async () => {
        const response = await chai.request(app)
          .get(`${basePath}/${notFoundId}`)
        should.equal(response.status, 404)
        should.equal(response.body.message, `${modelName} with id: ${notFoundId} doesn't exist`)
      })

      it('get entity API - invalid id', async () => {
        const response = await chai.request(app)
          .get(`${basePath}/invalid`)
        should.equal(response.status, 400)
        should.equal(response.body.message, '"id" must be a valid GUID')
      })
    })

    describe('get entity head API tests', () => {
      it('Call get entity head API successfully', async () => {
        const response = await chai.request(app)
          .head(`${basePath}/${id}`)
        should.equal(response.status, 200)
        should.equal(_.isEmpty(response.body), true)
      })

      it('get entity head API - not found', async () => {
        const response = await chai.request(app)
          .head(`${basePath}/${notFoundId}`)
        should.equal(response.status, 404)
        should.equal(_.isEmpty(response.body), true)
      })

      it('get entity head API - invalid id', async () => {
        const response = await chai.request(app)
          .head(`${basePath}/invalid`)
        should.equal(response.status, 400)
        should.equal(_.isEmpty(response.body), true)
      })
    })

    describe('update API tests', () => {
      beforeEach(() => {
        postEventBusStub = sinon.stub(helper, 'postEvent').resolves([])
      })

      it('Call update API successfully', async () => {
        const entity = {}
        for (const field of fields) {
          entity[field] = 'testing2'
        }

        const response = await chai.request(app)
          .put(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send(entity)
        should.equal(response.status, 200)
        should.equal(response.body.id, id)
        should.equal(postEventBusStub.callCount, 1)

        for (const field of fields) {
          should.equal(response.body[field], 'testing2')
        }
      })

      it('update API - name already used', async () => {
        const entity = _.cloneDeep(validationTestsEntity)
        for (const field of indexedFields) {
          entity[field] = 'a test4 b'
        }

        const response = await chai.request(app)
          .put(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
          .send(entity)
        should.equal(response.status, 409)
        expect(response.body.message).to.have.string('already exists')
        should.equal(postEventBusStub.callCount, 0)
      })

      it('update API - forbidden', async () => {
        const response = await chai.request(app)
          .put(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
          .send(validationTestsEntity)
        should.equal(response.status, 403)
        should.equal(response.body.message, 'You are not allowed to perform this action!')
        should.equal(postEventBusStub.callCount, 0)
      })

      it('update API - not found', async () => {
        const response = await chai.request(app)
          .put(`${basePath}/${notFoundId}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send(validationTestsEntity)
        should.equal(response.status, 404)
        should.equal(response.body.message, `${modelName} with id: ${notFoundId} doesn't exist`)
        should.equal(postEventBusStub.callCount, 0)
      })

      it('update API - invalid id', async () => {
        const response = await chai.request(app)
          .put(`${basePath}/invalid`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send(validationTestsEntity)
        should.equal(response.status, 400)
        should.equal(response.body.message, '"id" must be a valid GUID')
        should.equal(postEventBusStub.callCount, 0)
      })

      for (const fieldParam of fields) {
        it(`update API - invalid ${fieldParam}`, async () => {
          const response = await chai.request(app)
            .put(`${basePath}/${id}`)
            .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
            .send(_.set(_.cloneDeep(validationTestsEntity), fieldParam, { invalid: 'x' }))
          should.equal(response.status, 400)
          should.equal(response.body.message, `"${fieldParam}" must be a string`)
          should.equal(postEventBusStub.callCount, 0)
        })
      }
    })

    describe('partially update API tests', () => {
      beforeEach(() => {
        postEventBusStub = sinon.stub(helper, 'postEvent').resolves([])
      })

      for (const fieldParam of fields) {
        it(`Call partially update ${fieldParam} API successfully`, async () => {
          const response = await chai.request(app)
            .patch(`${basePath}/${id}`)
            .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
            .send({ [fieldParam]: 'testing3' })
          should.equal(response.status, 200)
          should.equal(response.body.id, id)
          should.equal(response.body[fieldParam], 'testing3')
          should.equal(postEventBusStub.callCount, 1)
        })

        it(`partially update API - invalid ${fieldParam}`, async () => {
          const response = await chai.request(app)
            .patch(`${basePath}/${id}`)
            .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
            .send({ [fieldParam]: { invalid: 123 } })
          should.equal(response.status, 400)
          should.equal(response.body.message, `"${fieldParam}" must be a string`)
          should.equal(postEventBusStub.callCount, 0)
        })
      }

      it('partially update API - name already used', async () => {
        let entity = validationTestsEntity
        for (const field of fields) {
          entity = _.set(_.cloneDeep(entity), field, 'a test5 b')
        }

        const response = await chai.request(app)
          .patch(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
          .send(entity)
        should.equal(response.status, 409)
        expect(response.body.message).to.have.string('already exists')
        should.equal(postEventBusStub.callCount, 0)
      })

      it('partially update API - forbidden', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
          .send(_.cloneDeep(validationTestsEntity))
        should.equal(response.status, 403)
        should.equal(response.body.message, 'You are not allowed to perform this action!')
      })

      it('partially update API - not found', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/${notFoundId}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send(_.cloneDeep(validationTestsEntity))
        should.equal(response.status, 404)
        should.equal(response.body.message, `${modelName} with id: ${notFoundId} doesn't exist`)
      })

      it('partially update API - invalid id', async () => {
        const response = await chai.request(app)
          .patch(`${basePath}/invalid`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
          .send(_.cloneDeep(validationTestsEntity))
        should.equal(response.status, 400)
        should.equal(response.body.message, '"id" must be a valid GUID')
      })
    })

    describe('remove API tests', () => {
      beforeEach(() => {
        postEventBusStub = sinon.stub(helper, 'postEvent').resolves([])
      })

      it('remove API - forbidden', async () => {
        const response = await chai.request(app)
          .delete(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.USER_TOKEN}`)
        should.equal(response.status, 403)
        should.equal(response.body.message, 'You are not allowed to perform this action!')
        should.equal(postEventBusStub.callCount, 0)
      })

      it('Call remove API successfully', async () => {
        const response = await chai.request(app)
          .delete(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        should.equal(response.status, 204)
        should.equal(_.isEmpty(response.body), true)
        should.equal(postEventBusStub.callCount, 1)
      })

      it('remove API - not found', async () => {
        const response = await chai.request(app)
          .delete(`${basePath}/${id}`)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        should.equal(response.status, 404)
        should.equal(response.body.message, `${modelName} with id: ${id} doesn't exist`)
        should.equal(postEventBusStub.callCount, 0)
      })

      it('remove API - invalid id', async () => {
        const response = await chai.request(app)
          .delete(`${basePath}/invalid`)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        should.equal(response.status, 400)
        should.equal(response.body.message, '"id" must be a valid GUID')
        should.equal(postEventBusStub.callCount, 0)
      })

      it('remove API - Wrong url', async () => {
        const response = await chai.request(app)
          .delete(`${basePath}`)
          .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        should.equal(response.status, 404)
      })
    })

    if (modelName === config.AMAZON.DYNAMODB_DEVICE_TABLE) {
      describe('get device types tests', () => {
        it('Call get device types from ES successfully', async () => {
          const response = await chai.request(app)
            .get(`${basePath}/types`)
          should.equal(response.status, 200)
          const result = response.body
          should.equal(result.length, 5)
          for (let i = 1; i <= 5; i += 1) {
            should.equal(_.includes(result, `a test${i} b`), true)
          }
        })

        describe('get device types from Database tests', () => {
          beforeEach(() => {
            sinon.stub(esClient, 'search').rejects(new Error('error'))
          })

          it('Call get device types from DB successfully', async () => {
            const response = await chai.request(app)
              .get(`${basePath}/types`)
            should.equal(response.status, 200)
            const result = response.body
            should.equal(result.length, 5)
            for (let i = 1; i <= 5; i += 1) {
              should.equal(_.includes(result, `a test${i} b`), true)
            }
          })
        })
      })

      describe('get device manufacturers tests', () => {
        it('Call get device manufacturers from ES successfully 1', async () => {
          const response = await chai.request(app)
            .get(`${basePath}/manufacturers`)
            .query({ type: 'a' })
          should.equal(response.status, 200)
          const result = response.body
          should.equal(result.length, 5)
          for (let i = 1; i <= 5; i += 1) {
            should.equal(_.includes(result, `a test${i} b`), true)
          }
        })

        it('Call get device manufacturers from ES successfully 2', async () => {
          const response = await chai.request(app)
            .get(`${basePath}/manufacturers`)
            .query({ type: 'A test3' })
          should.equal(response.status, 200)
          const result = response.body
          should.equal(result.length, 1)
          should.equal(result[0], 'a test3 b')
        })

        it('Call get device manufacturers from ES successfully 3', async () => {
          const response = await chai.request(app)
            .get(`${basePath}/manufacturers`)
            .query({ type: 'xyz' })
          should.equal(response.status, 200)
          const result = response.body
          should.equal(result.length, 0)
        })

        describe('get device manufacturers from Database tests', () => {
          beforeEach(() => {
            sinon.stub(esClient, 'search').rejects(new Error('error'))
          })

          it('Call get device manufacturers from DB successfully 1', async () => {
            const response = await chai.request(app)
              .get(`${basePath}/manufacturers`)
              .query({ type: 'b' })
            should.equal(response.status, 200)
            const result = response.body
            should.equal(result.length, 5)
            for (let i = 1; i <= 5; i += 1) {
              should.equal(_.includes(result, `a test${i} b`), true)
            }
          })

          it('Call get device manufacturers from DB successfully 2', async () => {
            const response = await chai.request(app)
              .get(`${basePath}/manufacturers`)
              .query({ type: 'test3' })
            should.equal(response.status, 200)
            const result = response.body
            should.equal(result.length, 1)
            should.equal(result[0], 'a test3 b')
          })

          it('Call get device manufacturers from DB successfully 3', async () => {
            const response = await chai.request(app)
              .get(`${basePath}/manufacturers`)
              .query({ type: 'abc' })
            should.equal(response.status, 200)
            const result = response.body
            should.equal(result.length, 0)
          })
        })

        it('get device manufacturers - missing type', async () => {
          const response = await chai.request(app)
            .get(`${basePath}/manufacturers`)
          should.equal(response.status, 400)
          should.equal(response.body.message, '"type" is required')
        })

        it('get device manufacturers - empty type', async () => {
          const response = await chai.request(app)
            .get(`${basePath}/manufacturers`)
            .query({ type: '' })
          should.equal(response.status, 400)
          should.equal(response.body.message, '"type" is not allowed to be empty')
        })

        it('get device manufacturers - unexpected field', async () => {
          const response = await chai.request(app)
            .get(`${basePath}/manufacturers`)
            .query({ type: 'a', other: 'b' })
          should.equal(response.status, 400)
          should.equal(response.body.message, '"other" is not allowed')
        })
      })
    }
  })
}

module.exports = {
  generateLookupE2ETests
}
