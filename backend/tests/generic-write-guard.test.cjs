const assert = require('node:assert/strict')
const {test} = require('node:test')

process.env.JWT_SECRET = 'generic-write-guard-test-secret'
const createMiddleware = require('../middleware.cjs')

const admin = {id: 1, role: 'admin', permissions: []}

function makeResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    }
  }
}

function createDb(initialState) {
  let state = initialState
  return {
    get: collection => ({
      value: () => state[collection] || [],
      find: criteria => ({
        value: () => (state[collection] || []).find(item => Object.entries(criteria).every(([key, value]) => item[key] === value))
      })
    }),
    getState: () => state,
    setState: nextState => {
      state = nextState
    },
    write: async () => {}
  }
}

test('bloqueia escritas genéricas nas coleções que exigem validação customizada', () => {
  const middleware = createMiddleware(createDb({}))
  const collections = ['services', 'barberServices', 'stockMovements', 'customerNotes', 'settings']

  for (const collection of collections) {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const path = method === 'POST' ? `/${collection}` : `/${collection}/1`
      const request = {method, path, url: path, query: {}, body: {}, user: admin}
      const response = makeResponse()
      let nextCalled = false

      middleware.genericAccess(request, response, () => {
        nextCalled = true
      })

      assert.equal(nextCalled, false, `${method} ${path} passou para o json-server`)
      assert.equal(response.statusCode, 405)
      assert.match(response.body.error, /Use a rota customizada/)
    }
  }
})

test('atualiza a ativação do serviço pela rota validada e registra auditoria', async () => {
  const db = createDb({services: [{id: 7, name: 'Corte', active: true}], auditLogs: []})
  const middleware = createMiddleware(db)
  const request = {method: 'PATCH', path: '/admin/catalog/services/7/active', url: '/admin/catalog/services/7/active', query: {}, body: {active: false}, user: admin}
  const response = makeResponse()

  await middleware(request, response, () => {})

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.body, {id: 7, active: false})
  assert.equal(db.getState().services[0].active, false)
  assert.equal(db.getState().auditLogs[0].action, 'catalog.service.active')
})

test('a rota de ativação rejeita status não booleano sem alterar o serviço', async () => {
  const db = createDb({services: [{id: 7, name: 'Corte', active: true}], auditLogs: []})
  const middleware = createMiddleware(db)
  const request = {method: 'PATCH', path: '/admin/catalog/services/7/active', url: '/admin/catalog/services/7/active', query: {}, body: {active: 'false'}, user: admin}
  const response = makeResponse()

  await middleware(request, response, () => {})

  assert.equal(response.statusCode, 400)
  assert.equal(db.getState().services[0].active, true)
  assert.equal(db.getState().auditLogs.length, 0)
})
