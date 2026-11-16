const {ACTIVE_APPOINTMENT_STATUSES, getById, hasPermission, makeError, nextId, validDateString} = require('./core.cjs')

function nextDate(date, weeks) {
  const value = new Date(`${date}T12:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + weeks * 7)
  return value.toISOString().slice(0, 10)
}

function timeBlockStart(date, time) {
  return new Date(`${date}T${time}:00-03:00`).toISOString()
}

function createTimeBlocks(db, body, user, commit) {
  if (!hasPermission(user, 'agenda.write')) throw makeError(403, 'Sem permissão para bloquear a agenda')
  const date = String(body.date || '')
  if (!validDateString(date)) throw makeError(400, 'Informe uma data válida')
  const allDay = body.allDay === true
  const startTime = allDay ? '00:00' : String(body.startTime || '')
  const endTime = allDay ? '00:00' : String(body.endTime || '')
  if (!allDay && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || startTime >= endTime)) throw makeError(400, 'Informe um intervalo de horários válido')
  const repeatWeeks = Number(body.repeatWeeks || 1)
  if (!Number.isInteger(repeatWeeks) || repeatWeeks < 1 || repeatWeeks > 8) throw makeError(400, 'A repetição deve ficar entre 1 e 8 semanas')
  const requestedBarbers =
    body.barberIds === null ? [null]
    : Array.isArray(body.barberIds) ? [...new Set(body.barberIds.map(Number))]
    : []
  if (!requestedBarbers.length) throw makeError(400, 'Selecione pelo menos um barbeiro')
  for (const barberId of requestedBarbers) {
    if (barberId !== null && (!Number.isInteger(barberId) || !getById(db, 'barbers', barberId))) throw makeError(400, 'Barbeiro inválido')
  }
  const reason = String(body.reason || '')
    .trim()
    .slice(0, 120)
  if (!reason) throw makeError(400, 'Informe o motivo do bloqueio')
  const startsAt = []
  for (let week = 0; week < repeatWeeks; week += 1) {
    const occurrenceDate = nextDate(date, week)
    const start = timeBlockStart(occurrenceDate, startTime)
    const end = allDay ? timeBlockStart(nextDate(occurrenceDate, 1), '00:00') : timeBlockStart(occurrenceDate, endTime)
    startsAt.push({date: occurrenceDate, start, end})
  }
  const conflicts = db
    .get('appointments')
    .value()
    .filter(appointment => {
      if (!ACTIVE_APPOINTMENT_STATUSES.has(appointment.status)) return false
      if (!requestedBarbers.includes(null) && !requestedBarbers.includes(Number(appointment.barberId))) return false
      return startsAt.some(interval => new Date(appointment.start).getTime() < new Date(interval.end).getTime() && new Date(interval.start).getTime() < new Date(appointment.end).getTime())
    })
    .map(appointment => ({
      id: Number(appointment.id),
      start: appointment.start,
      end: appointment.end,
      status: appointment.status,
      customerName: getById(db, 'users', appointment.customerId)?.name || 'Cliente',
      barberId: Number(appointment.barberId),
      barberName: getById(db, 'users', getById(db, 'barbers', appointment.barberId)?.userId)?.name || 'Profissional'
    }))
  if (conflicts.length) throw makeError(409, 'Remarque os atendimentos antes de bloquear este período', {conflicts})
  const records = startsAt.flatMap(interval =>
    requestedBarbers.map(barberId => ({
      id: nextId(db, 'timeBlocks') + startsAt.indexOf(interval) * requestedBarbers.length + requestedBarbers.indexOf(barberId),
      barberId,
      start: interval.start,
      end: interval.end,
      type: body.type === 'timeoff' ? 'timeoff' : 'block',
      reason
    }))
  )
  const action = async () =>
    commit(
      db,
      user,
      'timeBlocks.create',
      'timeBlocks',
      records[0]?.id,
      state => {
        state.timeBlocks = state.timeBlocks || []
        state.timeBlocks.push(...records)
      },
      {count: records.length, barberIds: requestedBarbers, reason, repeatWeeks}
    )
  return action().then(() => records)
}

function timeOffDraft(db, body, user) {
  if (!hasPermission(user, 'team.write')) throw makeError(403, 'Sem permissão para registrar folgas da equipe')
  const fromDate = String(body.fromDate || body.date || '')
  const toDate = String(body.toDate || fromDate)
  if (!validDateString(fromDate) || !validDateString(toDate) || toDate < fromDate) throw makeError(400, 'Informe um período válido.')
  const days = Math.round((new Date(`${toDate}T12:00:00.000Z`).getTime() - new Date(`${fromDate}T12:00:00.000Z`).getTime()) / 86400000) + 1
  if (days > 366) throw makeError(400, 'O período não pode passar de um ano.')
  const allDay = body.allDay === true
  const startTime = allDay ? '00:00' : String(body.startTime || '')
  const endTime = allDay ? '00:00' : String(body.endTime || '')
  if (!allDay && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || startTime >= endTime)) {
    throw makeError(400, 'Informe um intervalo de horários válido.')
  }
  const barberIds = Array.isArray(body.barberIds) ? [...new Set(body.barberIds.map(Number))] : []
  if (!barberIds.length || barberIds.some(id => !Number.isInteger(id) || !getById(db, 'barbers', id))) throw makeError(400, 'Selecione profissionais válidos.')
  const reason = String(body.reason || '')
  if (!['Folga', 'Férias', 'Atestado', 'Curso'].includes(reason)) throw makeError(400, 'Selecione um motivo válido.')
  const intervals = Array.from({length: days}, (_, offset) => {
    const date = nextDate(fromDate, 0)
    const day = new Date(`${date}T12:00:00.000Z`)
    day.setUTCDate(day.getUTCDate() + offset)
    const occurrenceDate = day.toISOString().slice(0, 10)
    const start = timeBlockStart(occurrenceDate, startTime)
    const end = allDay ? timeBlockStart(nextDate(occurrenceDate, 1), '00:00') : timeBlockStart(occurrenceDate, endTime)
    return {date: occurrenceDate, start, end}
  })
  const conflicts = db
    .get('appointments')
    .value()
    .filter(appointment => ACTIVE_APPOINTMENT_STATUSES.has(appointment.status))
    .filter(appointment => barberIds.includes(Number(appointment.barberId)))
    .filter(appointment =>
      intervals.some(interval => new Date(appointment.start).getTime() < new Date(interval.end).getTime() && new Date(interval.start).getTime() < new Date(appointment.end).getTime())
    )
    .map(appointment => ({
      id: Number(appointment.id),
      start: appointment.start,
      end: appointment.end,
      status: appointment.status,
      customerName: getById(db, 'users', appointment.customerId)?.name || 'Cliente',
      barberId: Number(appointment.barberId),
      barberName: getById(db, 'users', getById(db, 'barbers', appointment.barberId)?.userId)?.name || 'Profissional'
    }))
    .sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime())
  return {barberIds, reason, intervals, conflicts}
}

function previewTimeOffBlocks(db, body, user) {
  const draft = timeOffDraft(db, body, user)
  return {conflicts: draft.conflicts, count: draft.intervals.length * draft.barberIds.length}
}

async function createTimeOffBlocks(db, body, user, commit) {
  const draft = timeOffDraft(db, body, user)
  if (draft.conflicts.length) throw makeError(409, 'Remarque os atendimentos antes de registrar o período.', {conflicts: draft.conflicts})
  const firstId = nextId(db, 'timeBlocks')
  const records = draft.intervals.flatMap((interval, intervalIndex) =>
    draft.barberIds.map((barberId, barberIndex) => ({
      id: firstId + intervalIndex * draft.barberIds.length + barberIndex,
      barberId,
      start: interval.start,
      end: interval.end,
      type: 'timeoff',
      reason: draft.reason
    }))
  )
  await commit(
    db,
    user,
    'timeBlocks.timeoff.create',
    'timeBlocks',
    records[0]?.id,
    state => {
      state.timeBlocks = state.timeBlocks || []
      state.timeBlocks.push(...records)
    },
    {count: records.length, barberIds: draft.barberIds, reason: draft.reason}
  )
  return {items: records, conflicts: []}
}

module.exports = {createTimeBlocks, createTimeOffBlocks, previewTimeOffBlocks}
