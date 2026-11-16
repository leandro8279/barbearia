const {commit, getById, hasPermission, makeError, nextId, nowIso} = require('./core.cjs')

const EXPENSE_CATEGORIES = [
  {id: 1, name: 'Aluguel', slug: 'aluguel'},
  {id: 2, name: 'Energia', slug: 'energia'},
  {id: 3, name: 'Produtos', slug: 'produtos'},
  {id: 4, name: 'Comissões', slug: 'comissoes'},
  {id: 5, name: 'Marketing', slug: 'marketing'}
]
const PAYMENT_METHODS = ['cash', 'pix', 'debit', 'credit']
const LEGACY_CATEGORIES = {Estrutura: 'Aluguel', Insumos: 'Produtos', Utilidades: 'Energia'}

function requirePermission(user, permission) {
  if (!hasPermission(user, permission)) throw makeError(403, 'Você não tem permissão para esta ação')
}

function datePart(timestamp) {
  return new Date(timestamp - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function dateBound(value, endOfDay = false) {
  const input = String(value || '')
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const parsed = new Date(`${input}T${endOfDay ? '23:59:59.999' : '00:00:00'}-03:00`).getTime()
    return Number.isFinite(parsed) && datePart(parsed) === input ? parsed : Number.NaN
  }
  return new Date(input).getTime()
}

function readRange(from, to) {
  const start = dateBound(from)
  const end = dateBound(to, /^\d{4}-\d{2}-\d{2}$/.test(String(to || '')))
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) throw makeError(400, 'Informe um período válido.')
  return {start, end}
}

function inRange(timestamp, range) {
  return Number.isFinite(timestamp) && timestamp >= range.start && timestamp <= range.end
}

function monthKey(timestamp) {
  return datePart(timestamp).slice(0, 7)
}

function monthKeys(range) {
  const first = monthKey(range.start)
  const last = monthKey(range.end)
  const [startYear, startMonth] = first.split('-').map(Number)
  const [endYear, endMonth] = last.split('-').map(Number)
  const keys = []
  for (let index = startYear * 12 + startMonth - 1; index <= endYear * 12 + endMonth - 1; index += 1) {
    const year = Math.floor(index / 12)
    const month = (index % 12) + 1
    keys.push(`${year}-${String(month).padStart(2, '0')}`)
  }
  return keys
}

function tabEventTime(db, tab, basis) {
  if (basis === 'accrual' && tab.appointmentId) {
    const appointment = getById(db, 'appointments', tab.appointmentId)
    if (appointment?.start) return new Date(appointment.start).getTime()
  }
  return new Date(tab.closedAt || '').getTime()
}

function categoryName(value) {
  return LEGACY_CATEGORIES[value] || value
}

function computeSummary(db, range, basis) {
  const tabs = db
    .get('tabs')
    .value()
    .filter(tab => tab.status === 'closed')
  const tabsById = new Map(tabs.map(tab => [Number(tab.id), tab]))
  const incomeEvents = []
  const revenueByTab = new Map()
  const paymentTotals = Object.fromEntries(PAYMENT_METHODS.map(method => [method, 0]))

  if (basis === 'cash') {
    for (const payment of db.get('payments').value()) {
      const tab = tabsById.get(Number(payment.tabId))
      if (!tab || payment.status !== 'paid') continue
      const timestamp = new Date(payment.createdAt || tab.closedAt || '').getTime()
      if (!inRange(timestamp, range)) continue
      const amountCents = Number(payment.amountCents) || 0
      incomeEvents.push({timestamp, amountCents})
      revenueByTab.set(Number(tab.id), (revenueByTab.get(Number(tab.id)) || 0) + amountCents)
      if (PAYMENT_METHODS.includes(payment.method)) paymentTotals[payment.method] += amountCents
    }
  } else {
    for (const tab of tabs) {
      const timestamp = tabEventTime(db, tab, basis)
      if (!inRange(timestamp, range)) continue
      const amountCents = Number(tab.total || 0) + Number(tab.tip || 0)
      incomeEvents.push({timestamp, amountCents})
      revenueByTab.set(Number(tab.id), amountCents)
    }
    for (const payment of db.get('payments').value()) {
      const tab = tabsById.get(Number(payment.tabId))
      if (!tab || payment.status !== 'paid' || !revenueByTab.has(Number(tab.id))) continue
      if (PAYMENT_METHODS.includes(payment.method)) paymentTotals[payment.method] += Number(payment.amountCents) || 0
    }
  }

  const expenses = db.get('expenses').value()
  const expenseEvents = []
  for (const expense of expenses) {
    if (basis === 'cash' && expense.status !== 'paid') continue
    const timestamp = basis === 'cash' ? new Date(expense.paidAt || expense.createdAt || expense.dueAt || '').getTime() : new Date(expense.dueAt || '').getTime()
    if (inRange(timestamp, range)) expenseEvents.push({timestamp, amountCents: Number(expense.amountCents) || 0})
  }

  let commissionsToPayCents = 0
  for (const commission of db.get('commissions').value()) {
    if (commission.status !== 'pending') continue
    const tab = tabsById.get(Number(commission.tabId))
    if (tab && inRange(tabEventTime(db, tab, basis), range)) commissionsToPayCents += Number(commission.amountCents) || 0
  }

  const monthly = new Map(monthKeys(range).map(month => [month, {month, incomeCents: 0, expensesCents: 0}]))
  for (const event of incomeEvents) {
    const bucket = monthly.get(monthKey(event.timestamp))
    if (bucket) bucket.incomeCents += event.amountCents
  }
  for (const event of expenseEvents) {
    const bucket = monthly.get(monthKey(event.timestamp))
    if (bucket) bucket.expensesCents += event.amountCents
  }

  const revenueCents = incomeEvents.reduce((sum, event) => sum + event.amountCents, 0)
  const expensesCents = expenseEvents.reduce((sum, event) => sum + event.amountCents, 0)
  const tabsCount = revenueByTab.size
  return {
    metrics: {revenueCents, expensesCents, profitCents: revenueCents - expensesCents, averageTicketCents: tabsCount ? Math.round(revenueCents / tabsCount) : 0, commissionsToPayCents, tabsCount},
    monthly: [...monthly.values()],
    paymentMethods: PAYMENT_METHODS.map(method => ({method, amountCents: paymentTotals[method]}))
  }
}

function financeSummary(db, user, query) {
  requirePermission(user, 'finance.read')
  const range = readRange(query.from, query.to)
  const basis = query.basis === undefined ? 'cash' : String(query.basis)
  if (!['cash', 'accrual'].includes(basis)) throw makeError(400, 'Selecione um regime financeiro válido.')
  const duration = range.end - range.start + 1
  const previousRange = {start: range.start - duration, end: range.start - 1}
  const current = computeSummary(db, range, basis)
  const previous = computeSummary(db, previousRange, basis)
  return {basis, metrics: current.metrics, previous: previous.metrics, monthly: current.monthly, paymentMethods: current.paymentMethods}
}

function getExpenseCategories(user) {
  requirePermission(user, 'finance.read')
  return EXPENSE_CATEGORIES
}

function expenseStatus(expense, now = Date.now()) {
  if (expense.status === 'paid') return 'paid'
  const dueAt = new Date(expense.dueAt || '').getTime()
  return Number.isFinite(dueAt) && datePart(dueAt) < datePart(now) ? 'overdue' : 'open'
}

function listExpenses(db, user, query) {
  requirePermission(user, 'finance.read')
  const page = Math.max(1, Math.floor(Number(query.page || query._page) || 1))
  const pageSize = Math.min(100, Math.max(1, Math.floor(Number(query.pageSize || query._limit) || 10)))
  const search = String(query.q || '')
    .trim()
    .toLocaleLowerCase('pt-BR')
  const category = String(query.category || '')
  const selectedCategory = EXPENSE_CATEGORIES.find(item => item.slug === category || item.name === category)?.name || categoryName(category)
  const status = String(query.status || 'all')
  const from = query.from ? String(query.from).slice(0, 10) : ''
  const to = query.to ? String(query.to).slice(0, 10) : ''
  if (!['all', 'open', 'paid', 'overdue'].includes(status)) throw makeError(400, 'Selecione um status de despesa válido.')
  let items = db
    .get('expenses')
    .value()
    .map(expense => ({...expense, category: categoryName(expense.category), displayStatus: expenseStatus(expense), paidAt: expense.paidAt || null}))
    .filter(expense => {
      const normalizedSearch = `${expense.description} ${expense.category}`.toLocaleLowerCase('pt-BR')
      const dueDate = String(expense.dueAt || '').slice(0, 10)
      const selectedStatus = expenseStatus(expense)
      return (
        (!search || normalizedSearch.includes(search)) &&
        (!category || expense.category === selectedCategory) &&
        (status === 'all' || (status === 'open' ? selectedStatus === 'open' : selectedStatus === status)) &&
        (!from || dueDate >= from) &&
        (!to || dueDate <= to)
      )
    })
  const sortBy = ['dueAt', 'description', 'category', 'amountCents', 'status'].includes(String(query.sortBy || query._sort)) ? String(query.sortBy || query._sort) : 'dueAt'
  const order = String(query.order || query._order) === 'desc' ? -1 : 1
  items = items.sort((left, right) => {
    const leftValue = sortBy === 'status' ? left.displayStatus : left[sortBy]
    const rightValue = sortBy === 'status' ? right.displayStatus : right[sortBy]
    if (sortBy === 'amountCents') return (Number(leftValue) - Number(rightValue)) * order
    return String(leftValue || '').localeCompare(String(rightValue || ''), 'pt-BR') * order
  })
  const total = items.length
  return {items: items.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, pageCount: Math.ceil(total / pageSize)}
}

function normalizeExpenseInput(body) {
  const description = String(body.description || '').trim()
  const categoryValue = String(body.category || '')
  const category = EXPENSE_CATEGORIES.find(item => item.slug === categoryValue || item.name === categoryValue)?.name
  const amountCents = Number(body.amountCents)
  const dueAt = String(body.dueAt || '')
  if (description.length < 2 || description.length > 120) throw makeError(400, 'A descrição deve ter entre 2 e 120 caracteres.')
  if (!category) throw makeError(400, 'Selecione uma categoria válida.')
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw makeError(400, 'O valor da despesa deve ser maior que zero.')
  if (!Number.isFinite(new Date(dueAt).getTime())) throw makeError(400, 'Informe uma data de vencimento válida.')
  if (body.recurring !== undefined && typeof body.recurring !== 'boolean') throw makeError(400, 'Informe se a despesa é recorrente.')
  return {description, category, amountCents, dueAt, recurring: body.recurring === true}
}

async function createExpense(db, body, user) {
  requirePermission(user, 'finance.write')
  const input = normalizeExpenseInput(body)
  const createdAt = nowIso()
  const expense = {id: nextId(db, 'expenses'), ...input, status: 'open', paidAt: null, createdAt}
  await commit(
    db,
    user,
    'expenses.create',
    'expenses',
    expense.id,
    state => {
      state.expenses.push(expense)
    },
    {category: expense.category, amountCents: expense.amountCents}
  )
  return expense
}

async function updateExpense(db, id, body, user) {
  requirePermission(user, 'finance.write')
  const expense = getById(db, 'expenses', id)
  if (!expense) throw makeError(404, 'Despesa não encontrada.')
  if (expense.status === 'paid') requirePermission(user, 'finance.manage')
  const input = normalizeExpenseInput(body)
  await commit(
    db,
    user,
    'expenses.update',
    'expenses',
    expense.id,
    state => {
      const current = getById(db, 'expenses', expense.id)
      Object.assign(current, input)
    },
    {status: expense.status, category: input.category, amountCents: input.amountCents}
  )
  return getById(db, 'expenses', expense.id)
}

async function markExpensePaid(db, id, user) {
  requirePermission(user, 'finance.write')
  const expense = getById(db, 'expenses', id)
  if (!expense) throw makeError(404, 'Despesa não encontrada.')
  if (expense.status === 'paid') throw makeError(409, 'Esta despesa já está paga.')
  const paidAt = nowIso()
  await commit(
    db,
    user,
    'expenses.mark-paid',
    'expenses',
    expense.id,
    state => {
      const current = getById(db, 'expenses', expense.id)
      current.status = 'paid'
      current.paidAt = paidAt
    },
    {amountCents: expense.amountCents}
  )
  return getById(db, 'expenses', expense.id)
}

module.exports = {createExpense, financeSummary, getExpenseCategories, listExpenses, markExpensePaid, updateExpense}
