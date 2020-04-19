/**
 * This defines Country model.
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
  name: {
    type: String,
    required: true
  },
  countryFlag: {
    type: String,
    required: true
  },
  countryCode: {
    type: String,
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
  }
},
{
  throughput: {
    read: Number(config.AMAZON.DYNAMODB_READ_CAPACITY_UNITS),
    write: Number(config.AMAZON.DYNAMODB_WRITE_CAPACITY_UNITS)
  }
})

module.exports = schema
