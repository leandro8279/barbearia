const {ACTIVE_APPOINTMENT_STATUSES, getById, localDateString, makeError, minutesOf, nowIso, validDateString} = require('./core.cjs')

const DEFAULT_BOOKING = {
  slotGranularityMin: 15,
  minAdvanceMin: 60,
  maxDays: 45,
  defaultBufferMin: 0,
  cancelBeforeHours: 4,
  rescheduleBeforeHours: 4,
  maxReschedules: 2,
  autoConfirm: true,
  maxFutureAppointments: 3
}

const DEFAULT_NOTIFICATIONS = {
  events: {confirmation: true, reminder24: true, reminder2: true, post: true},
  channels: {whatsapp: true, email: false},
  quietHours: {enabled: true, start: '22:00', end: '08:00'},
  retentionDays: 180
}

const DEFAULT_TEMPLATES = {
  confirmation: 'Olá {nome}, seu horário com {barbeiro} está confirmado para {horario}.',
  reminder24: 'Olá {nome}, lembrete: seu horário com {barbeiro} é amanhã, {horario}.',
  reminder2: 'Olá {nome}, seu horário com {barbeiro} começa em breve: {horario}.',
  post: 'Olá {nome}, obrigado pela visita! Esperamos você novamente.'
}

const NOTIFICATION_TYPES = ['confirmation', 'reminder24', 'reminder2', 'post']
const NOTIFICATION_OFFSETS = {confirmation: 0, reminder24: -24 * 60, reminder2: -2 * 60}

function defaultHolidays() {
  const year = new Date().getFullYear()
  const rows = []
  for (const currentYear of [year - 1, year, year + 1, year + 2]) {
    for (const [monthDay, name] of [
      ['01-01', 'Confraternização Universal'],
      ['01-25', 'Aniversário da cidade de São Paulo'],
      ['04-21', 'Tiradentes'],
      ['05-01', 'Dia do Trabalho'],
      ['07-09', 'Revolução Constitucionalista de 1932'],
      ['09-07', 'Independência do Brasil'],
      ['10-12', 'Nossa Senhora Aparecida'],
      ['11-02', 'Finados'],
      ['11-15', 'Proclamação da República'],
      ['11-20', 'Dia Nacional de Zumbi e da Consciência Negra'],
      ['12-25', 'Natal']
    ]) {
      rows.push({date: `${currentYear}-${monthDay}`, name, closed: true, ranges: []})
    }
  }
  return rows
}

function getSettings(db) {
  return db.get('settings').find({id: 1}).value() || {id: 1, business: {unitId: 1, timezone: 'America/Sao_Paulo'}, booking: {}, notifications: {}}
}

function getBusinessHours(db) {
  const unit = db.get('units').find({id: 1}).value()
  if (!unit) throw makeError(404, 'Unidade não encontrada.')
  const holidays = unit.holidays || []
  const defaults = defaultHolidays()
  const defaultDates = new Set(defaults.map(item => item.date))
  const savedDates = new Set(holidays.map(item => item.date))
  const listedHolidays = [
    ...holidays.map(item => ({...item, isDefault: defaultDates.has(item.date)})),
    ...defaults.filter(item => !savedDates.has(item.date)).map(item => ({...item, isDefault: true}))
  ]
  return {businessHours: unit.businessHours || [], holidays: listedHolidays.sort((left, right) => left.date.localeCompare(right.date))}
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function cnpjValid(value) {
  const digits = onlyDigits(value)
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false
  const calculate = (base, weights) => {
    const remainder = base.split('').reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0) % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  const first = calculate(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = calculate(digits.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return digits.endsWith(`${first}${second}`)
}

function phoneValid(value) {
  const digits = onlyDigits(value).replace(/^55/, '')
  if (digits.length !== 10 && digits.length !== 11) return false
  const areaCode = Number(digits.slice(0, 2))
  const local = digits.slice(2)
  return areaCode >= 11 && areaCode <= 99 && (local.length === 9 ? /^9\d{8}$/.test(local) : /^[2-5]\d{7}$/.test(local))
}

function validImage(value, maxDataUrlBytes) {
  if (!value) return
  const image = String(value)
  if (image.startsWith('/') || /^https?:\/\/[^ ]+$/i.test(image)) return
  const match = /^data:image\/(?:png|jpe?g|webp|svg\+xml);base64,([a-z\d+/=]+)$/i.exec(image)
  if (!match) throw makeError(400, 'Use uma imagem válida em URL ou data URL.')
  if (Buffer.from(match[1], 'base64').length > 200 * 1024 || (maxDataUrlBytes && Buffer.byteLength(image, 'utf8') > maxDataUrlBytes)) throw makeError(400, 'Cada imagem deve ter no máximo 200 KB.')
}

function cleanText(value, max, field, required = false) {
  const text = String(value ?? '').trim()
  if (required && !text) throw makeError(400, `Informe ${field}.`)
  if (text.length > max) throw makeError(400, `${field} deve ter no máximo ${max} caracteres.`)
  return text
}

function normalizeAddress(input) {
  const fields = ['zip', 'street', 'number', 'complement', 'neighborhood', 'city', 'state', 'reference']
  const address = Object.fromEntries(fields.map(field => [field, cleanText(input?.[field], field === 'reference' ? 200 : 120, 'o endereço')]))
  const locality = [address.city, address.state].filter(Boolean).join(' - ')
  const lines = [[address.street, address.number].filter(Boolean).join(', '), address.complement, address.neighborhood, locality, address.zip].filter(Boolean)
  return {addressDetails: address, address: lines.join(', ')}
}

function normalizeSocials(input) {
  const socials = {}
  for (const field of ['instagram', 'facebook', 'tiktok', 'website']) {
    const value = cleanText(input?.[field], 500, 'o link')
    if (value && !/^https?:\/\/[^ ]+$/i.test(value)) throw makeError(400, `Informe um link válido para ${field}.`)
    socials[field] = value
  }
  return socials
}

function saveBusiness(db, input, user, commit) {
  const unit = db.get('units').find({id: 1}).value()
  if (!unit) throw makeError(404, 'Unidade não encontrada.')
  const name = cleanText(input.name, 120, 'o nome da barbearia', true)
  const cnpj = cleanText(input.cnpj, 24, 'o CNPJ')
  const phone = cleanText(input.phone, 24, 'o telefone', true)
  const whatsapp = cleanText(input.whatsapp, 24, 'o WhatsApp')
  const email = cleanText(input.email, 160, 'o e-mail')
  if (cnpj && !cnpjValid(cnpj)) throw makeError(400, 'Informe um CNPJ válido.')
  if (!phoneValid(phone)) throw makeError(400, 'Informe um telefone brasileiro válido com DDD.')
  if (whatsapp && !phoneValid(whatsapp)) throw makeError(400, 'Informe um WhatsApp brasileiro válido com DDD.')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw makeError(400, 'Informe um e-mail válido.')
  const address = normalizeAddress(input.addressDetails)
  const logo = String(input.logo || '')
  validImage(logo, 200 * 1024)
  const photos = Array.isArray(input.photos) ? input.photos.map(photo => String(photo || '').trim()).filter(Boolean) : []
  if (photos.length > 8) throw makeError(400, 'Cadastre no máximo oito fotos.')
  photos.forEach(validImage)
  const amenities = Array.isArray(input.amenities) ? [...new Set(input.amenities.map(item => cleanText(item, 60, 'a comodidade')).filter(Boolean))] : []
  if (amenities.length > 20) throw makeError(400, 'Cadastre no máximo vinte comodidades.')
  const socials = normalizeSocials(input.socials)
  const business = {...(getSettings(db).business || {}), name, cnpj, email, socials, unitId: 1, timezone: 'America/Sao_Paulo'}
  const update = {name, phone, whatsapp, ...address, logo: logo || null, photos, amenities}
  return commit(db, user, 'settings.business.update', 'units', 1, state => {
    const current = state.units.find(item => Number(item.id) === 1)
    Object.assign(current, update)
    const setting = state.settings.find(item => Number(item.id) === 1)
    setting.business = business
    return {unit: current, business}
  })
}

function timeMinutes(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ''))
  return match ? Number(match[1]) * 60 + Number(match[2]) : NaN
}

function normalizeRanges(values) {
  if (!Array.isArray(values) || values.length > 6) throw makeError(400, 'Cada dia pode ter até seis faixas de funcionamento.')
  const ranges = values
    .map(range => {
      const start = String(range?.start || '')
      const end = String(range?.end || '')
      const startMinute = timeMinutes(start)
      const endMinute = timeMinutes(end)
      if (!Number.isFinite(startMinute) || !Number.isFinite(endMinute) || startMinute >= endMinute) throw makeError(400, 'Confira os horários de funcionamento.')
      return {start, end, startMinute, endMinute}
    })
    .sort((left, right) => left.startMinute - right.startMinute)
  for (let index = 1; index < ranges.length; index += 1) {
    if (ranges[index].startMinute < ranges[index - 1].endMinute) throw makeError(400, 'As faixas de funcionamento não podem se sobrepor.')
  }
  return ranges.map(({start, end}) => ({start, end}))
}

function normalizeHours(input) {
  if (!Array.isArray(input) || input.length !== 7) throw makeError(400, 'Informe os horários dos sete dias da semana.')
  const weekdays = new Set()
  const businessHours = input
    .map(day => {
      const weekday = Number(day?.weekday)
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || weekdays.has(weekday)) throw makeError(400, 'Confira os dias da semana.')
      weekdays.add(weekday)
      return {weekday, ranges: normalizeRanges(day.ranges)}
    })
    .sort((left, right) => left.weekday - right.weekday)
  if (weekdays.size !== 7) throw makeError(400, 'Informe os horários dos sete dias da semana.')
  return businessHours
}

function normalizeHolidays(input) {
  if (!Array.isArray(input) || input.length > 200) throw makeError(400, 'Confira a lista de feriados e exceções.')
  const dates = new Set()
  return input
    .map(item => {
      const date = String(item?.date || '')
      const name = cleanText(item?.name, 120, 'o nome do feriado', true)
      if (!validDateString(date) || dates.has(date)) throw makeError(400, 'As datas dos feriados precisam ser válidas e únicas.')
      dates.add(date)
      const closed = item.closed === true
      const ranges = closed ? [] : normalizeRanges(item.ranges || [])
      return {date, name, closed, ranges}
    })
    .sort((left, right) => left.date.localeCompare(right.date))
}

function rangesForDate(businessHours, holidays, date) {
  const holiday = holidays.find(item => item.date === date)
  if (holiday) return holiday.closed ? [] : holiday.ranges
  const weekday = new Date(`${date}T12:00:00.000Z`).getUTCDay()
  return businessHours.find(item => item.weekday === weekday)?.ranges || []
}

function impactedAppointments(db, businessHours, holidays) {
  const now = Date.now()
  return db
    .get('appointments')
    .value()
    .filter(appointment => ACTIVE_APPOINTMENT_STATUSES.has(appointment.status) && new Date(appointment.start).getTime() > now)
    .filter(appointment => {
      const startDate = localDateString(new Date(appointment.start))
      const endDate = localDateString(new Date(appointment.end))
      const start = minutesOf(new Date(appointment.start))
      const end = minutesOf(new Date(appointment.end))
      return startDate !== endDate || !rangesForDate(businessHours, holidays, startDate).some(range => start >= timeMinutes(range.start) && end <= timeMinutes(range.end))
    })
    .map(appointment => ({
      id: Number(appointment.id),
      start: appointment.start,
      end: appointment.end,
      status: appointment.status,
      customerName: getById(db, 'users', appointment.customerId)?.name || 'Cliente',
      barberName: getById(db, 'users', getById(db, 'barbers', appointment.barberId)?.userId)?.name || 'Profissional'
    }))
    .sort((left, right) => left.start.localeCompare(right.start))
}

async function saveBusinessHours(db, input, user, commit) {
  const unit = db.get('units').find({id: 1}).value()
  if (!unit) throw makeError(404, 'Unidade não encontrada.')
  const businessHours = normalizeHours(input.businessHours)
  const holidays = normalizeHolidays(input.holidays)
  const impacted = impactedAppointments(db, businessHours, holidays)
  if (impacted.length && input.confirmAffected !== true)
    throw makeError(409, 'A mudança afeta agendamentos futuros. Revise o impacto e confirme que vai remarcar esses horários.', {impactedAppointments: impacted})
  await commit(
    db,
    user,
    'settings.hours.update',
    'units',
    1,
    state => {
      const current = state.units.find(item => Number(item.id) === 1)
      current.businessHours = businessHours
      current.holidays = holidays
      return {businessHours, holidays, impactedAppointments: impacted}
    },
    {impactedAppointmentIds: impacted.map(item => item.id)}
  )
  return {businessHours, holidays, impactedAppointments: impacted}
}

function saveBooking(db, input, user, commit) {
  const current = getSettings(db).booking || {}
  const number = (value, field, min, max) => {
    const result = Number(value)
    if (!Number.isInteger(result) || result < min || result > max) throw makeError(400, `${field} deve estar entre ${min} e ${max}.`)
    return result
  }
  const slotGranularityMin = number(input.slotGranularityMin, 'A grade', 15, 30)
  if (![15, 30].includes(slotGranularityMin)) throw makeError(400, 'A grade deve ser de 15 ou 30 minutos.')
  const booking = {
    ...current,
    slotGranularityMin,
    minAdvanceMin: number(input.minAdvanceMin, 'A antecedência mínima', 0, 10080),
    maxDays: number(input.maxDays, 'O limite de dias', 1, 365),
    defaultBufferMin: number(input.defaultBufferMin, 'O intervalo entre atendimentos', 0, 120),
    cancelBeforeHours: number(input.cancelBeforeHours, 'A janela de cancelamento', 0, 720),
    rescheduleBeforeHours: number(input.rescheduleBeforeHours, 'A janela de reagendamento', 0, 720),
    maxReschedules: number(input.maxReschedules, 'O limite de reagendamentos', 0, 20),
    autoConfirm: input.autoConfirm === true,
    maxFutureAppointments: number(input.maxFutureAppointments, 'O limite de agendamentos futuros', 1, 50)
  }
  return commit(db, user, 'settings.booking.update', 'settings', 1, state => {
    const setting = state.settings.find(item => Number(item.id) === 1)
    setting.booking = booking
    return booking
  })
}

function normalizeNotificationSettings(input) {
  const events = {}
  for (const type of NOTIFICATION_TYPES) {
    if (typeof input.events?.[type] !== 'boolean') throw makeError(400, 'Confira quando as notificações serão enviadas.')
    events[type] = input.events[type]
  }
  const channels = {}
  for (const channel of ['whatsapp', 'email']) {
    if (typeof input.channels?.[channel] !== 'boolean') throw makeError(400, 'Escolha os canais de notificação.')
    channels[channel] = input.channels[channel]
  }
  if (!channels.whatsapp && !channels.email) throw makeError(400, 'Ative pelo menos um canal de envio.')
  const enabled = input.quietHours?.enabled === true
  const start = String(input.quietHours?.start || '')
  const end = String(input.quietHours?.end || '')
  if (!Number.isFinite(timeMinutes(start)) || !Number.isFinite(timeMinutes(end)) || start === end) throw makeError(400, 'Confira o horário silencioso.')
  const retentionDays = Number(input.retentionDays)
  if (!Number.isInteger(retentionDays) || retentionDays < 30 || retentionDays > 730) throw makeError(400, 'A retenção deve ser de 30 a 730 dias.')
  return {events, channels, quietHours: {enabled, start, end}, retentionDays, reminders: events.reminder24 || events.reminder2, reminderHours: [24, 2]}
}

async function saveNotificationSettings(db, input, user, commit) {
  const notificationSettings = normalizeNotificationSettings(input)
  const templates = input.templates || {}
  for (const type of NOTIFICATION_TYPES) {
    const text = cleanText(templates[type], 1000, 'o texto da mensagem', true)
    if (text.length < 3) throw makeError(400, 'Cada mensagem precisa ter pelo menos três caracteres.')
  }
  await commit(db, user, 'settings.notifications.update', 'settings', 1, state => {
    const setting = state.settings.find(item => Number(item.id) === 1)
    setting.notifications = notificationSettings
    state.messageTemplates = state.messageTemplates || []
    for (const type of NOTIFICATION_TYPES) {
      const current = state.messageTemplates.find(item => item.type === type)
      if (current) current.text = String(templates[type]).trim()
      else state.messageTemplates.push({id: state.messageTemplates.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1, type, text: String(templates[type]).trim()})
    }
    return notificationSettings
  })
  return notificationSettings
}

function formatAppointmentTime(appointment) {
  if (!appointment?.start) return ''
  return new Intl.DateTimeFormat('pt-BR', {timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short'}).format(new Date(appointment.start))
}

function notificationMessage(state, type, appointment, user) {
  const template = state.messageTemplates?.find(item => item.type === type)?.text || DEFAULT_TEMPLATES[type] || ''
  const barber = state.barbers?.find(item => Number(item.id) === Number(appointment?.barberId))
  const barberUser = barber ? state.users.find(item => Number(item.id) === Number(barber.userId)) : null
  return String(template)
    .replaceAll('{nome}', String(user?.name || ''))
    .replaceAll('{barbeiro}', String(barberUser?.name || barber?.name || ''))
    .replaceAll('{horario}', formatAppointmentTime(appointment))
}

function quietAdjusted(timestamp, quietHours) {
  if (!quietHours?.enabled) return new Date(timestamp).toISOString()
  const date = new Date(timestamp)
  const local = new Date(date.getTime() - 3 * 60 * 60 * 1000)
  const minute = local.getUTCHours() * 60 + local.getUTCMinutes()
  const start = timeMinutes(quietHours.start)
  const end = timeMinutes(quietHours.end)
  const inside = start < end ? minute >= start && minute < end : minute >= start || minute < end
  if (!inside) return date.toISOString()
  const localDate = local.toISOString().slice(0, 10)
  const targetDate = start > end && minute >= start ? new Date(`${localDate}T12:00:00Z`) : new Date(`${localDate}T12:00:00Z`)
  if (start > end && minute >= start) targetDate.setUTCDate(targetDate.getUTCDate() + 1)
  const dateKey = targetDate.toISOString().slice(0, 10)
  return new Date(`${dateKey}T${quietHours.end}:00-03:00`).toISOString()
}

function hasNotification(state, appointmentId, type, channel) {
  return (state.notifications || []).some(item => Number(item.appointmentId) === Number(appointmentId) && item.type === type && item.channel === channel && item.status !== 'canceled')
}

function pushNotification(state, appointment, type, channel, scheduledAt, now = new Date()) {
  const user = state.users.find(item => Number(item.id) === Number(appointment.customerId))
  if (!user) return false
  if (!notificationAllowed(state, {type, channel, userId: user.id})) return false
  const config = state.settings.find(item => Number(item.id) === 1)?.notifications || DEFAULT_NOTIFICATIONS
  const row = {
    id: (state.notifications || []).reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1,
    userId: Number(user.id),
    appointmentId: Number(appointment.id),
    type,
    channel,
    status: 'scheduled',
    scheduledAt: quietAdjusted(scheduledAt, config.quietHours),
    sentAt: null,
    message: notificationMessage(state, type, appointment, user)
  }
  state.notifications = state.notifications || []
  state.notifications.push(row)
  return true
}

function notificationAllowed(state, notification) {
  const user = state.users.find(item => Number(item.id) === Number(notification.userId))
  if (!user) return false
  if (notification.channel === 'email' && !user.email) return false
  if (notification.channel === 'whatsapp' && !user.phone) return false
  if ((notification.type === 'reminder24' || notification.type === 'reminder2') && user.consent?.reminders === false) return false
  if (notification.type === 'post' && user.consent?.marketing === false) return false
  return true
}

function scheduleAppointmentNotifications(state, appointment, at = new Date()) {
  const config = {...DEFAULT_NOTIFICATIONS, ...(state.settings?.find(item => Number(item.id) === 1)?.notifications || {})}
  config.events = {...DEFAULT_NOTIFICATIONS.events, ...(config.events || {})}
  config.channels = {...DEFAULT_NOTIFICATIONS.channels, ...(config.channels || {})}
  const appointmentStart = new Date(appointment.start).getTime()
  for (const channel of ['whatsapp', 'email']) {
    if (!config.channels[channel]) continue
    for (const [type, offset] of Object.entries(NOTIFICATION_OFFSETS)) {
      if (!config.events[type] || hasNotification(state, appointment.id, type, channel)) continue
      const scheduledAt = type === 'confirmation' ? at.getTime() : appointmentStart + offset * 60000
      if (scheduledAt < at.getTime() && type !== 'confirmation') continue
      pushNotification(state, appointment, type, channel, scheduledAt, at)
    }
  }
}

function generatePendingNotifications(state, now = new Date()) {
  state.notifications = state.notifications || []
  const setting = state.settings?.find(item => Number(item.id) === 1) || {}
  const config = {...DEFAULT_NOTIFICATIONS, ...(setting.notifications || {})}
  config.events = {...DEFAULT_NOTIFICATIONS.events, ...(config.events || {})}
  config.channels = {...DEFAULT_NOTIFICATIONS.channels, ...(config.channels || {})}
  let created = 0
  for (const appointment of state.appointments || []) {
    const timestamp = new Date(appointment.start).getTime()
    if (ACTIVE_APPOINTMENT_STATUSES.has(appointment.status) && timestamp > now.getTime()) {
      for (const [type, offset] of [
        ['reminder24', -24 * 60],
        ['reminder2', -2 * 60]
      ]) {
        if (!config.events[type]) continue
        const scheduledAt = timestamp + offset * 60000
        if (scheduledAt <= now.getTime()) continue
        for (const channel of ['whatsapp', 'email']) {
          if (config.channels[channel] && !hasNotification(state, appointment.id, type, channel)) {
            if (pushNotification(state, appointment, type, channel, scheduledAt, now)) created += 1
          }
        }
      }
    }
    if (appointment.status === 'done' && config.events.post) {
      const user = state.users.find(item => Number(item.id) === Number(appointment.customerId))
      if (user?.consent?.marketing === false) continue
      const base = new Date(appointment.finishedAt || appointment.end).getTime() + 30 * 60000
      const scheduledAt = Math.max(base, now.getTime())
      for (const channel of ['whatsapp', 'email']) {
        if (config.channels[channel] && !hasNotification(state, appointment.id, 'post', channel)) {
          if (pushNotification(state, appointment, 'post', channel, scheduledAt, now)) created += 1
        }
      }
    }
  }
  const retentionDays = Number(config.retentionDays) || DEFAULT_NOTIFICATIONS.retentionDays
  const cutoff = now.getTime() - retentionDays * 86400000
  const before = state.notifications.length
  state.notifications = state.notifications.filter(item => {
    const timestamp = new Date(item.sentAt || item.scheduledAt || item.readyAt || 0).getTime()
    return !Number.isFinite(timestamp) || timestamp >= cutoff
  })
  return {created, expired: before - state.notifications.length}
}

function listNotifications(db) {
  return db
    .get('notifications')
    .value()
    .slice()
    .sort((left, right) => new Date(right.scheduledAt || right.sentAt || 0).getTime() - new Date(left.scheduledAt || left.sentAt || 0).getTime())
    .slice(0, 100)
    .map(item => {
      const user = getById(db, 'users', item.userId)
      const appointment = getById(db, 'appointments', item.appointmentId)
      const barber = appointment ? getById(db, 'barbers', appointment.barberId) : null
      return {
        ...item,
        customerName: user?.name || 'Cliente',
        customerPhone: user?.phone || '',
        customerEmail: user?.email || '',
        appointmentStart: appointment?.start || null,
        barberName: getById(db, 'users', barber?.userId)?.name || barber?.name || 'Profissional'
      }
    })
}

function notificationUrl(notification, user) {
  const message = String(notification.message || '')
  if (notification.channel === 'whatsapp') {
    const digits = onlyDigits(user.phone)
    if (!digits) throw makeError(400, 'O cliente não tem telefone cadastrado para WhatsApp.')
    const phone = digits.startsWith('55') ? digits : `55${digits}`
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  }
  if (!user.email) throw makeError(400, 'O cliente não tem e-mail cadastrado.')
  return `mailto:${encodeURIComponent(user.email)}?subject=${encodeURIComponent('Mensagem da Barbearia')}&body=${encodeURIComponent(message)}`
}

async function resendNotification(db, id, user, commit) {
  const original = getById(db, 'notifications', id)
  if (!original) throw makeError(404, 'Notificação não encontrada.')
  if (!notificationAllowed(db.getState(), original)) throw makeError(409, 'O cliente não pode receber esta mensagem pelo canal selecionado.')
  const customer = getById(db, 'users', original.userId)
  if (!customer) throw makeError(404, 'Cliente da notificação não encontrado.')
  const appointment = original.appointmentId ? getById(db, 'appointments', original.appointmentId) : null
  const message = original.message || notificationMessage(db.getState(), original.type, appointment, customer)
  const createdAt = nowIso()
  const resend = {
    ...original,
    id:
      db
        .get('notifications')
        .value()
        .reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1,
    status: 'ready',
    scheduledAt: createdAt,
    sentAt: null,
    readyAt: createdAt,
    resendOf: Number(original.id),
    message
  }
  const url = notificationUrl(resend, customer)
  await commit(
    db,
    user,
    'notifications.resend.prepare',
    'notifications',
    resend.id,
    state => {
      state.notifications.push(resend)
    },
    {resendOf: Number(original.id), channel: original.channel}
  )
  return {notification: listNotifications(db).find(item => Number(item.id) === Number(resend.id)), url}
}

async function markNotificationSent(db, id, user, commit) {
  const original = getById(db, 'notifications', id)
  if (!original) throw makeError(404, 'Notificação não encontrada.')
  if (original.status !== 'ready') throw makeError(409, 'Somente mensagens prontas podem ser registradas como enviadas.')
  const sentAt = nowIso()
  const sent = {
    ...original,
    id:
      db
        .get('notifications')
        .value()
        .reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1,
    status: 'sent',
    sentAt,
    sentFrom: Number(original.id)
  }
  await commit(
    db,
    user,
    'notifications.sent.register',
    'notifications',
    sent.id,
    state => {
      state.notifications.push(sent)
    },
    {sentFrom: Number(original.id), channel: original.channel}
  )
  return listNotifications(db).find(item => Number(item.id) === Number(sent.id))
}

module.exports = {
  DEFAULT_BOOKING,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_TEMPLATES,
  NOTIFICATION_TYPES,
  getSettings,
  getBusinessHours,
  generatePendingNotifications,
  listNotifications,
  normalizeNotificationSettings,
  notificationAllowed,
  saveBooking,
  saveBusiness,
  saveBusinessHours,
  saveNotificationSettings,
  scheduleAppointmentNotifications,
  resendNotification,
  markNotificationSent
}
