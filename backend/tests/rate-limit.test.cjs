const assert = require('node:assert/strict')
const bcrypt = require('bcryptjs')
const express = require('express')
const http = require('node:http')
const {test} = require('node:test')

process.env.JWT_SECRET = 'rate-limit-test-secret'
const createMiddleware = require('../middleware.cjs')

function createDb(users = []) {
  let state = {users, passwordResets: [], auditLogs: [], slotHolds: []}
  return {
    get: collection => ({
      value: () => state[collection] || [],
      find: criteria => ({
        value: () => (state[collection] || []).find(item => typeof criteria === 'function' ? criteria(item) : Object.entries(criteria).every(([key, value]) => item[key] === value))
      })
    }),
    getState: () => state,
    setState: nextState => {
      state = nextState
    },
    write: async () => {}
  }
}

function send(port, path, body) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {host: '127.0.0.1', port, method: 'POST', path, headers: {'Content-Type': 'application/json'}},
      response => {
        response.resume()
        response.on('end', () => resolve({status: response.statusCode, headers: response.headers}))
      }
    )
    request.on('error', reject)
    request.end(JSON.stringify(body))
  })
}

async function withApi(db, run) {
  const app = express()
  app.use(express.json())
  app.use(createMiddleware(db))
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  try {
    await run(server.address().port)
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
}

test('logins válidos do mesmo IP não consomem o limite de falhas', async () => {
  const user = {
    id: 1,
    name: 'Cliente de teste',
    email: 'cliente@example.test',
    phone: '11999990000',
    passwordHash: bcrypt.hashSync('senha-teste', 4),
    role: 'customer',
    permissions: [],
    active: true,
    tokenVersion: 0,
    guest: false
  }

  await withApi(createDb([user]), async port => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await send(port, '/auth/login', {email: user.email, password: 'senha-teste'})
      assert.equal(response.status, 200)
    }
  })
})

test('cinco falhas de login são limitadas e o limite expõe Retry-After', async () => {
  const user = {
    id: 1,
    email: 'cliente@example.test',
    passwordHash: bcrypt.hashSync('senha-correta', 4),
    role: 'customer',
    active: true,
    tokenVersion: 0
  }

  await withApi(createDb([user]), async port => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await send(port, '/auth/login', {email: user.email, password: 'senha-incorreta'})
      assert.equal(response.status, 401)
    }
    const limited = await send(port, '/auth/login', {email: user.email, password: 'senha-correta'})
    assert.equal(limited.status, 429)
    assert.ok(Number(limited.headers['retry-after']) > 0)
  })
})

test('cadastro, visitante, recuperação e holds têm limites por IP', async () => {
  const cases = [
    {path: '/auth/register', body: {}, allowed: 5},
    {path: '/auth/guest', body: {}, allowed: 10},
    {path: '/auth/forgot', body: {}, allowed: 5},
    {path: '/slotHolds', body: {}, allowed: 20}
  ]

  await withApi(createDb(), async port => {
    for (const {path, body, allowed} of cases) {
      for (let attempt = 0; attempt < allowed; attempt += 1) {
        const response = await send(port, path, body)
        assert.notEqual(response.status, 429, `${path} bloqueou antes do limite`)
      }
      const limited = await send(port, path, body)
      assert.equal(limited.status, 429, `${path} não aplicou limite`)
      assert.ok(Number(limited.headers['retry-after']) > 0)
    }
  })
})
