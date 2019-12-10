process.env.NODE_ENV = 'test'

require('../../app-bootstrap')

const chai = require('chai')

const config = require('config')
const service = require('../../src/common/helper')
const should = chai.should()
chai.use(require('chai-as-promised'))

const notFoundTableName = 'test_table_not_found'
const testTableName = 'test_table'

describe(`Unit tests for Helper Methods service`, () => {
  describe('Create - Delete Tables tests', () => {
    before(async () => {
      try {
        await service.deleteTable(testTableName)
      } catch (error) {

      }
    })

    it('Create Table Missing attribute in schema', async () => {
      try {
        await service.createTable({})
      } catch (e) {
        should.equal(e.message.indexOf('Missing required key') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('Create Table success', async () => {
      await service.createTable({
        TableName: testTableName,
        KeySchema: [
          { AttributeName: 'id', KeyType: 'HASH' } // Partition key
        ],
        AttributeDefinitions: [
          { AttributeName: 'id', AttributeType: 'S' } // S -> String
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: Number(config.AMAZON.DYNAMODB_READ_CAPACITY_UNITS),
          WriteCapacityUnits: Number(config.AMAZON.DYNAMODB_WRITE_CAPACITY_UNITS)
        }
      })
    })

    it('Delete Table not found', async () => {
      try {
        await service.deleteTable(notFoundTableName)
        throw new Error('should not reach here')
      } catch (err) {

      }
    })

    it('Delete Table success', async () => {
      await service.deleteTable(testTableName)
    })
  })
})
