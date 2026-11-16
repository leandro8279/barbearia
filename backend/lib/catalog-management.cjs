const {ACTIVE_APPOINTMENT_STATUSES, getById, makeError, nowIso} = require('./core.cjs')

const PRODUCT_SORT_FIELDS = new Set(['name', 'sku', 'categoryId', 'price', 'costCents', 'stock'])
const SERVICE_SORT_FIELDS = new Set(['name', 'categoryId', 'durationMin', 'price', 'commissionPct', 'active'])
const MAX_IMAGE_BYTES = 200 * 1024

function list(db, collection) {
  const rows = db.get(collection).value()
  return Array.isArray(rows) ? rows : []
}

function nextId(rows) {
  return rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1
}

function validateImage(image, maxBytes = MAX_IMAGE_BYTES) {
  if (image == null || image === '') return ''
  if (typeof image !== 'string') throw makeError(400, 'A imagem informada é inválida.')
  if (!image.startsWith('data:')) return image
  const match = /^data:image\/(?:png|jpe?g|webp);base64,([A-Za-z0-9+/]*={0,2})$/.exec(image)
  if (!match) throw makeError(400, 'Use uma imagem PNG, JPG ou WebP válida.')
  if (Buffer.from(match[1], 'base64').byteLength > maxBytes) throw makeError(413, `A imagem deve ter no máximo ${Math.floor(maxBytes / 1024)} KB.`)
  return image
}

function getAdminBarbers(db) {
  return list(db, 'barbers')
    .filter(barber => barber.active !== false)
    .map(barber => ({id: Number(barber.id), name: getById(db, 'users', barber.userId)?.name || barber.name || barber.slug || 'Profissional', photo: barber.photo || null}))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

function getAdminService(db, id) {
  const service = getById(db, 'services', id)
  if (!service) return null
  const links = list(db, 'barberServices')
  return {
    ...service,
    barberAssignments: getAdminBarbers(db).map(barber => {
      const link = links.find(item => Number(item.barberId) === barber.id && Number(item.serviceId) === Number(id))
      const hasLinks = links.some(item => Number(item.barberId) === barber.id)
      return {
        barberId: barber.id,
        name: barber.name,
        photo: barber.photo,
        assigned: Boolean(link) || !hasLinks,
        durationMin: link?.durationMin ?? null,
        price: link?.price ?? null,
        commissionPct: link?.commissionPct ?? null
      }
    })
  }
}

function hasFutureAppointmentsForService(db, id) {
  const serviceId = Number(id)
  const now = Date.now()
  return list(db, 'appointments').some(
    appointment =>
      ACTIVE_APPOINTMENT_STATUSES.has(appointment.status) &&
      new Date(appointment.start).getTime() > now &&
      Array.isArray(appointment.items) &&
      appointment.items.some(item => Number(item.serviceId) === serviceId)
  )
}

async function saveAdminService(db, user, id, body, commit) {
  const serviceId = id == null ? null : Number(id)
  const existing = serviceId == null ? null : getById(db, 'services', serviceId)
  if (serviceId != null && !existing) throw makeError(404, 'Serviço não encontrado.')
  const name = String(body.name || '').trim()
  const categoryId = Number(body.categoryId)
  const durationMin = Number(body.durationMin)
  const bufferMin = Number(body.bufferMin || 0)
  const price = Number(body.price)
  const commissionPct = Number(body.commissionPct)
  if (name.length < 2) throw makeError(400, 'Informe o nome do serviço.')
  if (!getById(db, 'serviceCategories', categoryId)) throw makeError(400, 'Selecione uma categoria válida.')
  if (!Number.isInteger(durationMin) || durationMin < 5 || durationMin % 5 !== 0) throw makeError(400, 'A duração precisa ser múltipla de 5 minutos.')
  if (!Number.isInteger(bufferMin) || bufferMin < 0 || bufferMin % 5 !== 0) throw makeError(400, 'O intervalo precisa ser múltiplo de 5 minutos.')
  if (!Number.isInteger(price) || price < 0) throw makeError(400, 'Informe um preço válido em centavos.')
  if (!Number.isFinite(commissionPct) || commissionPct < 0 || commissionPct > 100) throw makeError(400, 'A comissão deve ficar entre 0% e 100%.')
  const assignments = Array.isArray(body.barberAssignments) ? body.barberAssignments : []
  const selected = assignments.filter(item => item.assigned)
  const validBarberIds = new Set(getAdminBarbers(db).map(item => item.id))
  if (!selected.length) throw makeError(400, 'Selecione ao menos um profissional.')
  if (selected.some(item => !validBarberIds.has(Number(item.barberId)))) throw makeError(400, 'Um profissional selecionado não está disponível.')
  if (new Set(selected.map(item => Number(item.barberId))).size !== selected.length) throw makeError(400, 'Há profissionais duplicados nesta configuração.')
  for (const assignment of selected) {
    const barberDuration = assignment.durationMin == null ? null : Number(assignment.durationMin)
    const barberPrice = assignment.price == null ? null : Number(assignment.price)
    const barberCommission = assignment.commissionPct == null ? null : Number(assignment.commissionPct)
    if (barberDuration !== null && (!Number.isInteger(barberDuration) || barberDuration < 5 || barberDuration % 5 !== 0)) throw makeError(400, 'A duração específica deve ser múltipla de 5 minutos.')
    if (barberPrice !== null && (!Number.isInteger(barberPrice) || barberPrice < 0)) throw makeError(400, 'O preço específico deve ser informado em centavos.')
    if (barberCommission !== null && (!Number.isFinite(barberCommission) || barberCommission < 0 || barberCommission > 100)) throw makeError(400, 'A comissão específica deve ficar entre 0% e 100%.')
  }
  const image = validateImage(body.image, 1024 * 1024)
  const slug = String(
    body.slug ||
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
  )
  const record = {
    ...(existing || {}),
    name,
    slug,
    categoryId,
    description: String(body.description || '').trim(),
    image,
    durationMin,
    bufferMin,
    price,
    commissionPct,
    active: body.active !== false,
    featured: body.featured === true
  }
  let saved
  await commit(
    db,
    user,
    serviceId == null ? 'catalog.service.create' : 'catalog.service.update',
    'services',
    serviceId,
    state => {
      state.services = state.services || []
      state.barberServices = state.barberServices || []
      const actualId = serviceId ?? nextId(state.services)
      saved = {...record, id: actualId}
      const index = state.services.findIndex(item => Number(item.id) === actualId)
      if (index >= 0) state.services[index] = saved
      else state.services.push(saved)
      state.barberServices = state.barberServices.filter(item => Number(item.serviceId) !== actualId)
      for (const assignment of selected) {
        const link = {serviceId: actualId, barberId: Number(assignment.barberId)}
        for (const key of ['durationMin', 'price', 'commissionPct']) {
          const value = assignment[key]
          if (value != null && value !== '') link[key] = Number(value)
        }
        state.barberServices.push(link)
      }
    },
    {barberCount: selected.length}
  )
  return saved
}

function getAdminProductPage(db, query = {}) {
  const requestedPage = Number(query._page)
  const requestedPageSize = Number(query._limit)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const pageSize = Number.isInteger(requestedPageSize) && requestedPageSize > 0 ? Math.min(requestedPageSize, 100) : 20
  const search = String(query.q || '')
    .trim()
    .toLocaleLowerCase('pt-BR')
  const categoryId = Number(query.categoryId)
  const kind = query.kind === 'resale' || query.kind === 'supply' ? query.kind : ''
  const stockFilter = query.stock === 'low' || query.stock === 'ok' ? query.stock : ''
  const sortField = PRODUCT_SORT_FIELDS.has(String(query._sort)) ? String(query._sort) : 'name'
  const direction = query._order === 'desc' ? -1 : 1
  const products = list(db, 'products')
    .filter(product => !search || `${product.name || ''} ${product.sku || ''}`.toLocaleLowerCase('pt-BR').includes(search))
    .filter(product => !Number.isInteger(categoryId) || categoryId <= 0 || Number(product.categoryId) === categoryId)
    .filter(product => !kind || product.kind === kind)
    .filter(product => !stockFilter || (stockFilter === 'low' ? Number(product.stock) < Number(product.minStock) : Number(product.stock) >= Number(product.minStock)))
    .sort((left, right) => {
      const a = left[sortField]
      const b = right[sortField]
      const comparison = typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b, 'pt-BR', {sensitivity: 'base'}) : Number(a) - Number(b)
      return comparison * direction || Number(left.id) - Number(right.id)
    })
  const total = products.length
  return {items: products.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize}
}

function getAdminProduct(db, id) {
  return getById(db, 'products', id) || null
}

async function saveAdminProduct(db, user, id, body, commit) {
  const productId = id == null ? null : Number(id)
  const existing = productId == null ? null : getById(db, 'products', productId)
  if (productId != null && !existing) throw makeError(404, 'Produto não encontrado.')
  const sku = String(body.sku || '')
    .trim()
    .toUpperCase()
  const name = String(body.name || '').trim()
  const categoryId = Number(body.categoryId)
  const price = Number(body.price)
  const costCents = Number(body.costCents)
  const stock =
    existing ? Number(existing.stock)
    : body.stock == null ? 0
    : Number(body.stock)
  const minStock = Number(body.minStock)
  const commissionPct = Number(body.commissionPct)
  const kind =
    body.kind === 'supply' ? 'supply'
    : body.kind === 'resale' ? 'resale'
    : ''
  if (sku.length < 2) throw makeError(400, 'Informe um SKU válido.')
  if (
    list(db, 'products').some(
      item =>
        String(item.sku || '')
          .trim()
          .toUpperCase() === sku && Number(item.id) !== productId
    )
  )
    throw makeError(409, 'Este SKU já está em uso.')
  if (name.length < 2) throw makeError(400, 'Informe o nome do produto.')
  if (!getById(db, 'productCategories', categoryId)) throw makeError(400, 'Selecione uma categoria válida.')
  if (![price, costCents, stock, minStock].every(value => Number.isInteger(value) && value >= 0)) throw makeError(400, 'Preço, custo, saldo e estoque mínimo devem ser valores inteiros não negativos.')
  if (!Number.isFinite(commissionPct) || commissionPct < 0 || commissionPct > 100) throw makeError(400, 'A comissão deve ficar entre 0% e 100%.')
  if (!kind) throw makeError(400, 'Selecione se o produto é para revenda ou uso interno.')
  const image = validateImage(body.image)
  const record = {...(existing || {}), sku, name, categoryId, price, costCents, stock, minStock, kind, commissionPct, image, active: body.active !== false}
  let saved
  await commit(
    db,
    user,
    productId == null ? 'catalog.product.create' : 'catalog.product.update',
    'products',
    productId,
    state => {
      state.products = state.products || []
      const actualId = productId ?? nextId(state.products)
      saved = {...record, id: actualId}
      const index = state.products.findIndex(item => Number(item.id) === actualId)
      if (index >= 0) state.products[index] = saved
      else state.products.push(saved)
    },
    {sku}
  )
  return saved
}

async function adjustProductStock(db, user, id, body, commit) {
  const productId = Number(id)
  const delta = Number(body.delta)
  const reason = String(body.reason || '').trim()
  const product = getById(db, 'products', productId)
  if (!product) throw makeError(404, 'Produto não encontrado.')
  if (!Number.isInteger(delta) || delta === 0) throw makeError(400, 'Informe uma quantidade inteira diferente de zero.')
  if (reason.length < 3 || reason.length > 200) throw makeError(400, 'Informe o motivo do ajuste (3 a 200 caracteres).')
  if (Number(product.stock) + delta < 0) throw makeError(409, 'O ajuste não pode deixar o estoque negativo.')
  let result
  await commit(
    db,
    user,
    'catalog.product.stock.adjust',
    'products',
    productId,
    state => {
      const current = state.products.find(item => Number(item.id) === productId)
      current.stock = Number(current.stock) + delta
      state.stockMovements = state.stockMovements || []
      const movement = {id: nextId(state.stockMovements), productId, type: 'adjust', qty: delta, reason, userId: Number(user.id), createdAt: nowIso()}
      state.stockMovements.push(movement)
      result = {product: current, movement}
    },
    {delta, reason}
  )
  return result
}

async function setServiceActive(db, user, id, active, commit) {
  const serviceId = Number(id)
  const service = getById(db, 'services', serviceId)
  if (!service) throw makeError(404, 'Serviço não encontrado.')
  if (typeof active !== 'boolean') throw makeError(400, 'Informe um status válido para o serviço.')
  await commit(db, user, 'catalog.service.active', 'services', serviceId, state => {
    const current = state.services.find(item => Number(item.id) === serviceId)
    current.active = active
  }, {active})
  return {id: serviceId, active}
}

module.exports = {adjustProductStock, getAdminBarbers, getAdminProduct, getAdminProductPage, getAdminService, hasFutureAppointmentsForService, saveAdminProduct, saveAdminService, setServiceActive, validateImage}
