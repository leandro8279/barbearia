const {canReadAppointment, getById, hasPermission, localDateString, makeError, nextId, nowIso, safeUser} = require('./core.cjs')

const SORT_FIELDS = new Set(['name', 'lastVisit', 'visitsCount', 'totalSpentCents'])
const DAY_MS = 24 * 60 * 60 * 1000

function records(db, collection) {
  const value = db.get(collection).value()
  return Array.isArray(value) ? value : []
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

function normalizePhone(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .replace(/^55(?=\d{10,11}$)/, '')
}

function maskPhone(value) {
  const digits = normalizePhone(value)
  return digits ? `(**) *****-**${digits.slice(-2)}` : ''
}

function customerMetrics(db) {
  const metrics = new Map()
  for (const appointment of records(db, 'appointments')) {
    if (appointment.status !== 'done') continue
    const customerId = Number(appointment.customerId)
    if (!Number.isFinite(customerId)) continue
    const metric = metrics.get(customerId) ?? {lastVisit: null, visitsCount: 0, totalSpentCents: 0}
    const start = new Date(appointment.start)
    if (!Number.isNaN(start.getTime()) && (!metric.lastVisit || start.getTime() > new Date(metric.lastVisit).getTime())) metric.lastVisit = start.toISOString()
    metric.visitsCount += 1
    metrics.set(customerId, metric)
  }
  for (const tab of records(db, 'tabs')) {
    if (tab.status !== 'closed') continue
    const customerId = Number(tab.customerId)
    if (!Number.isFinite(customerId)) continue
    const metric = metrics.get(customerId) ?? {lastVisit: null, visitsCount: 0, totalSpentCents: 0}
    metric.totalSpentCents += Number(tab.total || 0) + Number(tab.tip || 0)
    metrics.set(customerId, metric)
  }
  return metrics
}

function validCPF(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false
  const calculate = length => {
    const sum = digits
      .slice(0, length)
      .split('')
      .reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0)
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  return calculate(9) === Number(digits[9]) && calculate(10) === Number(digits[10])
}

function customerInput(body) {
  const name = String(body.name || '').trim()
  const phone = normalizePhone(body.phone)
  const email = String(body.email || '')
    .trim()
    .toLocaleLowerCase('pt-BR')
  const birthDate = String(body.birthDate || '').trim()
  const cpf = String(body.cpf || '').replace(/\D/g, '')
  const referralSource = String(body.referralSource || '').trim()

  if (name.length < 2 || name.length > 100) throw makeError(400, 'Informe o nome do cliente.')
  const areaCode = Number(phone.slice(0, 2))
  const localNumber = phone.slice(2)
  const validPhone = areaCode >= 11 && areaCode <= 99 && ((localNumber.length === 8 && /^[2-5]\d{7}$/.test(localNumber)) || (localNumber.length === 9 && /^9\d{8}$/.test(localNumber)))
  if (!validPhone) throw makeError(400, 'Informe um telefone brasileiro válido com DDD.')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw makeError(400, 'Informe um e-mail válido.')
  if (birthDate) {
    const parsed = new Date(`${birthDate}T00:00:00.000Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== birthDate) throw makeError(400, 'Informe uma data de nascimento válida.')
  }
  if (cpf && !validCPF(cpf)) throw makeError(400, 'Informe um CPF válido.')
  if (referralSource.length > 120) throw makeError(400, 'Como conheceu a barbearia deve ter até 120 caracteres.')

  const tags = [...new Set((Array.isArray(body.tags) ? body.tags : []).map(tag => String(tag).trim()).filter(Boolean))].slice(0, 12)
  const consent = body.consent && typeof body.consent === 'object' ? body.consent : {}
  return {
    name,
    phone,
    email: email || null,
    cpf: cpf || null,
    birthDate: birthDate || null,
    referralSource: referralSource || null,
    tags,
    consent: {reminders: Boolean(consent.reminders), marketing: Boolean(consent.marketing), at: nowIso()}
  }
}

function findAdminCustomerDuplicates(db, query = {}) {
  const phone = normalizePhone(query.phone)
  const name = normalizeText(query.name).trim()
  const excludeId = Number(query.excludeId)
  if (phone.length < 10 && name.length < 3) return []

  return records(db, 'users')
    .filter(customer => customer.role === 'customer' && Number(customer.id) !== excludeId)
    .map(customer => {
      const matchedBy = []
      if (phone.length >= 10 && normalizePhone(customer.phone) === phone) matchedBy.push('phone')
      if (name.length >= 3 && normalizeText(customer.name).trim() === name) matchedBy.push('name')
      return {customer, matchedBy}
    })
    .filter(result => result.matchedBy.length > 0)
    .sort((left, right) => {
      const phoneMatch = Number(right.matchedBy.includes('phone')) - Number(left.matchedBy.includes('phone'))
      return phoneMatch || left.customer.name.localeCompare(right.customer.name, 'pt-BR')
    })
    .slice(0, 5)
    .map(({customer, matchedBy}) => ({id: Number(customer.id), name: String(customer.name || ''), phone: String(customer.phone || ''), matchedBy}))
}

function getAdminCustomerProfile(db, user, id) {
  const customer = getById(db, 'users', id)
  if (!customer || customer.role !== 'customer') throw makeError(404, 'Cliente não encontrado.')

  const canWrite = hasPermission(user, 'customers.write')
  const canReadHistory = hasPermission(user, 'agenda.read')
  const canReadFinancial = hasPermission(user, 'cash.read')
  const completedVisits = records(db, 'appointments')
    .filter(appointment => Number(appointment.customerId) === Number(id) && appointment.status === 'done')
    .map(appointment => new Date(appointment.start).getTime())
    .filter(Number.isFinite)
    .sort((left, right) => left - right)
  const intervals = completedVisits
    .slice(1)
    .map((visit, index) => (visit - completedVisits[index]) / DAY_MS)
    .sort((left, right) => left - right)
  const middle = Math.floor(intervals.length / 2)
  const medianIntervalDays = intervals.length === 0 ? null : Math.round((intervals.length % 2 ? intervals[middle] : (intervals[middle - 1] + intervals[middle]) / 2) * 10) / 10

  const closedTabs = records(db, 'tabs')
    .filter(tab => Number(tab.customerId) === Number(id) && tab.status === 'closed')
    .sort((left, right) => String(right.closedAt || right.createdAt).localeCompare(String(left.closedAt || left.createdAt)))
  const averageTicketCents = closedTabs.length ? Math.round(closedTabs.reduce((sum, tab) => sum + Number(tab.total || 0) + Number(tab.tip || 0), 0) / closedTabs.length) : 0

  const visibleUser = {
    id: Number(customer.id),
    name: String(customer.name || ''),
    email: customer.email || null,
    phone: canWrite ? String(customer.phone || '') : maskPhone(customer.phone),
    phoneMasked: !canWrite,
    avatar: customer.avatar || null,
    birthDate: customer.birthDate || null,
    cpf: canWrite ? customer.cpf || null : null,
    tags: Array.isArray(customer.tags) ? customer.tags : [],
    referralSource: customer.referralSource || null,
    guest: Boolean(customer.guest),
    consent: canWrite ? customer.consent || {reminders: false, marketing: false, at: null} : null
  }

  const appointments =
    canReadHistory ?
      records(db, 'appointments')
        .filter(appointment => Number(appointment.customerId) === Number(id) && canReadAppointment(db, user, appointment))
        .sort((left, right) => String(right.start).localeCompare(String(left.start)))
        .map(appointment => ({
          id: Number(appointment.id),
          code: String(appointment.code || ''),
          start: appointment.start,
          end: appointment.end,
          status: String(appointment.status || ''),
          items: (Array.isArray(appointment.items) ? appointment.items : []).map(item => ({
            name: String(item.name || 'Serviço'),
            priceCents: Number(item.price || 0),
            durationMin: Number(item.durationMin || 0)
          }))
        }))
    : []

  const financial =
    canReadFinancial ?
      closedTabs.map(tab => ({
        id: Number(tab.id),
        appointmentId: tab.appointmentId ? Number(tab.appointmentId) : null,
        date: tab.closedAt || tab.createdAt,
        totalCents: Number(tab.total || 0) + Number(tab.tip || 0),
        items: (Array.isArray(tab.items) ? tab.items : []).map(item => ({name: String(item.name || 'Item'), qty: Number(item.qty || 1)})),
        payments: records(db, 'payments')
          .filter(payment => Number(payment.tabId) === Number(tab.id) && payment.status !== 'refunded')
          .map(payment => ({method: String(payment.method || ''), amountCents: Number(payment.amountCents || 0)}))
      }))
    : []

  const notes =
    canWrite ?
      records(db, 'customerNotes')
        .filter(note => Number(note.userId) === Number(id))
        .sort((left, right) => Number(Boolean(right.pinned)) - Number(Boolean(left.pinned)) || String(right.createdAt).localeCompare(String(left.createdAt)))
        .map(note => ({id: Number(note.id), type: String(note.type || 'general'), text: String(note.text || ''), pinned: Boolean(note.pinned), createdAt: note.createdAt}))
    : []

  const metrics = customerMetrics(db).get(Number(id)) ?? {lastVisit: null, visitsCount: 0, totalSpentCents: 0}
  return {
    customer: visibleUser,
    metrics: {visitsCount: metrics.visitsCount, averageTicketCents, medianIntervalDays, lastVisit: metrics.lastVisit, totalSpentCents: metrics.totalSpentCents},
    permissions: {history: canReadHistory, financial: canReadFinancial, notes: canWrite, edit: canWrite, schedule: hasPermission(user, 'agenda.write')},
    appointments,
    financial,
    notes
  }
}

async function saveAdminCustomer(db, user, id, body, commitWrite) {
  const input = customerInput(body)
  const customerId = id ? Number(id) : null
  const existing = customerId ? getById(db, 'users', customerId) : null
  if (customerId && (!existing || existing.role !== 'customer')) throw makeError(404, 'Cliente não encontrado.')
  const duplicate = records(db, 'users').find(record => record.role === 'customer' && Number(record.id) !== customerId && normalizePhone(record.phone) === input.phone)
  if (duplicate) throw makeError(409, 'Este telefone já está cadastrado para outro cliente.', {duplicate: {id: Number(duplicate.id), name: duplicate.name}})

  if (existing) {
    return commitWrite(db, user, 'customer.update', 'users', customerId, state => {
      const saved = state.users.find(record => Number(record.id) === customerId)
      Object.assign(saved, input)
      return safeUser(saved)
    })
  }

  const newId = nextId(db, 'users')
  return commitWrite(db, user, 'customer.create', 'users', newId, state => {
    const saved = {id: newId, ...input, role: 'customer', avatar: null, addresses: [], permissions: [], active: true, guest: false, tokenVersion: 0, passwordHash: null, createdAt: nowIso()}
    state.users.push(saved)
    return safeUser(saved)
  })
}

function getAdminCustomerPage(db, user, query = {}) {
  const requestedPage = Number(query._page)
  const requestedPageSize = Number(query._limit)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const pageSize = Number.isInteger(requestedPageSize) && requestedPageSize > 0 ? Math.min(requestedPageSize, 100) : 20
  const search = normalizeText(query.q)
  const searchPhone = normalizePhone(query.q)
  const requestedNoVisitDays = query.noVisitDays === undefined || query.noVisitDays === '' ? null : Number(query.noVisitDays)
  if (requestedNoVisitDays !== null && (!Number.isInteger(requestedNoVisitDays) || requestedNoVisitDays < 1 || requestedNoVisitDays > 3650))
    throw makeError(400, 'O filtro de ausência de visita é inválido.')
  const noVisitCutoff = requestedNoVisitDays === null ? null : Date.now() - requestedNoVisitDays * DAY_MS
  const birthdayFilter = query.birthday === 'month'
  const currentMonth = localDateString(new Date()).slice(5, 7)
  const sortBy = SORT_FIELDS.has(String(query._sort)) ? String(query._sort) : 'name'
  const direction = query._order === 'desc' ? -1 : 1
  const metrics = customerMetrics(db)
  const fullPhoneAccess = hasPermission(user, 'customers.write')
  const userRecords = records(db, 'users').filter(customer => customer.role === 'customer')
  const customerRecords = new Map(userRecords.map(customer => [Number(customer.id), customer]))
  const customers = userRecords
    .map(customer => {
      const metric = metrics.get(Number(customer.id)) ?? {lastVisit: null, visitsCount: 0, totalSpentCents: 0}
      const tags = new Set(
        (Array.isArray(customer.tags) ? customer.tags : [])
          .map(tag => String(tag).trim())
          .filter(Boolean)
          .slice(0, 12)
      )
      if (customer.guest) tags.add('Visitante')
      if (String(customer.birthDate || '').slice(5, 7) === currentMonth) tags.add('Aniversariante')
      return {
        id: Number(customer.id),
        name: String(customer.name || ''),
        phone: fullPhoneAccess ? String(customer.phone || '') : maskPhone(customer.phone),
        phoneMasked: !fullPhoneAccess,
        lastVisit: metric.lastVisit,
        visitsCount: metric.visitsCount,
        totalSpentCents: metric.totalSpentCents,
        tags: [...tags]
      }
    })
    .filter(customer => {
      const user = customerRecords.get(customer.id)
      const searchMatches = !search || normalizeText(customer.name).includes(search) || Boolean(searchPhone && normalizePhone(user?.phone).includes(searchPhone))
      const visitTime = customer.lastVisit ? new Date(customer.lastVisit).getTime() : null
      const visitMatches = noVisitCutoff === null || visitTime === null || visitTime <= noVisitCutoff
      const birthdayMatches = !birthdayFilter || String(user?.birthDate || '').slice(5, 7) === currentMonth
      return searchMatches && visitMatches && birthdayMatches
    })
    .sort((left, right) => {
      const a = left[sortBy]
      const b = right[sortBy]
      if (sortBy === 'lastVisit' && (a === null || b === null)) {
        if (a === b) return left.id - right.id
        return a === null ? 1 : -1
      }
      const comparison = typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b, 'pt-BR', {sensitivity: 'base'}) : Number(a) - Number(b)
      return comparison * direction || left.id - right.id
    })
  const total = customers.length
  return {items: customers.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize}
}

module.exports = {findAdminCustomerDuplicates, getAdminCustomerPage, getAdminCustomerProfile, maskPhone, saveAdminCustomer}
