const assert = require('node:assert/strict')
const {test} = require('node:test')
const appointments = require('../lib/appointments.cjs')
const checkout = require('../lib/checkout.cjs')
const core = require('../lib/core.cjs')
const {withLock} = require('../lib/lock.cjs')

class Collection {
  constructor(read) {
    this.read = read
  }

  value() {
    return this.read()
  }

  find(criteria) {
    return new Collection(() => {
      const values = this.value()
      if (!Array.isArray(values)) return undefined
      return values.find(item => Object.entries(criteria).every(([key, value]) => item[key] === value))
    })
  }

  filter(predicate) {
    return new Collection(() => {
      const values = this.value()
      return Array.isArray(values) ? values.filter(predicate) : []
    })
  }

  map(project) {
    return new Collection(() => {
      const values = this.value()
      return Array.isArray(values) ? values.map(project) : []
    })
  }
}

function createDb(initialState, {failWrite = false} = {}) {
  let state = structuredClone(initialState)
  return {
    getState: () => state,
    setState: next => {
      state = next
    },
    get: collection => new Collection(() => state[collection] || []),
    write: async () => {
      if (failWrite) throw new Error('simulated write failure')
    }
  }
}

function bookingState() {
  const weekdays = Array.from({length: 7}, (_, weekday) => ({weekday, ranges: [{start: '08:00', end: '20:00'}]}))
  return {
    units: [{id: 1, businessHours: weekdays}],
    schedules: weekdays.map(({weekday, ranges}) => ({barberId: 1, weekday, ranges, breaks: []})),
    settings: [{id: 1, booking: {minAdvanceMin: 0, maxDays: 60, maxFutureAppointments: 3, slotGranularityMin: 15, autoConfirm: true, cancelBeforeHours: 0, maxDiscountPct: 10}, defaultBufferMin: 0}],
    services: [{id: 1, name: 'Corte', active: true, durationMin: 30, price: 6500, commissionPct: 10, bufferMin: 0}],
    barbers: [{id: 1, name: 'Rafael', active: true, userId: 2}],
    barberServices: [],
    users: [{id: 1, name: 'Cliente', role: 'customer'}, {id: 2, name: 'Rafael', role: 'barber'}],
    appointments: [],
    slotHolds: [],
    timeBlocks: [],
    tabs: [],
    payments: [],
    cashSessions: [],
    cashMovements: [],
    products: [],
    stockMovements: [],
    commissions: [],
    notifications: [],
    auditLogs: []
  }
}

function futureStart() {
  const date = core.localDateString(new Date(Date.now() + 2 * 86400000))
  return core.localDateTime(date, 10 * 60).toISOString()
}

const customer = {id: 1, role: 'customer'}

test('serializa reservas concorrentes e responde 409 para o horário já ocupado', async () => {
  const db = createDb(bookingState())
  const body = {barberId: 1, serviceIds: [1], start: futureStart()}
  const results = await Promise.allSettled([
    withLock(() => appointments.createAppointment(db, body, customer, core.commit)),
    withLock(() => appointments.createAppointment(db, body, customer, core.commit))
  ])

  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  const conflict = results.find(result => result.status === 'rejected')
  assert.equal(conflict.reason.status, 409)
  assert.equal(db.getState().appointments.length, 1)
})

test('cancelar um agendamento libera novamente o horário', async () => {
  const db = createDb(bookingState())
  const start = futureStart()
  const appointment = await appointments.createAppointment(db, {barberId: 1, serviceIds: [1], start}, customer, core.commit)

  await appointments.cancelAppointment(db, appointment.id, {reason: 'Solicitação do cliente'}, customer, core.commit)

  assert.equal(db.getState().appointments[0].status, 'canceled')
  assert.ok(
    require('../lib/availability.cjs')
      .getSlots(db, {date: core.localDateString(new Date(start)), serviceIds: [1], barberId: 1})
      .some(slot => slot.start === start)
  )
})

test('createAppointment rejeita reserva temporária vinculada a outra conta', async () => {
  const db = createDb(bookingState())
  const start = futureStart()
  db.getState().slotHolds.push({
    id: 9,
    key: 'hold-owned-by-another-user',
    barberId: 1,
    start,
    end: new Date(new Date(start).getTime() + 30 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60000).toISOString(),
    userId: 2
  })

  await assert.rejects(
    appointments.createAppointment(db, {barberId: 1, serviceIds: [1], start, holdKey: 'hold-owned-by-another-user'}, customer, core.commit),
    error => error.status === 404
  )

  assert.equal(db.getState().appointments.length, 0)
  assert.equal(db.getState().slotHolds.length, 1)
})

test('createAppointment rejeita chave de reserva inexistente', async () => {
  const db = createDb(bookingState())
  const start = futureStart()

  await assert.rejects(
    appointments.createAppointment(db, {barberId: 1, serviceIds: [1], start, holdKey: 'missing-hold'}, customer, core.commit),
    error => error.status === 409
  )

  assert.equal(db.getState().appointments.length, 0)
})

test('createAppointment permite consumir reserva do próprio cliente', async () => {
  const db = createDb(bookingState())
  const start = futureStart()
  db.getState().slotHolds.push({
    id: 9,
    key: 'hold-owned-by-customer',
    barberId: 1,
    start,
    end: new Date(new Date(start).getTime() + 30 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60000).toISOString(),
    userId: customer.id
  })

  const appointment = await appointments.createAppointment(db, {barberId: 1, serviceIds: [1], start, holdKey: 'hold-owned-by-customer'}, customer, core.commit)

  assert.equal(appointment.start, start)
  assert.equal(db.getState().appointments.length, 1)
  assert.equal(db.getState().slotHolds.length, 0)
})

test('falha ao persistir o fechamento restaura comanda, pagamento, estoque e atendimento', async () => {
  const initial = bookingState()
  initial.products = [{id: 10, name: 'Pomada', active: true, stock: 4, price: 1200, commissionPct: 10}]
  initial.appointments = [{id: 55, customerId: 1, barberId: 1, status: 'in_service', finishedAt: null, events: []}]
  initial.tabs = [{
    id: 7,
    appointmentId: 55,
    customerId: 1,
    barberId: 1,
    status: 'open',
    discount: 0,
    items: [{type: 'product', refId: 10, name: 'Pomada', qty: 1, unitPrice: 1200, discount: 0, barberId: 1, commissionPct: 10}]
  }]
  const db = createDb(initial, {failWrite: true})
  const before = structuredClone(db.getState())

  await assert.rejects(
    checkout.closeTab(db, 7, {tipCents: 0, payments: [{method: 'pix', amountCents: 1200}]}, {id: 9, role: 'admin'}, core.commit),
    /simulated write failure/
  )
  assert.deepEqual(db.getState(), before)
})

test('falha no meio do fechamento restaura alterações parciais da comanda', async () => {
  const initial = bookingState()
  initial.products = [{id: 10, name: 'Pomada', active: true, stock: 4, price: 1200, commissionPct: 10}]
  initial.appointments = [{id: 55, customerId: 1, barberId: 1, status: 'in_service', finishedAt: null, events: []}]
  initial.tabs = [{
    id: 7,
    appointmentId: 55,
    customerId: 1,
    barberId: 1,
    status: 'open',
    discount: 0,
    items: [{type: 'product', refId: 10, name: 'Pomada', qty: 1, unitPrice: 1200, discount: 0, barberId: 1, commissionPct: 10}]
  }]
  const db = createDb(initial)
  const before = structuredClone(db.getState())
  let stock = 4
  Object.defineProperty(db.getState().products[0], 'stock', {
    enumerable: true,
    get: () => stock,
    set: () => {
      throw new Error('simulated mid-close failure')
    }
  })

  await assert.rejects(
    checkout.closeTab(db, 7, {tipCents: 0, payments: [{method: 'pix', amountCents: 1200}]}, {id: 9, role: 'admin'}, core.commit),
    /simulated mid-close failure/
  )
  assert.deepEqual(db.getState(), before)
})

test('horário local na virada do dia avança para a data seguinte', () => {
  const nextDay = core.localDateTime('2026-11-11', 24 * 60)
  assert.equal(nextDay.toISOString(), '2026-11-12T03:00:00.000Z')
  assert.equal(core.localDateString(nextDay), '2026-11-12')
})
