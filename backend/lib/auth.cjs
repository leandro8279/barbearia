const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createHash, createHmac } = require('node:crypto');
const { getById, makeError, nowIso, safeUser, randomToken } = require('./core.cjs');
const { createRateLimiter } = require('./rate-limit.cjs');

const sessionSecret = process.env.SESSION_SECRET;
const jwtSecret =
  process.env.JWT_SECRET ||
  (sessionSecret ? createHmac('sha256', sessionSecret).update('barbearia:jwt:v1').digest() : '');
const STAFF_ROLES = new Set(['barber', 'reception', 'manager', 'admin']);
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const failedLoginAttempts = createRateLimiter({ windowMs: LOGIN_WINDOW_MS, maxAttempts: LOGIN_MAX_ATTEMPTS });
const dummyPasswordHash = bcrypt.hashSync('auth-comparison-only-not-a-user-password', 10);

if (!jwtSecret) throw new Error('Configure JWT_SECRET ou SESSION_SECRET antes de iniciar a API');

function canAttemptLogin(ip) {
  return failedLoginAttempts.status(ip);
}

function recordFailedLogin(ip) {
  failedLoginAttempts.consume(ip);
}

function issueToken(user) {
  return jwt.sign({ sub: String(user.id), ver: Number(user.tokenVersion) || 0 }, jwtSecret, { expiresIn: '12h' });
}

function authenticate(db, request, response, next) {
  const header = request.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    request.user = null;
    return next();
  }
  try {
    const payload = jwt.verify(header.slice(7), jwtSecret);
    const user = getById(db, 'users', payload.sub);
    if (!user || !user.active || Number(user.tokenVersion || 0) !== Number(payload.ver || 0)) {
      return response.status(401).json({ error: 'Sessão inválida ou expirada' });
    }
    request.user = user;
    return next();
  } catch {
    return response.status(401).json({ error: 'Sessão inválida ou expirada' });
  }
}

function requireUser(request) {
  if (!request.user) throw makeError(401, 'Faça login para continuar');
  return request.user;
}

function login(db, identifier, password, options = {}) {
  const normalizedIdentifier = String(identifier || '')
    .trim()
    .toLowerCase();
  const rawPhoneDigits = normalizedIdentifier.replace(/\D/g, '');
  const phoneDigits =
    rawPhoneDigits.startsWith('55') && [12, 13].includes(rawPhoneDigits.length)
      ? rawPhoneDigits.slice(2)
      : rawPhoneDigits;
  const isPhone = /^[+\d\s().-]+$/.test(normalizedIdentifier) && phoneDigits.length >= 10;
  const user = db
    .get('users')
    .find(
      (item) =>
        String(item.email || '')
          .trim()
          .toLowerCase() === normalizedIdentifier ||
        (!options.staffOnly && isPhone && String(item.phone || '').replace(/\D/g, '') === phoneDigits),
    )
    .value();
  const passwordMatches = bcrypt.compareSync(String(password || ''), user?.passwordHash || dummyPasswordHash);

  if (!user || !user.active || (options.staffOnly && !STAFF_ROLES.has(user.role)) || !passwordMatches)
    throw makeError(401, 'E-mail ou senha inválidos');
  return { user: safeUser(user), token: issueToken(user) };
}

function registerInput(body) {
  const name = String(body.name || '').trim();
  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  const phone = String(body.phone || '').replace(/\D/g, '');
  const password = String(body.password || '');
  const birthDate = String(body.birthDate || '').trim();
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 10 || password.length < 8) {
    throw makeError(400, 'Informe nome, e-mail válido, telefone e senha com pelo menos 8 caracteres');
  }
  const parsedBirthDate = birthDate ? new Date(`${birthDate}T00:00:00.000Z`) : null;
  if (
    birthDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) ||
      !parsedBirthDate ||
      Number.isNaN(parsedBirthDate.getTime()) ||
      parsedBirthDate.toISOString().slice(0, 10) !== birthDate ||
      birthDate > new Date().toISOString().slice(0, 10))
  ) {
    throw makeError(400, 'Informe uma data de nascimento válida.');
  }
  return { name, email, phone, password, birthDate: birthDate || null };
}

function safeAuthResult(user) {
  return { user: safeUser(user), token: issueToken(user) };
}

function requestPasswordReset(db, email) {
  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  const user = db
    .get('users')
    .find(
      (item) =>
        String(item.email || '')
          .trim()
          .toLowerCase() === normalized && item.active,
    )
    .value();
  const response = { message: 'Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.' };
  if (!user) return response;
  const invitation = createPasswordReset(Number(user.id));
  return {
    ...response,
    email: user.email,
    resetToken: invitation.token,
    userId: Number(user.id),
    resetRecord: invitation.resetRecord,
  };
}

function createPasswordReset(userId) {
  const token = randomToken(32);
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const now = Date.now();
  return {
    token,
    resetRecord: {
      tokenHash,
      userId: Number(userId),
      expiresAt: new Date(now + 30 * 60 * 1000).toISOString(),
      createdAt: nowIso(),
    },
  };
}

async function resetPassword(db, token, password, commit) {
  const tokenHash = createHash('sha256')
    .update(String(token || ''))
    .digest('hex');
  const reset = db.get('passwordResets').find({ tokenHash }).value();
  if (!reset || new Date(reset.expiresAt).getTime() <= Date.now()) {
    throw makeError(400, 'Token de recuperação inválido ou expirado');
  }
  if (String(password || '').length < 8 || String(password).length > 128)
    throw makeError(400, 'A senha deve ter entre 8 e 128 caracteres');
  const user = getById(db, 'users', reset.userId);
  if (!user) throw makeError(400, 'Token de recuperação inválido ou expirado');
  const passwordHash = bcrypt.hashSync(String(password), 10);
  await commit(db, null, 'auth.password.reset', 'users', user.id, (state) => {
    const currentReset = state.passwordResets.find((item) => item.tokenHash === tokenHash);
    if (!currentReset || new Date(currentReset.expiresAt).getTime() <= Date.now())
      throw makeError(400, 'Token de recuperação inválido ou expirado');
    const target = state.users.find((item) => Number(item.id) === Number(user.id));
    target.passwordHash = passwordHash;
    target.tokenVersion = (Number(target.tokenVersion) || 0) + 1;
    state.passwordResets = state.passwordResets.filter((item) => Number(item.userId) !== Number(user.id));
  });
  return { message: 'Senha alterada com sucesso' };
}

function createUser(data) {
  return {
    ...data,
    role: 'customer',
    permissions: [],
    active: true,
    guest: false,
    tokenVersion: 0,
    lastAccessAt: null,
    consent: { reminders: true, at: nowIso() },
    createdAt: nowIso(),
  };
}

module.exports = {
  authenticate,
  requireUser,
  canAttemptLogin,
  recordFailedLogin,
  login,
  registerInput,
  safeAuthResult,
  requestPasswordReset,
  createPasswordReset,
  resetPassword,
  createUser,
};
