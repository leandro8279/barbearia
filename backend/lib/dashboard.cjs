const {currentBarber, getById, hasPermission, localDateString, localDateTime, makeError, validDateString} = require('./core.cjs')

const VISIT_STATUSES = new Set(['pending', 'confirmed', 'checked_in', 'in_service', 'done'])
const UPCOMING_STATUSES = new Set(['pending', 'confirmed', 'checked_in', 'in_service'])
const DAY_MS = 24 * 60 * 60 * 1000

function dateKey(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : localDateString(date)
}

function dateList(from, to) {
  const dates = []
  const day = new Date(`${from}T12:00:00.000Z`)
  const lastDay = new Date(`${to}T12:00:00.000Z`)
  while (day <= lastDay) {
    dates.push(day.toISOString().slice(0, 10))
    day.setUTCDate(day.getUTCDate() + 1)
  }
  return dates
}

function parseTime(value) {
  if (typeof value === 'number') return value
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ''))
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN
}

function parseIntervals(values = []) {
  return values
    .map(value => {
      const start = Array.isArray(value) ? parseTime(value[0]) : parseTime(value.start)
      const end = Array.isArray(value) ? parseTime(value[1]) : parseTime(value.end)
      return {start, end}
    })
    .filter(range => Number.isFinite(range.start) && Number.isFinite(range.end) && range.start < range.end)
}

function intersectIntervals(left, right) {
  return left.flatMap(first => right.map(second => ({start: Math.max(first.start, second.start), end: Math.min(first.end, second.end)})).filter(range => range.start < range.end))
}

function subtractIntervals(ranges, cuts) {
  return ranges.flatMap(range => {
    let remaining = [range]
    for (const cut of cuts) {
      remaining = remaining.flatMap(piece => {
        if (cut.end <= piece.start || cut.start >= piece.end) return [piece]
        return [...(piece.start < cut.start ? [{start: piece.start, end: cut.start}] : []), ...(cut.end < piece.end ? [{start: cut.end, end: piece.end}] : [])]
      })
    }
    return remaining
  })
}

function scheduledSegments(db, barberId, date, weekday) {
  const schedule = db
    .get('schedules')
    .find(item => Number(item.barberId) === Number(barberId) && Number(item.weekday) === weekday)
    .value()
  if (!schedule) return []
  const unit = db.get('units').find({id: 1}).value()
  const holiday = unit?.holidays?.find(item => item.date === date)
  if (holiday?.closed) return []
  const businessHours = (unit?.businessHours || []).find(item => Number(item.weekday) === weekday)
  const unitRanges = parseIntervals(Array.isArray(holiday?.ranges) ? holiday.ranges : businessHours?.ranges)
  const working = intersectIntervals(parseIntervals(schedule.ranges), unitRanges)
  const blocks = db
    .get('timeBlocks')
    .value()
    .filter(
      item =>
        (item.barberId == null || Number(item.barberId) === Number(barberId)) &&
        new Date(item.start).getTime() < localDateTime(date, 1440).getTime() &&
        new Date(item.end).getTime() > localDateTime(date, 0).getTime()
    )
    .map(item => ({
      start: Math.max(0, (new Date(item.start).getTime() - localDateTime(date, 0).getTime()) / 60000),
      end: Math.min(1440, (new Date(item.end).getTime() - localDateTime(date, 0).getTime()) / 60000)
    }))
  return subtractIntervals(working, [...parseIntervals(schedule.breaks), ...blocks])
    .map(range => ({start: localDateTime(date, range.start).getTime(), end: localDateTime(date, range.end).getTime()}))
    .filter(range => range.start < range.end)
}

function rangeFromQuery(query) {
  const today = localDateString(new Date())
  const from = String(query.from || `${today.slice(0, 7)}-01`)
  const to = String(query.to || today)
  if (!validDateString(from) || !validDateString(to) || from > to) throw makeError(400, 'Informe um período válido.')
  const days = Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY_MS) + 1
  if (days > 366) throw makeError(400, 'O período não pode ultrapassar 366 dias.')
  return {from, to, dates: dateList(from, to)}
}

function tabRevenue(tab) {
  return Number(tab.total || 0) + Number(tab.tip || 0)
}

function getAdminDashboard(db, user, query) {
  if (!hasPermission(user, 'agenda.read')) throw makeError(403, 'Sem permissão para consultar o dashboard.')
  const {from, to, dates} = rangeFromQuery(query)
  const today = localDateString(new Date())
  const monthFrom = `${today.slice(0, 7)}-01`
  const barber = user.role === 'barber' ? currentBarber(db, user) : null
  const isBarber = user.role === 'barber'
  const barberId = isBarber ? Number(barber?.id) || 0 : null
  const allAppointments = db.get('appointments').value()
  const scopedAppointments = allAppointments.filter(item => !isBarber || Number(item.barberId) === barberId)
  const appointmentsByDate = new Map()
  for (const appointment of scopedAppointments) {
    const key = dateKey(appointment.start)
    if (!key) continue
    const rows = appointmentsByDate.get(key) || []
    rows.push(appointment)
    appointmentsByDate.set(key, rows)
  }
  const inRangeAppointments = scopedAppointments.filter(appointment => {
    const key = dateKey(appointment.start)
    return key && key >= from && key <= to
  })
  const closedTabs = db
    .get('tabs')
    .value()
    .filter(tab => tab.status === 'closed' && (!isBarber || Number(tab.barberId) === barberId) && dateKey(tab.closedAt) >= from && dateKey(tab.closedAt) <= to)
  const closedToday = db
    .get('tabs')
    .value()
    .filter(tab => tab.status === 'closed' && (!isBarber || Number(tab.barberId) === barberId) && dateKey(tab.closedAt) === today)
  const closedThisMonth = db
    .get('tabs')
    .value()
    .filter(tab => tab.status === 'closed' && (!isBarber || Number(tab.barberId) === barberId) && dateKey(tab.closedAt) >= monthFrom && dateKey(tab.closedAt) <= today)
  const revenueByDate = new Map(dates.map(date => [date, 0]))
  for (const tab of closedTabs) {
    const key = dateKey(tab.closedAt)
    if (key && revenueByDate.has(key)) revenueByDate.set(key, revenueByDate.get(key) + tabRevenue(tab))
  }

  const barbers = db
    .get('barbers')
    .value()
    .filter(item => !isBarber || Number(item.id) === barberId)
  const barberStats = new Map(
    barbers.map(item => [
      Number(item.id),
      {barberId: Number(item.id), name: getById(db, 'users', item.userId)?.name || item.name || item.slug || 'Profissional', revenueCents: 0, appointmentsCount: 0}
    ])
  )
  for (const tab of closedTabs) {
    const stat = barberStats.get(Number(tab.barberId))
    if (stat) stat.revenueCents += tabRevenue(tab)
  }
  for (const appointment of inRangeAppointments) {
    if (!VISIT_STATUSES.has(appointment.status)) continue
    const stat = barberStats.get(Number(appointment.barberId))
    if (stat) stat.appointmentsCount += 1
  }

  let capacityMinutes = 0
  let occupiedMinutes = 0
  for (const date of dates) {
    const weekday = new Date(`${date}T12:00:00-03:00`).getUTCDay()
    const dailyAppointments = (appointmentsByDate.get(date) || []).filter(item => VISIT_STATUSES.has(item.status))
    for (const selectedBarber of barbers) {
      const segments = scheduledSegments(db, selectedBarber.id, date, weekday)
      capacityMinutes += segments.reduce((sum, segment) => sum + (segment.end - segment.start) / 60000, 0)
      for (const appointment of dailyAppointments.filter(item => Number(item.barberId) === Number(selectedBarber.id))) {
        const start = new Date(appointment.start).getTime()
        const end = new Date(appointment.end).getTime()
        occupiedMinutes += segments.reduce((sum, segment) => sum + Math.max(0, Math.min(segment.end, end) - Math.max(segment.start, start)) / 60000, 0)
      }
    }
  }

  const periodRevenueCents = closedTabs.reduce((sum, tab) => sum + tabRevenue(tab), 0)
  const newCustomerIds = new Set()
  for (const customer of db.get('users').value()) {
    if (customer.role !== 'customer' || !customer.createdAt) continue
    const createdDate = dateKey(customer.createdAt)
    if (createdDate < from || createdDate > to) continue
    if (isBarber && !inRangeAppointments.some(item => Number(item.customerId) === Number(customer.id) && Number(item.barberId) === barberId)) continue
    newCustomerIds.add(Number(customer.id))
  }
  const todayAppointments = (appointmentsByDate.get(today) || []).filter(item => VISIT_STATUSES.has(item.status))
  const noShows = inRangeAppointments.filter(item => item.status === 'no_show').length
  const ranking = [...barberStats.values()]
    .filter(item => item.appointmentsCount || item.revenueCents || (barberId && item.barberId === barberId))
    .sort((a, b) => b.revenueCents - a.revenueCents || b.appointmentsCount - a.appointmentsCount || a.name.localeCompare(b.name, 'pt-BR'))
    .slice(0, 5)

  const now = Date.now()
  const upcomingAppointments = scopedAppointments
    .filter(item => UPCOMING_STATUSES.has(item.status) && new Date(item.start).getTime() >= now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 6)
    .map(item => {
      const appointmentBarber = getById(db, 'barbers', item.barberId)
      return {
        id: Number(item.id),
        code: item.code,
        start: item.start,
        status: item.status,
        customerName: getById(db, 'users', item.customerId)?.name || 'Cliente',
        barberName: getById(db, 'users', appointmentBarber?.userId)?.name || appointmentBarber?.name || 'Profissional',
        serviceNames: (item.items || []).map(service => service.name),
        totalCents: Number(item.total || 0)
      }
    })
  const inventoryAlerts =
    hasPermission(user, 'catalog.read') ?
      db
        .get('products')
        .value()
        .filter(item => item.active !== false && Number(item.stock) < Number(item.minStock))
        .map(item => ({id: Number(item.id), name: item.name, sku: item.sku, stock: Number(item.stock), minStock: Number(item.minStock)}))
        .sort((a, b) => a.stock - a.minStock - (b.stock - b.minStock) || a.name.localeCompare(b.name, 'pt-BR'))
    : []

  return {
    from,
    to,
    metrics: {
      revenueTodayCents: closedToday.reduce((sum, tab) => sum + tabRevenue(tab), 0),
      revenueMonthCents: closedThisMonth.reduce((sum, tab) => sum + tabRevenue(tab), 0),
      appointmentsToday: todayAppointments.length,
      occupancyPct: capacityMinutes ? Math.round((occupiedMinutes / capacityMinutes) * 1000) / 10 : null,
      averageTicketCents: closedTabs.length ? Math.round(periodRevenueCents / closedTabs.length) : 0,
      newCustomers: newCustomerIds.size,
      noShows,
      periodRevenueCents
    },
    revenueByDay: dates.map(date => ({date, revenueCents: revenueByDate.get(date) || 0})),
    barberRanking: ranking,
    upcomingAppointments,
    inventoryAlerts
  }
}

module.exports = {getAdminDashboard}
