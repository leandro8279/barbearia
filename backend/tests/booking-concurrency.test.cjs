const assert = require('node:assert/strict')
const express = require('express')
const {test} = require('node:test')
const core = require('../lib/core.cjs')
const createMiddleware = require('../middleware.cjs')

const customer = {id: 1, role: 'customer', permissions: []}

function bookingState() {
  const weekdays = Array.from({length: 7}, (_, weekday) => ({weekday, ranges: [{start: '08:00', end: '20:00'}]}))
  return {
    units: [{id: 1, businessHours: weekdays}],
    schedules: weekdays.map(({weekday, ranges}) => ({barberId: 1, weekday, ranges, breaks: []})),
    settings: [{id: 1, booking: {minAdvanceMin: 0, maxDays: 60, maxFutureAppointments: 3, slotGranularityMin: 15, autoConfirm: true}}],
    services: [{id: 1, name: 'Corte', active: true, durationMin: 30, price: 6500, commissionPct: 10, bufferMin: 0}],
    barbers: [{id: 1, name: 'Rafael', active: true, userId: 2}],
    barberServices: [],
    users: [{id: 1, name: 'Cliente', role: 'customer'}, {id: 2, name: 'Rafael', role: 'barber'}],
    appointments: [],
    slotHolds: [],
    timeBlocks: [],
    notifications: [],
    auditLogs: []
  }
}

function createDb(initialState) {
  let state = structuredClone(initialState)
  return {
    get: name => ({
      value: () => state[name] || [],
      find: criteria => ({
        value: () => (state[name] || []).find(record => Object.entries(criteria).every(([key, value]) => record[key] === value))
      })
    }),
    getState: () => state,
    setState: next => {
      state = next
    },
    write: async () => {}
  }
}

function futureStart() {
  const date = core.localDateString(new Date(Date.now() + 2 * 86400000))
  return core.localDateTime(date, 10 * 60).toISOString()
}

async function withApi(db, run) {
  const app = express()
  app.use(express.json())
  app.use((request, response, next) => {
    request.user = customer
    next()
  })
  app.use(createMiddleware(db))
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  try {
    await run(server.address().port)
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
}

function post(port, path, body) {
  return fetch(`http://127.0.0.1:${port}${path}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  })
}

test('confirmações concorrentes para o mesmo horário criam uma reserva e retornam 409', async () => {
  const db = createDb(bookingState())
  const body = {barberId: 1, serviceIds: [1], start: futureStart()}

  await withApi(db, async port => {
    const responses = await Promise.all([post(port, '/appointments', body), post(port, '/appointments', body)])

    assert.deepEqual(responses.map(response => response.status).sort(), [201, 409])
  })

  assert.equal(db.getState().appointments.length, 1)
})

test('hold expirado não confirma reserva e deixa o horário disponível na API', async () => {
  const db = createDb(bookingState())
  const start = futureStart()
  db.getState().slotHolds.push({
    id: 1,
    key: 'expired-hold',
    barberId: 1,
    start,
    end: new Date(new Date(start).getTime() + 30 * 60000).toISOString(),
    expiresAt: new Date(Date.now() - 1000).toISOString(),
    userId: customer.id
  })

  await withApi(db, async port => {
    const confirmation = await post(port, '/appointments', {barberId: 1, serviceIds: [1], start, holdKey: 'expired-hold'})
    assert.equal(confirmation.status, 409)

    const date = core.localDateString(new Date(start))
    const availability = await fetch(`http://127.0.0.1:${port}/availability?date=${date}&serviceIds=1&barberId=1`)
    const slots = await availability.json()

    assert.equal(availability.status, 200)
    assert.ok(slots.some(slot => slot.start === start))
  })

  assert.equal(db.getState().appointments.length, 0)
})
