const {currentBarber, getById, hasPermission, makeError, nextId, nowIso} = require('./core.cjs')
const {lineTotal, tabTotals, commissionAmount} = require('./pricing.cjs')
const {openAppointmentTab} = require('./appointments.cjs')

const PAYMENT_METHODS = new Set(['cash', 'pix', 'debit', 'credit'])
const CASH_DENOMINATIONS = [20000, 10000, 5000, 2000, 1000, 500, 200]
const CASH_DIFFERENCE_LIMIT_CENTS = 500

function hasCashSession(db) {
  return db.get('cashSessions').find({status: 'open'}).value()
}

function addMinutesAtBusinessOffset(value, minutes) {
  const shifted = new Date(new Date(value).getTime() + Number(minutes) * 60_000 - 3 * 60 * 60_000).toISOString()
  return `${shifted.slice(0, 10)}T${shifted.slice(11, 19)}-03:00`
}

function itemFromCatalog(db, source, user, tab) {
  const type = String(source.type || '')
  const qty = Number(source.qty ?? 1)
  if (!Number.isInteger(qty) || qty < 1 || qty > 50) throw makeError(400, 'Quantidade inválida')
  const barberId = Number(source.barberId || tab.barberId || 0) || null
  if (user.role === 'barber' && Number(currentBarber(db, user)?.id) !== barberId) throw makeError(403, 'Você só pode lançar itens para sua própria agenda')
  const barber = barberId ? getById(db, 'barbers', barberId) : null
  if (barberId && (!barber || barber.active === false)) throw makeError(400, 'Profissional inválido')
  if (type === 'service') {
    const service = getById(db, 'services', source.refId)
    if (!service || service.active === false) throw makeError(400, 'Serviço indisponível')
    const override = db
      .get('barberServices')
      .find({barberId, serviceId: Number(service.id)})
      .value()
    const assignments = db
      .get('barberServices')
      .value()
      .filter(entry => Number(entry.barberId) === Number(barberId))
    if (barberId && assignments.length && !override) throw makeError(400, 'Este profissional não realiza o serviço selecionado')
    return {
      type,
      refId: Number(service.id),
      name: service.name,
      qty,
      unitPrice: Number(override?.price ?? service.price),
      discount: 0,
      barberId,
      commissionPct: Number(override?.commissionPct ?? barber?.commissionServicePct ?? service.commissionPct ?? 0),
      durationMin: Number(override?.durationMin ?? service.durationMin)
    }
  }
  if (type === 'product') {
    const product = getById(db, 'products', source.refId)
    if (!product || product.active === false) throw makeError(400, 'Produto indisponível')
    if (Number(product.stock) < qty) throw makeError(409, `Estoque insuficiente para ${product.name}`)
    return {type, refId: Number(product.id), name: product.name, qty, unitPrice: Number(product.price), discount: 0, barberId, commissionPct: Number(product.commissionPct || 0)}
  }
  throw makeError(400, 'Tipo de item inválido')
}

function requireCashWrite(user) {
  if (!hasPermission(user, 'cash.write')) throw makeError(403, 'Sem permissão para operar comandas e caixa')
}

function discountPolicy(db) {
  const configured = Number(db.get('settings').find({id: 1}).value()?.booking?.maxDiscountPct ?? 10)
  return {maxDiscountPct: Number.isFinite(configured) ? Math.max(0, configured) : 10}
}

function validateTabDiscount(db, tab, discount, user) {
  if (!Number.isInteger(discount) || discount < 0) throw makeError(400, 'O desconto deve ser um valor inteiro e não negativo em centavos')
  const totals = tabTotals(tab.items, discount)
  if (discount > totals.subtotal) throw makeError(400, 'O desconto não pode exceder o subtotal da comanda')
  const {maxDiscountPct} = discountPolicy(db)
  if (discount > 0 && (discount / Math.max(1, totals.subtotal)) * 100 > maxDiscountPct && !hasPermission(user, 'cash.manage')) {
    throw makeError(403, `Descontos acima de ${maxDiscountPct}% exigem permissão cash.manage`)
  }
  return totals
}

async function updateTabDiscount(db, id, body, user, commit) {
  requireCashWrite(user)
  const tab = getById(db, 'tabs', id)
  if (!tab || tab.status !== 'open') throw makeError(404, 'Comanda aberta não encontrada')
  if (user.role === 'barber' && Number(currentBarber(db, user)?.id) !== Number(tab.barberId)) throw makeError(403, 'Acesso restrito à própria comanda')
  const discount = Number(body.discountCents)
  const totals = validateTabDiscount(db, tab, discount, user)
  await commit(
    db,
    user,
    'tabs.discount',
    'tabs',
    tab.id,
    state => {
      const current = state.tabs.find(row => Number(row.id) === Number(tab.id))
      current.discount = discount
      current.total = totals.total
    },
    {discountCents: discount}
  )
  return getById(db, 'tabs', tab.id)
}

async function openTab(db, body, user, commit) {
  requireCashWrite(user)
  const appointment = body.appointmentId ? getById(db, 'appointments', body.appointmentId) : null
  if (body.appointmentId && !appointment) throw makeError(404, 'Agendamento não encontrado')
  if (appointment) {
    if (user.role === 'barber' && Number(currentBarber(db, user)?.id) !== Number(appointment.barberId)) throw makeError(403, 'Acesso restrito à própria agenda')
    const found = db
      .get('tabs')
      .find({appointmentId: Number(appointment.id), status: 'open'})
      .value()
    if (found) return found
  }
  const at = nowIso()
  const tab = {
    id: nextId(db, 'tabs'),
    ...(appointment ? {appointmentId: Number(appointment.id)} : {}),
    customerId: Number(appointment?.customerId || body.customerId) || null,
    barberId: Number(appointment?.barberId || body.barberId) || null,
    type: appointment ? 'appointment' : 'counter',
    status: 'open',
    items:
      appointment ?
        appointment.items.map(item => ({
          type: 'service',
          refId: Number(item.serviceId),
          name: item.name,
          qty: 1,
          unitPrice: Number(item.price),
          discount: 0,
          barberId: Number(appointment.barberId),
          commissionPct: Number(item.commissionPct || 0)
        }))
      : [],
    tip: 0,
    discount: 0,
    total: appointment?.total || 0,
    createdAt: at,
    closedAt: null
  }
  await commit(
    db,
    user,
    'tabs.open',
    'tabs',
    tab.id,
    state => {
      state.tabs.push(tab)
    },
    {appointmentId: tab.appointmentId || null}
  )
  return tab
}

async function addTabItem(db, id, body, user, commit) {
  requireCashWrite(user)
  const tab = getById(db, 'tabs', id)
  if (!tab || tab.status !== 'open') throw makeError(404, 'Comanda aberta não encontrada')
  if (user.role === 'barber' && Number(currentBarber(db, user)?.id) !== Number(tab.barberId)) throw makeError(403, 'Acesso restrito à própria comanda')
  const catalogItem = itemFromCatalog(db, body, user, tab)
  const serviceDurationMin = catalogItem.type === 'service' ? Number(catalogItem.durationMin) : 0
  const addedDurationMin = serviceDurationMin * Number(catalogItem.qty)
  const item = {...catalogItem}
  delete item.durationMin
  const items = [...tab.items, item]
  const totals = tabTotals(items, tab.discount)
  await commit(
    db,
    user,
    'tabs.items.add',
    'tabs',
    tab.id,
    state => {
      const current = state.tabs.find(row => Number(row.id) === Number(tab.id))
      current.items.push(item)
      current.total = totals.total
      if (addedDurationMin > 0 && current.appointmentId) {
        const appointment = state.appointments.find(row => Number(row.id) === Number(current.appointmentId))
        if (appointment) {
          appointment.end = addMinutesAtBusinessOffset(appointment.end, addedDurationMin)
          for (let index = 0; index < Number(item.qty); index += 1) {
            appointment.items.push({serviceId: item.refId, name: item.name, price: item.unitPrice, durationMin: serviceDurationMin, commissionPct: item.commissionPct, barberId: item.barberId})
          }
          appointment.subtotal = Number(appointment.subtotal || 0) + lineTotal(item)
          appointment.total = Number(appointment.total || 0) + lineTotal(item)
          if (appointment.finishedAt) appointment.actualDurationMin = Number(appointment.actualDurationMin || 0) + addedDurationMin
        }
      }
    },
    {type: item.type, refId: item.refId, qty: item.qty}
  )
  return getById(db, 'tabs', tab.id)
}

function expectedCash(db, session) {
  const expected = {cash: Number(session.openingCents) || 0, pix: 0, debit: 0, credit: 0}
  const openedAt = new Date(session.openedAt).getTime()
  const closedAt = session.closedAt ? new Date(session.closedAt).getTime() : Infinity
  for (const payment of db.get('payments').value()) {
    const createdAt = new Date(payment.createdAt).getTime()
    if (payment.status !== 'paid' || createdAt < openedAt || createdAt > closedAt) continue
    if (expected[payment.method] !== undefined) expected[payment.method] += Number(payment.amountCents)
  }
  for (const movement of db.get('cashMovements').value()) {
    if (Number(movement.sessionId) !== Number(session.id)) continue
    expected.cash += movement.type === 'supply' ? Number(movement.amountCents) : -Number(movement.amountCents)
  }
  return expected
}

async function closeTab(db, id, body, user, commit) {
  requireCashWrite(user)
  const tab = getById(db, 'tabs', id)
  if (!tab || tab.status !== 'open') throw makeError(404, 'Comanda aberta não encontrada')
  if (user.role === 'barber' && Number(currentBarber(db, user)?.id) !== Number(tab.barberId)) throw makeError(403, 'Acesso restrito à própria comanda')
  const discount = Number(body.discountCents ?? tab.discount ?? 0)
  const tip = Number(body.tipCents || 0)
  if (!Number.isInteger(tip) || tip < 0) throw makeError(400, 'Gorjeta deve ser um valor inteiro e não negativo em centavos')
  const tipAllocations = Array.isArray(body.tipAllocations) ? body.tipAllocations : []
  const eligibleBarberIds = new Set(tab.items.map(item => Number(item.barberId)).filter(Boolean))
  const tipAllocationIds = new Set()
  let allocatedTipCents = 0
  for (const allocation of tipAllocations) {
    const barberId = Number(allocation.barberId)
    const amountCents = Number(allocation.amountCents)
    if (!Number.isInteger(barberId) || barberId <= 0 || !eligibleBarberIds.has(barberId) || tipAllocationIds.has(barberId)) {
      throw makeError(400, 'O rateio da gorjeta deve usar barbeiros vinculados aos itens, sem repetições')
    }
    if (!Number.isInteger(amountCents) || amountCents < 0) throw makeError(400, 'Os valores de gorjeta devem ser inteiros e não negativos')
    tipAllocationIds.add(barberId)
    allocatedTipCents += amountCents
  }
  if (eligibleBarberIds.size > 0 && allocatedTipCents !== tip) throw makeError(400, 'O rateio entre barbeiros deve corresponder ao valor total da gorjeta')
  const totals = validateTabDiscount(db, tab, discount, user)
  const payments = Array.isArray(body.payments) ? body.payments : []
  if (
    (payments.length === 0 && totals.total + tip > 0) ||
    payments.some(payment => !PAYMENT_METHODS.has(payment.method) || !Number.isInteger(Number(payment.amountCents)) || Number(payment.amountCents) <= 0)
  )
    throw makeError(400, 'Informe pagamentos válidos em centavos')
  if (payments.reduce((sum, payment) => sum + Number(payment.amountCents), 0) !== totals.total + tip) {
    throw makeError(400, 'A soma dos pagamentos deve ser igual ao total mais a gorjeta')
  }
  if (payments.some(payment => payment.method === 'cash') && !hasCashSession(db)) throw makeError(409, 'Abra o caixa antes de receber pagamentos em dinheiro')
  for (const item of tab.items) {
    if (item.type !== 'product') continue
    const product = getById(db, 'products', item.refId)
    if (!product || Number(product.stock) < Number(item.qty)) throw makeError(409, `Estoque insuficiente para ${item.name}`)
  }

  const at = nowIso()
  await commit(
    db,
    user,
    'tabs.close',
    'tabs',
    tab.id,
    state => {
      const currentTab = state.tabs.find(row => Number(row.id) === Number(tab.id))
      const finalTotals = tabTotals(currentTab.items, discount)
      currentTab.discount = discount
      currentTab.tip = tip
      currentTab.tipAllocations = tipAllocations
        .filter(allocation => Number(allocation.amountCents) > 0)
        .map(allocation => ({barberId: Number(allocation.barberId), amountCents: Number(allocation.amountCents)}))
      currentTab.total = finalTotals.total
      currentTab.status = 'closed'
      currentTab.closedAt = at
      state.payments = state.payments || []
      state.stockMovements = state.stockMovements || []
      state.commissions = state.commissions || []
      for (const payment of payments) {
        state.payments.push({
          id: state.payments.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1,
          tabId: currentTab.id,
          method: payment.method,
          amountCents: Number(payment.amountCents),
          status: 'paid',
          createdAt: at
        })
      }
      const totalLineValue = currentTab.items.reduce((sum, item) => sum + lineTotal(item), 0)
      for (const [index, item] of currentTab.items.entries()) {
        const product = item.type === 'product' ? state.products.find(row => Number(row.id) === Number(item.refId)) : null
        if (product) {
          product.stock = Number(product.stock) - Number(item.qty)
          state.stockMovements.push({
            id: state.stockMovements.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1,
            productId: product.id,
            type: 'sale',
            qty: -Number(item.qty),
            reason: 'Venda em comanda',
            userId: Number(user.id),
            tabId: currentTab.id,
            createdAt: at
          })
        }
        const lineGross = lineTotal(item)
        const allocatedDiscount =
          index === currentTab.items.length - 1 ?
            discount - currentTab.items.slice(0, -1).reduce((sum, line) => sum + Math.floor((discount * lineTotal(line)) / Math.max(1, totalLineValue)), 0)
          : Math.floor((discount * lineGross) / Math.max(1, totalLineValue))
        const baseCents = Math.max(0, lineGross - allocatedDiscount)
        if (item.barberId && item.commissionPct) {
          state.commissions.push({
            id: state.commissions.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1,
            barberId: Number(item.barberId),
            tabId: currentTab.id,
            kind: item.type,
            baseCents,
            pct: Number(item.commissionPct),
            amountCents: commissionAmount(baseCents, item.commissionPct),
            status: 'pending'
          })
        }
      }
      if (currentTab.appointmentId) {
        const appointment = state.appointments.find(row => Number(row.id) === Number(currentTab.appointmentId))
        if (appointment) {
          appointment.status = 'done'
          appointment.finishedAt = appointment.finishedAt || at
          appointment.events.push({at, type: 'done', by: Number(user.id)})
          state.notifications.push({
            id: state.notifications.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1,
            userId: Number(appointment.customerId),
            appointmentId: Number(appointment.id),
            type: 'post',
            channel: 'whatsapp',
            status: 'queued',
            scheduledAt: at,
            sentAt: null
          })
        }
      }
    },
    {totalCents: totals.total + tip, paymentCount: payments.length}
  )
  return getById(db, 'tabs', tab.id)
}

async function openCashSession(db, body, user, commit) {
  requireCashWrite(user)
  const openingCents = Number(body.openingCents || 0)
  if (!Number.isInteger(openingCents) || openingCents < 0) throw makeError(400, 'Informe o fundo inicial em centavos')
  if (hasCashSession(db)) throw makeError(409, 'Já existe um caixa aberto')
  const session = {
    id: nextId(db, 'cashSessions'),
    openedBy: Number(user.id),
    openingCents,
    closedBy: null,
    countedByMethod: null,
    expectedByMethod: null,
    diffCents: null,
    countedCashByDenomination: null,
    countedOtherCashCents: null,
    closingNote: '',
    differenceApprovedBy: null,
    transferredTabIds: [],
    status: 'open',
    openedAt: nowIso(),
    closedAt: null
  }
  await commit(db, user, 'cashSessions.open', 'cashSessions', session.id, state => {
    state.cashSessions.push(session)
    for (const tab of state.tabs) {
      if (tab.status === 'open') tab.cashSessionId = session.id
    }
  })
  return session
}

async function closeCashSession(db, id, body, user, commit) {
  requireCashWrite(user)
  const session = getById(db, 'cashSessions', id)
  if (!session || session.status !== 'open') throw makeError(404, 'Caixa aberto não encontrado')
  const counted = body.countedByMethod
  if (!counted || typeof counted !== 'object') throw makeError(400, 'Informe os valores conferidos por forma de pagamento')
  const expected = expectedCash(db, session)
  const normalized = {}
  for (const method of PAYMENT_METHODS) {
    normalized[method] = Number(counted[method] || 0)
    if (!Number.isInteger(normalized[method]) || normalized[method] < 0) throw makeError(400, 'Valores conferidos devem ser inteiros e não negativos')
  }
  const denominationCounts = body.countedCashByDenomination && typeof body.countedCashByDenomination === 'object' ? body.countedCashByDenomination : {}
  const normalizedDenominations = {}
  for (const denomination of CASH_DENOMINATIONS) {
    normalizedDenominations[denomination] = Number(denominationCounts[denomination] || 0)
    if (!Number.isInteger(normalizedDenominations[denomination]) || normalizedDenominations[denomination] < 0) {
      throw makeError(400, 'A contagem de cédulas deve usar quantidades inteiras e não negativas')
    }
  }
  const otherCashCents = Number(body.countedOtherCashCents || 0)
  if (!Number.isInteger(otherCashCents) || otherCashCents < 0) throw makeError(400, 'O valor de moedas deve ser inteiro e não negativo')
  const denominationTotal = CASH_DENOMINATIONS.reduce((sum, denomination) => sum + denomination * normalizedDenominations[denomination], otherCashCents)
  if (normalized.cash !== denominationTotal) throw makeError(400, 'O total contado em dinheiro deve corresponder à contagem de cédulas e moedas')
  const closingNote = String(body.closingNote || '')
    .trim()
    .slice(0, 500)
  const at = nowIso()
  const difference = normalized.cash - expected.cash
  const differenceRequiresApproval = Math.abs(difference) > CASH_DIFFERENCE_LIMIT_CENTS
  if (differenceRequiresApproval && !hasPermission(user, 'cash.manage')) {
    throw makeError(403, 'Diferenças acima de R$ 5,00 exigem permissão cash.manage')
  }
  if (differenceRequiresApproval && body.approveDifference !== true) {
    throw makeError(409, 'Confirme a aprovação da diferença antes de fechar o caixa')
  }
  const transferredTabIds = db
    .get('tabs')
    .value()
    .filter(tab => tab.status === 'open')
    .map(tab => Number(tab.id))
  await commit(
    db,
    user,
    'cashSessions.close',
    'cashSessions',
    session.id,
    state => {
      const current = state.cashSessions.find(row => Number(row.id) === Number(session.id))
      current.status = 'closed'
      current.closedBy = Number(user.id)
      current.countedByMethod = normalized
      current.expectedByMethod = expected
      current.diffCents = difference
      current.countedCashByDenomination = normalizedDenominations
      current.countedOtherCashCents = otherCashCents
      current.closingNote = closingNote
      current.differenceApprovedBy = differenceRequiresApproval ? Number(user.id) : null
      current.transferredTabIds = transferredTabIds
      current.closedAt = at
      for (const tab of state.tabs) {
        if (tab.status !== 'open') continue
        tab.transferredFromSessionId = Number(session.id)
        tab.cashSessionId = null
      }
    },
    {diffCents: difference, transferredTabIds, differenceApproved: differenceRequiresApproval}
  )
  return getById(db, 'cashSessions', session.id)
}

async function createCashMovement(db, body, user, commit) {
  requireCashWrite(user)
  const session = hasCashSession(db)
  if (!session) throw makeError(409, 'Abra o caixa antes de registrar movimentações')
  const type = String(body.type || '')
  const amountCents = Number(body.amountCents)
  if (!['withdraw', 'supply'].includes(type) || !Number.isInteger(amountCents) || amountCents <= 0 || !String(body.reason || '').trim()) {
    throw makeError(400, 'Informe tipo, valor inteiro em centavos e motivo')
  }
  if (type === 'withdraw' && amountCents > expectedCash(db, session).cash) throw makeError(409, 'A sangria não pode exceder o saldo disponível em dinheiro')
  const movement = {id: nextId(db, 'cashMovements'), sessionId: session.id, type, amountCents, reason: String(body.reason).slice(0, 250), userId: Number(user.id), createdAt: nowIso()}
  await commit(db, user, `cashMovements.${type}`, 'cashMovements', movement.id, state => {
    state.cashMovements.push(movement)
  })
  return movement
}

function commissionSummary(db, user, query, requiredPermission = 'commissions.read') {
  const barber = currentBarber(db, user)
  const from = query.from ? new Date(query.from).getTime() : -Infinity
  const to = query.to ? new Date(query.to).getTime() : Infinity
  let records = db.get('commissions').value()
  if (user.role === 'barber') records = records.filter(item => Number(item.barberId) === Number(barber?.id))
  else if (!hasPermission(user, requiredPermission)) throw makeError(403, 'Sem permissão para consultar comissões')
  records = records.filter(item => {
    const tab = getById(db, 'tabs', item.tabId)
    return tab && tab.status === 'closed' && new Date(tab.closedAt).getTime() >= from && new Date(tab.closedAt).getTime() <= to
  })
  const byBarber = new Map()
  const getSummary = barberId => {
    if (!byBarber.has(Number(barberId))) {
      const profile = getById(db, 'barbers', barberId)
      const member = profile ? getById(db, 'users', profile.userId) : null
      byBarber.set(Number(barberId), {
        barberId: Number(barberId),
        barberName: member?.name || profile?.name || `Profissional ${barberId}`,
        servicesCents: 0,
        productsCents: 0,
        tipsCents: 0,
        refundsCents: 0,
        pendingCents: 0,
        paidCents: 0,
        totalCents: 0,
        toPayCents: 0
      })
    }
    return byBarber.get(Number(barberId))
  }
  for (const item of records) {
    const entry = getSummary(item.barberId)
    if (item.status === 'void') entry.refundsCents += Math.abs(Number(item.amountCents))
    else if (item.kind === 'service') entry.servicesCents += Number(item.amountCents)
    else if (item.kind === 'product') entry.productsCents += Number(item.amountCents)
    if (item.status === 'pending') entry.pendingCents += Number(item.amountCents)
    if (item.status === 'paid') entry.paidCents += Number(item.amountCents)
  }
  for (const tab of db.get('tabs').value()) {
    const closedAt = new Date(tab.closedAt || '').getTime()
    if (tab.status !== 'closed' || closedAt < from || closedAt > to) continue
    for (const allocation of tab.tipAllocations || []) {
      if (user.role === 'barber' && Number(allocation.barberId) !== Number(barber?.id)) continue
      const entry = getSummary(allocation.barberId)
      entry.tipsCents += Number(allocation.amountCents) || 0
    }
  }
  for (const entry of byBarber.values()) {
    entry.totalCents = entry.servicesCents + entry.productsCents - entry.refundsCents
    entry.toPayCents = Math.max(0, entry.pendingCents - entry.refundsCents)
  }

  const filteredRecords = ['pending', 'paid'].includes(query.status) ? records.filter(item => item.status === query.status) : records
  const commissions = filteredRecords
    .map(item => {
      const tab = getById(db, 'tabs', item.tabId)
      const entry = getSummary(item.barberId)
      return {...item, barberName: entry.barberName, closedAt: tab.closedAt, appointmentId: tab.appointmentId || null}
    })
    .sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime() || Number(b.id) - Number(a.id))

  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 20))
  const page = Math.max(1, Number(query.page) || 1)
  const start = (page - 1) * pageSize
  const paginated = query.page || query.pageSize ? commissions.slice(start, start + pageSize) : commissions

  return {
    totals: [...byBarber.values()].sort((a, b) => a.barberName.localeCompare(b.barberName, 'pt-BR')),
    commissions: paginated,
    pagination: {page, pageSize, total: commissions.length, pageCount: Math.max(1, Math.ceil(commissions.length / pageSize))}
  }
}

async function settleCommissions(db, body, user, commit) {
  if (!hasPermission(user, 'team.manage')) throw makeError(403, 'Sem permissão para liquidar comissões')
  const from = body.from ? new Date(body.from).getTime() : -Infinity
  const to = body.to ? new Date(body.to).getTime() : Infinity
  const allCommissions = db.get('commissions').value()
  let ids = Array.isArray(body.ids) ? [...new Set(body.ids.map(Number))] : []
  if (!ids.length && Number.isInteger(Number(body.barberId)) && Number(body.barberId) > 0) {
    ids = allCommissions
      .filter(item => {
        if (item.status !== 'pending' || Number(item.barberId) !== Number(body.barberId)) return false
        const tab = getById(db, 'tabs', item.tabId)
        const closedAt = new Date(tab?.closedAt || '').getTime()
        return tab?.status === 'closed' && closedAt >= from && closedAt <= to
      })
      .map(item => Number(item.id))
  }
  if (!ids.length) throw makeError(400, 'Não há comissões pendentes para liquidar no período.')
  const selected = allCommissions.filter(item => ids.includes(Number(item.id)) && item.status === 'pending')
  if (selected.length !== ids.length) throw makeError(409, 'Uma ou mais comissões não estão pendentes')
  const barberIds = new Set(selected.map(item => Number(item.barberId)))
  if (barberIds.size !== 1) throw makeError(400, 'Marque as comissões de apenas um profissional por vez')
  if (
    selected.some(item => {
      const tab = getById(db, 'tabs', item.tabId)
      const closedAt = new Date(tab?.closedAt || '').getTime()
      return !tab || tab.status !== 'closed' || closedAt < from || closedAt > to
    })
  ) {
    throw makeError(409, 'As comissões selecionadas não pertencem ao período informado')
  }
  const barberId = Number(selected[0].barberId)
  const profile = getById(db, 'barbers', barberId)
  const member = profile ? getById(db, 'users', profile.userId) : null
  const barberName = member?.name || profile?.name || `Profissional ${barberId}`
  const amountCents = selected.reduce((sum, item) => sum + Number(item.amountCents), 0)
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw makeError(409, 'O total das comissões não pode ser liquidado')
  const settledAt = nowIso()
  const periodLabel = body.periodLabel ? String(body.periodLabel).slice(0, 40) : 'período selecionado'
  const expense = {
    id: nextId(db, 'expenses'),
    description: `Comissões · ${barberName} · ${periodLabel}`,
    category: 'Comissões',
    amountCents,
    dueAt: settledAt,
    status: 'paid',
    recurring: false,
    createdAt: settledAt
  }
  await commit(
    db,
    user,
    'commissions.settle',
    'commissions',
    null,
    state => {
      for (const item of state.commissions) if (ids.includes(Number(item.id))) item.status = 'paid'
      state.expenses = state.expenses || []
      state.expenses.push(expense)
    },
    {ids, barberId, amountCents, expenseId: expense.id, periodLabel}
  )
  return {updated: ids.length, expense}
}

module.exports = {
  openTab,
  addTabItem,
  updateTabDiscount,
  closeTab,
  openCashSession,
  closeCashSession,
  createCashMovement,
  commissionSummary,
  settleCommissions,
  expectedCash,
  discountPolicy,
  CASH_DENOMINATIONS,
  CASH_DIFFERENCE_LIMIT_CENTS
}
