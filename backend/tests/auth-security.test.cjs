const assert = require('node:assert/strict')
const {spawnSync} = require('node:child_process')
const {test} = require('node:test')
const jwt = require('jsonwebtoken')

process.env.JWT_SECRET = ''
process.env.SESSION_SECRET = 'unit-test-session-secret-not-used-outside-this-test'
const auth = require('../lib/auth.cjs')

function createDb(user) {
  return {
    get: collection => ({
      find: criteria => ({
        value: () => collection === 'users' && Number(user.id) === Number(criteria.id) ? user : undefined
      })
    })
  }
}

function authenticateToken(token) {
  const user = {id: 1, role: 'admin', active: true, tokenVersion: 0}
  const request = {headers: {authorization: `Bearer ${token}`}}
  let status = 200
  let responseBody
  let nextCalled = false
  const response = {
    status: code => {
      status = code
      return response
    },
    json: body => {
      responseBody = body
      return response
    }
  }

  auth.authenticate(createDb(user), request, response, () => {
    nextCalled = true
  })

  return {status, responseBody, nextCalled}
}

test('não autentica token assinado com chave não configurada', () => {
  const forgedToken = jwt.sign({sub: '1', ver: 0}, 'not-the-configured-server-secret')
  const result = authenticateToken(forgedToken)

  assert.equal(result.status, 401)
  assert.equal(result.nextCalled, false)
  assert.equal(result.responseBody.error, 'Sessão inválida ou expirada')
})

test('tokens emitidos com SESSION_SECRET são autenticados', () => {
  const user = {id: 1, role: 'admin', active: true, tokenVersion: 0}
  const {token} = auth.safeAuthResult(user)
  const result = authenticateToken(token)

  assert.equal(result.status, 200)
  assert.equal(result.nextCalled, true)
})

test('a API falha ao iniciar quando nenhum segredo está configurado', () => {
  const env = {...process.env, NODE_ENV: 'development'}
  delete env.JWT_SECRET
  delete env.SESSION_SECRET
  const result = spawnSync(process.execPath, ['-e', "require('./server/lib/auth.cjs')"], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8'
  })

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Configure JWT_SECRET ou SESSION_SECRET/)
})
