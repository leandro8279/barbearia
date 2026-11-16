function getPublicServicePrices(db) {
  const barbers = db
    .get('barbers')
    .value()
    .filter(barber => barber.active)
  const links = db.get('barberServices').value()

  return db
    .get('services')
    .value()
    .filter(service => service.active !== false)
    .map(service => {
      const effectivePrices = barbers.flatMap(barber => {
        const barberLinks = links.filter(link => Number(link.barberId) === Number(barber.id))
        const serviceLink = barberLinks.find(link => Number(link.serviceId) === Number(service.id))
        if (barberLinks.length && !serviceLink) return []
        return [Number(serviceLink?.price ?? service.price)]
      })
      const uniquePrices = new Set(effectivePrices)
      return {serviceId: Number(service.id), price: effectivePrices.length ? Math.min(...effectivePrices) : Number(service.price), variesByBarber: uniquePrices.size > 1}
    })
}

const ADMIN_SERVICE_SORT_FIELDS = new Set(['name', 'categoryId', 'durationMin', 'price', 'commissionPct', 'active'])

function getAdminServicePage(db, query = {}) {
  const requestedPage = Number(query._page)
  const requestedPageSize = Number(query._limit)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const pageSize = Number.isInteger(requestedPageSize) && requestedPageSize > 0 ? Math.min(requestedPageSize, 100) : 20
  const search = String(query.q || '')
    .trim()
    .toLocaleLowerCase('pt-BR')
  const categoryId = Number(query.categoryId)
  const activeFilter =
    query.active === 'true' ? true
    : query.active === 'false' ? false
    : undefined
  const sortField = ADMIN_SERVICE_SORT_FIELDS.has(String(query._sort)) ? String(query._sort) : 'name'
  const direction = query._order === 'desc' ? -1 : 1
  const services = db
    .get('services')
    .value()
    .filter(
      service =>
        !search ||
        String(service.name || '')
          .toLocaleLowerCase('pt-BR')
          .includes(search)
    )
    .filter(service => !Number.isInteger(categoryId) || categoryId <= 0 || Number(service.categoryId) === categoryId)
    .filter(service => activeFilter === undefined || (service.active !== false) === activeFilter)
    .sort((left, right) => {
      const leftValue = left[sortField]
      const rightValue = right[sortField]
      const comparison =
        typeof leftValue === 'string' && typeof rightValue === 'string' ? leftValue.localeCompare(rightValue, 'pt-BR', {sensitivity: 'base'})
        : leftValue === rightValue ? 0
        : leftValue > rightValue ? 1
        : -1
      return comparison * direction || Number(left.id) - Number(right.id)
    })
  const total = services.length
  const items = services
    .slice((page - 1) * pageSize, page * pageSize)
    .map(service => ({
      id: Number(service.id),
      name: String(service.name || ''),
      slug: String(service.slug || ''),
      categoryId: Number(service.categoryId),
      description: String(service.description || ''),
      durationMin: Number(service.durationMin) || 0,
      bufferMin: Number(service.bufferMin) || 0,
      price: Number(service.price) || 0,
      commissionPct: Number(service.commissionPct) || 0,
      active: service.active !== false,
      featured: service.featured === true
    }))
  return {items, total, page, pageSize}
}

module.exports = {getAdminServicePage, getPublicServicePrices}
