/**
 * App constants
 */
const UserRoles = {
  Admin: 'Administrator'
}

const Scopes = {
  CreateLookup: 'create:lookups',
  ReadLookup: 'read:lookups',
  UpdateLookup: 'update:lookups',
  DeleteLookup: 'delete:lookups',
  AllLookup: 'all:lookups'
}

const Resources = {
  Country: 'country',
  Device: 'device',
  EducationalInstitution: 'educationalInstitution'
}

module.exports = {
  UserRoles,
  Scopes,
  Resources
}
