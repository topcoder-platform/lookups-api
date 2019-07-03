/**
 * This file defines helper methods used for unit tests
 */
const _ = require('lodash')
const chai = require('chai')
const testHelper = require('../testHelper')

const should = chai.should()
chai.use(require('chai-as-promised'))

/**
 * Generate unit tests for lookup service.
 * @param {Object} service the service to test
 * @param {String} modelName the model name
 */
function generateLookupUnitTests (service, modelName) {
  describe(`Unit tests for ${modelName} service`, () => {
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

    describe('list tests', () => {
      it('Call list successfully 1', async () => {
        const result = await service.list({})
        should.equal(result.total, 5)
        should.equal(result.page, 1)
        should.equal(result.perPage, 20)
        should.equal(result.result.length, 5)
        for (let i = 1; i <= 5; i += 1) {
          const name = `a test${i} b`
          const found = _.find(result.result, (item) => item.name === name)
          should.exist(found)
        }
      })

      it('Call list successfully 2', async () => {
        const result = await service.list({ page: 2, perPage: 2 })
        should.equal(result.total, 5)
        should.equal(result.page, 2)
        should.equal(result.perPage, 2)
        should.equal(result.result.length, 2)
        for (let i = 3; i <= 4; i += 1) {
          const name = `a test${i} b`
          const found = _.find(result.result, (item) => item.name === name)
          should.exist(found)
        }
      })

      it('Call list successfully 3', async () => {
        const result = await service.list({ name: 'TEst3' })
        should.equal(result.total, 1)
        should.equal(result.page, 1)
        should.equal(result.perPage, 20)
        should.equal(result.result.length, 1)
        should.equal(result.result[0].name, 'a test3 b')
      })

      it('Call list successfully 4', async () => {
        const result = await service.list({ name: 'a b' })
        should.equal(result.total, 0)
        should.equal(result.page, 1)
        should.equal(result.perPage, 20)
        should.equal(result.result.length, 0)
      })

      it('list - invalid name', async () => {
        try {
          await service.list({ name: ['invalid'] })
        } catch (e) {
          should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
          return
        }
        throw new Error('should not reach here')
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
      it('Call create successfully', async () => {
        const result = await service.create({ name: 'testing' })
        should.equal(result.name, 'testing')
        id = result.id
      })

      it('create - name already used', async () => {
        await service.create({ name: 'testing' }).should.be.rejectedWith(
          `${modelName} with name: testing already exists`)
      })

      it('create - missing name', async () => {
        try {
          await service.create({})
        } catch (e) {
          should.equal(e.message.indexOf('"name" is required') >= 0, true)
          return
        }
        throw new Error('should not reach here')
      })

      it('create - invalid name', async () => {
        try {
          await service.create({ name: ['xx'] })
        } catch (e) {
          should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
          return
        }
        throw new Error('should not reach here')
      })

      it('create - unexpected field', async () => {
        try {
          await service.create({ name: 'some name', other: 123 })
        } catch (e) {
          should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
          return
        }
        throw new Error('should not reach here')
      })
    })

    describe('getEntity tests', () => {
      it('Call getEntity successfully', async () => {
        const result = await service.getEntity(id)
        should.equal(result.id, id)
        should.equal(result.name, 'testing')
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
      it('Call update successfully', async () => {
        const result = await service.update(id, { name: 'testing2' })
        should.equal(result.id, id)
        should.equal(result.name, 'testing2')
      })

      it('update - name already used', async () => {
        await service.update(id, { name: 'a test1 b' }).should.be.rejectedWith(
          `${modelName} with name: a test1 b already exists`)
      })

      it('update - not found', async () => {
        await service.update(notFoundId, { name: 'x' }).should.be.rejectedWith(
          `${modelName} with id: ${notFoundId} doesn't exist`)
      })

      it('update - invalid id', async () => {
        try {
          await service.update('invalid', { name: 'x' })
        } catch (e) {
          should.equal(e.message.indexOf('"id" must be a valid GUID') >= 0, true)
          return
        }
        throw new Error('should not reach here')
      })

      it('update - null name', async () => {
        try {
          await service.update(id, { name: null })
        } catch (e) {
          should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
          return
        }
        throw new Error('should not reach here')
      })

      it('update - invalid name', async () => {
        try {
          await service.update(id, { name: { invalid: 'x' } })
        } catch (e) {
          should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
          return
        }
        throw new Error('should not reach here')
      })

      it('update - empty name', async () => {
        try {
          await service.update(id, { name: '' })
        } catch (e) {
          should.equal(e.message.indexOf('"name" is not allowed to be empty') >= 0, true)
          return
        }
        throw new Error('should not reach here')
      })
    })

    describe('partiallyUpdate tests', () => {
      it('Call partiallyUpdate successfully 1', async () => {
        const result = await service.partiallyUpdate(id, { name: 'testing3' })
        should.equal(result.id, id)
        should.equal(result.name, 'testing3')
      })

      it('Call partiallyUpdate successfully 2', async () => {
        const result = await service.partiallyUpdate(id, {})
        should.equal(result.id, id)
        should.equal(result.name, 'testing3')
      })

      it('partiallyUpdate - name already used', async () => {
        await service.partiallyUpdate(id, { name: 'a test2 b' }).should.be.rejectedWith(
          `${modelName} with name: a test2 b already exists`)
      })

      it('partiallyUpdate - not found', async () => {
        await service.partiallyUpdate(notFoundId, { name: 'x' }).should.be.rejectedWith(
          `${modelName} with id: ${notFoundId} doesn't exist`)
      })

      it('partiallyUpdate - invalid id', async () => {
        try {
          await service.partiallyUpdate('invalid', { name: 'x' })
        } catch (e) {
          should.equal(e.message.indexOf('"id" must be a valid GUID') >= 0, true)
          return
        }
        throw new Error('should not reach here')
      })

      it('partiallyUpdate - null name', async () => {
        try {
          await service.partiallyUpdate(id, { name: null })
        } catch (e) {
          should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
          return
        }
        throw new Error('should not reach here')
      })

      it('partiallyUpdate - invalid name', async () => {
        try {
          await service.partiallyUpdate(id, { name: { invalid: 'x' } })
        } catch (e) {
          should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
          return
        }
        throw new Error('should not reach here')
      })

      it('partiallyUpdate - empty name', async () => {
        try {
          await service.partiallyUpdate(id, { name: '' })
        } catch (e) {
          should.equal(e.message.indexOf('"name" is not allowed to be empty') >= 0, true)
          return
        }
        throw new Error('should not reach here')
      })

      it('partiallyUpdate - unexpected field', async () => {
        try {
          await service.partiallyUpdate(id, { name: 'xx', other: 'xx' })
        } catch (e) {
          should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
          return
        }
        throw new Error('should not reach here')
      })
    })

    describe('remove tests', () => {
      it('Call remove successfully', async () => {
        await service.remove(id)
      })

      it('remove - not found', async () => {
        await service.remove(id).should.be.rejectedWith(
          `${modelName} with id: ${id} doesn't exist`)
      })

      it('remove - invalid id', async () => {
        try {
          await service.remove('invalid')
        } catch (e) {
          should.equal(e.message.indexOf('"id" must be a valid GUID') >= 0, true)
          return
        }
        throw new Error('should not reach here')
      })
    })
  })
}

module.exports = {
  generateLookupUnitTests
}
