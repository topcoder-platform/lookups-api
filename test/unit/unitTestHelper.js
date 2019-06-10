/**
 * This file defines helper methods used for unit tests
 */
const _ = require('lodash')
const chai = require('chai')
const testHelper = require('../testHelper')

chai.should()
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
      await testHelper.clearData()
      await testHelper.insertTestData()
    })

    after(async () => {
      await testHelper.clearData()
    })

    describe('list tests', () => {
      it('Call list successfully 1', async () => {
        const result = await service.list({})
        result.length.should.be.eql(5)
        for (let i = 1; i <= 5; i += 1) {
          const name = `test${i}`
          const found = !!_.find(result, (item) => item.name === name)
          found.should.be.eql(true)
        }
      })

      it('Call list successfully 2', async () => {
        const result = await service.list({ name: 'test3' })
        result.length.should.be.eql(1)
        result[0].name.should.be.eql('test3')
      })

      it('list - invalid name', async () => {
        try {
          await service.list({ name: ['invalid'] })
          throw new Error('should not reach here')
        } catch (e) {
          (e.message.indexOf('"name" must be a string') >= 0).should.be.eql(true)
        }
      })

      it('list - invalid page', async () => {
        try {
          await service.list({ page: -1 })
          throw new Error('should not reach here')
        } catch (e) {
          (e.message.indexOf('"page" must be larger than or equal to 1') >= 0).should.be.eql(true)
        }
      })

      it('list - invalid perPage', async () => {
        try {
          await service.list({ perPage: -1 })
          throw new Error('should not reach here')
        } catch (e) {
          (e.message.indexOf('"perPage" must be larger than or equal to 1') >= 0).should.be.eql(true)
        }
      })

      it('list - unexpected field', async () => {
        try {
          await service.list({ other: 123 })
          throw new Error('should not reach here')
        } catch (e) {
          (e.message.indexOf('"other" is not allowed') >= 0).should.be.eql(true)
        }
      })
    })

    describe('create tests', () => {
      it('Call create successfully', async () => {
        const result = await service.create({ name: 'testing' })
        result.name.should.be.eql('testing')
        id = result.id
      })

      it('create - name already used', async () => {
        await service.create({ name: 'testing' }).should.be.rejectedWith(
          `${modelName} with name: testing already exists`)
      })

      it('create - missing name', async () => {
        try {
          await service.create({})
          throw new Error('should not reach here')
        } catch (e) {
          (e.message.indexOf('"name" is required') >= 0).should.be.eql(true)
        }
      })

      it('create - invalid name', async () => {
        try {
          await service.create({ name: ['xx'] })
          throw new Error('should not reach here')
        } catch (e) {
          (e.message.indexOf('"name" must be a string') >= 0).should.be.eql(true)
        }
      })

      it('create - unexpected field', async () => {
        try {
          await service.create({ name: 'some name', other: 123 })
          throw new Error('should not reach here')
        } catch (e) {
          (e.message.indexOf('"other" is not allowed') >= 0).should.be.eql(true)
        }
      })
    })

    describe('getEntity tests', () => {
      it('Call getEntity successfully', async () => {
        const result = await service.getEntity(id)
        result.id.should.be.eql(id)
        result.name.should.be.eql('testing')
      })

      it('getEntity - not found', async () => {
        await service.getEntity(notFoundId).should.be.rejectedWith(
          `${modelName} with id: ${notFoundId} doesn't exist`)
      })

      it('getEntity - invalid id', async () => {
        try {
          await service.getEntity('invalid')
          throw new Error('should not reach here')
        } catch (e) {
          (e.message.indexOf('"id" must be a valid GUID') >= 0).should.be.eql(true)
        }
      })
    })

    describe('update tests', () => {
      it('Call update successfully', async () => {
        const result = await service.update(id, { name: 'testing2' })
        result.id.should.be.eql(id)
        result.name.should.be.eql('testing2')
      })

      it('update - name already used', async () => {
        await service.update(id, { name: 'test1' }).should.be.rejectedWith(
          `${modelName} with name: test1 already exists`)
      })

      it('update - not found', async () => {
        await service.update(notFoundId, { name: 'x' }).should.be.rejectedWith(
          `${modelName} with id: ${notFoundId} doesn't exist`)
      })

      it('update - invalid id', async () => {
        try {
          await service.update('invalid', { name: 'x' })
          throw new Error('should not reach here')
        } catch (e) {
          (e.message.indexOf('"id" must be a valid GUID') >= 0).should.be.eql(true)
        }
      })

      it('update - null name', async () => {
        try {
          await service.update(id, { name: null })
          throw new Error('should not reach here')
        } catch (e) {
          (e.message.indexOf('"name" must be a string') >= 0).should.be.eql(true)
        }
      })

      it('update - invalid name', async () => {
        try {
          await service.update(id, { name: { invalid: 'x' } })
          throw new Error('should not reach here')
        } catch (e) {
          (e.message.indexOf('"name" must be a string') >= 0).should.be.eql(true)
        }
      })

      it('update - empty name', async () => {
        try {
          await service.update(id, { name: '' })
          throw new Error('should not reach here')
        } catch (e) {
          (e.message.indexOf('"name" is not allowed to be empty') >= 0).should.be.eql(true)
        }
      })
    })

    describe('partiallyUpdate tests', () => {
      it('Call partiallyUpdate successfully 1', async () => {
        const result = await service.partiallyUpdate(id, { name: 'testing3' })
        result.id.should.be.eql(id)
        result.name.should.be.eql('testing3')
      })

      it('Call partiallyUpdate successfully 2', async () => {
        const result = await service.partiallyUpdate(id, {})
        result.id.should.be.eql(id)
        result.name.should.be.eql('testing3')
      })

      it('partiallyUpdate - name already used', async () => {
        await service.partiallyUpdate(id, { name: 'test2' }).should.be.rejectedWith(
          `${modelName} with name: test2 already exists`)
      })

      it('partiallyUpdate - not found', async () => {
        await service.partiallyUpdate(notFoundId, { name: 'x' }).should.be.rejectedWith(
          `${modelName} with id: ${notFoundId} doesn't exist`)
      })

      it('partiallyUpdate - invalid id', async () => {
        try {
          await service.partiallyUpdate('invalid', { name: 'x' })
          throw new Error('should not reach here')
        } catch (e) {
          (e.message.indexOf('"id" must be a valid GUID') >= 0).should.be.eql(true)
        }
      })

      it('partiallyUpdate - null name', async () => {
        try {
          await service.partiallyUpdate(id, { name: null })
          throw new Error('should not reach here')
        } catch (e) {
          (e.message.indexOf('"name" must be a string') >= 0).should.be.eql(true)
        }
      })

      it('partiallyUpdate - invalid name', async () => {
        try {
          await service.partiallyUpdate(id, { name: { invalid: 'x' } })
          throw new Error('should not reach here')
        } catch (e) {
          (e.message.indexOf('"name" must be a string') >= 0).should.be.eql(true)
        }
      })

      it('partiallyUpdate - empty name', async () => {
        try {
          await service.partiallyUpdate(id, { name: '' })
          throw new Error('should not reach here')
        } catch (e) {
          (e.message.indexOf('"name" is not allowed to be empty') >= 0).should.be.eql(true)
        }
      })

      it('partiallyUpdate - unexpected field', async () => {
        try {
          await service.partiallyUpdate(id, { name: 'xx', other: 'xx' })
          throw new Error('should not reach here')
        } catch (e) {
          (e.message.indexOf('"other" is not allowed') >= 0).should.be.eql(true)
        }
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
          throw new Error('should not reach here')
        } catch (e) {
          (e.message.indexOf('"id" must be a valid GUID') >= 0).should.be.eql(true)
        }
      })
    })
  })
}

module.exports = {
  generateLookupUnitTests
}
