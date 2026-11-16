const bcrypt = require('bcryptjs');
const { getSlots, requestedServices, priceAndDuration } = require('./lib/availability.cjs');
const { getAdminServicePage, getPublicServicePrices } = require('./lib/catalog.cjs');
const catalogManagement = require('./lib/catalog-management.cjs');
const customerManagement = require('./lib/customer-management.cjs');
const auth = require('./lib/auth.cjs');
const resetPasswordEmail = require('./lib/password-reset-email.cjs');
const appointments = require('./lib/appointments.cjs');
const timeBlocks = require('./lib/time-blocks.cjs');
const teamManagement = require('./lib/team-management.cjs');
const checkout = require('./lib/checkout.cjs');
const finance = require('./lib/finance.cjs');
const { getAdminDashboard } = require('./lib/dashboard.cjs');
const profile = require('./lib/profile.cjs');
const settings = require('./lib/settings.cjs');
const { withLock } = require('./lib/lock.cjs');
const { createRateLimiter } = require('./lib/rate-limit.cjs');
const { countMatchingRecords } = require('./lib/query-count.cjs');
const {
  ACTIVE_APPOINTMENT_STATUSES,
  canReadAppointment,
  currentBarber,
  fail,
  getById,
  hasPermission,
  localDateTime,
  makeError,
  nextId,
  nowIso,
  randomToken,
  STAFF_ROLES,
  safeUser,
  sendError,
  validDateString,
} = require('./lib/core.cjs');

const endpointRateLimits = {
  guest: createRateLimiter({ windowMs: 10 * 60 * 1000, maxAttempts: 10 }),
  register: createRateLimiter({ windowMs: 10 * 60 * 1000, maxAttempts: 5 }),
  forgot: createRateLimiter({ windowMs: 10 * 60 * 1000, maxAttempts: 5 }),
  slotHolds: createRateLimiter({ windowMs: 10 * 60 * 1000, maxAttempts: 20 }),
};

const protectedQueryFields = {
  products: { permission: 'catalog.read', fields: ['costCents', 'stock', 'minStock', 'commissionPct', 'kind'] },
  services: { permission: 'catalog.read', fields: ['commissionPct'] },
  barbers: { permission: 'team.read', fields: ['commissionServicePct', 'commissionProductPct'] },
};

const customWriteOnlyCollections = new Set([
  'services',
  'barberServices',
  'stockMovements',
  'customerNotes',
  'settings',
]);
const publicCollections = new Set([
  'units',
  'barbers',
  'services',
  'serviceCategories',
  'products',
  'productCategories',
]);

function enforceRateLimit(limiter, request, response) {
  const result = limiter.consume(request.ip || request.socket?.remoteAddress);
  if (result.allowed) return;
  response.setHeader('Retry-After', String(Math.max(1, Math.ceil(result.retryAfterMs / 1000))));
  throw makeError(429, 'Muitas solicitações. Aguarde antes de tentar novamente.');
}

function hasProtectedFieldQuery(query, fields) {
  const protectedNames = new Set(fields.map((field) => field.toLowerCase()));
  return Object.entries(query || {}).some(([key, value]) => {
    if (key.toLowerCase() === '_sort') {
      const sortValues = Array.isArray(value) ? value : [value];
      return sortValues.some((sortValue) =>
        String(sortValue)
          .split(',')
          .some((field) => protectedNames.has(field.trim().replace(/^[-+]/, '').toLowerCase())),
      );
    }
    const field = key.toLowerCase();
    return [...protectedNames].some((name) => field === name || field.startsWith(`${name}_`));
  });
}

function requirePermission(user, permission) {
  if (!hasPermission(user, permission)) throw makeError(403, 'Você não tem permissão para esta ação');
}

const TEAM_PERMISSION_KEYS = [
  'agenda.read',
  'agenda.write',
  'agenda.manage',
  'commissions.read',
  'cash.read',
  'cash.write',
  'cash.manage',
  'catalog.read',
  'catalog.write',
  'customers.read',
  'customers.write',
  'team.read',
  'team.write',
  'team.manage',
  'finance.read',
  'finance.write',
  'finance.manage',
  'settings.read',
  'settings.write',
  'settings.manage',
];

async function deliverTeamInvitation(email, token) {
  try {
    await resetPasswordEmail.sendInvitation(email, token);
    return true;
  } catch (error) {
    console.error('Falha ao enviar convite da equipe pelo Resend:', error.message);
    if (process.env.NODE_ENV !== 'production') resetPasswordEmail.logDevelopmentLink(token);
    return false;
  }
}

function adminTeamUsers(db) {
  const users = db
    .get('users')
    .value()
    .filter((item) => item.role !== 'customer')
    .map((item) => ({
      ...safeUser(item),
      permissions: Array.isArray(item.permissions) ? item.permissions : [],
      effectivePermissions: TEAM_PERMISSION_KEYS.filter((permission) => hasPermission(item, permission)),
      hasPassword: Boolean(item.passwordHash),
    }))
    .sort((a, b) => String(a.name || a.email).localeCompare(String(b.name || b.email), 'pt-BR'));
  const roleDefaults = Object.fromEntries(
    ['barber', 'reception', 'manager', 'admin'].map((role) => [
      role,
      TEAM_PERMISSION_KEYS.filter((permission) => hasPermission({ role, permissions: [] }, permission)),
    ]),
  );
  return { users, roles: [...STAFF_ROLES], permissionKeys: TEAM_PERMISSION_KEYS, roleDefaults };
}

function dateString(date) {
  const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function dateRange(month) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ''))) throw makeError(400, 'Informe o mês no formato AAAA-MM');
  const [year, monthNumber] = month.split('-').map(Number);
  if (monthNumber < 1 || monthNumber > 12) throw makeError(400, 'Mês inválido');
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
}

function serviceIdsFrom(request) {
  return request.query.serviceIds || request.body?.serviceIds || [];
}

function barberNextSlot(db, barberId, serviceIds) {
  for (let offset = 0; offset <= 30; offset += 1) {
    const date = dateString(new Date(Date.now() + offset * 86400000));
    const slots = getSlots(db, { barberId, serviceIds, date });
    if (slots.length) return { ...slots[0], items: slots[0].items.map(({ commissionPct, ...item }) => item) };
  }
  return null;
}

function eligibleBarbers(db, services) {
  return db
    .get('barbers')
    .value()
    .filter((barber) => {
      if (!barber.active) return false;
      const linked = db
        .get('barberServices')
        .value()
        .filter((item) => Number(item.barberId) === Number(barber.id));
      return (
        !linked.length ||
        services.every((service) => linked.some((item) => Number(item.serviceId) === Number(service.id)))
      );
    });
}

function bookingEstimate(db, request) {
  const services = requestedServices(db, serviceIdsFrom(request));
  const requestedBarberId = request.query.barberId;
  const candidates = requestedBarberId
    ? [eligibleBarbers(db, services).find((barber) => Number(barber.id) === Number(requestedBarberId))].filter(Boolean)
    : eligibleBarbers(db, services);

  if (requestedBarberId && !candidates.length)
    throw makeError(404, 'Profissional indisponível para os serviços selecionados');

  const quotes = (candidates.length ? candidates : [null]).map((barber) => priceAndDuration(db, barber?.id, services));
  const durations = quotes.map((quote) => quote.durationMin + quote.bufferMin);
  const prices = quotes.map((quote) => quote.subtotal);

  return {
    durationMin: { min: Math.min(...durations), max: Math.max(...durations) },
    subtotal: { min: Math.min(...prices), max: Math.max(...prices) },
  };
}

function availabilityBarbers(db, request) {
  const services = requestedServices(db, serviceIdsFrom(request));
  return eligibleBarbers(db, services).map((barber) => {
    const pricing = priceAndDuration(db, barber.id, services);
    const profile = db
      .get('users')
      .find({ id: Number(barber.userId) })
      .value();
    const { commissionServicePct, commissionProductPct, userId, ...publicBarber } = barber;
    return {
      ...publicBarber,
      name: profile?.name || barber.name || barber.slug,
      items: pricing.items.map(({ commissionPct, ...item }) => item),
      durationMin: pricing.durationMin,
      bufferMin: pricing.bufferMin,
      totalDurationMin: pricing.durationMin + pricing.bufferMin,
      subtotal: pricing.subtotal,
      nextSlot: barberNextSlot(
        db,
        barber.id,
        services.map((service) => service.id),
      ),
    };
  });
}

function availabilityDays(db, request) {
  const dates = dateRange(request.query.month);
  const serviceIds = serviceIdsFrom(request);
  const barberId = request.query.barberId;
  return dates
    .map((date) => ({ date, slotsCount: getSlots(db, { date, serviceIds, barberId }).length, available: false }))
    .map((day) => ({ ...day, available: day.slotsCount > 0 }));
}

function nextAvailability(db, request) {
  const serviceIds = serviceIdsFrom(request);
  const barberId = request.query.barberId;
  const maxDays = Number(db.get('settings').find({ id: 1 }).value()?.booking?.maxDays ?? 45);
  for (let offset = 0; offset <= maxDays; offset += 1) {
    const date = dateString(new Date(Date.now() + offset * 86400000));
    const slots = getSlots(db, { date, serviceIds, barberId });
    if (slots.length) return { slot: { ...slots[0], items: slots[0].items.map(({ commissionPct, ...item }) => item) } };
  }
  return { slot: null };
}

function canAccessEntity(db, user, collection, record) {
  if (!user) return false;
  if (collection === 'appointments') return canReadAppointment(db, user, record);
  if (collection === 'users') {
    if (user.role === 'customer') return Number(record.id) === Number(user.id);
    return record.role === 'customer' ? hasPermission(user, 'customers.read') : hasPermission(user, 'team.read');
  }
  if (collection === 'commissions') {
    const barber = currentBarber(db, user);
    return user.role === 'barber'
      ? Number(record.barberId) === Number(barber?.id)
      : hasPermission(user, 'commissions.read');
  }
  if (collection === 'tabs') {
    if (user.role === 'customer') return Number(record.customerId) === Number(user.id);
    if (user.role === 'barber') return Number(record.barberId) === Number(currentBarber(db, user)?.id);
    return hasPermission(user, 'cash.read');
  }
  if (collection === 'payments') {
    const tab = getById(db, 'tabs', record.tabId);
    return tab ? canAccessEntity(db, user, 'tabs', tab) : false;
  }
  if (collection === 'customerNotes')
    return user.role === 'customer'
      ? Number(record.userId) === Number(user.id)
      : hasPermission(user, 'customers.write');
  if (collection === 'cashSessions' || collection === 'cashMovements') return hasPermission(user, 'cash.read');
  if (collection === 'auditLogs') return hasPermission(user, 'team.manage') || hasPermission(user, 'settings.manage');
  if (collection === 'notifications')
    return user.role === 'customer'
      ? Number(record.userId) === Number(user.id)
      : hasPermission(user, 'settings.write') || hasPermission(user, 'settings.manage');
  if (collection === 'settings')
    return (
      hasPermission(user, 'settings.read') ||
      hasPermission(user, 'settings.write') ||
      hasPermission(user, 'settings.manage')
    );
  if (['units', 'barbers', 'services', 'serviceCategories', 'products', 'productCategories'].includes(collection))
    return true;
  if (['schedules', 'timeBlocks'].includes(collection)) {
    if (user.role === 'barber') {
      if (collection === 'timeBlocks' && record.barberId == null) return true;
      return Number(record.barberId) === Number(currentBarber(db, user)?.id);
    }
    return hasPermission(user, 'agenda.read');
  }
  return hasPermission(user, 'team.read');
}

function stripJsonServerRelations(request) {
  const parsedQuery = request.query || {};
  const safeQuery = { ...parsedQuery };
  delete safeQuery._embed;
  delete safeQuery._expand;
  Object.defineProperty(request, 'query', { configurable: true, value: safeQuery });

  const queryStart = String(request.url || '').indexOf('?');
  if (queryStart === -1) return;
  const path = request.url.slice(0, queryStart);
  const query = new URLSearchParams(request.url.slice(queryStart + 1));
  if (!query.has('_embed') && !query.has('_expand')) return;
  query.delete('_embed');
  query.delete('_expand');
  const remaining = query.toString();
  request.url = `${path}${remaining ? `?${remaining}` : ''}`;
}

function genericAccess(db, request, response, next) {
  stripJsonServerRelations(request);
  const collection = request.path.split('/').filter(Boolean)[0];
  if (!collection) return next();
  if (collection === 'passwordResets') return fail(response, 404, 'Rota não encontrada');
  const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  const protectedWrites = new Set([
    'appointments',
    'slotHolds',
    'tabs',
    'payments',
    'commissions',
    'cashSessions',
    'cashMovements',
    'auditLogs',
    'users',
    'notifications',
  ]);
  const protectedQuery = protectedQueryFields[collection];
  if (
    ['GET', 'HEAD'].includes(request.method) &&
    protectedQuery &&
    !hasPermission(request.user, protectedQuery.permission) &&
    hasProtectedFieldQuery(request.query, protectedQuery.fields)
  )
    return fail(response, 403, 'Sem permissão para filtrar ou ordenar por estes campos');
  if (publicCollections.has(collection) && !isWrite) {
    if (['barbers', 'services', 'products'].includes(collection)) request.query.active_ne = 'false';
    if (collection === 'products') request.query.kind = 'resale';
    request.totalCountQuery = { ...request.query };
    return next();
  }
  if (!request.user) return fail(response, 401, 'Faça login para acessar estes dados');
  if (collection === 'expenses')
    return fail(response, 405, 'Use as rotas financeiras para consultar ou alterar despesas.');
  if (isWrite) {
    if (protectedWrites.has(collection)) return fail(response, 405, 'Use a rota customizada para esta operação');
    const permission = {
      services: 'catalog.write',
      barberServices: 'catalog.write',
      serviceCategories: 'catalog.write',
      products: 'catalog.write',
      productCategories: 'catalog.write',
      barbers: 'team.write',
      schedules: 'team.write',
      timeBlocks: 'agenda.write',
      settings: 'settings.manage',
      customerNotes: 'customers.write',
      expenses: 'finance.write',
      stockMovements: 'catalog.write',
    }[collection];
    if (!permission || !hasPermission(request.user, permission))
      return fail(response, 403, 'Você não tem permissão para alterar estes dados');
    if (customWriteOnlyCollections.has(collection))
      return fail(response, 405, 'Use a rota customizada para esta operação');
    if (collection === 'services' && request.method === 'DELETE') {
      const serviceIdMatch = /^\/services\/(\d+)$/.exec(request.path);
      if (serviceIdMatch && catalogManagement.hasFutureAppointmentsForService(db, serviceIdMatch[1]))
        return fail(
          response,
          409,
          'Este serviço tem agendamentos futuros e não pode ser excluído. Desative-o no catálogo.',
        );
    }
    if (
      collection === 'services' &&
      request.body?.durationMin !== undefined &&
      (!Number.isInteger(Number(request.body.durationMin)) ||
        Number(request.body.durationMin) < 5 ||
        Number(request.body.durationMin) % 5 !== 0)
    )
      return fail(response, 400, 'A duração precisa ser múltipla de 5 minutos.');
    if (collection === 'products') {
      if (request.method === 'PATCH' && Object.prototype.hasOwnProperty.call(request.body || {}, 'stock'))
        return fail(response, 400, 'Use Ajustar saldo para alterar o estoque.');
      if (
        request.method === 'POST' &&
        request.body?.stock !== undefined &&
        (!Number.isInteger(Number(request.body.stock)) || Number(request.body.stock) < 0)
      )
        return fail(response, 400, 'O saldo inicial deve ser um número inteiro não negativo.');
      try {
        catalogManagement.validateImage(request.body?.image);
      } catch (error) {
        return fail(response, error.status || 400, error.message);
      }
      const sku = String(request.body?.sku || '')
        .trim()
        .toUpperCase();
      const productPathMatch = /^\/products\/(\d+)$/.exec(request.path);
      const currentId = productPathMatch ? Number(productPathMatch[1]) : Number.NaN;
      if (
        sku &&
        db
          .get('products')
          .value()
          .some(
            (item) =>
              String(item.sku || '')
                .trim()
                .toUpperCase() === sku && Number(item.id) !== currentId,
          )
      )
        return fail(response, 409, 'Este SKU já está em uso.');
    }
    if (request.body?.passwordHash || request.body?.password)
      return fail(response, 400, 'Credenciais não podem ser alteradas por esta rota');
    return next();
  }
  if (collection === 'users' && request.user.role === 'barber')
    return fail(response, 403, 'Acesso a usuários não permitido');
  if (collection === 'barberServices' && !hasPermission(request.user, 'catalog.read'))
    return fail(response, 403, 'Sem permissão para consultar os profissionais por serviço');
  if (collection === 'appointments') {
    if (request.user.role === 'customer') request.query.customerId = String(Number(request.user.id));
    else if (request.user.role === 'barber')
      request.query.barberId = String(Number(currentBarber(db, request.user)?.id));
    else if (!hasPermission(request.user, 'agenda.read'))
      return fail(response, 403, 'Sem permissão para consultar a agenda');
  }
  if (collection === 'commissions' && request.user.role === 'barber')
    request.query.barberId = String(Number(currentBarber(db, request.user)?.id));
  if (collection === 'users' && request.user.role === 'customer') request.query.id = String(Number(request.user.id));
  if (collection === 'tabs' && request.user.role === 'customer')
    request.query.customerId = String(Number(request.user.id));
  if (collection === 'tabs' && request.user.role === 'barber')
    request.query.barberId = String(Number(currentBarber(db, request.user)?.id));
  if (
    collection === 'users' &&
    request.user.role !== 'customer' &&
    !hasPermission(request.user, 'team.read') &&
    !hasPermission(request.user, 'customers.read')
  )
    return fail(response, 403, 'Sem permissão para consultar usuários');
  if (
    collection === 'appointments' &&
    request.user.role !== 'customer' &&
    request.user.role !== 'barber' &&
    !hasPermission(request.user, 'agenda.read')
  )
    return fail(response, 403, 'Sem permissão para consultar a agenda');
  if (
    collection === 'commissions' &&
    request.user.role !== 'barber' &&
    !hasPermission(request.user, 'commissions.read')
  )
    return fail(response, 403, 'Sem permissão para consultar comissões');
  if (
    ['tabs', 'payments', 'cashSessions', 'cashMovements'].includes(collection) &&
    !['customer', 'barber'].includes(request.user.role) &&
    !hasPermission(request.user, 'cash.read')
  )
    return fail(response, 403, 'Sem permissão para consultar o caixa');
  if (['cashSessions', 'cashMovements'].includes(collection) && !hasPermission(request.user, 'cash.read'))
    return fail(response, 403, 'Sem permissão para consultar o caixa');
  if (
    collection === 'customerNotes' &&
    request.user.role !== 'customer' &&
    !hasPermission(request.user, 'customers.write')
  )
    return fail(response, 403, 'Sem permissão para consultar anotações de clientes');
  if (
    collection === 'auditLogs' &&
    !hasPermission(request.user, 'team.manage') &&
    !hasPermission(request.user, 'settings.manage')
  )
    return fail(response, 403, 'Sem permissão para consultar auditoria');
  if (
    collection === 'notifications' &&
    request.user.role !== 'customer' &&
    !hasPermission(request.user, 'settings.write') &&
    !hasPermission(request.user, 'settings.manage')
  )
    return fail(response, 403, 'Sem permissão para consultar notificações');
  request.totalCountQuery = { ...request.query };
  return next();
}

function filterAndScrub(db, request, response, data) {
  const collection = request.path.split('/').filter(Boolean)[0];
  let result = data;
  const scopedCollections = new Set([
    'appointments',
    'users',
    'commissions',
    'tabs',
    'payments',
    'customerNotes',
    'cashSessions',
    'cashMovements',
    'notifications',
    'auditLogs',
    'settings',
    'schedules',
    'timeBlocks',
    'expenses',
  ]);
  if (
    !Array.isArray(data) &&
    data &&
    scopedCollections.has(collection) &&
    !canAccessEntity(db, request.user, collection, data)
  ) {
    response.status(404);
    return null;
  }
  if (
    !Array.isArray(data) &&
    data &&
    ((['services', 'barbers', 'products'].includes(collection) && data.active === false) ||
      (collection === 'products' && data.kind === 'supply'))
  ) {
    response.status(404);
    return null;
  }
  if (Array.isArray(data) && request.user)
    result = data.filter((item) => canAccessEntity(db, request.user, collection, item));
  if (Array.isArray(result) && ['services', 'barbers', 'products'].includes(collection))
    result = result.filter((item) => item.active !== false);
  if (Array.isArray(result) && collection === 'products') result = result.filter((item) => item.kind !== 'supply');
  if (collection === 'users') {
    const scrubUser = (record) => {
      const safe = safeUser(record);
      if (!safe || safe.role !== 'customer' || hasPermission(request.user, 'customers.write')) return safe;
      const { cpf, consent, ...visible } = safe;
      return { ...visible, phone: customerManagement.maskPhone(safe.phone) };
    };
    result = Array.isArray(result) ? result.map(scrubUser) : scrubUser(result);
  }
  if (collection === 'barbers') {
    const scrub = (barber) => {
      if (!barber) return barber;
      const publicProfile = { ...barber };
      delete publicProfile.userId;
      delete publicProfile.commissionServicePct;
      delete publicProfile.commissionProductPct;
      delete publicProfile.user;
      const profile = db
        .get('users')
        .find({ id: Number(barber.userId) })
        .value();
      return { ...publicProfile, name: profile?.name || barber.name || barber.slug };
    };
    result = Array.isArray(result) ? result.map(scrub) : scrub(result);
  }
  if (collection === 'products') {
    const scrub = (product) => {
      if (!product) return product;
      const { costCents, stock, minStock, commissionPct, kind, ...publicProduct } = product;
      return publicProduct;
    };
    result = Array.isArray(result) ? result.map(scrub) : scrub(result);
  }
  if (collection === 'services') {
    const scrub = (service) => {
      if (!service) return service;
      const { commissionPct, ...publicService } = service;
      return publicService;
    };
    result = Array.isArray(result) ? result.map(scrub) : scrub(result);
  }
  if (collection === 'appointments') {
    const scrub = (appointment) => {
      if (!appointment) return appointment;
      const { guestToken, ...safeAppointment } = appointment;
      return { ...safeAppointment, items: (appointment.items || []).map(({ commissionPct, ...item }) => item) };
    };
    result = Array.isArray(result) ? result.map(scrub) : scrub(result);
  }
  if (['GET', 'HEAD'].includes(request.method)) {
    const total = Array.isArray(result)
      ? countMatchingRecords(
          db.get(collection).value(),
          request.totalCountQuery,
          (record) =>
            (!request.user || canAccessEntity(db, request.user, collection, record)) &&
            (!['services', 'barbers', 'products'].includes(collection) || record.active !== false) &&
            (collection !== 'products' || record.kind !== 'supply'),
        )
      : result
        ? 1
        : 0;
    response.setHeader('X-Total-Count', String(total));
  }
  return result;
}

async function handleAuth(db, request, response) {
  const path = request.path;
  const body = request.body || {};
  if (request.method === 'POST' && path === '/auth/login') {
    const result = await withLock(async () => {
      const ip = request.ip || request.socket?.remoteAddress;
      const limit = auth.canAttemptLogin(ip);
      // if (!limit.allowed) {
      //   response.setHeader('Retry-After', String(Math.max(1, Math.ceil(limit.retryAfterMs / 1000))))
      //   throw makeError(429, 'Muitas tentativas inválidas. Aguarde antes de tentar novamente.')
      // }
      try {
        console.log(body.email);
        const loggedIn = auth.login(db, body.email, body.password, { staffOnly: body.staffOnly === true });
        const lastAccessAt = nowIso();
        const member = db
          .get('users')
          .find({ id: Number(loggedIn.user.id) })
          .value();
        if (member) member.lastAccessAt = lastAccessAt;
        await db.write();
        loggedIn.user.lastAccessAt = lastAccessAt;
        return loggedIn;
      } catch (error) {
        if (error.status === 401) auth.recordFailedLogin(ip);
        throw error;
      }
    });
    return response.json(result);
  }
  if (request.method === 'GET' && path === '/auth/me')
    return response.json({ user: auth.requireUser(request) && safeUser(request.user) });
  if (request.method === 'POST' && path === '/auth/register') {
    enforceRateLimit(endpointRateLimits.register, request, response);
    if (body.termsAccepted !== true) throw makeError(400, 'É necessário aceitar os termos para criar a conta.');
    const input = auth.registerInput(body);
    const passwordHash = bcrypt.hashSync(input.password, 10);
    let user;
    let phoneGuest;
    await withLock(async () => {
      const existingEmail = db
        .get('users')
        .find(
          (item) =>
            String(item.email || '')
              .trim()
              .toLowerCase() === input.email,
        )
        .value();
      phoneGuest = db
        .get('users')
        .find((item) => item.phone === input.phone && item.guest)
        .value();
      if (existingEmail && Number(existingEmail.id) !== Number(phoneGuest?.id))
        throw makeError(409, 'Este e-mail já está cadastrado');
      const existingPhone = db
        .get('users')
        .find((item) => item.phone === input.phone && !item.guest)
        .value();
      if (existingPhone && Number(existingPhone.id) !== Number(existingEmail?.id))
        throw makeError(409, 'Este telefone já está cadastrado');
      await require('./lib/core.cjs').commit(
        db,
        request.user,
        'auth.register',
        'users',
        phoneGuest?.id,
        (state) => {
          if (phoneGuest) {
            user = state.users.find((item) => Number(item.id) === Number(phoneGuest.id));
            Object.assign(user, {
              name: input.name,
              email: input.email,
              phone: input.phone,
              passwordHash,
              birthDate: input.birthDate,
              guest: false,
              consent: { reminders: Boolean(body.reminders), at: nowIso() },
            });
          } else {
            user = {
              id: nextId(db, 'users'),
              ...auth.createUser({
                name: input.name,
                email: input.email,
                phone: input.phone,
                passwordHash,
                cpf: null,
                birthDate: input.birthDate,
                avatar: null,
              }),
            };
            user.consent = { reminders: Boolean(body.reminders), at: nowIso() };
            state.users.push(user);
          }
        },
        { email: input.email },
      );
    });
    return response.status(phoneGuest ? 200 : 201).json(auth.safeAuthResult(user));
  }
  if (request.method === 'POST' && path === '/auth/guest') {
    enforceRateLimit(endpointRateLimits.guest, request, response);
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').replace(/\D/g, '');
    if (name.length < 2 || phone.length < 10) throw makeError(400, 'Informe nome e telefone válido');
    let user;
    let created = false;
    await withLock(async () => {
      const found = db.get('users').find({ phone }).value();
      if (found && !found.guest) throw makeError(409, 'Este telefone pertence a uma conta. Entre para continuar.');
      user = found;
      if (!user) {
        await require('./lib/core.cjs').commit(
          db,
          null,
          'auth.guest.create',
          'users',
          null,
          (state) => {
            user = {
              id: nextId(db, 'users'),
              name,
              email: body.email || null,
              phone,
              cpf: null,
              birthDate: null,
              avatar: null,
              passwordHash: null,
              role: 'customer',
              permissions: [],
              active: true,
              guest: true,
              tokenVersion: 0,
              consent: { reminders: Boolean(body.reminders), at: nowIso() },
              createdAt: nowIso(),
            };
            state.users.push(user);
            created = true;
          },
          { phoneLastDigits: phone.slice(-4) },
        );
      }
    });
    return response.status(created ? 201 : 200).json(auth.safeAuthResult(user));
  }
  if (request.method === 'POST' && path === '/auth/logout') {
    const user = auth.requireUser(request);
    await require('./lib/core.cjs').commit(db, user, 'auth.logout', 'users', user.id, (state) => {
      const current = state.users.find((item) => Number(item.id) === Number(user.id));
      current.tokenVersion = Number(current.tokenVersion || 0) + 1;
    });
    return response.json({ message: 'Sessão encerrada' });
  }
  if (request.method === 'POST' && path === '/auth/forgot') {
    enforceRateLimit(endpointRateLimits.forgot, request, response);
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    const result = await withLock(async () => {
      const issued = auth.requestPasswordReset(db, email);
      await require('./lib/core.cjs').commit(
        db,
        null,
        'auth.password.reset.requested',
        'users',
        issued.userId ?? null,
        (state) => {
          state.passwordResets = state.passwordResets.filter(
            (item) => new Date(item.expiresAt).getTime() > Date.now() && Number(item.userId) !== Number(issued.userId),
          );
          if (issued.resetRecord)
            state.passwordResets.push({ id: nextId(db, 'passwordResets'), ...issued.resetRecord });
        },
      );
      return issued;
    });
    if (result.resetToken) {
      if (process.env.NODE_ENV === 'production') {
        setImmediate(() =>
          resetPasswordEmail.send(result.email, result.resetToken).catch((error) => {
            console.error('Falha ao enviar e-mail de recuperação pelo Resend:', error.message);
          }),
        );
      } else {
        resetPasswordEmail.logDevelopmentLink(result.resetToken);
      }
    }
    return response.json({ message: result.message });
  }
  if (request.method === 'POST' && path === '/auth/reset') {
    const result = await withLock(() =>
      auth.resetPassword(db, body.token, body.password, require('./lib/core.cjs').commit),
    );
    return response.json(result);
  }
  if (request.method === 'POST' && path === '/auth/change-password') {
    const user = auth.requireUser(request);
    if (!bcrypt.compareSync(String(body.currentPassword || ''), user.passwordHash || ''))
      throw makeError(400, 'Senha atual incorreta');
    if (String(body.password || '').length < 8) throw makeError(400, 'A nova senha deve ter pelo menos 8 caracteres');
    await require('./lib/core.cjs').commit(db, user, 'auth.password.change', 'users', user.id, (state) => {
      const current = state.users.find((item) => Number(item.id) === Number(user.id));
      current.passwordHash = bcrypt.hashSync(String(body.password), 10);
      current.tokenVersion = Number(current.tokenVersion || 0) + 1;
    });
    return response.json({ message: 'Senha alterada. Entre novamente.' });
  }
  return false;
}

async function handleCustom(db, request, response) {
  const path = request.path;
  const method = request.method;
  if (method === 'GET' && path === '/public/booking-estimate')
    return (response.json(bookingEstimate(db, request)), true);
  if (method === 'GET' && path === '/public/service-prices') return (response.json(getPublicServicePrices(db)), true);
  const body = request.body || {};
  const user = request.user;
  if (method === 'GET' && path === '/admin/settings/business') {
    requirePermission(auth.requireUser(request), 'settings.read');
    return (
      response.json({
        unit: db.get('units').find({ id: 1 }).value(),
        business: settings.getSettings(db).business || { unitId: 1, timezone: 'America/Sao_Paulo' },
      }),
      true
    );
  }
  if (method === 'PATCH' && path === '/admin/settings/business') {
    const current = auth.requireUser(request);
    requirePermission(current, 'settings.write');
    return (
      response.json(await withLock(() => settings.saveBusiness(db, body, current, require('./lib/core.cjs').commit))),
      true
    );
  }
  if (method === 'GET' && path === '/admin/settings/hours') {
    requirePermission(auth.requireUser(request), 'settings.write');
    return (response.json(settings.getBusinessHours(db)), true);
  }
  if (method === 'PATCH' && path === '/admin/settings/hours') {
    const current = auth.requireUser(request);
    requirePermission(current, 'settings.write');
    return (
      response.json(
        await withLock(() => settings.saveBusinessHours(db, body, current, require('./lib/core.cjs').commit)),
      ),
      true
    );
  }
  if (method === 'GET' && path === '/admin/settings/booking') {
    requirePermission(auth.requireUser(request), 'settings.write');
    return (response.json({ ...settings.DEFAULT_BOOKING, ...(settings.getSettings(db).booking || {}) }), true);
  }
  if (method === 'PATCH' && path === '/admin/settings/booking') {
    const current = auth.requireUser(request);
    requirePermission(current, 'settings.write');
    return (
      response.json(await withLock(() => settings.saveBooking(db, body, current, require('./lib/core.cjs').commit))),
      true
    );
  }
  if (method === 'GET' && path === '/admin/settings/notifications') {
    requirePermission(auth.requireUser(request), 'settings.write');
    const notificationSettings = settings.getSettings(db).notifications || {};
    const templates = Object.fromEntries(
      settings.NOTIFICATION_TYPES.map((type) => [
        type,
        db.get('messageTemplates').find({ type }).value()?.text || settings.DEFAULT_TEMPLATES[type],
      ]),
    );
    return (
      response.json({
        settings: {
          ...settings.DEFAULT_NOTIFICATIONS,
          ...notificationSettings,
          events: { ...settings.DEFAULT_NOTIFICATIONS.events, ...(notificationSettings.events || {}) },
          channels: { ...settings.DEFAULT_NOTIFICATIONS.channels, ...(notificationSettings.channels || {}) },
          quietHours: { ...settings.DEFAULT_NOTIFICATIONS.quietHours, ...(notificationSettings.quietHours || {}) },
        },
        templates,
        notifications: settings.listNotifications(db),
      }),
      true
    );
  }
  if (method === 'PATCH' && path === '/admin/settings/notifications') {
    const current = auth.requireUser(request);
    requirePermission(current, 'settings.write');
    return (
      response.json(
        await withLock(() => settings.saveNotificationSettings(db, body, current, require('./lib/core.cjs').commit)),
      ),
      true
    );
  }
  const resendNotificationMatch = /^\/admin\/settings\/notifications\/(\d+)\/resend$/.exec(path);
  if (method === 'POST' && resendNotificationMatch) {
    const current = auth.requireUser(request);
    requirePermission(current, 'settings.write');
    return (
      response
        .status(201)
        .json(
          await withLock(() =>
            settings.resendNotification(db, resendNotificationMatch[1], current, require('./lib/core.cjs').commit),
          ),
        ),
      true
    );
  }
  const sentNotificationMatch = /^\/admin\/settings\/notifications\/(\d+)\/mark-sent$/.exec(path);
  if (method === 'POST' && sentNotificationMatch) {
    const current = auth.requireUser(request);
    requirePermission(current, 'settings.write');
    return (
      response
        .status(201)
        .json(
          await withLock(() =>
            settings.markNotificationSent(db, sentNotificationMatch[1], current, require('./lib/core.cjs').commit),
          ),
        ),
      true
    );
  }
  if (method === 'GET' && path === '/admin/finance/summary')
    return (response.json(finance.financeSummary(db, auth.requireUser(request), request.query)), true);
  if (method === 'GET' && path === '/admin/finance/expense-categories')
    return (response.json(finance.getExpenseCategories(auth.requireUser(request))), true);
  if (method === 'GET' && path === '/admin/finance/expenses')
    return (response.json(finance.listExpenses(db, auth.requireUser(request), request.query)), true);
  if (method === 'POST' && path === '/admin/finance/expenses') {
    const expense = await withLock(() => finance.createExpense(db, body, auth.requireUser(request)));
    return (response.status(201).json(expense), true);
  }
  const markExpensePaidMatch = /^\/admin\/finance\/expenses\/(\d+)\/mark-paid$/.exec(path);
  if (markExpensePaidMatch && method === 'POST') {
    const expense = await withLock(() =>
      finance.markExpensePaid(db, markExpensePaidMatch[1], auth.requireUser(request)),
    );
    return (response.json(expense), true);
  }
  const expenseMatch = /^\/admin\/finance\/expenses\/(\d+)$/.exec(path);
  if (expenseMatch && method === 'PATCH') {
    const expense = await withLock(() => finance.updateExpense(db, expenseMatch[1], body, auth.requireUser(request)));
    return (response.json(expense), true);
  }
  if (method === 'GET' && path === '/admin/users') {
    requirePermission(auth.requireUser(request), 'team.manage');
    return (response.json(adminTeamUsers(db)), true);
  }
  if (method === 'POST' && path === '/admin/users/invite') {
    const current = auth.requireUser(request);
    requirePermission(current, 'team.manage');
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    const role = String(body.role || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw makeError(400, 'Informe um e-mail válido.');
    if (!STAFF_ROLES.has(role)) throw makeError(400, 'Selecione um papel válido para a equipe.');
    const created = await withLock(async () => {
      if (
        db
          .get('users')
          .find(
            (item) =>
              String(item.email || '')
                .trim()
                .toLowerCase() === email,
          )
          .value()
      )
        throw makeError(409, 'Já existe uma conta com este e-mail.');
      const userId = nextId(db, 'users');
      const invite = auth.createPasswordReset(userId);
      const invitedUser = {
        id: userId,
        ...auth.createUser({
          name: email.split('@')[0],
          email,
          phone: '',
          cpf: null,
          birthDate: null,
          avatar: null,
          passwordHash: null,
        }),
        role,
        permissions: [],
        active: true,
        guest: false,
        passwordHash: null,
        lastAccessAt: null,
      };
      await require('./lib/core.cjs').commit(
        db,
        current,
        'team.user.invite',
        'users',
        userId,
        (state) => {
          state.users = state.users || [];
          state.passwordResets = state.passwordResets || [];
          state.users.push(invitedUser);
          state.passwordResets = state.passwordResets.filter((item) => Number(item.userId) !== userId);
          state.passwordResets.push(invite.resetRecord);
        },
        { role },
      );
      return { user: invitedUser, invite };
    });
    const inviteSent = await deliverTeamInvitation(email, created.invite.token);
    return (
      response
        .status(201)
        .json({ user: safeUser(created.user), inviteToken: inviteSent ? null : created.invite.token, inviteSent }),
      true
    );
  }
  const teamUserMatch = /^\/admin\/users\/(\d+)$/.exec(path);
  if (method === 'PATCH' && teamUserMatch) {
    const current = auth.requireUser(request);
    requirePermission(current, 'team.manage');
    const userId = Number(teamUserMatch[1]);
    const updated = await withLock(async () => {
      const target = getById(db, 'users', userId);
      if (!target || target.role === 'customer') throw makeError(404, 'Usuário da equipe não encontrado.');
      const role = body.role === undefined ? target.role : String(body.role);
      const active = body.active === undefined ? target.active !== false : body.active;
      if (!STAFF_ROLES.has(role)) throw makeError(400, 'Selecione um papel válido para a equipe.');
      if (typeof active !== 'boolean') throw makeError(400, 'Informe um status válido.');
      const permissions = body.permissions === undefined ? target.permissions || [] : body.permissions;
      if (!Array.isArray(permissions) || permissions.some((permission) => !TEAM_PERMISSION_KEYS.includes(permission)))
        throw makeError(400, 'A matriz contém uma permissão inválida.');
      const normalizedPermissions = [...new Set(permissions)];
      const removesActiveAdmin = target.role === 'admin' && target.active !== false && (role !== 'admin' || !active);
      if (removesActiveAdmin) {
        const otherActiveAdmins = db
          .get('users')
          .value()
          .filter((item) => item.role === 'admin' && item.active !== false && Number(item.id) !== userId);
        if (!otherActiveAdmins.length)
          throw makeError(409, 'Não é possível remover ou desativar o último administrador ativo.');
      }
      const roleChanged = target.role !== role;
      await require('./lib/core.cjs').commit(
        db,
        current,
        'team.user.update',
        'users',
        userId,
        (state) => {
          const member = state.users.find((item) => Number(item.id) === userId);
          member.role = role;
          member.active = active;
          member.permissions = normalizedPermissions;
          if (roleChanged) member.tokenVersion = Number(member.tokenVersion || 0) + 1;
          const barber = (state.barbers || []).find((item) => Number(item.userId) === userId);
          if (barber) barber.active = active && role === 'barber';
        },
        { role, active, permissions: normalizedPermissions, roleChanged },
      );
      return safeUser(getById(db, 'users', userId));
    });
    return (response.json({ user: updated }), true);
  }
  if (method === 'GET' && path === '/admin/customers') {
    const current = auth.requireUser(request);
    requirePermission(current, 'customers.read');
    return (response.json(customerManagement.getAdminCustomerPage(db, current, request.query)), true);
  }
  if (method === 'GET' && path === '/admin/customers/duplicates') {
    const current = auth.requireUser(request);
    requirePermission(current, 'customers.write');
    return (response.json(customerManagement.findAdminCustomerDuplicates(db, request.query)), true);
  }
  const customerIdMatch = /^\/admin\/customers\/(\d+)$/.exec(path);
  if (method === 'GET' && customerIdMatch) {
    const current = auth.requireUser(request);
    requirePermission(current, 'customers.read');
    return (response.json(customerManagement.getAdminCustomerProfile(db, current, customerIdMatch[1])), true);
  }
  if (method === 'POST' && path === '/admin/customers') {
    const current = auth.requireUser(request);
    requirePermission(current, 'customers.write');
    const customer = await withLock(() =>
      customerManagement.saveAdminCustomer(db, current, null, body, require('./lib/core.cjs').commit),
    );
    return (response.status(201).json(customer), true);
  }
  if (method === 'PATCH' && customerIdMatch) {
    const current = auth.requireUser(request);
    requirePermission(current, 'customers.write');
    const customer = await withLock(() =>
      customerManagement.saveAdminCustomer(db, current, customerIdMatch[1], body, require('./lib/core.cjs').commit),
    );
    return (response.json(customer), true);
  }
  if (method === 'GET' && path === '/admin/catalog/services') {
    requirePermission(auth.requireUser(request), 'catalog.read');
    return (response.json(getAdminServicePage(db, request.query)), true);
  }
  const serviceIdMatch = /^\/admin\/catalog\/services\/(\d+)$/.exec(path);
  if (method === 'GET' && serviceIdMatch) {
    requirePermission(auth.requireUser(request), 'catalog.write');
    const service = catalogManagement.getAdminService(db, serviceIdMatch[1]);
    if (!service) throw makeError(404, 'Serviço não encontrado.');
    return (response.json(service), true);
  }
  const serviceActiveMatch = /^\/admin\/catalog\/services\/(\d+)\/active$/.exec(path);
  if (method === 'PATCH' && serviceActiveMatch) {
    const current = auth.requireUser(request);
    requirePermission(current, 'catalog.write');
    const result = await withLock(() =>
      catalogManagement.setServiceActive(
        db,
        current,
        serviceActiveMatch[1],
        body.active,
        require('./lib/core.cjs').commit,
      ),
    );
    return (response.json(result), true);
  }
  if (method === 'GET' && path === '/admin/catalog/barbers') {
    requirePermission(auth.requireUser(request), 'catalog.write');
    return (response.json(catalogManagement.getAdminBarbers(db)), true);
  }
  if (method === 'POST' && path === '/admin/catalog/services') {
    const current = auth.requireUser(request);
    requirePermission(current, 'catalog.write');
    return (
      response
        .status(201)
        .json(
          await withLock(() =>
            catalogManagement.saveAdminService(db, current, null, body, require('./lib/core.cjs').commit),
          ),
        ),
      true
    );
  }
  const servicePatchMatch = /^\/admin\/catalog\/services\/(\d+)$/.exec(path);
  if (method === 'PATCH' && servicePatchMatch) {
    const current = auth.requireUser(request);
    requirePermission(current, 'catalog.write');
    return (
      response.json(
        await withLock(() =>
          catalogManagement.saveAdminService(db, current, servicePatchMatch[1], body, require('./lib/core.cjs').commit),
        ),
      ),
      true
    );
  }
  if (method === 'GET' && path === '/admin/catalog/products') {
    requirePermission(auth.requireUser(request), 'catalog.read');
    return (response.json(catalogManagement.getAdminProductPage(db, request.query)), true);
  }
  const productIdMatch = /^\/admin\/catalog\/products\/(\d+)$/.exec(path);
  if (method === 'GET' && productIdMatch) {
    requirePermission(auth.requireUser(request), 'catalog.write');
    const product = catalogManagement.getAdminProduct(db, productIdMatch[1]);
    if (!product) throw makeError(404, 'Produto não encontrado.');
    return (response.json(product), true);
  }
  if (method === 'POST' && path === '/admin/catalog/products') {
    const current = auth.requireUser(request);
    requirePermission(current, 'catalog.write');
    return (
      response
        .status(201)
        .json(
          await withLock(() =>
            catalogManagement.saveAdminProduct(db, current, null, body, require('./lib/core.cjs').commit),
          ),
        ),
      true
    );
  }
  const productPatchMatch = /^\/admin\/catalog\/products\/(\d+)$/.exec(path);
  if (method === 'PATCH' && productPatchMatch) {
    const current = auth.requireUser(request);
    requirePermission(current, 'catalog.write');
    return (
      response.json(
        await withLock(() =>
          catalogManagement.saveAdminProduct(db, current, productPatchMatch[1], body, require('./lib/core.cjs').commit),
        ),
      ),
      true
    );
  }
  const stockAdjustMatch = /^\/admin\/catalog\/products\/(\d+)\/adjust-stock$/.exec(path);
  if (method === 'POST' && stockAdjustMatch) {
    const current = auth.requireUser(request);
    requirePermission(current, 'catalog.write');
    return (
      response.json(
        await withLock(() =>
          catalogManagement.adjustProductStock(
            db,
            current,
            stockAdjustMatch[1],
            body,
            require('./lib/core.cjs').commit,
          ),
        ),
      ),
      true
    );
  }
  if (method === 'GET' && path === '/admin/cash/summary') {
    return (response.json(require('./lib/cash-summary.cjs').getCashSummary(db, auth.requireUser(request))), true);
  }
  if (method === 'GET' && path === '/admin/cash/discount-policy') {
    const current = auth.requireUser(request);
    requirePermission(current, 'cash.write');
    return (response.json(checkout.discountPolicy(db)), true);
  }
  if (method === 'GET' && path === '/admin/team') {
    const current = auth.requireUser(request);
    const profiles =
      current.role === 'barber'
        ? db
            .get('barbers')
            .value()
            .filter((barber) => Number(barber.userId) === Number(current.id))
        : (requirePermission(current, 'team.read'), db.get('barbers').value());
    return (
      response.json(
        profiles.map((barber) => {
          const member = getById(db, 'users', barber.userId);
          return {
            id: Number(barber.id),
            name: member?.name || barber.name || barber.slug || 'Profissional',
            photo: barber.photo || member?.avatar || null,
            specialties: Array.isArray(barber.specialties) ? barber.specialties : [],
            active: barber.active !== false && member?.active !== false,
          };
        }),
      ),
      true
    );
  }
  if (method === 'GET' && path === '/admin/team/services') {
    return (response.json(teamManagement.getTeamServiceCatalog(db, auth.requireUser(request))), true);
  }
  if (method === 'GET' && path === '/admin/team/timeoff/barbers') {
    return (response.json(teamManagement.getTeamTimeOffBarbers(db, auth.requireUser(request))), true);
  }
  if (method === 'POST' && path === '/admin/team/timeoff/preview') {
    return (response.json(timeBlocks.previewTimeOffBlocks(db, body, auth.requireUser(request))), true);
  }
  if (method === 'POST' && path === '/admin/team/timeoff') {
    const result = await withLock(() =>
      timeBlocks.createTimeOffBlocks(db, body, auth.requireUser(request), require('./lib/core.cjs').commit),
    );
    return (response.status(201).json(result), true);
  }
  const teamScheduleMatch = /^\/admin\/team\/(\d+)\/schedule(?:\/(preview))?$/.exec(path);
  if (teamScheduleMatch && method === 'GET' && !teamScheduleMatch[2]) {
    return (response.json(teamManagement.getTeamSchedule(db, teamScheduleMatch[1], auth.requireUser(request))), true);
  }
  if (teamScheduleMatch && method === 'POST' && teamScheduleMatch[2] === 'preview') {
    return (
      response.json(teamManagement.previewTeamSchedule(db, teamScheduleMatch[1], body, auth.requireUser(request))),
      true
    );
  }
  if (teamScheduleMatch && method === 'PATCH' && !teamScheduleMatch[2]) {
    const result = await withLock(() =>
      teamManagement.saveTeamSchedule(
        db,
        teamScheduleMatch[1],
        body,
        auth.requireUser(request),
        require('./lib/core.cjs').commit,
      ),
    );
    return (response.json(result), true);
  }
  const teamProfileMatch = /^\/admin\/team\/(\d+)$/.exec(path);
  if (teamProfileMatch && method === 'GET') {
    return (response.json(teamManagement.getTeamProfile(db, teamProfileMatch[1], auth.requireUser(request))), true);
  }
  if (method === 'POST' && path === '/admin/team') {
    const result = await withLock(() =>
      teamManagement.saveTeamProfile(db, null, body, auth.requireUser(request), require('./lib/core.cjs').commit),
    );
    const inviteSent = result.inviteToken ? await deliverTeamInvitation(result.user.email, result.inviteToken) : false;
    return (response.status(201).json({ ...result, inviteSent }), true);
  }
  if (teamProfileMatch && method === 'PATCH') {
    const result = await withLock(() =>
      teamManagement.saveTeamProfile(
        db,
        teamProfileMatch[1],
        body,
        auth.requireUser(request),
        require('./lib/core.cjs').commit,
      ),
    );
    const inviteSent = result.inviteToken ? await deliverTeamInvitation(result.user.email, result.inviteToken) : false;
    return (response.json({ ...result, inviteSent }), true);
  }
  if (request.path === '/users/me' && request.method === 'GET') {
    const current = auth.requireUser(request);
    return (response.json({ ...safeUser(current), addresses: current.addresses || [] }), true);
  }
  if (request.path === '/users/me' && request.method === 'PATCH') {
    const current = auth.requireUser(request);
    const updated = await withLock(() => profile.updateProfile(db, body, current, require('./lib/core.cjs').commit));
    return (response.json(updated), true);
  }
  if (method === 'GET' && path === '/appointments' && request.query.date) {
    return (response.json(appointments.listStaffAppointments(db, auth.requireUser(request), request.query)), true);
  }
  if (method === 'GET' && path === '/appointments' && request.query.view) {
    return (response.json(appointments.listCustomerAppointments(db, auth.requireUser(request), request.query)), true);
  }
  if (method === 'GET' && path === '/appointments' && (request.query.from || request.query.to)) {
    return (response.json(appointments.listStaffAppointments(db, auth.requireUser(request), request.query)), true);
  }
  if (method === 'POST' && path === '/timeBlocks') {
    const records = await withLock(() =>
      timeBlocks.createTimeBlocks(db, body, auth.requireUser(request), require('./lib/core.cjs').commit),
    );
    return (response.status(201).json({ items: records }), true);
  }
  if (method === 'GET' && path === '/public/booking-policy') {
    const booking = db.get('settings').find({ id: 1 }).value()?.booking || {};
    const configuredHours = Number(booking.cancelBeforeHours ?? 4);
    const configuredReschedules = Number(booking.maxReschedules ?? 2);
    const configuredAdvance = Number(booking.minAdvanceMin ?? 60);
    return (
      response.json({
        cancelBeforeHours: Number.isFinite(configuredHours) ? Math.max(0, configuredHours) : 4,
        maxReschedules: Number.isFinite(configuredReschedules) ? Math.max(0, configuredReschedules) : 2,
        minAdvanceMin: Number.isFinite(configuredAdvance) ? Math.max(0, configuredAdvance) : 60,
      }),
      true
    );
  }
  const publicAppointmentMatch = /^\/public\/appointments\/(\d+)$/.exec(path);
  if (method === 'GET' && publicAppointmentMatch) {
    const appointment = appointments.getPublicAppointment(
      db,
      publicAppointmentMatch[1],
      user,
      request.headers['x-appointment-token'],
    );
    return (response.json(appointment), true);
  }
  if (path.startsWith('/auth/')) {
    const handled = await handleAuth(db, request, response);
    if (handled !== false) return true;
  }
  if (method === 'GET' && path === '/health') return (response.json({ status: 'ok' }), true);
  if (method === 'GET' && path === '/availability') {
    const bypassAdvance = request.query.bypassAdvance === 'true';
    const allowOutOfHours = request.query.allowOutOfHours === 'true';
    if ((bypassAdvance || allowOutOfHours) && !hasPermission(auth.requireUser(request), 'agenda.manage'))
      throw makeError(403, 'Encaixes e exceções de antecedência exigem agenda.manage');
    const slots = getSlots(db, {
      date: request.query.date,
      serviceIds: serviceIdsFrom(request),
      barberId: request.query.barberId,
      bypassAdvance,
      allowOutOfHours,
    }).map((slot) => ({
      ...slot,
      items: slot.items.map(({ commissionPct, ...item }) => item),
    }));
    return (response.json(slots), true);
  }
  if (method === 'GET' && path === '/availability/barbers')
    return (response.json(availabilityBarbers(db, request)), true);
  if (method === 'GET' && path === '/availability/days') return (response.json(availabilityDays(db, request)), true);
  if (method === 'GET' && path === '/availability/next') return (response.json(nextAvailability(db, request)), true);
  if (method === 'POST' && path === '/slotHolds')
    return (
      enforceRateLimit(endpointRateLimits.slotHolds, request, response),
      response.status(201).json(
        await withLock(async () => {
          const barberId = Number(body.barberId);
          const start = new Date(body.start);
          const serviceIds = body.serviceIds || [];
          if (!barberId || Number.isNaN(start.getTime())) throw makeError(400, 'Informe profissional e horário');
          const slots = getSlots(db, { barberId, serviceIds, date: dateString(start) }).filter(
            (slot) => slot.start === start.toISOString(),
          );
          if (!slots.length) throw makeError(409, 'Esse horário não está mais disponível');
          const slot = slots[0];
          const at = nowIso();
          const hold = {
            id: nextId(db, 'slotHolds'),
            key: randomToken(24),
            barberId,
            start: slot.start,
            end: slot.end,
            expiresAt: new Date(Date.now() + 5 * 60000).toISOString(),
            ...(user ? { userId: Number(user.id) } : {}),
          };
          await require('./lib/core.cjs').commit(
            db,
            user,
            'slotHolds.create',
            'slotHolds',
            hold.id,
            (state) => {
              state.slotHolds = state.slotHolds.filter((item) => new Date(item.expiresAt).getTime() > Date.now());
              state.slotHolds.push(hold);
            },
            { barberId, start: slot.start },
          );
          return { ...hold, serverTime: at };
        }),
      ),
      true
    );
  if (method === 'DELETE' && /^\/slotHolds\/[^/]+$/.test(path)) {
    const supplied = path.split('/').pop();
    const hold = /^\d+$/.test(supplied)
      ? getById(db, 'slotHolds', supplied)
      : db.get('slotHolds').find({ key: supplied }).value();
    const suppliedKey = request.query.key || body.key || (!/^\d+$/.test(supplied) ? supplied : '');
    if (
      !hold ||
      (String(suppliedKey) !== String(hold.key) &&
        (!hold.userId || Number(hold.userId) !== Number(user?.id)) &&
        !hasPermission(user, 'agenda.manage'))
    )
      throw makeError(404, 'Reserva temporária não encontrada');
    const id = Number(hold.id);
    await withLock(() =>
      require('./lib/core.cjs').commit(db, user, 'slotHolds.delete', 'slotHolds', id, (state) => {
        state.slotHolds = state.slotHolds.filter((item) => Number(item.id) !== id);
      }),
    );
    return (response.status(204).end(), true);
  }
  if (method === 'POST' && path === '/appointments') {
    const result = await withLock(() =>
      appointments.createAppointment(db, body, user, require('./lib/core.cjs').commit),
    );
    return (response.status(201).json(result), true);
  }
  let match = /^\/appointments\/(\d+)\/(status|reschedule|cancel|no-show|items|finish)$/.exec(path);
  if (match && ['PATCH', 'POST'].includes(method)) {
    const [, id, action] = match;
    const result = await withLock(async () => {
      if (action === 'status') return appointments.updateStatus(db, id, body, user, require('./lib/core.cjs').commit);
      if (action === 'finish') return appointments.finishService(db, id, user, require('./lib/core.cjs').commit);
      if (action === 'reschedule')
        return appointments.rescheduleAppointment(db, id, body, user, require('./lib/core.cjs').commit);
      if (action === 'cancel')
        return appointments.cancelAppointment(db, id, body, user, require('./lib/core.cjs').commit);
      if (action === 'no-show')
        return appointments.updateStatus(
          db,
          id,
          { ...body, status: 'no_show' },
          user,
          require('./lib/core.cjs').commit,
        );
      return appointments.updateItems(db, id, body, user, require('./lib/core.cjs').commit);
    });
    return (response.json(appointments.publicAppointment(result)), true);
  }
  if (method === 'POST' && path === '/tabs')
    return (
      response
        .status(201)
        .json(
          await withLock(() => checkout.openTab(db, body, auth.requireUser(request), require('./lib/core.cjs').commit)),
        ),
      true
    );
  match = /^\/tabs\/(\d+)\/(items|discount|close)$/.exec(path);
  if (match && method === 'POST') {
    const [, id, action] = match;
    const result = await withLock(() =>
      action === 'items'
        ? checkout.addTabItem(db, id, body, auth.requireUser(request), require('./lib/core.cjs').commit)
        : action === 'discount'
          ? checkout.updateTabDiscount(db, id, body, auth.requireUser(request), require('./lib/core.cjs').commit)
          : checkout.closeTab(db, id, body, auth.requireUser(request), require('./lib/core.cjs').commit),
    );
    return (response.json(result), true);
  }
  if (method === 'POST' && path === '/cashSessions/open')
    return (
      response
        .status(201)
        .json(
          await withLock(() =>
            checkout.openCashSession(db, body, auth.requireUser(request), require('./lib/core.cjs').commit),
          ),
        ),
      true
    );
  match = /^\/cashSessions\/(\d+)\/close$/.exec(path);
  if (match && method === 'POST')
    return (
      response.json(
        await withLock(() =>
          checkout.closeCashSession(db, match[1], body, auth.requireUser(request), require('./lib/core.cjs').commit),
        ),
      ),
      true
    );
  if (method === 'POST' && path === '/cashMovements')
    return (
      response
        .status(201)
        .json(
          await withLock(() =>
            checkout.createCashMovement(db, body, auth.requireUser(request), require('./lib/core.cjs').commit),
          ),
        ),
      true
    );
  if (method === 'GET' && path === '/commissions/summary')
    return (response.json(checkout.commissionSummary(db, auth.requireUser(request), request.query)), true);
  if (method === 'GET' && path === '/admin/commissions/summary')
    return (response.json(checkout.commissionSummary(db, auth.requireUser(request), request.query, 'team.read')), true);
  if (method === 'POST' && path === '/commissions/settle')
    return (
      response.json(
        await withLock(() =>
          checkout.settleCommissions(db, body, auth.requireUser(request), require('./lib/core.cjs').commit),
        ),
      ),
      true
    );
  if (method === 'GET' && path === '/admin/dashboard')
    return (response.json(getAdminDashboard(db, auth.requireUser(request), request.query)), true);
  if (method === 'GET' && path === '/search/suggest') {
    const query = String(request.query.q || '')
      .trim()
      .toLowerCase();
    if (!query) return (response.json({ services: [], barbers: [], customers: [] }), true);
    const services = db
      .get('services')
      .value()
      .filter((item) => item.active && item.name.toLowerCase().includes(query))
      .slice(0, 6)
      .map(({ commissionPct, ...service }) => service);
    const barbers = db
      .get('barbers')
      .value()
      .filter((barber) => {
        const name =
          db
            .get('users')
            .find({ id: Number(barber.userId) })
            .value()?.name ||
          barber.name ||
          '';
        return barber.active && name.toLowerCase().includes(query);
      })
      .slice(0, 6)
      .map((barber) => ({
        id: barber.id,
        slug: barber.slug,
        name:
          db
            .get('users')
            .find({ id: Number(barber.userId) })
            .value()?.name ||
          barber.name ||
          barber.slug,
        photo: barber.photo,
        specialties: barber.specialties,
      }));
    const customers = hasPermission(user, 'customers.read')
      ? db
          .get('users')
          .value()
          .filter((item) => item.role === 'customer' && `${item.name} ${item.phone}`.toLowerCase().includes(query))
          .slice(0, 10)
          .map((customer) => {
            const safe = safeUser(customer);
            return hasPermission(user, 'customers.write')
              ? safe
              : { ...safe, phone: customerManagement.maskPhone(customer.phone) };
          })
      : [];
    return (response.json({ services, barbers, customers }), true);
  }
  if (
    path.startsWith('/auth/') ||
    path.startsWith('/availability') ||
    path.startsWith('/tabs/') ||
    path.startsWith('/admin/')
  )
    throw makeError(404, 'Rota não encontrada');
  return false;
}

function createMiddleware(db) {
  const middleware = async (request, response, next) => {
    try {
      const handled = await handleCustom(db, request, response);
      if (handled) return;
      return next();
    } catch (error) {
      return sendError(response, error);
    }
  };
  middleware.genericAccess = genericAccess.bind(null, db);
  middleware.filterAndScrub = filterAndScrub.bind(null, db);
  return middleware;
}

module.exports = createMiddleware;
