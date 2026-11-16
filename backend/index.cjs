require('dotenv').config()

const fs = require('node:fs')
const path = require('node:path')
const express = require('express')
const jsonServer = require('json-server')
const {authenticate} = require('./lib/auth.cjs')
const {withLock} = require('./lib/lock.cjs')
const createMiddleware = require('./middleware.cjs')
const settings = require('./lib/settings.cjs')
const {nowIso} = require('./lib/core.cjs')

const server = jsonServer.create()
const dbPath = path.join(__dirname, 'db.json')
const publicPath = path.join(__dirname, '..', 'public')
const distPath = path.join(__dirname, '..', 'dist')
const isProduction = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT || (isProduction ? 5000 : 3001))
const router = jsonServer.router(dbPath)
const db = router.db
const api = createMiddleware(db)

for (const collection of [
  'users',
  'passwordResets',
  'customerNotes',
  'units',
  'barbers',
  'schedules',
  'timeBlocks',
  'serviceCategories',
  'services',
  'barberServices',
  'appointments',
  'slotHolds',
  'tabs',
  'payments',
  'cashSessions',
  'cashMovements',
  'commissions',
  'products',
  'productCategories',
  'stockMovements',
  'expenses',
  'notifications',
  'messageTemplates',
  'settings',
  'auditLogs'
]) {
  if (!Array.isArray(db.get(collection).value())) db.set(collection, []).write()
}

server.use((request, response, next) => {
  request.isApiRequest = request.path === '/api' || request.path.startsWith('/api/')
  if (request.isApiRequest) {
    request.url = request.url.replace(/^\/api(?=\/|$)/, '') || '/'
  }
  next()
})
server.use(jsonServer.defaults({logger: !isProduction}))
server.use(express.json({limit: '1mb'}), express.urlencoded({extended: false, limit: '1mb'}))
server.use(authenticate.bind(null, db))

server.use((request, response, next) => {
  if (request.path === '/health') return response.json({status: 'ok'})
  if (isProduction && !request.isApiRequest) return next()
  return api(request, response, next)
})
server.use((request, response, next) => {
  if (isProduction && !request.isApiRequest) return next()
  return api.genericAccess(request, response, next)
})
server.use((request, response, next) => {
  if (isProduction && !request.isApiRequest) return next()
  return router(request, response, next)
})

router.render = (request, response) => {
  const data = api.filterAndScrub(request, response, response.locals.data)
  const write = !['GET', 'HEAD', 'OPTIONS'].includes(request.method) && response.statusCode < 400
  const collection = request.path.split('/').filter(Boolean)[0] || 'database'
  const sensitiveRead = request.method === 'GET' && collection === 'customerNotes' && request.user && response.statusCode < 400
  const respond = () => {
    if (request.method === 'HEAD') return response.end()
    response.jsonp(data)
  }
  if (!write && !sensitiveRead) return respond()
  const state = db.getState()
  state.auditLogs = state.auditLogs || []
  const id = state.auditLogs.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1
  state.auditLogs.push({
    id,
    userId: request.user ? Number(request.user.id) : null,
    action: write ? `api.${request.method.toLowerCase()}` : 'customerNotes.read',
    entity: collection,
    entityId: Number(request.params?.id) || null,
    details: {
      path: request.path,
      ...(sensitiveRead ?
        {
          recordCount:
            Array.isArray(data) ? data.length
            : data ? 1
            : 0
        }
      : {})
    },
    createdAt: nowIso()
  })
  try {
    db.write()
    respond()
  } catch (error) {
    console.error('Falha ao registrar auditoria da API:', error.message)
    if (!response.headersSent) response.status(500).json({error: 'Não foi possível salvar a auditoria'})
  }
}

if (isProduction) {
  if (!fs.existsSync(path.join(distPath, 'index.html'))) throw new Error('Build ausente. Execute npm run build antes de npm start.')
  server.use(express.static(publicPath))
  server.use(express.static(distPath))
  server.get('*', (request, response, next) => {
    if (request.isApiRequest) return response.status(404).json({error: 'Rota não encontrada'})
    response.sendFile(path.join(distPath, 'index.html'))
  })
}

async function runScheduler() {
  await withLock(async () => {
    const state = db.getState()
    const now = Date.now()
    const holdsBefore = state.slotHolds.length
    const resetsBefore = state.passwordResets.length
    state.slotHolds = state.slotHolds.filter(hold => new Date(hold.expiresAt).getTime() > now)
    state.passwordResets = state.passwordResets.filter(reset => new Date(reset.expiresAt).getTime() > now)
    const generated = settings.generatePendingNotifications(state, new Date(now))
    const due = state.notifications.filter(item => item.status === 'scheduled' && new Date(item.scheduledAt).getTime() <= now)
    for (const notification of due) {
      if (settings.notificationAllowed(state, notification)) {
        notification.status = 'ready'
        notification.readyAt = nowIso()
      } else {
        notification.status = 'canceled'
      }
    }
    if (holdsBefore === state.slotHolds.length && resetsBefore === state.passwordResets.length && due.length === 0 && generated.created === 0 && generated.expired === 0) return
    state.auditLogs.push({
      id: state.auditLogs.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1,
      userId: null,
      action: 'scheduler.tick',
      entity: 'scheduler',
      entityId: null,
      details: {
        expiredHolds: holdsBefore - state.slotHolds.length,
        expiredPasswordResets: resetsBefore - state.passwordResets.length,
        dueNotifications: due.length,
        generatedNotifications: generated.created,
        expiredNotifications: generated.expired
      },
      createdAt: nowIso()
    })
    await db.write()
  })
}

const scheduler = setInterval(() => runScheduler().catch(error => console.error('Falha no agendador:', error.message)), 60000)
scheduler.unref()
runScheduler().catch(error => console.error('Falha na execução inicial do agendador:', error.message))

server.set('trust proxy', 1)
server.listen(port, '0.0.0.0', () => {
  console.log(`API ${isProduction ? 'e site' : 'local'} disponíveis na porta ${port}`)
})
