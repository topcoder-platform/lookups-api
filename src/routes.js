/**
 * Contains all routes.
 * If access roles are not configured for a route, then any role is allowed.
 * If scopes are not configured for a route, then any scope is allowed.
 */

const constants = require('../app-constants')

module.exports = {
  '/lookups/countries': {
    get: {
      controller: 'CountryController',
      method: 'list'
      // any role / scope is allowed
    },
    head: {
      controller: 'CountryController',
      method: 'listHead'
      // any role / scope is allowed
    },
    post: {
      controller: 'CountryController',
      method: 'create',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [constants.Scopes.CreateLookup, constants.Scopes.AllLookup]
    }
  },
  '/lookups/countries/:id': {
    get: {
      controller: 'CountryController',
      method: 'getEntity'
      // any role / scope is allowed
    },
    head: {
      controller: 'CountryController',
      method: 'getEntityHead'
      // any role / scope is allowed
    },
    put: {
      controller: 'CountryController',
      method: 'update',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [constants.Scopes.UpdateLookup, constants.Scopes.AllLookup]
    },
    patch: {
      controller: 'CountryController',
      method: 'partiallyUpdate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [constants.Scopes.UpdateLookup, constants.Scopes.AllLookup]
    },
    delete: {
      controller: 'CountryController',
      method: 'remove',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [constants.Scopes.DeleteLookup, constants.Scopes.AllLookup]
    }
  },

  '/lookups/educationalInstitutions': {
    get: {
      controller: 'EducationalInstitutionController',
      method: 'list'
      // any role / scope is allowed
    },
    head: {
      controller: 'EducationalInstitutionController',
      method: 'listHead'
      // any role / scope is allowed
    },
    post: {
      controller: 'EducationalInstitutionController',
      method: 'create',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [constants.Scopes.CreateLookup, constants.Scopes.AllLookup]
    }
  },
  '/lookups/educationalInstitutions/:id': {
    get: {
      controller: 'EducationalInstitutionController',
      method: 'getEntity'
      // any role / scope is allowed
    },
    head: {
      controller: 'EducationalInstitutionController',
      method: 'getEntityHead'
      // any role / scope is allowed
    },
    put: {
      controller: 'EducationalInstitutionController',
      method: 'update',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [constants.Scopes.UpdateLookup, constants.Scopes.AllLookup]
    },
    patch: {
      controller: 'EducationalInstitutionController',
      method: 'partiallyUpdate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [constants.Scopes.UpdateLookup, constants.Scopes.AllLookup]
    },
    delete: {
      controller: 'EducationalInstitutionController',
      method: 'remove',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [constants.Scopes.DeleteLookup, constants.Scopes.AllLookup]
    }
  },

  '/lookups/devices': {
    get: {
      controller: 'DeviceController',
      method: 'list'
      // any role / scope is allowed
    },
    head: {
      controller: 'DeviceController',
      method: 'listHead'
      // any role / scope is allowed
    },
    post: {
      controller: 'DeviceController',
      method: 'create',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [constants.Scopes.CreateLookup, constants.Scopes.AllLookup]
    }
  },
  '/lookups/devices/:id': {
    get: {
      controller: 'DeviceController',
      method: 'getEntity'
      // any role / scope is allowed
    },
    head: {
      controller: 'DeviceController',
      method: 'getEntityHead'
      // any role / scope is allowed
    },
    put: {
      controller: 'DeviceController',
      method: 'update',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [constants.Scopes.UpdateLookup, constants.Scopes.AllLookup]
    },
    patch: {
      controller: 'DeviceController',
      method: 'partiallyUpdate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [constants.Scopes.UpdateLookup, constants.Scopes.AllLookup]
    },
    delete: {
      controller: 'DeviceController',
      method: 'remove',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [constants.Scopes.DeleteLookup, constants.Scopes.AllLookup]
    }
  },

  '/health': {
    get: {
      controller: 'HealthCheckController',
      method: 'check'
    }
  }
}
