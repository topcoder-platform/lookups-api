/**
 * This defines Device model.
 */
const config = require('config')
const dynamoose = require('dynamoose')

const Schema = dynamoose.Schema

const schema = new Schema({
  id: {
    type: String,
    hashKey: true,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  manufacturer: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  operatingSystem: {
    type: String,
    required: false
  },
  operatingSystemVersion: {
    type: String,
    required: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
},
{
  throughput: {
    read: Number(config.AMAZON.DYNAMODB_READ_CAPACITY_UNITS),
    write: Number(config.AMAZON.DYNAMODB_WRITE_CAPACITY_UNITS)
  }
})

module.exports = schema
