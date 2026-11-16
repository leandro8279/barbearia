const crypto = require('node:crypto')

const ACTIVE_APPOINTMENT_STATUSES = new Set(['pending', 'confirmed', 'checked_in', 'in_service'])
const STAFF_ROLES = new Set(['barber', 'reception', 'manager', 'admin'])
const ROLE_PERMISSIONS = {
  customer: [],
  barber: ['agenda.read', 'agenda.write', 'customers.read', 'catalog.read', 'commissions.read'],
  reception: ['agenda.*', 'cash.*', 'customers.*', 'catalog.read'],
  manager: ['*'],
  admin: ['*']
}

function nowIso() {
  return new Date().toISOString()
}

function nextId(db, collection) {
  const records = db.get(collection).value() || []
  return records.reduce((max, record) => Math.max(max, Number(record.id) || 0), 0) + 1
}

function getById(db, collection, id) {
  return db
    .get(collection)
    .find({id: Number(id)})
    .value()
}

function currentBarber(db, user) {
  return db
    .get('barbers')
    .find({userId: Number(user.id)})
    .value()
}

function hasPermission(user, permission) {
  if (!user) return false
  if (user.role === 'admin') return true
  if (user.role === 'manager' && permission === 'settings.manage') return false
  const grants = [...(ROLE_PERMISSIONS[user.role] || []), ...(Array.isArray(user.permissions) ? user.permissions : [])]
  return grants.some(grant => grant === '*' || grant === permission || (grant.endsWith('.*') && permission.startsWith(grant.slice(0, -1))))
}

function canReadAppointment(db, user, appointment) {
  if (!user || !appointment) return false
  if (user.role === 'customer') return Number(appointment.customerId) === Number(user.id)
  if (user.role === 'barber') return Number(appointment.barberId) === Number(currentBarber(db, user)?.id)
  return hasPermission(user, 'agenda.read')
}

function safeUser(user) {
  if (!user) return null
  const {passwordHash, tokenVersion, ...safe} = user
  return safe
}

function fail(response, status, message, details) {
  response.status(status).json({error: message, ...(details ? {details} : {})})
}

async function commit(db, actor, action, entity, entityId, mutate, details = {}) {
  const state = db.getState()
  const snapshot = JSON.parse(JSON.stringify(state))
  try {
    const result = mutate(state)
    state.auditLogs = state.auditLogs || []
    state.auditLogs.push({
      id: nextIdFromArray(state.auditLogs),
      userId: actor ? Number(actor.id) : null,
      action,
      entity,
      entityId: entityId === undefined ? null : Number(entityId) || entityId,
      details,
      createdAt: nowIso()
    })
    await db.write()
    return result
  } catch (error) {
    db.setState(snapshot)
    throw error
  }
}

function nextIdFromArray(records) {
  return records.reduce((max, record) => Math.max(max, Number(record.id) || 0), 0) + 1
}

function localDateTime(date, minutes) {
  const [year, month, day] = date.split('-').map(Number)
  const normalizedDay = new Date(Date.UTC(year, month - 1, day + Math.floor(minutes / 1440)))
  const normalizedDate = `${normalizedDay.getUTCFullYear()}-${String(normalizedDay.getUTCMonth() + 1).padStart(2, '0')}-${String(normalizedDay.getUTCDate()).padStart(2, '0')}`
  const dayMinutes = ((minutes % 1440) + 1440) % 1440
  const hours = String(Math.floor(dayMinutes / 60)).padStart(2, '0')
  const mins = String(dayMinutes % 60).padStart(2, '0')
  return new Date(`${normalizedDate}T${hours}:${mins}:00-03:00`)
}

function localDateString(date) {
  const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000)
  return shifted.toISOString().slice(0, 10)
}

function minutesOf(date) {
  const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000)
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes()
}

function validDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T12:00:00-03:00`)
  return !Number.isNaN(parsed.getTime()) && localDateString(parsed) === value
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd
}

function sendError(response, error) {
  if (error && Number.isInteger(error.status)) return fail(response, error.status, error.message, error.details)
  console.error(error)
  return fail(response, 500, 'Erro interno da API')
}

function makeError(status, message, details) {
  const error = new Error(message)
  error.status = status
  error.details = details
  return error
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex')
}

module.exports = {
  ACTIVE_APPOINTMENT_STATUSES,
  ROLE_PERMISSIONS,
  STAFF_ROLES,
  ROLE_PERMISSIONS,
  nowIso,
  nextId,
  getById,
  currentBarber,
  hasPermission,
  canReadAppointment,
  safeUser,
  fail,
  commit,
  localDateTime,
  localDateString,
  minutesOf,
  validDateString,
  overlaps,
  sendError,
  makeError,
  randomToken
}
