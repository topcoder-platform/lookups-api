# Topcoder Lookup API v5

## Prerequisites

- NodeJS (v10)
- AWS DynamoDB
- Java 6+ (used if using runnable jar of local DynamoDB)
- Docker, Docker Compose (used if using docker of local DynamoDB)
- Elasticsearch 7.1.1

## Configuration

Configuration for the application is at `config/default.js` and `config/production.js`.
The following parameters can be set in config files or in env variables:

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
- AMAZON.DYNAMODB_EDUCATIONAL_INSTITUTION_TABLE: DynamoDB table name for educational institutions
- ES.HOST: Elasticsearch host
- ES.API_VERSION: Elasticsearch API version
- ES.COUNTRY_INDEX: Elasticsearch index name for countries
- ES.COUNTRY_TYPE: Elasticsearch index type for countries
- ES.EDUCATIONAL_INSTITUTION_INDEX: Elasticsearch index name for educational institutions
- ES.EDUCATIONAL_INSTITUTION_TYPE: Elasticsearch index type for educational institutions
- AUTH0_URL: Auth0 URL, used to get TC M2M token
- AUTH0_AUDIENCE: Auth0 audience, used to get TC M2M token
- TOKEN_CACHE_TIME: Auth0 token cache time, used to get TC M2M token
- AUTH0_CLIENT_ID: Auth0 client id, used to get TC M2M token
- AUTH0_CLIENT_SECRET: Auth0 client secret, used to get TC M2M token
- AUTH0_PROXY_SERVER_URL: Proxy Auth0 URL, used to get TC M2M token
- BUSAPI_URL: the bus api, default value is 'https://api.topcoder-dev.com/v5'
- KAFKA_ERROR_TOPIC: Kafka error topic, default value is 'common.error.reporting',
- KAFKA_MESSAGE_ORIGINATOR: the Kafka message originator, default value is 'lookups-api'
- LOOKUP_CREATE_TOPIC: the lookup create Kafka topic, default value is 'lookup.notification.create',
- LOOKUP_UPDATE_TOPIC: the lookup update Kafka topic, default value is 'lookup.notification.update',
- LOOKUP_DELETE_TOPIC: the lookup delete Kafka topic, default value is 'lookup.notification.delete'

Test configuration is at `config/test.js`. You don't need to change them.
The following test parameters can be set in config file or in env variables:

- ADMIN_TOKEN: admin token
- COPILOT_TOKEN: copilot token
- USER_TOKEN: user token
- EXPIRED_TOKEN: expired token
- INVALID_TOKEN: invalid token
- M2M_FULL_ACCESS_TOKEN: M2M full access token
- M2M_READ_ACCESS_TOKEN: M2M read access token
- M2M_UPDATE_ACCESS_TOKEN: M2M update access token

## Local DynamoDB setup (Optional)

This page `https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html` provides several ways to deploy local DynamoDB.

If you want to use runnable jar of local DynamoDB:

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

## AWS DynamoDB setup

Properly configure AMAZON.AWS_ACCESS_KEY_ID, AMAZON.AWS_SECRET_ACCESS_KEY, AMAZON.AWS_REGION, AMAZON.IS_LOCAL_DB
in config file or via environment variables. You may create tables using below `npm run create-tables` command.

## Elasticsearch setup

This page `https://www.elastic.co/downloads/elasticsearch` contains various ways to setup Elasticsearch,
choose a way suitable for you system, setup version 7.1.1, update Elasticsearch connection host if needed.
Make sure to use correct version, different versions may behave differently, especially the index creation
may be different for different ES versions.

## Local Deployment

- Install dependencies `npm install`
- Run lint `npm run lint`
- Run lint fix `npm run lint:fix`
- To delete DynamoDB table if needed `npm run delete-tables`
- To create DynamoDB table if needed `npm run create-tables`
- Create configured Elasticsearch indices, they will be re-created if present: `npm run init-es`
- Start app `npm start`
- App is running at `http://localhost:3000`

## Running tests

Tables should be created before running tests.
Note that running tests will clear all DynamoDB data and re-create Elasticsearch indices.

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

## Verification

- import Postman collection and environment in the docs folder to Postman
- then run the Postman tests, you may use Postman collection runner to run them

## Notes

- swagger is updated, adding health check API and some other fixes, you may check it using `http://editor.swagger.io/`
- Postman tests are also updated to suit latest code
- all JWT tokens provided in Postman environment file and tests are created in `https://jwt.io` with secret `mysecret`

