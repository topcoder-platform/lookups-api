/**
 * This file defines helper methods used for unit tests
 */
const _ = require('lodash')
const chai = require('chai')
const config = require('config')
const sinon = require('sinon')
const helper = require('../../src/common/helper')
const testHelper = require('../testHelper')

const should = chai.should()
chai.use(require('chai-as-promised'))

/**
 * Generate unit tests for lookup service.
 * @param {Object} service the service to test
 * @param {String} modelName the model name
 */
function generateLookupUnitTests (service, modelName, fields, searchByFields, indexedFields) {
  describe(`Unit tests for ${modelName} service`, () => {
    // created entity id
    let id
    const notFoundId = '4ef609c7-d81c-4684-80a1-06b7d74d0eab'
    const validationTestsEntity = {}
    let postEventBusStub
    let esClient

    before(async () => {
      for (let field of fields) {
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

    describe('list tests', () => {
      it('Call list from ES successfully 1', async () => {
        const result = await service.list({})
        should.equal(result.total, 5)
        should.equal(result.page, 1)
        should.equal(result.perPage, 20)
        should.equal(result.result.length, 5)
        for (let i = 1; i <= 5; i += 1) {
          let value, found
          for (let field of fields) {
            value = `a test${i} b`
            found = _.find(result.result, (item) => item[field] === value)
            should.exist(found)
          }
        }
      })

      it('Call list from ES successfully 2', async () => {
        const result = await service.list({ page: 2, perPage: 2 })
        should.equal(result.total, 5)
        should.equal(result.page, 2)
        should.equal(result.perPage, 2)
        should.equal(result.result.length, 2)
      })

      for (let fieldParam of searchByFields) {
        it(`Call list from ES successfully 3 - by ${fieldParam}`, async () => {
          const result = await service.list({ [fieldParam]: 'TEst3' })
          should.equal(result.total, 1)
          should.equal(result.page, 1)
          should.equal(result.perPage, 20)
          should.equal(result.result.length, 1)
          for (let field of fields) {
            should.equal(result.result[0][field], 'a test3 b')
          }
        })

        it(`Call list from ES successfully 4 - by ${fieldParam}`, async () => {
          const result = await service.list({ [fieldParam]: 'a b' })
          should.equal(result.result.length, 0)
        })

        it(`list - invalid ${fieldParam}`, async () => {
          try {
            await service.list({ [fieldParam]: ['invalid'] })
          } catch (e) {
            should.equal(e.message.indexOf(`"${fieldParam}" must be a string`) >= 0, true)
            return
          }
          throw new Error('should not reach here')
        })
      }

      describe('list from Database tests', () => {
        beforeEach(() => {
          sinon.stub(esClient, 'search').rejects(new Error('error'))
        })

        it('Call list from DB successfully 1', async () => {
          let result = await service.list({})
          should.equal(result.fromDB, true)
          should.equal(result.result.length, 5)
          for (let i = 1; i <= 5; i += 1) {
            let value, found
            for (let field of fields) {
              value = `a test${i} b`
              found = _.find(result.result, (item) => item[field] === value)
              should.exist(found)
            }
          }
        })

        it('Call list from DB successfully 2', async () => {
          let result = await service.list({ page: 2, perPage: 2 })
          should.equal(result.fromDB, true)
          should.equal(result.result.length, 5)
          for (let i = 3; i <= 4; i += 1) {
            let value, found
            for (let field of fields) {
              value = `a test${i} b`
              found = _.find(result.result, (item) => item[field] === value)
              should.exist(found)
            }
          }
        })

        for (let fieldParam of searchByFields) {
          it(`Call list from DB successfully 3 - by ${fieldParam}`, async () => {
            const result = await service.list({ [fieldParam]: 'test3' })
            should.equal(result.fromDB, true)
            should.equal(result.result.length, 1)
            for (let field of fields) {
              should.equal(result.result[0][field], 'a test3 b')
            }
          })

          it(`Call list from DB successfully 4 - by ${fieldParam}`, async () => {
            let result = await service.list({ [fieldParam]: 'a b' })
            should.equal(result.fromDB, true)
            should.equal(result.result.length, 0)
          })

          it(`list - invalid ${fieldParam}`, async () => {
            try {
              await service.list({ [fieldParam]: ['invalid'] })
            } catch (e) {
              should.equal(e.message.indexOf(`"${fieldParam}" must be a string`) >= 0, true)
              return
            }
            throw new Error('should not reach here')
          })
        }

        it(`Call list from DB successfully 4 - by all`, async () => {
          let entity = {}
          for (let fieldParam in searchByFields) {
            entity[searchByFields[fieldParam]] = validationTestsEntity[searchByFields[fieldParam]]
          }
          let result = await service.list(entity)
          should.equal(result.fromDB, true)
          should.equal(result.result.length, 0)
        })
      })

      it('list - invalid page', async () => {
        try {
          await service.list({ page: -1 })
        } catch (e) {
          should.equal(e.message.indexOf('"page" must be larger than or equal to 1') >= 0, true)
          return
        }
        throw new Error('should not reach here')
      })

      it('list - invalid perPage', async () => {
        try {
          await service.list({ perPage: -1 })
        } catch (e) {
          should.equal(e.message.indexOf('"perPage" must be larger than or equal to 1') >= 0, true)
          return
        }
        throw new Error('should not reach here')
      })

      it('list - unexpected field', async () => {
        try {
          await service.list({ other: 123 })
        } catch (e) {
          should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
          return
        }
        throw new Error('should not reach here')
      })
    })

    describe('create tests', () => {
      beforeEach(() => {
        postEventBusStub = sinon.stub(helper, 'postEvent').resolves([])
      })

      it('Call create successfully', async () => {
        const entity = {}
        for (let field of fields) {
          entity[field] = 'testing'
        }

        const result = await service.create(entity)
        for (let field of fields) {
          should.equal(result[field], 'testing')
        }
        should.equal(postEventBusStub.callCount, 1)
        id = result.id
      })

      it('create - element already exists', async () => {
        const entity = {}
        for (let field of fields) {
          entity[field] = 'testing'
        }

        await service.create(entity).should.be.rejectedWith(
          `already exists`)
        should.equal(postEventBusStub.callCount, 0)
      })

      it('create - missing required attribute', async () => {
        try {
          await service.create({})
        } catch (e) {
          should.equal(e.message.indexOf(' is required') >= 0, true)
          should.equal(postEventBusStub.callCount, 0)
          return
        }
        throw new Error('should not reach here')
      })

      for (let fieldParam of fields) {
        it(`create - invalid ${fieldParam}`, async () => {
          const entity = _.cloneDeep(validationTestsEntity)
          entity[fieldParam] = ['xx']

          try {
            await service.create(entity)
          } catch (e) {
            should.equal(e.message.indexOf(`"${fieldParam}" must be a string`) >= 0, true)
            should.equal(postEventBusStub.callCount, 0)
            return
          }
          throw new Error('should not reach here')
        })
      }

      it('create - unexpected field', async () => {
        const entity = _.cloneDeep(validationTestsEntity)
        entity['other'] = 123

        try {
          await service.create(entity)
        } catch (e) {
          should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
          should.equal(postEventBusStub.callCount, 0)
          return
        }
        throw new Error('should not reach here')
      })

      it('create - validateDuplicate - Bad Request', async () => {
        let values = []
        values.push('testing')
        try {
          helper.validateDuplicate(modelName, fields)
        } catch (e) {
          should.equal(e.message.indexOf(`size of ${fields} and ${values} do not match.`) >= 0, true)
        }
      })
    })

    describe('getEntity tests', () => {
      it('Call getEntity successfully', async () => {
        const result = await service.getEntity(id)
        should.equal(result.id, id)
        for (let field of fields) {
          should.equal(result[field], 'testing')
        }
      })

      it('getEntity - not found', async () => {
        await service.getEntity(notFoundId).should.be.rejectedWith(
          `${modelName} with id: ${notFoundId} doesn't exist`)
      })

      it('getEntity - invalid id', async () => {
        try {
          await service.getEntity('invalid')
        } catch (e) {
          should.equal(e.message.indexOf('"id" must be a valid GUID') >= 0, true)
          return
        }
        throw new Error('should not reach here')
      })
    })

    describe('update tests', () => {
      beforeEach(() => {
        postEventBusStub = sinon.stub(helper, 'postEvent').resolves([])
      })

      it('Call update successfully', async () => {
        const entity = {}
        for (let field of fields) {
          entity[field] = 'testing2'
        }

        const result = await service.update(id, entity)
        should.equal(result.id, id)
        should.equal(postEventBusStub.callCount, 1)

        for (let field of fields) {
          should.equal(result[field], 'testing2')
        }
      })

      it(`update - already exists`, async () => {
        const entity = _.cloneDeep(validationTestsEntity)
        for (const field of indexedFields) {
          entity[field] = 'a test1 b'
        }

        await service.update(id, entity).should.be.rejectedWith(
          `already exists`)
        should.equal(postEventBusStub.callCount, 0)
      })

      it('update - not found', async () => {
        await service.update(notFoundId, _.cloneDeep(validationTestsEntity)).should.be.rejectedWith(
          `${modelName} with id: ${notFoundId} doesn't exist`)
        should.equal(postEventBusStub.callCount, 0)
      })

      it('update - invalid id', async () => {
        try {
          await service.update('invalid', { name: 'x' })
        } catch (e) {
          should.equal(e.message.indexOf('"id" must be a valid GUID') >= 0, true)
          should.equal(postEventBusStub.callCount, 0)
          return
        }
        throw new Error('should not reach here')
      })

      for (let fieldParam of fields) {
        it(`update - invalid ${fieldParam}`, async () => {
          try {
            await service.update(id, _.set(_.cloneDeep(validationTestsEntity), fieldParam, { invalid: 'x' }))
          } catch (e) {
            should.equal(e.message.indexOf(`"${fieldParam}" must be a string`) >= 0, true)
            should.equal(postEventBusStub.callCount, 0)
            return
          }
          throw new Error('should not reach here')
        })
      }
    })

    describe('partiallyUpdate tests', () => {
      beforeEach(() => {
        postEventBusStub = sinon.stub(helper, 'postEvent').resolves([])
      })

      for (let fieldParam of fields) {
        it(`Call partiallyUpdate successfully ${fieldParam}`, async () => {
          const result = await service.partiallyUpdate(id, { [fieldParam]: 'testing3' })
          should.equal(result.id, id)
          should.equal(result[fieldParam], 'testing3')
          should.equal(postEventBusStub.callCount, 1)
        })

        it(`partiallyUpdate - invalid ${fieldParam}`, async () => {
          try {
            await service.partiallyUpdate(id, { [fieldParam]: { invalid: 'x' } })
          } catch (e) {
            should.equal(e.message.indexOf(`"${fieldParam}" must be a string`) >= 0, true)
            should.equal(postEventBusStub.callCount, 0)
            return
          }
          throw new Error('should not reach here')
        })
      }

      it('partiallyUpdate - name already used', async () => {
        const entity = _.cloneDeep(validationTestsEntity)
        for (const field of indexedFields) {
          entity[field] = 'a test2 b'
        }

        await service.partiallyUpdate(id, entity).should.be.rejectedWith(
          `already exists`)
        should.equal(postEventBusStub.callCount, 0)
      })

      it('partiallyUpdate - not found', async () => {
        await service.partiallyUpdate(notFoundId, _.cloneDeep(validationTestsEntity)).should.be.rejectedWith(
          `${modelName} with id: ${notFoundId} doesn't exist`)
        should.equal(postEventBusStub.callCount, 0)
      })

      it('partiallyUpdate - invalid id', async () => {
        try {
          await service.partiallyUpdate('invalid', _.cloneDeep(validationTestsEntity))
        } catch (e) {
          should.equal(e.message.indexOf('"id" must be a valid GUID') >= 0, true)
          should.equal(postEventBusStub.callCount, 0)
          return
        }
        throw new Error('should not reach here')
      })

      it('partiallyUpdate - unexpected field', async () => {
        const entity = _.cloneDeep(validationTestsEntity)
        entity['other'] = 'xx'
        try {
          await service.partiallyUpdate(id, entity)
        } catch (e) {
          should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
          should.equal(postEventBusStub.callCount, 0)
          return
        }
        throw new Error('should not reach here')
      })
    })

    describe('remove tests', () => {
      beforeEach(() => {
        postEventBusStub = sinon.stub(helper, 'postEvent').resolves([])
      })

      it('Call remove successfully', async () => {
        await service.remove(id)
        should.equal(postEventBusStub.callCount, 1)
      })

      it('remove - not found', async () => {
        await service.remove(id).should.be.rejectedWith(
          `${modelName} with id: ${id} doesn't exist`)
        should.equal(postEventBusStub.callCount, 0)
      })

      it('remove - invalid id', async () => {
        try {
          await service.remove('invalid')
        } catch (e) {
          should.equal(e.message.indexOf('"id" must be a valid GUID') >= 0, true)
          should.equal(postEventBusStub.callCount, 0)
          return
        }
        throw new Error('should not reach here')
      })
    })

    if (modelName === config.AMAZON.DYNAMODB_DEVICE_TABLE) {
      describe('get device types tests', () => {
        it('Call get device types from ES successfully', async () => {
          const result = await service.getTypes()
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
            const result = await service.getTypes()
            should.equal(result.length, 5)
            for (let i = 1; i <= 5; i += 1) {
              should.equal(_.includes(result, `a test${i} b`), true)
            }
          })
        })
      })

      describe('get device manufacturers tests', () => {
        it('Call get device manufacturers from ES successfully 1', async () => {
          const result = await service.getManufacturers({ type: 'a' })
          should.equal(result.length, 5)
          for (let i = 1; i <= 5; i += 1) {
            should.equal(_.includes(result, `a test${i} b`), true)
          }
        })

        it('Call get device manufacturers from ES successfully 2', async () => {
          const result = await service.getManufacturers({ type: 'A test3' })
          should.equal(result.length, 1)
          should.equal(result[0], 'a test3 b')
        })

        it('Call get device manufacturers from ES successfully 3', async () => {
          const result = await service.getManufacturers({ type: 'xyz' })
          should.equal(result.length, 0)
        })

        describe('get device manufacturers from Database tests', () => {
          beforeEach(() => {
            sinon.stub(esClient, 'search').rejects(new Error('error'))
          })

          it('Call get device manufacturers from DB successfully 1', async () => {
            const result = await service.getManufacturers({ type: 'b' })
            should.equal(result.length, 5)
            for (let i = 1; i <= 5; i += 1) {
              should.equal(_.includes(result, `a test${i} b`), true)
            }
          })

          it('Call get device manufacturers from DB successfully 2', async () => {
            const result = await service.getManufacturers({ type: 'test3' })
            should.equal(result.length, 1)
            should.equal(result[0], 'a test3 b')
          })

          it('Call get device manufacturers from DB successfully 3', async () => {
            const result = await service.getManufacturers({ type: 'abc' })
            should.equal(result.length, 0)
          })
        })

        it('get device manufacturers - missing type', async () => {
          try {
            await service.getManufacturers({})
          } catch (e) {
            should.equal(e.message.indexOf('"type" is required') >= 0, true)
            return
          }
          throw new Error('should not reach here')
        })

        it('get device manufacturers - empty type', async () => {
          try {
            await service.getManufacturers({ type: '' })
          } catch (e) {
            should.equal(e.message.indexOf('"type" is not allowed to be empty') >= 0, true)
            return
          }
          throw new Error('should not reach here')
        })

        it('get device manufacturers - invalid type', async () => {
          try {
            await service.getManufacturers({ type: [1, 2] })
          } catch (e) {
            should.equal(e.message.indexOf('"type" must be a string') >= 0, true)
            return
          }
          throw new Error('should not reach here')
        })

        it('get device manufacturers - unexpected field', async () => {
          try {
            await service.getManufacturers({ type: 'a', other: 123 })
          } catch (e) {
            should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
            return
          }
          throw new Error('should not reach here')
        })
      })
    }
  })
}

module.exports = {
  generateLookupUnitTests
}
