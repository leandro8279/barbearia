const assert = require('node:assert/strict')
const {test} = require('node:test')
process.env.JWT_SECRET = 'api-scrubbing-test-secret'
const createMiddleware = require('../middleware.cjs')

function createDb(users) {
  return {
    get: collection => ({
      find: criteria => ({
        value: () => collection === 'users' ? users.find(user => Number(user.id) === Number(criteria.id)) : undefined
      })
    })
  }
}

function scrubBarber(db, path, data) {
  const response = {
    status() {
      return this
    }
  }
  return createMiddleware(db).filterAndScrub({path, user: null}, response, data)
}

test('respostas públicas de barbeiros removem usuários expandidos com dados privados', () => {
  const user = {
    id: 42,
    name: 'Rafael Costa',
    email: 'rafael@example.test',
    phone: '11999990000',
    passwordHash: 'private-hash',
    tokenVersion: 7
  }
  const barber = {
    id: 3,
    userId: user.id,
    slug: 'rafael-costa',
    active: true,
    commissionServicePct: 40,
    commissionProductPct: 10,
    user
  }
  const db = createDb([user])

  for (const [path, input] of [
    ['/barbers', [barber]],
    ['/barbers/3', barber]
  ]) {
    const result = scrubBarber(db, path, input)
    const record = Array.isArray(result) ? result[0] : result

    assert.equal(record.name, user.name)
    assert.equal(record.user, undefined)
    assert.equal(record.userId, undefined)
    assert.equal(record.commissionServicePct, undefined)
    assert.equal(record.commissionProductPct, undefined)
    assert.doesNotMatch(JSON.stringify(result), /rafael@example\.test|11999990000|private-hash|tokenVersion/)
  }
})

test('remove relações json-server de coleções públicas e de agendamentos do cliente', () => {
  const middleware = createMiddleware(createDb([]))
  const requests = [
    {path: '/barbers', queryString: '_embed=appointments', user: null},
    {path: '/services', queryString: '_embed=barberServices', user: null},
    {path: '/appointments', queryString: '_expand=barber&customerId=999', user: {id: 8, role: 'customer', permissions: []}}
  ]

  for (const {path, queryString, user} of requests) {
    const request = {
      method: 'GET',
      path,
      url: `${path}?${queryString}&_page=1`,
      query: Object.fromEntries(new URLSearchParams(`${queryString}&_page=1`)),
      user
    }
    let nextCalled = false

    middleware.genericAccess(request, {}, () => {
      nextCalled = true
    })

    assert.equal(nextCalled, true)
    assert.equal(Object.hasOwn(request.query, '_embed'), false)
    assert.equal(Object.hasOwn(request.query, '_expand'), false)
    assert.equal(new URLSearchParams(request.url.split('?')[1]).has('_embed'), false)
    assert.equal(new URLSearchParams(request.url.split('?')[1]).has('_expand'), false)
    assert.equal(new URLSearchParams(request.url.split('?')[1]).get('_page'), '1')
    if (path === '/appointments') assert.equal(request.query.customerId, '8')
  }
})

test('bloqueia filtros e ordenação em campos públicos ocultos sem permissão', () => {
  const middleware = createMiddleware(createDb([]))
  const requests = [
    {path: '/products', query: {costCents_gte: '100'}},
    {path: '/products', query: {_sort: 'stock'}},
    {path: '/products', query: {_sort: 'name,costCents'}},
    {path: '/products', query: {commissionPct_lte: '20'}},
    {path: '/services', query: {_sort: 'commissionPct'}},
    {path: '/services', query: {commissionPct: '30'}},
    {path: '/barbers', query: {_sort: 'commissionServicePct'}},
    {path: '/barbers', query: {commissionProductPct_gte: '10'}}
  ]

  for (const {path, query} of requests) {
    let statusCode = 200
    let responseBody
    let nextCalled = false
    const response = {
      status(code) {
        statusCode = code
        return this
      },
      json(body) {
        responseBody = body
        return this
      }
    }
    const request = {method: 'GET', path, url: path, query, user: null}

    middleware.genericAccess(request, response, () => {
      nextCalled = true
    })

    assert.equal(nextCalled, false, `${path} aceitou ${JSON.stringify(query)}`)
    assert.equal(statusCode, 403)
    assert.match(responseBody.error, /Sem permissão/)
  }
})

test('preserva filtros e ordenação de campos internos para papéis autorizados', () => {
  const middleware = createMiddleware(createDb([]))
  const requests = [
    {path: '/products', query: {_sort: 'costCents'}, user: {id: 1, role: 'reception', permissions: ['catalog.read']}},
    {path: '/services', query: {commissionPct_gte: '20'}, user: {id: 1, role: 'reception', permissions: ['catalog.read']}},
    {path: '/barbers', query: {_sort: 'commissionServicePct'}, user: {id: 1, role: 'manager', permissions: ['team.read']}}
  ]

  for (const {path, query, user} of requests) {
    let nextCalled = false
    middleware.genericAccess({method: 'GET', path, url: path, query, user}, {}, () => {
      nextCalled = true
    })
    assert.equal(nextCalled, true)
  }
})

test('a listagem pública de produtos consulta apenas revenda ativa', () => {
  const middleware = createMiddleware(createDb([]))
  const request = {method: 'GET', path: '/products', url: '/products?_page=1&_limit=1', query: {_page: '1', _limit: '1'}, user: null}
  let nextCalled = false

  middleware.genericAccess(request, {}, () => {
    nextCalled = true
  })

  assert.equal(nextCalled, true)
  assert.equal(request.query.kind, 'resale')
  assert.equal(request.query.active_ne, 'false')
})

test('oculta insumos internos e informa a contagem total antes da paginação', () => {
  const products = [
    {id: 1, name: 'Pomada', active: true, kind: 'resale'},
    {id: 2, name: 'Shampoo interno', active: true, kind: 'supply'},
    {id: 3, name: 'Cera', active: true, kind: 'resale'},
    {id: 4, name: 'Produto inativo', active: false, kind: 'resale'}
  ]
  const db = {
    get: collection => ({
      value: () => collection === 'products' ? products : [],
      find: () => ({value: () => undefined})
    })
  }
  const headers = new Map()
  const response = {
    status() {
      return this
    },
    getHeader(name) {
      return headers.get(name.toLowerCase())
    },
    setHeader(name, value) {
      headers.set(name.toLowerCase(), value)
      return this
    }
  }
  const request = {
    method: 'GET',
    path: '/products',
    user: null,
    totalCountQuery: {_page: '1', _limit: '1', kind: 'resale', active_ne: 'false'}
  }
  const page = [products[0], products[1]]

  const result = createMiddleware(db).filterAndScrub(request, response, page)

  assert.deepEqual(result.map(product => product.id), [1])
  assert.equal(headers.get('x-total-count'), '2')
  assert.doesNotMatch(JSON.stringify(result), /Shampoo interno|supply/)
})

test('uma consulta pública por ID também oculta produtos internos', () => {
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code
      return this
    },
    setHeader() {}
  }
  const result = createMiddleware(createDb([])).filterAndScrub({method: 'GET', path: '/products/2', user: null}, response, {id: 2, name: 'Shampoo interno', active: true, kind: 'supply'})

  assert.equal(result, null)
  assert.equal(response.statusCode, 404)
})
