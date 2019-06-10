/**
 * The application entry point
 */

require('./app-bootstrap')

const config = require('config')
const express = require('express')
const interceptor = require('express-interceptor')
const bodyParser = require('body-parser')
const _ = require('lodash')
const cors = require('cors')
const logger = require('./src/common/logger')
const HttpStatus = require('http-status-codes')

// setup express app
const app = express()

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.set('port', config.PORT)

// intercept the 403 error
// it may be authentication error from jwtAuthenticator or forbidden error,
// the jwtAuthenticator authentication error should be converted to 401 error
app.use(interceptor((req, res) => {
  return {
    isInterceptable: () => {
      return res.statusCode === 403
    },

    intercept: (body, send) => {
      if (!res.forbidden) {
        res.statusCode = 401
      }
      let obj
      try {
        obj = JSON.parse(body)
      } catch (e) {
        logger.error('Invalid response body.')
      }
      if (obj && obj.result && obj.result.content && obj.result.content.message) {
        const ret = { message: obj.result.content.message }
        send(JSON.stringify(ret))
      } else {
        send(body)
      }
    }
  }
}))

// Register routes
require('./app-routes')(app)

// The error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.logFullError(err, req.signature || `${req.method} ${req.url}`)
  const errorResponse = {}
  const status = err.isJoi ? HttpStatus.BAD_REQUEST : (err.httpStatus || HttpStatus.INTERNAL_SERVER_ERROR)

  if (_.isArray(err.details)) {
    if (err.isJoi) {
      _.map(err.details, (e) => {
        if (e.message) {
          if (_.isUndefined(errorResponse.message)) {
            errorResponse.message = e.message
          } else {
            errorResponse.message += `, ${e.message}`
          }
        }
      })
    }
  }
  if (_.isUndefined(errorResponse.message)) {
    if (err.message && status !== HttpStatus.INTERNAL_SERVER_ERROR) {
      errorResponse.message = err.message
    } else {
      errorResponse.message = 'Internal server error'
    }
  }

  res.status(status).json(errorResponse)
})

app.listen(app.get('port'), () => {
  logger.info(`Express server listening on port ${app.get('port')}`)
})

module.exports = app
