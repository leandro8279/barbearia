const {ACTIVE_APPOINTMENT_STATUSES, getById, hasPermission, makeError, nextId, nowIso} = require('./core.cjs')
const auth = require('./auth.cjs')

const WEEKDAY_COUNT = 7
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

function list(db, collection) {
  const rows = db.get(collection).value()
  return Array.isArray(rows) ? rows : []
}

function requireTeamWrite(user) {
  if (!hasPermission(user, 'team.write')) throw makeError(403, 'Sem permissão para gerenciar a equipe')
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function validCpf(value) {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  const digit = (base, weights) => {
    const remainder = base.split('').reduce((sum, item, index) => sum + Number(item) * weights[index], 0) % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  const first = digit(cpf.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = digit(`${cpf.slice(0, 9)}${first}`, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  return cpf.endsWith(`${first}${second}`)
}

function validCnpj(value) {
  const cnpj = onlyDigits(value)
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false
  const digit = (base, weights) => {
    const remainder = base.split('').reduce((sum, item, index) => sum + Number(item) * weights[index], 0) % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  const first = digit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = digit(`${cnpj.slice(0, 12)}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return cnpj.endsWith(`${first}${second}`)
}

function validPhone(value) {
  const phone = onlyDigits(value).replace(/^55(?=\d{10,11}$)/, '')
  return (
    /^\d{10,11}$/.test(phone) && Number(phone.slice(0, 2)) >= 11 && Number(phone.slice(0, 2)) <= 99 && (phone.length === 11 ? /^9\d{8}$/.test(phone.slice(2)) : /^[2-5]\d{7}$/.test(phone.slice(2)))
  )
}

function validPixKey(value) {
  const key = String(value || '').trim()
  if (!key) return true
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) return true
  if (validCpf(key) || validCnpj(key) || validPhone(key)) return true
  return /^(?:[a-f\d]{32}|[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})$/i.test(key)
}

function photoValue(value) {
  const photo = String(value || '').trim()
  if (!photo) return ''
  if (photo.startsWith('data:')) {
    const match = /^data:image\/(?:png|jpe?g|webp);base64,([A-Za-z0-9+/]*={0,2})$/.exec(photo)
    if (!match || Buffer.from(match[1], 'base64').byteLength > 90 * 1024) throw makeError(413, 'A foto deve ter até 90 KB e estar em PNG, JPG ou WebP.')
    return photo
  }
  if (photo.length > 500 || !(/^\/[A-Za-z0-9/_./-]{1,200}$/.test(photo) || /^https?:\/\/\S+$/i.test(photo))) {
    throw makeError(400, 'Informe uma URL de foto válida.')
  }
  return photo
}

function publicUser(user) {
  if (!user) return null
  return {
    id: Number(user.id),
    name: String(user.name || ''),
    email: String(user.email || ''),
    phone: String(user.phone || ''),
    cpf: user.cpf || '',
    role: String(user.role || 'barber'),
    active: user.active !== false,
    hasPassword: Boolean(user.passwordHash)
  }
}

function normalizeServiceAssignments(db, input, barberId) {
  if (!Array.isArray(input)) throw makeError(400, 'Confira os serviços do profissional.')
  const selected = input.filter(item => item.assigned === true)
  if (!selected.length) throw makeError(400, 'Selecione ao menos um serviço para o profissional.')
  if (new Set(selected.map(item => Number(item.serviceId))).size !== selected.length) throw makeError(400, 'Há serviços duplicados na configuração.')
  return selected.map(item => {
    const serviceId = Number(item.serviceId)
    const service = getById(db, 'services', serviceId)
    if (!service || service.active === false) throw makeError(400, 'Um dos serviços selecionados não está disponível.')
    const link = {barberId, serviceId}
    for (const key of ['durationMin', 'price', 'commissionPct']) {
      const value = item[key]
      if (value == null || value === '') continue
      const number = Number(value)
      if (key === 'durationMin' && (!Number.isInteger(number) || number < 5 || number % 5 !== 0)) throw makeError(400, 'A duração específica deve ser múltipla de 5 minutos.')
      if (key === 'price' && (!Number.isInteger(number) || number < 0)) throw makeError(400, 'O preço específico deve ser informado em centavos.')
      if (key === 'commissionPct' && (!Number.isFinite(number) || number < 0 || number > 100)) throw makeError(400, 'A comissão específica deve ficar entre 0% e 100%.')
      link[key] = number
    }
    return link
  })
}

function normalizeProfile(db, body, currentBarber, currentUser) {
  const name = String(body.name || '').trim()
  const email = String(body.email || '')
    .trim()
    .toLowerCase()
  const phone = onlyDigits(body.phone).replace(/^55(?=\d{10,11}$)/, '')
  const cpf = onlyDigits(body.cpf)
  const pixKey = String(body.pixKey || '').trim()
  const bio = String(body.bio || '').trim()
  const specialties =
    Array.isArray(body.specialties) ?
      body.specialties.map(value => String(value).trim()).filter(Boolean)
    : String(body.specialties || '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean)
  const commissionServicePct = Number(body.commissionServicePct)
  const commissionProductPct = Number(body.commissionProductPct)

  if (name.length < 2 || name.length > 100) throw makeError(400, 'Informe um nome entre 2 e 100 caracteres.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) throw makeError(400, 'Informe um e-mail válido.')
  if (!validPhone(phone)) throw makeError(400, 'Informe um telefone válido com DDD.')
  if (cpf && !validCpf(cpf)) throw makeError(400, 'Informe um CPF válido ou deixe o campo vazio.')
  if (pixKey.length > 120 || !validPixKey(pixKey)) throw makeError(400, 'Informe uma chave Pix válida.')
  if (bio.length > 600) throw makeError(400, 'A biografia deve ter até 600 caracteres.')
  if (specialties.length > 12 || specialties.some(value => value.length > 40)) throw makeError(400, 'Informe até 12 especialidades com no máximo 40 caracteres cada.')
  if (![commissionServicePct, commissionProductPct].every(value => Number.isFinite(value) && value >= 0 && value <= 100)) throw makeError(400, 'As comissões devem ficar entre 0% e 100%.')

  const duplicate = list(db, 'users').find(user => String(user.email || '').toLowerCase() === email && Number(user.id) !== Number(currentUser?.id))
  if (duplicate) throw makeError(409, 'Este e-mail já está cadastrado.')
  const duplicatePhone = list(db, 'users').find(user => onlyDigits(user.phone) === phone && Number(user.id) !== Number(currentUser?.id) && !user.guest)
  if (duplicatePhone) throw makeError(409, 'Este telefone já está cadastrado.')
  if (cpf && list(db, 'users').some(user => onlyDigits(user.cpf) === cpf && Number(user.id) !== Number(currentUser?.id))) {
    throw makeError(409, 'Este CPF já está cadastrado.')
  }
  if (pixKey && list(db, 'barbers').some(barber => String(barber.pixKey || '').toLowerCase() === pixKey.toLowerCase() && Number(barber.id) !== Number(currentBarber?.id))) {
    throw makeError(409, 'Esta chave Pix já está vinculada a outro profissional.')
  }

  return {
    user: {name, email, phone, cpf: cpf || null},
    barber: {bio, specialties: [...new Set(specialties)], photo: photoValue(body.photo), pixKey: pixKey || null, commissionServicePct, commissionProductPct, active: body.active !== false}
  }
}

function getTeamServices(db, barberId) {
  const links = list(db, 'barberServices').filter(item => Number(item.barberId) === Number(barberId))
  const services = list(db, 'services')
    .filter(service => service.active !== false)
    .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR'))
  return services.map(service => {
    const link = links.find(item => Number(item.serviceId) === Number(service.id))
    return {
      serviceId: Number(service.id),
      name: String(service.name || ''),
      durationMin: link?.durationMin ?? null,
      defaultDurationMin: Number(service.durationMin) || 0,
      price: link?.price ?? null,
      defaultPrice: Number(service.price) || 0,
      commissionPct: link?.commissionPct ?? null,
      defaultCommissionPct: Number(service.commissionPct) || 0,
      assigned: links.length === 0 || Boolean(link)
    }
  })
}

function getTeamServiceCatalog(db, user) {
  requireTeamWrite(user)
  return getTeamServices(db, null)
}

function getTeamTimeOffBarbers(db, user) {
  requireTeamWrite(user)
  return list(db, 'barbers')
    .map(barber => ({
      id: Number(barber.id),
      name: getById(db, 'users', barber.userId)?.name || barber.name || barber.slug || 'Profissional',
      photo: barber.photo || null,
      specialties: Array.isArray(barber.specialties) ? barber.specialties : [],
      active: barber.active !== false
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
}

function getTeamProfile(db, id, user) {
  requireTeamWrite(user)
  const barber = getById(db, 'barbers', id)
  if (!barber) throw makeError(404, 'Profissional não encontrado.')
  const account = getById(db, 'users', barber.userId)
  if (!account) throw makeError(404, 'Usuário vinculado ao profissional não encontrado.')
  const {userId, ...profile} = barber
  return {barber: {...profile, id: Number(profile.id), active: profile.active !== false, pixKey: profile.pixKey || ''}, user: publicUser(account), services: getTeamServices(db, id)}
}

function normalizeClockRange(value) {
  const start = Array.isArray(value) ? String(value[0] || '') : String(value?.start || '')
  const end = Array.isArray(value) ? String(value[1] || '') : String(value?.end || '')
  return {start, end}
}

function businessHours(db, weekday) {
  const unit = getById(db, 'units', 1)
  const entry = (unit?.businessHours || []).find(item => Number(item.weekday) === weekday)
  return (entry?.ranges || []).map(normalizeClockRange)
}

function getTeamSchedule(db, id, user) {
  requireTeamWrite(user)
  const barber = getById(db, 'barbers', id)
  if (!barber) throw makeError(404, 'Profissional não encontrado.')
  const schedules = list(db, 'schedules').filter(item => Number(item.barberId) === Number(id))
  return {
    barber: {id: Number(barber.id), name: getById(db, 'users', barber.userId)?.name || barber.name || 'Profissional'},
    days: Array.from({length: WEEKDAY_COUNT}, (_, weekday) => {
      const current = schedules.find(item => Number(item.weekday) === weekday)
      return {weekday, ranges: (current?.ranges || []).map(normalizeClockRange), breaks: (current?.breaks || []).map(normalizeClockRange), businessHours: businessHours(db, weekday)}
    })
  }
}

function timeToMinutes(value) {
  if (!TIME_PATTERN.test(value)) return -1
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

function validateIntervals(intervals, label) {
  if (!Array.isArray(intervals) || intervals.length > 6) throw makeError(400, `Confira as faixas de ${label}.`)
  const normalized = intervals.map(normalizeClockRange)
  for (const interval of normalized) {
    const start = timeToMinutes(interval.start)
    const end = timeToMinutes(interval.end)
    if (start < 0 || end <= start) throw makeError(400, `Confira os horários de ${label}.`)
  }
  const sorted = [...normalized].sort((left, right) => timeToMinutes(left.start) - timeToMinutes(right.start))
  for (let index = 1; index < sorted.length; index += 1) {
    if (timeToMinutes(sorted[index].start) < timeToMinutes(sorted[index - 1].end)) throw makeError(400, `As faixas de ${label} não podem se sobrepor.`)
  }
  return sorted
}

function normalizeSchedules(db, id, input) {
  if (!Array.isArray(input) || input.length !== WEEKDAY_COUNT || new Set(input.map(item => Number(item.weekday))).size !== WEEKDAY_COUNT) {
    throw makeError(400, 'Informe uma escala para cada um dos sete dias.')
  }
  return input
    .map(day => {
      const weekday = Number(day.weekday)
      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw makeError(400, 'Dia da semana inválido.')
      const ranges = validateIntervals(day.ranges || [], 'trabalho')
      const breaks = validateIntervals(day.breaks || [], 'pausas')
      const openingRanges = businessHours(db, weekday)
      for (const range of ranges) {
        const start = timeToMinutes(range.start)
        const end = timeToMinutes(range.end)
        if (!openingRanges.some(opening => start >= timeToMinutes(opening.start) && end <= timeToMinutes(opening.end))) {
          throw makeError(400, 'A escala precisa ficar dentro do horário de funcionamento.')
        }
      }
      for (const pause of breaks) {
        const start = timeToMinutes(pause.start)
        const end = timeToMinutes(pause.end)
        if (!ranges.some(range => start >= timeToMinutes(range.start) && end <= timeToMinutes(range.end))) {
          throw makeError(400, 'Cada pausa precisa ficar dentro de uma faixa de trabalho.')
        }
      }
      return {barberId: Number(id), weekday, ranges, breaks}
    })
    .sort((left, right) => left.weekday - right.weekday)
}

function saoPauloDateAndMinute(value) {
  const local = new Date(new Date(value).getTime() - 3 * 60 * 60 * 1000)
  return {date: local.toISOString().slice(0, 10), minute: local.getUTCHours() * 60 + local.getUTCMinutes()}
}

function getImpactedAppointments(db, barberId, schedules) {
  const now = Date.now()
  return list(db, 'appointments')
    .filter(appointment => Number(appointment.barberId) === Number(barberId) && ACTIVE_APPOINTMENT_STATUSES.has(appointment.status) && new Date(appointment.start).getTime() > now)
    .filter(appointment => {
      const start = saoPauloDateAndMinute(appointment.start)
      const end = saoPauloDateAndMinute(appointment.end)
      const weekday = new Date(`${start.date}T12:00:00.000Z`).getUTCDay()
      const day = schedules.find(item => item.weekday === weekday)
      const fitsWorkRange = Boolean(
        day?.ranges.some(range => {
          const rangeStart = timeToMinutes(range.start)
          const rangeEnd = timeToMinutes(range.end)
          return start.date === end.date && start.minute >= rangeStart && end.minute <= rangeEnd
        })
      )
      const overlapsBreak = Boolean(day?.breaks.some(pause => start.date === end.date && start.minute < timeToMinutes(pause.end) && end.minute > timeToMinutes(pause.start)))
      return !fitsWorkRange || overlapsBreak
    })
    .map(appointment => ({
      id: Number(appointment.id),
      start: appointment.start,
      end: appointment.end,
      status: appointment.status,
      customerName: getById(db, 'users', appointment.customerId)?.name || 'Cliente',
      barberId: Number(appointment.barberId),
      barberName: getById(db, 'users', getById(db, 'barbers', barberId)?.userId)?.name || 'Profissional'
    }))
    .sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime())
}

function previewTeamSchedule(db, id, body, user) {
  requireTeamWrite(user)
  if (!getById(db, 'barbers', id)) throw makeError(404, 'Profissional não encontrado.')
  const schedules = normalizeSchedules(db, id, body.days)
  return {days: schedules, impactedAppointments: getImpactedAppointments(db, id, schedules)}
}

async function saveTeamSchedule(db, id, body, user, commit) {
  const preview = previewTeamSchedule(db, id, body, user)
  if (preview.impactedAppointments.length && body.confirmAffected !== true) {
    throw makeError(409, 'A escala afeta agendamentos futuros. Revise a lista antes de confirmar.', {impactedAppointments: preview.impactedAppointments})
  }
  await commit(
    db,
    user,
    'team.schedule.update',
    'schedules',
    Number(id),
    state => {
      state.schedules = (state.schedules || []).filter(item => Number(item.barberId) !== Number(id))
      state.schedules.push(...preview.days)
    },
    {impactedAppointmentIds: preview.impactedAppointments.map(item => item.id)}
  )
  return {days: preview.days, impactedAppointments: preview.impactedAppointments}
}

function updateServiceLinks(db, state, barberId, links) {
  state.barberServices = (state.barberServices || []).filter(item => Number(item.barberId) !== Number(barberId))
  state.barberServices.push(...links)
}

async function saveTeamProfile(db, id, body, user, commit) {
  requireTeamWrite(user)
  const isCreate = id == null
  const currentBarber = isCreate ? null : getById(db, 'barbers', id)
  if (!isCreate && !currentBarber) throw makeError(404, 'Profissional não encontrado.')
  const linkedUser = currentBarber ? getById(db, 'users', currentBarber.userId) : null
  const requestedEmail = String(body.email || '')
    .trim()
    .toLowerCase()
  const invitedBarber =
    isCreate ?
      list(db, 'users').find(
        item =>
          String(item.email || '')
            .trim()
            .toLowerCase() === requestedEmail && item.role === 'barber'
      )
    : null
  const hasExistingProfile = invitedBarber && list(db, 'barbers').some(item => Number(item.userId) === Number(invitedBarber.id))
  const currentUser = linkedUser || (invitedBarber && !hasExistingProfile ? invitedBarber : null)
  if (currentBarber && !currentUser) throw makeError(404, 'Usuário vinculado ao profissional não encontrado.')
  const normalized = normalizeProfile(db, body, currentBarber, currentUser)
  const barberId = Number(currentBarber?.id ?? nextId(db, 'barbers'))
  const links = normalizeServiceAssignments(db, body.services, barberId)
  const invite =
    isCreate && currentUser && !currentUser.passwordHash ? auth.createPasswordReset(currentUser.id)
    : isCreate && !currentUser ? auth.createPasswordReset(nextId(db, 'users'))
    : null
  let savedBarber
  let savedUser
  await commit(
    db,
    user,
    isCreate ? 'team.profile.create' : 'team.profile.update',
    'barbers',
    barberId,
    state => {
      state.users = state.users || []
      state.barbers = state.barbers || []
      state.passwordResets = state.passwordResets || []
      const userId = currentUser ? Number(currentUser.id) : nextId(db, 'users')
      if (currentUser) {
        savedUser = state.users.find(item => Number(item.id) === userId)
        Object.assign(savedUser, normalized.user, {avatar: normalized.barber.photo || null, active: normalized.barber.active})
      } else {
        savedUser = {
          id: userId,
          ...auth.createUser({...normalized.user, passwordHash: null, birthDate: null, avatar: normalized.barber.photo || null}),
          role: 'barber',
          permissions: [],
          active: normalized.barber.active,
          guest: false,
          passwordHash: null
        }
        state.users.push(savedUser)
      }
      if (invite) {
        state.passwordResets = state.passwordResets.filter(item => Number(item.userId) !== userId)
        state.passwordResets.push(invite.resetRecord)
      }
      const slug = String(normalized.user.name)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      const profile = {
        ...(currentBarber || {}),
        id: barberId,
        userId,
        slug,
        bio: normalized.barber.bio,
        specialties: normalized.barber.specialties,
        photo: normalized.barber.photo || null,
        pixKey: normalized.barber.pixKey,
        commissionServicePct: normalized.barber.commissionServicePct,
        commissionProductPct: normalized.barber.commissionProductPct,
        active: normalized.barber.active
      }
      const existingIndex = state.barbers.findIndex(item => Number(item.id) === barberId)
      if (existingIndex >= 0) state.barbers[existingIndex] = profile
      else state.barbers.push(profile)
      savedBarber = profile
      updateServiceLinks(db, state, barberId, links)
    },
    {userId: currentUser?.id || null, serviceCount: links.length, invited: isCreate}
  )
  const {userId: ignoredUserId, ...profile} = savedBarber
  return {barber: profile, user: publicUser(savedUser), services: getTeamServices(db, barberId), inviteToken: invite?.token || null}
}

module.exports = {getTeamProfile, getTeamSchedule, getTeamServiceCatalog, getTeamTimeOffBarbers, normalizeSchedules, previewTeamSchedule, saveTeamProfile, saveTeamSchedule}
