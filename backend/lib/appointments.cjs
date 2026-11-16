const crypto = require('node:crypto')
const {getSlots, requestedServices, priceAndDuration} = require('./availability.cjs')
const {ACTIVE_APPOINTMENT_STATUSES, canReadAppointment, currentBarber, getById, hasPermission, localDateString, makeError, nextId, nowIso, overlaps, validDateString} = require('./core.cjs')
const settingsConfig = require('./settings.cjs')

function dateKey(value) {
  return localDateString(new Date(value))
}

function suggestedSlot(db, options, after) {
  const firstDay = dateKey(after)
  const maxDays = Number(db.get('settings').find({id: 1}).value()?.booking?.maxDays ?? 45)
  for (let offset = 0; offset <= maxDays; offset += 1) {
    const date = new Date(`${firstDay}T12:00:00-03:00`)
    date.setUTCDate(date.getUTCDate() + offset)
    const day = localDateString(date)
    const slot = getSlots(db, {...options, date: day}).find(item => item.start > after)
    if (slot) return slot
  }
  return null
}

function slotsAtStart(db, options, start, ignoreAppointmentId = options.ignoreAppointmentId) {
  const date = dateKey(start)
  return getSlots(db, {...options, date, ignoreAppointmentId}).filter(slot => slot.start === start)
}

function bookingPrice(db, barberId, serviceIds) {
  return priceAndDuration(db, barberId, requestedServices(db, serviceIds))
}

function publicAppointment(appointment) {
  const {guestToken, ...safe} = appointment
  safe.items = safe.items.map(({commissionPct, ...item}) => item)
  return safe
}

function getPublicAppointment(db, id, user, guestToken) {
  const appointment = getById(db, 'appointments', id)
  if (!appointment) throw makeError(404, 'Agendamento não encontrado')
  const token = typeof guestToken === 'string' ? guestToken : ''
  const storedToken = typeof appointment.guestToken === 'string' ? appointment.guestToken : ''
  const tokenMatches = /^[a-f0-9]{48}$/i.test(token) && storedToken.length === token.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken))
  const registeredCustomerCanRead = user?.role === 'customer' && !user.guest && Number(appointment.customerId) === Number(user.id)
  if (!registeredCustomerCanRead && !tokenMatches) throw makeError(404, 'Agendamento não encontrado')

  const barber = getById(db, 'barbers', appointment.barberId)
  const barberUser = barber ? getById(db, 'users', barber.userId) : null
  return {
    id: Number(appointment.id),
    code: appointment.code,
    start: appointment.start,
    end: appointment.end,
    durationMin: Math.round((new Date(appointment.end).getTime() - new Date(appointment.start).getTime()) / 60000),
    status: appointment.status,
    items: appointment.items.map(({commissionPct, ...item}) => item),
    subtotal: Number(appointment.subtotal),
    total: Number(appointment.total),
    barber: {id: Number(appointment.barberId), name: barberUser?.name || barber?.name || barber?.slug || 'Profissional'}
  }
}

function listCustomerAppointments(db, user, query) {
  if (!user || user.role !== 'customer') throw makeError(403, 'Apenas clientes podem consultar seus agendamentos')
  const view = String(query.view || '')
  if (!['upcoming', 'past', 'canceled'].includes(view)) throw makeError(400, 'Filtro de agendamentos inválido')
  const page = Number(query.page || 1)
  const pageSize = Number(query.limit || 10)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) throw makeError(400, 'Página ou limite inválido')
  const from = query.from ? String(query.from) : ''
  const to = query.to ? String(query.to) : ''
  if ((from && !validDateString(from)) || (to && !validDateString(to))) throw makeError(400, 'Informe um período válido')
  if (from && to && from > to) throw makeError(400, 'A data inicial deve ser anterior à data final')
  const status = query.status ? String(query.status) : ''
  if (status && !['pending', 'confirmed', 'checked_in', 'in_service', 'done', 'canceled', 'no_show'].includes(status)) throw makeError(400, 'Status inválido')
  const now = Date.now()
  const rows = (db.get('appointments').value() || [])
    .filter(appointment => {
      if (Number(appointment.customerId) !== Number(user.id)) return false
      const timestamp = new Date(appointment.start).getTime()
      const date = localDateString(new Date(timestamp))
      if (view === 'upcoming' && (timestamp < now || appointment.status === 'canceled')) return false
      if (view === 'past' && (timestamp >= now || appointment.status === 'canceled')) return false
      if (view === 'canceled' && appointment.status !== 'canceled') return false
      if (from && date < from) return false
      if (to && date > to) return false
      return !status || appointment.status === status
    })
    .sort((a, b) => {
      const difference = new Date(a.start).getTime() - new Date(b.start).getTime()
      return view === 'upcoming' ? difference : -difference
    })
  const offset = (page - 1) * pageSize
  return {items: rows.slice(offset, offset + pageSize).map(publicAppointment), total: rows.length, page, pageSize}
}

function listStaffAppointments(db, user, query) {
  if (!hasPermission(user, 'agenda.read')) throw makeError(403, 'Sem permissão para consultar a agenda')
  const from = String(query.from || query.date || '')
  const to = String(query.to || query.date || '')
  if (!validDateString(from) || !validDateString(to) || from > to) throw makeError(400, 'Informe um período válido')

  const barber = user.role === 'barber' ? currentBarber(db, user) : null
  const requestedBarberId = query.barberId && query.barberId !== 'me' ? Number(query.barberId) : null
  if (requestedBarberId !== null && !Number.isInteger(requestedBarberId)) throw makeError(400, 'Profissional inválido')
  const barberId = user.role === 'barber' ? Number(barber?.id) : requestedBarberId

  return db
    .get('appointments')
    .value()
    .filter(appointment => {
      const date = dateKey(appointment.start)
      return canReadAppointment(db, user, appointment) && date >= from && date <= to && (!barberId || Number(appointment.barberId) === barberId)
    })
    .sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime())
    .map(appointment => {
      const barberProfile = getById(db, 'barbers', appointment.barberId)
      return {
        ...publicAppointment(appointment),
        durationMin: Math.round((new Date(appointment.end).getTime() - new Date(appointment.start).getTime()) / 60000),
        customerName: getById(db, 'users', appointment.customerId)?.name || 'Cliente',
        barberId: Number(appointment.barberId),
        barberName: getById(db, 'users', barberProfile?.userId)?.name || barberProfile?.name || 'Profissional',
        notes: String(appointment.notes || '')
      }
    })
}

async function createAppointment(db, body, user, commit) {
  if (!user) throw makeError(401, 'Faça login ou continue como visitante antes de agendar')
  if (user.role !== 'customer' && !hasPermission(user, 'agenda.write')) throw makeError(403, 'Sem permissão para criar agendamentos')
  const serviceIds = body.serviceIds || (Array.isArray(body.items) ? body.items.map(item => item.serviceId) : [])
  const services = requestedServices(db, serviceIds)
  let customerId = Number(user.id)
  if (user.role !== 'customer') customerId = Number(body.customerId)
  if (!customerId || !getById(db, 'users', customerId)) throw makeError(400, 'Cliente inválido')
  const customer = getById(db, 'users', customerId)
  if (customer.role !== 'customer') throw makeError(400, 'O agendamento precisa pertencer a um cliente')
  const expectedPaymentMethod = body.expectedPaymentMethod ?? null
  if (expectedPaymentMethod !== null && !['cash', 'pix', 'debit', 'credit'].includes(expectedPaymentMethod)) throw makeError(400, 'Forma de pagamento prevista inválida')
  const start = new Date(body.start)
  if (!body.start || Number.isNaN(start.getTime())) throw makeError(400, 'Informe um horário válido')
  const startIso = start.toISOString()
  const hold =
    body.holdKey ?
      db
        .get('slotHolds')
        .find({key: String(body.holdKey)})
        .value()
    : null
  if (body.holdKey && !hold) throw makeError(409, 'A reserva temporária não existe ou expirou')
  if (hold && new Date(hold.expiresAt).getTime() <= Date.now()) throw makeError(409, 'A reserva temporária expirou')
  if (hold?.userId && Number(hold.userId) !== Number(user.id)) throw makeError(404, 'Reserva temporária não encontrada')
  const options = {serviceIds: services.map(service => service.id), ignoreHoldId: hold?.id}
  const bypassAdvance = body.bypassAdvance === true
  const allowOutOfHours = body.allowOutOfHours === true
  if ((bypassAdvance || allowOutOfHours) && !hasPermission(user, 'agenda.manage')) throw makeError(403, 'Encaixes e exceções de antecedência exigem agenda.manage')
  let candidates = slotsAtStart(db, {...options, barberId: body.barberId, bypassAdvance, allowOutOfHours}, startIso)
  if (hold) candidates = candidates.filter(slot => Number(slot.barberId) === Number(hold.barberId) && slot.start === hold.start)
  if (!candidates.length) {
    const next = suggestedSlot(db, {...options, barberId: body.barberId}, startIso)
    throw makeError(409, 'Esse horário acabou de ser ocupado', {suggestedSlot: next})
  }
  const selected = candidates.sort((a, b) => {
    const count = barberId =>
      db
        .get('appointments')
        .value()
        .filter(item => Number(item.barberId) === Number(barberId) && ACTIVE_APPOINTMENT_STATUSES.has(item.status) && dateKey(item.start) === dateKey(startIso)).length
    return count(a.barberId) - count(b.barberId) || a.barberId - b.barberId
  })[0]
  if (user.role === 'barber' && Number(currentBarber(db, user)?.id) !== Number(selected.barberId)) throw makeError(403, 'Barbeiros só podem agendar na própria agenda')
  if (user.role === 'customer') {
    const futureCount = db
      .get('appointments')
      .value()
      .filter(appointment => Number(appointment.customerId) === customerId && ACTIVE_APPOINTMENT_STATUSES.has(appointment.status) && new Date(appointment.start).getTime() > Date.now()).length
    const maxFutureAppointments = Number(db.get('settings').find({id: 1}).value()?.booking?.maxFutureAppointments ?? 3)
    if (futureCount >= maxFutureAppointments) throw makeError(429, `Você pode manter até ${maxFutureAppointments} agendamentos futuros.`)
  }
  const at = nowIso()
  const totals = {subtotal: selected.subtotal, discount: 0, total: selected.subtotal}
  const autoConfirm = db.get('settings').find({id: 1}).value()?.booking?.autoConfirm !== false
  const appointment = {
    id: nextId(db, 'appointments'),
    code: `AG${String(Date.now()).slice(-8)}`,
    barberId: selected.barberId,
    customerId,
    start: selected.start,
    end: selected.end,
    status: autoConfirm ? 'confirmed' : 'pending',
    origin: user.role !== 'customer' && body.origin === 'admin' ? 'admin' : 'web',
    expectedPaymentMethod,
    items: selected.items,
    ...totals,
    notes: String(body.notes || '').slice(0, 500),
    rescheduleCount: 0,
    startedAt: null,
    finishedAt: null,
    canceledReason: null,
    events: [{at, type: 'created', by: Number(user.id)}, ...(autoConfirm ? [{at, type: 'confirmed', by: Number(user.id)}] : [])],
    createdAt: at,
    ...(customer.guest ? {guestToken: require('node:crypto').randomBytes(24).toString('hex')} : {})
  }
  await commit(
    db,
    user,
    'appointments.create',
    'appointments',
    appointment.id,
    state => {
      state.appointments.push(appointment)
      if (hold) state.slotHolds = state.slotHolds.filter(item => Number(item.id) !== Number(hold.id))
      settingsConfig.scheduleAppointmentNotifications(state, appointment, new Date(at))
    },
    {
      barberId: selected.barberId,
      start: selected.start,
      createdBy: Number(user.id),
      origin: appointment.origin,
      expectedPaymentMethod: appointment.expectedPaymentMethod,
      bypassAdvance,
      allowOutOfHours
    }
  )
  const result = publicAppointment(appointment)
  if (customer.guest) result.guestToken = appointment.guestToken
  return result
}

async function rescheduleAppointment(db, id, body, user, commit) {
  const appointment = getById(db, 'appointments', id)
  if (!appointment || !canReadAppointment(db, user, appointment)) throw makeError(404, 'Agendamento não encontrado')
  const staff = user.role !== 'customer'
  if (staff && !hasPermission(user, 'agenda.write')) throw makeError(403, 'Sem permissão para reagendar')
  if (!['pending', 'confirmed'].includes(appointment.status)) throw makeError(409, 'Este agendamento não pode ser reagendado')
  const settings = db.get('settings').find({id: 1}).value()?.booking || {}
  const maxChanges = Number(settings.maxReschedules ?? 2)
  if (!staff && Number(appointment.rescheduleCount || 0) >= maxChanges) throw makeError(409, 'Limite de reagendamentos atingido')
  if (!staff && (new Date(appointment.start).getTime() - Date.now()) / 3600000 < Number(settings.rescheduleBeforeHours ?? 0)) {
    throw makeError(409, 'O prazo para reagendar este horário foi encerrado.')
  }
  const start = new Date(body.start)
  if (Number.isNaN(start.getTime())) throw makeError(400, 'Informe um horário válido')
  const targetBarberId = Number(body.barberId || appointment.barberId)
  if (user.role === 'barber' && Number(currentBarber(db, user)?.id) !== targetBarberId) throw makeError(403, 'Barbeiros só podem reagendar na própria agenda')
  const serviceIds = appointment.items.map(item => item.serviceId)
  const hold =
    body.holdKey ?
      db
        .get('slotHolds')
        .find({key: String(body.holdKey)})
        .value()
    : null
  if (body.holdKey && !hold) throw makeError(409, 'A reserva temporária não existe ou expirou')
  if (hold && new Date(hold.expiresAt).getTime() <= Date.now()) throw makeError(409, 'A reserva temporária expirou')
  if (hold?.userId && Number(hold.userId) !== Number(user.id)) throw makeError(404, 'Reserva temporária não encontrada')
  const candidates = slotsAtStart(db, {serviceIds, barberId: targetBarberId, ignoreAppointmentId: appointment.id, ignoreHoldId: hold?.id}, start.toISOString()).filter(
    slot => !hold || Number(slot.barberId) === Number(hold.barberId)
  )
  if (!candidates.length)
    throw makeError(409, 'Esse horário não está mais disponível', {suggestedSlot: suggestedSlot(db, {serviceIds, barberId: targetBarberId, ignoreAppointmentId: appointment.id}, start.toISOString())})
  const selected = candidates[0]
  const previousStart = appointment.start
  const at = nowIso()
  await commit(
    db,
    user,
    'appointments.reschedule',
    'appointments',
    appointment.id,
    state => {
      const current = state.appointments.find(item => Number(item.id) === Number(appointment.id))
      current.barberId = selected.barberId
      current.start = selected.start
      current.end = selected.end
      current.items = selected.items
      current.subtotal = selected.subtotal
      current.total = selected.subtotal
      current.rescheduleCount = Number(current.rescheduleCount || 0) + (staff ? 0 : 1)
      current.events.push({
        at,
        type: 'rescheduled',
        by: Number(user.id),
        from: previousStart,
        to: selected.start,
        reason: String(body.reason || '')
          .trim()
          .slice(0, 300)
      })
      if (hold) state.slotHolds = state.slotHolds.filter(item => Number(item.id) !== Number(hold.id))
      state.notifications.forEach(notification => {
        if (Number(notification.appointmentId) === Number(current.id) && notification.status === 'scheduled') notification.status = 'canceled'
      })
      settingsConfig.scheduleAppointmentNotifications(state, current, new Date(at))
      if (body.notifyCustomer === true) {
        state.notifications.push({
          id: state.notifications.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1,
          userId: Number(current.customerId),
          appointmentId: Number(current.id),
          type: 'rescheduled',
          channel: 'whatsapp',
          status: 'queued',
          previousStart,
          newStart: selected.start,
          scheduledAt: at,
          sentAt: null
        })
      }
    },
    {
      previousStart,
      start: selected.start,
      barberId: selected.barberId,
      reason: String(body.reason || '')
        .trim()
        .slice(0, 300),
      notifyCustomer: body.notifyCustomer === true
    }
  )
  return getById(db, 'appointments', appointment.id)
}

function openAppointmentTab(state, appointment, at) {
  state.tabs = state.tabs || []
  if (state.tabs.some(tab => Number(tab.appointmentId) === Number(appointment.id) && tab.status === 'open')) return
  const items = appointment.items.map(item => ({
    type: 'service',
    refId: item.serviceId,
    name: item.name,
    qty: 1,
    unitPrice: item.price,
    discount: 0,
    barberId: appointment.barberId,
    commissionPct: item.commissionPct
  }))
  state.tabs.push({
    id: state.tabs.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1,
    appointmentId: appointment.id,
    customerId: appointment.customerId,
    barberId: appointment.barberId,
    type: 'appointment',
    status: 'open',
    items,
    tip: 0,
    discount: 0,
    total: appointment.total,
    createdAt: at,
    closedAt: null
  })
}

const TRANSITIONS = {pending: ['confirmed', 'canceled'], confirmed: ['checked_in', 'canceled', 'no_show'], checked_in: ['in_service', 'canceled'], in_service: [], done: [], canceled: [], no_show: []}

async function updateStatus(db, id, body, user, commit, allowCustomerCancel = false) {
  const appointment = getById(db, 'appointments', id)
  if (!appointment || !canReadAppointment(db, user, appointment)) throw makeError(404, 'Agendamento não encontrado')
  const status = body.status === 'no_show' ? 'no_show' : String(body.status || '')
  if ((user.role === 'customer' && !(allowCustomerCancel && status === 'canceled')) || (user.role !== 'customer' && !hasPermission(user, 'agenda.write')))
    throw makeError(403, 'Sem permissão para alterar o status')
  if (!TRANSITIONS[appointment.status]?.includes(status)) throw makeError(409, `Transição inválida: ${appointment.status} → ${status}`)
  const at = nowIso()
  await commit(
    db,
    user,
    `appointments.${status}`,
    'appointments',
    appointment.id,
    state => {
      const current = state.appointments.find(item => Number(item.id) === Number(appointment.id))
      current.status = status
      current.events.push({at, type: status, by: Number(user.id)})
      if (status === 'in_service') current.startedAt = at
      if (status === 'checked_in') openAppointmentTab(state, current, at)
      if (status === 'canceled') current.canceledReason = String(body.reason || '').slice(0, 300)
      const event = current.events.at(-1)
      if (event && body.reason) event.reason = String(body.reason).slice(0, 300)
      if (['canceled', 'no_show'].includes(status)) {
        state.notifications.forEach(notification => {
          if (Number(notification.appointmentId) === Number(current.id) && notification.status === 'scheduled') notification.status = 'canceled'
        })
      }
    },
    {reason: body.reason || null, cancellationType: body.cancellationType || null, offerReschedule: body.offerReschedule === true}
  )
  return getById(db, 'appointments', appointment.id)
}

async function finishService(db, id, user, commit) {
  const appointment = getById(db, 'appointments', id)
  if (!appointment || !canReadAppointment(db, user, appointment)) throw makeError(404, 'Agendamento não encontrado')
  if (user.role === 'customer' || !hasPermission(user, 'agenda.write')) throw makeError(403, 'Sem permissão para finalizar o atendimento')
  if (appointment.status !== 'in_service' || !appointment.startedAt || appointment.finishedAt) throw makeError(409, 'Este atendimento não pode ser finalizado')

  const at = nowIso()
  const actualDurationMin = Math.max(0, Math.round((new Date(at).getTime() - new Date(appointment.startedAt).getTime()) / 60000))
  await commit(
    db,
    user,
    'appointments.service.finish',
    'appointments',
    appointment.id,
    state => {
      const current = state.appointments.find(item => Number(item.id) === Number(appointment.id))
      current.finishedAt = at
      current.actualDurationMin = actualDurationMin
      current.events.push({at, type: 'service_finished', by: Number(user.id)})
    },
    {actualDurationMin}
  )
  return getById(db, 'appointments', appointment.id)
}

async function cancelAppointment(db, id, body, user, commit) {
  const appointment = getById(db, 'appointments', id)
  if (!appointment || !canReadAppointment(db, user, appointment)) throw makeError(404, 'Agendamento não encontrado')
  if (!['pending', 'confirmed', 'checked_in'].includes(appointment.status)) throw makeError(409, 'Este agendamento não pode ser cancelado')
  if (user.role !== 'customer' && !hasPermission(user, 'agenda.write')) throw makeError(403, 'Sem permissão para cancelar')
  if (user.role === 'customer') {
    const cancelBeforeHours = Number(db.get('settings').find({id: 1}).value()?.booking?.cancelBeforeHours ?? 0)
    if ((new Date(appointment.start).getTime() - Date.now()) / 3600000 < cancelBeforeHours) throw makeError(409, 'O prazo para cancelar este horário foi encerrado.')
  }
  if (user.role !== 'customer' && !String(body.reason || '').trim()) {
    throw makeError(400, 'Informe o motivo do cancelamento')
  }
  return updateStatus(db, id, {status: 'canceled', reason: body.reason, cancellationType: body.cancellationType, offerReschedule: body.offerReschedule}, user, commit, true)
}

async function updateItems(db, id, body, user, commit) {
  const appointment = getById(db, 'appointments', id)
  if (!appointment || !canReadAppointment(db, user, appointment)) throw makeError(404, 'Agendamento não encontrado')
  if (user.role === 'customer' || !hasPermission(user, 'agenda.write') || !['pending', 'confirmed'].includes(appointment.status))
    throw makeError(403, 'Os serviços deste agendamento não podem ser alterados')
  const serviceIds = Array.isArray(body.serviceIds) ? body.serviceIds : []
  const targetBarberId = Number(body.barberId || appointment.barberId)
  if (user.role === 'barber' && Number(currentBarber(db, user)?.id) !== targetBarberId) throw makeError(403, 'Barbeiros só podem alterar serviços na própria agenda')
  const pricing = bookingPrice(db, targetBarberId, serviceIds)
  const start = new Date(appointment.start)
  const candidates = slotsAtStart(db, {serviceIds, barberId: targetBarberId, ignoreAppointmentId: appointment.id}, start.toISOString())
  if (!candidates.length)
    throw makeError(409, 'A nova duração não cabe mais nesse horário', {
      suggestedSlot: suggestedSlot(db, {serviceIds, barberId: targetBarberId, ignoreAppointmentId: appointment.id}, start.toISOString())
    })
  const selected = candidates[0]
  const at = nowIso()
  await commit(
    db,
    user,
    'appointments.items.update',
    'appointments',
    appointment.id,
    state => {
      const current = state.appointments.find(item => Number(item.id) === Number(appointment.id))
      current.barberId = selected.barberId
      current.end = selected.end
      current.items = selected.items
      current.subtotal = pricing.subtotal
      current.total = pricing.subtotal
      current.events.push({at, type: 'items_updated', by: Number(user.id)})
    },
    {serviceIds}
  )
  return getById(db, 'appointments', appointment.id)
}

module.exports = {
  createAppointment,
  getPublicAppointment,
  listCustomerAppointments,
  listStaffAppointments,
  rescheduleAppointment,
  updateStatus,
  finishService,
  cancelAppointment,
  updateItems,
  openAppointmentTab,
  publicAppointment,
  dateKey
}
