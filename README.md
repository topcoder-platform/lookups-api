# Topcoder Lookup API v5

## Prerequisites

- NodeJS (v10)
- AWS DynamoDB
- Java 6+ (used if using runnable jar of local DynamoDB)
- Docker, Docker Compose (used if using docker of local DynamoDB/Elasticsearch)
- Elasticsearch 6.8

## Configuration

Configuration for the application is at `config/default.js` and `config/production.js`. The following parameters can be set in config files or in env variables:

- LOG_LEVEL: the log level
- PORT: the server port
- API_VERSION: the API version
- AUTH_SECRET: TC Authentication secret
- VALID_ISSUERS: valid issuers for TC authentication
- AMAZON.AWS_ACCESS_KEY_ID: The Amazon certificate key to use when connecting. For local dynamodb you can set fake value.
- AMAZON.AWS_SECRET_ACCESS_KEY: The Amazon certificate access key to use when connecting. For local dynamodb you can set fake value.
- AMAZON.AWS_REGION: The Amazon region to use when connecting. For local dynamodb you can set fake value.
- AMAZON.IS_LOCAL_DB: Use local or AWS Amazon DynamoDB
- AMAZON.DYNAMODB_URL: The local url, if using local Amazon DynamoDB
- AMAZON.DYNAMODB_READ_CAPACITY_UNITS: the AWS DynamoDB read capacity units, if using local Amazon DynamoDB
- AMAZON.DYNAMODB_WRITE_CAPACITY_UNITS: the AWS DynamoDB write capacity units, if using local Amazon DynamoDB
- AMAZON.DYNAMODB_COUNTRY_TABLE: DynamoDB table name for countries
- AMAZON.DYNAMODB_DEVICE_TABLE: DynamoDB table name for device
- AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE: DynamoDB table name for educational institutions
- ES.HOST: Elasticsearch host
- ES.API_VERSION: Elasticsearch API version
- ES.COUNTRY_INDEX: Elasticsearch index name for countries
- ES.COUNTRY_TYPE: Elasticsearch index type for countries
- ES.DEVICE_INDEX: Elasticsearch index name for devices
- ES.DEVICE_TYPE: Elasticsearch index type for devices
- ES.EDUCATIONAL_INSTITUTION_INDEX: Elasticsearch index name for educational institutions
- ES.EDUCATIONAL_INSTITUTION_TYPE: Elasticsearch index type for educational institutions
- AUTH0_URL: Auth0 URL, used to get TC M2M token
- AUTH0_AUDIENCE: Auth0 audience, used to get TC M2M token
- TOKEN_CACHE_TIME: Auth0 token cache time, used to get TC M2M token
- AUTH0_CLIENT_ID: Auth0 client id, used to get TC M2M token
- AUTH0_CLIENT_SECRET: Auth0 client secret, used to get TC M2M token
- AUTH0_PROXY_SERVER_URL: Proxy Auth0 URL, used to get TC M2M token
- BUSAPI_URL: the bus api, default value is `https://api.topcoder-dev.com/v5`
- KAFKA_ERROR_TOPIC: Kafka error topic, default value is 'common.error.reporting',
- KAFKA_MESSAGE_ORIGINATOR: the Kafka message originator, default value is 'lookups-api'
- LOOKUP_CREATE_TOPIC: the lookup create Kafka topic, default value is 'lookup.notification.create',
- LOOKUP_UPDATE_TOPIC: the lookup update Kafka topic, default value is 'lookup.notification.update',
- LOOKUP_DELETE_TOPIC: the lookup delete Kafka topic, default value is 'lookup.notification.delete'

Test configuration is at `config/test.js`. You don't need to change them. The following test parameters can be set in config file or in env variables:

- ADMIN_TOKEN: admin token
- COPILOT_TOKEN: copilot token
- USER_TOKEN: user token
- EXPIRED_TOKEN: expired token
- INVALID_TOKEN: invalid token
- M2M_FULL_ACCESS_TOKEN: M2M full access token
- M2M_READ_ACCESS_TOKEN: M2M read access token
- M2M_UPDATE_ACCESS_TOKEN: M2M update access token
- AMAZON.DYNAMODB_COUNTRY_TABLE: The country DynamoDB table used during unit/e2e tests (`test_` is appended to the table name automatically)
- AMAZON.DYNAMODB_DEVICE_TABLE: The device DynamoDB table used during unit/e2e tests (`test_` is appended to the table name automatically)
- AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE: The educational institutions DynamoDB table used during unit/e2e tests (`test_` is appended to the table name automatically)
- ES.COUNTRY_INDEX: The country elasticsearch index used during unit/e2e tests.
- ES.COUNTRY_TYPE: The country elastic search document type used during unit/e2e tests.
- ES.DEVICE_INDEX: The device elasticsearch index used during unit/e2e tests.
- ES.DEVICE_TYPE: The device elastic search document type used during unit/e2e tests.
- ES.EDUCATIONAL_INSTITUTION_INDEX: The educational institution elastic search index used during unit/e2e tests
- ES.EDUCATIONAL_INSTITUTION_TYPE: The educational institution elastic search document type used during unit/e2e tests.

## Local DynamoDB setup (Optional)

This page `https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html` provides several ways to deploy local DynamoDB. If you want to use runnable jar of local DynamoDB:

- see `https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html` for details
- download the local DynamoDB of your region
- extract out the downloaded archive
- ensure Java 6+ is installed
- in the extracted folder, run `java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb`
- local DynamoDB is running at `http://localhost:8000`

If you want to use docker of local DynamoDB:

- see `https://hub.docker.com/r/amazon/dynamodb-local` for details
- you may go to `db-docker` folder, and run `docker-compose up` to start local DynamoDB
- local DynamoDB is running at `http://localhost:8000`

## AWS DynamoDB

Properly configure AMAZON.AWS_ACCESS_KEY_ID, AMAZON.AWS_SECRET_ACCESS_KEY, AMAZON.AWS_REGION, AMAZON.IS_LOCAL_DB
in config file or via environment variables. You may create tables using below `npm run create-tables` command.

## Elasticsearch setup

This page `https://www.elastic.co/downloads/elasticsearch` contains various ways to setup Elasticsearch,
choose a way suitable for you system, setup version 6.8, update Elasticsearch connection host if needed.
Make sure to use correct version, different versions may behave differently, especially the index creation
may be different for different ES versions.

If you want to use docker of local Elasticsearch:

- you may go to `es-docker` folder, and run `docker-compose up` to start local Elasticsearch
- local Elasticsearch is running at `http://localhost:9200`

## Local Deployment

- Install dependencies `npm install`
- Run lint `npm run lint`
- Run lint fix `npm run lint:fix`
- To delete DynamoDB table if needed `npm run delete-tables` **WARNING: This deletes all tables**
- To create DynamoDB table if needed `npm run create-tables`
- Create configured Elasticsearch indices, they will be re-created if present: `npm run init-es`
- Start app `npm start`
- App is running at `http://localhost:3000`

### Load/Clean Data

- Set development env `export NODE_ENV=development`
- To add data to DynamoDB table and es `npm run load-data`
    > **Example:** `npm run load-data`

- To delete data from  DynamoDB table and es `npm run clean-data` **WARNING: This deletes all the data in the db and es**
    > **Example:** `npm run clean-data`

## Running tests

Tables should be created before running tests.
Note that running tests will clear all DynamoDB data in test tables and re-create Elasticsearch test indices.

### Running unit tests

To run unit tests alone

```bash
npm run test
```

To run unit tests with coverage report

```bash
npm run test:cov
```

### Running integration tests

To run integration tests alone

```bash
npm run e2e
```

To run integration tests with coverage report

```bash
npm run e2e:cov
```

You can see that the controllers functions 'getEntityHead()' and 'listHead()' in both controllers are not covered by the E2E tests.
According to the HTTP HEAD method documentation https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/HEAD , a GET request is issued behind the scenes, hence these functions are not even hit by the tests even if the HEAD HTTP method was called :
See 'list head API tests' and 'get entity head API tests' in e2eTestHelper.js, you can find calls like 'await chai.request(app).head(`${basePath}/${id}`).set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)'

But this does not hit the controllers functions mentioned above.

## Verification

- configure and start the application as described above
- import Postman collection and environment in the docs folder to Postman
- then run the Postman tests from top to bottom, you may use Postman collection runner to run them
- To check if create/update/delete lookups events are properly sent to event bus, go to `https://lauscher.topcoder-dev.com/` login as TonyJ/appirio123 and check the following topics based on the test that was executed : 'lookup.notification.create', 'lookup.notification.update', 'lookup.notification.delete'
- In postman, you can use 'get country' test to get the country after each update to see if it is correctly updated.

## Notes

- swagger is updated, you may check it using `http://editor.swagger.io/`
- Postman tests are also updated to suit latest code
- all JWT tokens provided in Postman environment file and tests are created in `https://jwt.io` with secret `mysecret`
