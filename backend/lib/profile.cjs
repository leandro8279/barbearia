const bcrypt = require('bcryptjs')
const {makeError, nowIso, randomToken, safeUser, validDateString} = require('./core.cjs')

function digits(value) {
  return String(value || '').replace(/\D/g, '')
}

function validPhone(value) {
  const phone = digits(value).replace(/^55(?=\d{10,11}$)/, '')
  if (phone.length !== 10 && phone.length !== 11) return false
  const areaCode = Number(phone.slice(0, 2))
  const localNumber = phone.slice(2)
  return areaCode >= 11 && areaCode <= 99 && (localNumber.length === 9 ? /^9\d{8}$/.test(localNumber) : /^[2-5]\d{7}$/.test(localNumber))
}

function validCpf(value) {
  const cpf = digits(value)
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  const digit = (base, weights) => {
    const remainder = base.split('').reduce((sum, item, index) => sum + Number(item) * weights[index], 0) % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  const first = digit(cpf.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = digit(`${cpf.slice(0, 9)}${first}`, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  return cpf.endsWith(`${first}${second}`)
}

function cleanAddress(address) {
  if (!address || typeof address !== 'object' || Array.isArray(address)) throw makeError(400, 'Confira os dados dos endereços.')
  const value = {
    id: String(address.id || randomToken(6)),
    label: String(address.label || '').trim(),
    zip: digits(address.zip),
    street: String(address.street || '').trim(),
    number: String(address.number || '').trim(),
    complement: String(address.complement || '').trim(),
    neighborhood: String(address.neighborhood || '').trim(),
    city: String(address.city || '').trim(),
    state: String(address.state || '')
      .trim()
      .toUpperCase(),
    reference: String(address.reference || '').trim()
  }
  if (
    !value.label ||
    value.label.length > 40 ||
    value.zip.length !== 8 ||
    value.street.length < 2 ||
    value.street.length > 100 ||
    !value.number ||
    value.number.length > 20 ||
    value.complement.length > 80 ||
    value.neighborhood.length < 2 ||
    value.neighborhood.length > 80 ||
    value.city.length < 2 ||
    value.city.length > 80 ||
    !/^[A-Z]{2}$/.test(value.state) ||
    value.reference.length > 120
  ) {
    throw makeError(400, 'Confira os dados dos endereços.')
  }
  return value
}

async function updateProfile(db, body, user, commit) {
  const updates = {}
  const current = db
    .get('users')
    .find({id: Number(user.id)})
    .value()
  if (!current) throw makeError(404, 'Perfil não encontrado.')

  if (Object.hasOwn(body, 'name')) {
    const name = String(body.name || '').trim()
    if (name.length < 2 || name.length > 100) throw makeError(400, 'Informe um nome entre 2 e 100 caracteres.')
    updates.name = name
  }
  let emailChanged = false
  if (Object.hasOwn(body, 'email')) {
    const email = String(body.email || '')
      .trim()
      .toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) throw makeError(400, 'Informe um e-mail válido.')
    emailChanged =
      email !==
      String(current.email || '')
        .trim()
        .toLowerCase()
    if (emailChanged) {
      if (!current.passwordHash || !bcrypt.compareSync(String(body.currentPassword || ''), current.passwordHash))
        throw makeError(400, 'Senha atual incorreta. Confirme sua senha para alterar o e-mail.')
      const duplicate = db
        .get('users')
        .find(
          item =>
            String(item.email || '')
              .trim()
              .toLowerCase() === email && Number(item.id) !== Number(current.id)
        )
        .value()
      if (duplicate) throw makeError(409, 'Este e-mail já está cadastrado.')
    }
    updates.email = email
  }
  if (Object.hasOwn(body, 'phone')) {
    const phone = digits(body.phone).replace(/^55(?=\d{10,11}$)/, '')
    if (!validPhone(phone)) throw makeError(400, 'Informe um telefone válido com DDD.')
    const duplicate = db
      .get('users')
      .find(item => item.phone === phone && !item.guest && Number(item.id) !== Number(current.id))
      .value()
    if (duplicate) throw makeError(409, 'Este telefone já está cadastrado.')
    updates.phone = phone
  }
  if (Object.hasOwn(body, 'cpf')) {
    const cpf = digits(body.cpf)
    if (cpf && !validCpf(cpf)) throw makeError(400, 'Informe um CPF válido ou deixe o campo vazio.')
    updates.cpf = cpf || null
  }
  if (Object.hasOwn(body, 'birthDate')) {
    const birthDate = String(body.birthDate || '').trim()
    const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Sao_Paulo'}).format(new Date())
    if (birthDate && (!validDateString(birthDate) || birthDate > today)) throw makeError(400, 'Informe uma data de nascimento válida.')
    updates.birthDate = birthDate || null
  }
  if (Object.hasOwn(body, 'avatar')) {
    const avatar = body.avatar
    if (
      avatar !== null &&
      (typeof avatar !== 'string' || avatar.length > 90000 || !(/^\/[A-Za-z0-9/_./-]{1,200}$/.test(avatar) || /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(avatar)))
    ) {
      throw makeError(400, 'Escolha uma imagem válida. A foto será reduzida automaticamente.')
    }
    updates.avatar = avatar
  }
  if (Object.hasOwn(body, 'addresses')) {
    if (!Array.isArray(body.addresses) || body.addresses.length > 10) throw makeError(400, 'Você pode salvar até 10 endereços.')
    updates.addresses = body.addresses.map(cleanAddress)
  }
  return commit(
    db,
    user,
    'users.profile.update',
    'users',
    user.id,
    state => {
      const saved = state.users.find(item => Number(item.id) === Number(user.id))
      Object.assign(saved, updates)
      if (!Array.isArray(saved.addresses)) saved.addresses = []
      return safeUser(saved)
    },
    {emailChanged, changedFields: Object.keys(updates), addressCount: updates.addresses?.length}
  )
}

module.exports = {updateProfile}
