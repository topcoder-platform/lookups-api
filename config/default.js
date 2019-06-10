/**
 * The configuration file.
 */

module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  PORT: process.env.PORT || 3000,
  API_VERSION: process.env.API_VERSION || '/v5',
  AUTH_SECRET: process.env.AUTH_SECRET || 'mysecret',
  VALID_ISSUERS: process.env.VALID_ISSUERS ? process.env.VALID_ISSUERS.replace(/\\"/g, '') : '["https://topcoder-dev.auth0.com/"]',

  AMAZON: {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || 'FAKE_ACCESS_KEY',
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || 'FAKE_SECRET_ACCESS_KEY',
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',
    IS_LOCAL_DB: process.env.IS_LOCAL_DB ? process.env.IS_LOCAL_DB === 'true' : false,
    // Below three configuration is required if IS_LOCAL_DB is true
    DYNAMODB_URL: process.env.DYNAMODB_URL || 'http://localhost:8000',
    DYNAMODB_READ_CAPACITY_UNITS: process.env.DYNAMODB_READ_CAPACITY_UNITS || 10,
    DYNAMODB_WRITE_CAPACITY_UNITS: process.env.DYNAMODB_WRITE_CAPACITY_UNITS || 5,
    // table name is model name
    DYNAMODB_COUNTRY_TABLE: process.env.DYNAMODB_COUNTRY_TABLE || 'countries',
    DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE: process.env.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE || 'educationalInstitutions'
  }
}
