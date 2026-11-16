const {ACTIVE_APPOINTMENT_STATUSES, localDateTime, localDateString, validDateString, overlaps, makeError} = require('./core.cjs')

function timeToMinutes(value) {
  if (typeof value === 'number') return value
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ''))
  return match ? Number(match[1]) * 60 + Number(match[2]) : NaN
}

function intervals(values = []) {
  return values
    .map(value => {
      if (Array.isArray(value)) return {start: timeToMinutes(value[0]), end: timeToMinutes(value[1])}
      return {start: timeToMinutes(value.start), end: timeToMinutes(value.end)}
    })
    .filter(range => Number.isFinite(range.start) && Number.isFinite(range.end) && range.start < range.end)
}

function requestedServices(db, ids) {
  const serviceIds = [...new Set((Array.isArray(ids) ? ids : String(ids || '').split(',')).map(Number).filter(Number.isFinite))]
  if (!serviceIds.length || serviceIds.length > 4) throw makeError(400, 'Informe de 1 a 4 serviços')
  const servicesById = new Map(
    db
      .get('services')
      .value()
      .map(service => [Number(service.id), service])
  )
  const services = serviceIds.map(id => servicesById.get(id)).filter(service => service && service.active !== false)
  if (services.length !== serviceIds.length) throw makeError(400, 'Um ou mais serviços não estão disponíveis')
  return services
}

function priceAndDuration(db, barberId, services) {
  const defaultBufferMin = Number(db.get('settings').find({id: 1}).value()?.booking?.defaultBufferMin) || 0
  const items = services.map(service => {
    const override = db
      .get('barberServices')
      .find(entry => Number(entry.barberId) === Number(barberId) && Number(entry.serviceId) === Number(service.id))
      .value()
    return {
      serviceId: Number(service.id),
      name: service.name,
      durationMin: Number(override?.durationMin ?? service.durationMin),
      price: Number(override?.price ?? service.price),
      commissionPct: Number(override?.commissionPct ?? service.commissionPct ?? 0),
      bufferMin: Number(service.bufferMin) || defaultBufferMin
    }
  })
  return {
    items: items.map(({bufferMin, ...item}) => item),
    durationMin: items.reduce((total, item) => total + item.durationMin, 0),
    bufferMin: items.at(-1)?.bufferMin || 0,
    subtotal: items.reduce((total, item) => total + item.price, 0)
  }
}

function unitRanges(db, weekday, date) {
  const unit = db.get('units').find({id: 1}).value()
  const holiday = unit?.holidays?.find(item => item.date === date)
  if (holiday?.closed) return []
  const exception = holiday?.ranges ? intervals(holiday.ranges) : null
  const businessHours = (unit?.businessHours || []).find(entry => Number(entry.weekday) === weekday)
  return exception || intervals(businessHours?.ranges)
}

function barberFor(db, id, serviceIds) {
  const barber = db
    .get('barbers')
    .find({id: Number(id), active: true})
    .value()
  if (!barber) return null
  const allowed = db
    .get('barberServices')
    .value()
    .filter(entry => Number(entry.barberId) === Number(barber.id))
    .map(entry => Number(entry.serviceId))
  if (allowed.length && serviceIds.some(serviceId => !allowed.includes(Number(serviceId)))) return null
  const serviceList = db.get('services').value()
  if (!allowed.length && serviceIds.some(serviceId => !serviceList.some(service => Number(service.id) === Number(serviceId)))) return null
  return barber
}

function blockedIntervals(db, barberId, date, ignoreAppointmentId, ignoreHoldId) {
  const from = localDateTime(date, 0).getTime()
  const to = localDateTime(date, 24 * 60).getTime()
  const appointments = db
    .get('appointments')
    .value()
    .filter(
      appointment =>
        Number(appointment.barberId) === Number(barberId) &&
        Number(appointment.id) !== Number(ignoreAppointmentId) &&
        ACTIVE_APPOINTMENT_STATUSES.has(appointment.status) &&
        new Date(appointment.start).getTime() < to &&
        new Date(appointment.end).getTime() > from
    )
    .map(appointment => ({start: new Date(appointment.start).getTime(), end: new Date(appointment.end).getTime()}))
  const blocks = db
    .get('timeBlocks')
    .value()
    .filter(block => (block.barberId == null || Number(block.barberId) === Number(barberId)) && new Date(block.start).getTime() < to && new Date(block.end).getTime() > from)
    .map(block => ({start: new Date(block.start).getTime(), end: new Date(block.end).getTime()}))
  const now = Date.now()
  const holds = db
    .get('slotHolds')
    .value()
    .filter(
      hold =>
        Number(hold.barberId) === Number(barberId) &&
        Number(hold.id) !== Number(ignoreHoldId) &&
        new Date(hold.expiresAt).getTime() > now &&
        new Date(hold.start).getTime() < to &&
        new Date(hold.end).getTime() > from
    )
    .map(hold => ({start: new Date(hold.start).getTime(), end: new Date(hold.end).getTime()}))
  return [...appointments, ...blocks, ...holds]
}

function getSlots(db, {date, serviceIds, barberId, ignoreAppointmentId, ignoreHoldId, bypassAdvance = false, allowOutOfHours = false}) {
  if (!validDateString(date)) throw makeError(400, 'Informe a data no formato AAAA-MM-DD')
  const services = requestedServices(db, serviceIds)
  const day = new Date(`${date}T12:00:00-03:00`)
  const weekday = day.getUTCDay()
  const unitWork = allowOutOfHours ? [{start: 0, end: 24 * 60}] : unitRanges(db, weekday, date)
  if (!unitWork.length) return []
  const settings = db.get('settings').find({id: 1}).value()?.booking || {}
  const minAdvance = bypassAdvance ? 0 : Number(settings.minAdvanceMin ?? 60)
  const maxDays = Number(settings.maxDays ?? 45)
  const today = new Date()
  const todayDate = localDateString(today)
  const dayOffset = Math.floor((localDateTime(date, 12 * 60).getTime() - localDateTime(todayDate, 12 * 60).getTime()) / 86400000)
  if (dayOffset < 0 || dayOffset > maxDays) return []
  const eligible =
    barberId ?
      [
        barberFor(
          db,
          barberId,
          services.map(service => service.id)
        )
      ].filter(Boolean)
    : db
        .get('barbers')
        .value()
        .filter(
          barber =>
            barber.active &&
            barberFor(
              db,
              barber.id,
              services.map(service => service.id)
            )
        )
  const granularity = Math.max(5, Number(settings.slotGranularityMin ?? 15))
  const earliest = Date.now() + minAdvance * 60000
  const results = []

  for (const barber of eligible) {
    const schedule = db
      .get('schedules')
      .find({barberId: Number(barber.id), weekday})
      .value()
    if (!schedule && !allowOutOfHours) continue
    const pricing = priceAndDuration(db, barber.id, services)
    const staffRanges =
      allowOutOfHours ? unitWork : (
        intervals(schedule.ranges).flatMap(range =>
          unitWork.map(unitRange => ({start: Math.max(range.start, unitRange.start), end: Math.min(range.end, unitRange.end)})).filter(intersection => intersection.start < intersection.end)
        )
      )
    const pauses = allowOutOfHours ? [] : intervals(schedule.breaks)
    const blocked = blockedIntervals(db, barber.id, date, ignoreAppointmentId, ignoreHoldId)
    for (const range of staffRanges) {
      for (let startMin = Math.ceil(range.start / granularity) * granularity; startMin + pricing.durationMin + pricing.bufferMin <= range.end; startMin += granularity) {
        const start = localDateTime(date, startMin)
        const end = localDateTime(date, startMin + pricing.durationMin + pricing.bufferMin)
        if (start.getTime() < earliest) continue
        if (pauses.some(pause => startMin < pause.end && startMin + pricing.durationMin + pricing.bufferMin > pause.start)) continue
        if (blocked.some(interval => overlaps(start.getTime(), end.getTime(), interval.start, interval.end))) continue
        results.push({
          barberId: Number(barber.id),
          start: start.toISOString(),
          end: end.toISOString(),
          durationMin: pricing.durationMin,
          bufferMin: pricing.bufferMin,
          items: pricing.items,
          subtotal: pricing.subtotal,
          total: pricing.subtotal
        })
      }
    }
  }
  return results.sort((a, b) => a.start.localeCompare(b.start) || a.barberId - b.barberId)
}

module.exports = {getSlots, requestedServices, priceAndDuration}
