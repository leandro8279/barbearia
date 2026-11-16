const fs = require('node:fs')
const path = require('node:path')
const bcrypt = require('bcryptjs')

const dbPath = path.join(__dirname, 'db.json')
const publicSeedPath = path.join(__dirname, '..', 'public', 'seed')
const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Sao_Paulo'}).format(new Date())
const nowDate = new Date(`${today}T12:00:00-03:00`)
const nowIso = `${today}T12:00:00-03:00`
const fixedSalt = '$2b$10$abcdefghijklmnopqrstuu'
const passwordHash = bcrypt.hashSync('Barbearia@123', fixedSalt)
let seedState = 134791

function random() {
  seedState = (seedState * 48271) % 2147483647
  return seedState / 2147483647
}

function dateOffset(days) {
  const date = new Date(`${today}T12:00:00-03:00`)
  date.setUTCDate(date.getUTCDate() + days)
  return new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function localTime(date, minutes) {
  return `${date}T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00-03:00`
}

function addMinutes(value, minutes) {
  const date = new Date(value)
  date.setMinutes(date.getMinutes() + minutes)
  const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000)
  return `${shifted.toISOString().slice(0, 10)}T${String(shifted.getUTCHours()).padStart(2, '0')}:${String(shifted.getUTCMinutes()).padStart(2, '0')}:00-03:00`
}

function svgCard(label, color, accent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 240"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="${accent}"/></linearGradient></defs><rect width="360" height="240" rx="28" fill="url(#g)"/><circle cx="286" cy="58" r="64" fill="#fff" opacity=".10"/><circle cx="61" cy="203" r="92" fill="#fff" opacity=".08"/><path d="M140 149c0-28 18-49 40-49s40 21 40 49v25h-80z" fill="#fff" opacity=".88"/><circle cx="180" cy="80" r="27" fill="#f1c7a7"/><text x="24" y="218" fill="#fff" font-family="Arial,sans-serif" font-size="17" font-weight="700">${label}</text></svg>`
}

fs.mkdirSync(publicSeedPath, {recursive: true})
const palette = [
  ['#233b36', '#708d69'],
  ['#332d45', '#a07770'],
  ['#293c52', '#7991a8'],
  ['#3b302b', '#ba8460']
]
palette.forEach(([color, accent], index) => fs.writeFileSync(path.join(publicSeedPath, `barber-${index + 1}.svg`), svgCard(`Profissional ${index + 1}`, color, accent)))
;['hair', 'beard', 'care', 'tools'].forEach((category, index) => {
  const [color, accent] = palette[index]
  fs.writeFileSync(path.join(publicSeedPath, `product-${category}.svg`), svgCard(`Linha ${category}`, color, accent))
})

const users = [
  {id: 1, name: 'Alexandre Costa', email: 'admin@barbearia.test', phone: '11999990001', role: 'admin'},
  {id: 2, name: 'Mariana Almeida', email: 'gerente@barbearia.test', phone: '11999990002', role: 'manager'},
  {id: 3, name: 'Paulo Santos', email: 'recepcao@barbearia.test', phone: '11999990003', role: 'reception'},
  {id: 4, name: 'Rafael Nogueira', email: 'rafael@barbearia.test', phone: '11999990004', role: 'barber'},
  {id: 5, name: 'Bruno Carvalho', email: 'bruno@barbearia.test', phone: '11999990005', role: 'barber'},
  {id: 6, name: 'Diego Martins', email: 'diego@barbearia.test', phone: '11999990006', role: 'barber'},
  {id: 7, name: 'Felipe Rocha', email: 'felipe@barbearia.test', phone: '11999990007', role: 'barber'}
]
const customers = [
  'André Ribeiro',
  'Bianca Lima',
  'Caio Mendes',
  'Daniela Souza',
  'Eduardo Freitas',
  'Fernanda Melo',
  'Gabriel Lopes',
  'Helena Castro',
  'Igor Ferreira',
  'Juliana Barbosa',
  'Kaique Oliveira',
  'Larissa Gomes',
  'Marcelo Azevedo',
  'Natália Cardoso',
  'Otávio Pereira',
  'Priscila Duarte',
  'Rogério Teixeira',
  'Sofia Moreira',
  'Thiago Batista',
  'Úrsula Campos',
  'Vinícius Rezende',
  'William Pires',
  'Yasmin Andrade',
  'Zeca Farias',
  'Amanda Tavares',
  'Breno Xavier',
  'Cecília Ramos',
  'Davi Monteiro',
  'Elisa Figueiredo',
  'Fábio Correia',
  'Giovana Reis',
  'Heitor Nascimento',
  'Isabela Antunes',
  'João Viana',
  'Kelly Macedo',
  'Leonardo Dantas',
  'Manuela Peixoto',
  'Nicolas Braga',
  'Olívia Assis',
  'Pedro Valente'
]
customers.forEach((name, index) =>
  users.push({
    id: index + 8,
    name,
    email: index < 35 ? `cliente${String(index + 1).padStart(2, '0')}@email.test` : null,
    phone: `11988${String(index + 1).padStart(6, '0')}`,
    role: 'customer',
    guest: index >= 35
  })
)
for (const user of users) {
  Object.assign(user, {
    passwordHash: user.role === 'customer' && user.guest ? null : passwordHash,
    cpf: null,
    birthDate: null,
    addresses: [],
    tags: [],
    referralSource: null,
    avatar: user.role === 'barber' ? `/seed/barber-${user.id - 3}.svg` : null,
    permissions: [],
    active: true,
    guest: Boolean(user.guest),
    tokenVersion: 0,
    lastAccessAt: null,
    consent: {reminders: true, marketing: false, at: nowIso},
    createdAt: localTime(dateOffset(-45), 12 * 60)
  })
}

const barberProfiles = [
  {
    id: 1,
    userId: 4,
    slug: 'rafael-nogueira',
    bio: 'Cortes clássicos e acabamento preciso.',
    specialties: ['Degradê', 'Corte clássico'],
    commissionServicePct: 45,
    commissionProductPct: 10,
    photo: '/seed/barber-1.svg',
    workdays: [1, 2, 3, 4, 5, 6],
    start: 9 * 60,
    end: 18 * 60,
    breakStart: 12 * 60
  },
  {
    id: 2,
    userId: 5,
    slug: 'bruno-carvalho',
    bio: 'Especialista em barba e visagismo.',
    specialties: ['Barba', 'Navalha'],
    commissionServicePct: 48,
    commissionProductPct: 12,
    photo: '/seed/barber-2.svg',
    workdays: [2, 3, 4, 5, 6],
    start: 10 * 60,
    end: 19 * 60,
    breakStart: 13 * 60
  },
  {
    id: 3,
    userId: 6,
    slug: 'diego-martins',
    bio: 'Cortes modernos e atendimento infantil.',
    specialties: ['Infantil', 'Degradê'],
    commissionServicePct: 42,
    commissionProductPct: 10,
    photo: '/seed/barber-3.svg',
    workdays: [1, 3, 4, 5, 6],
    start: 8 * 60,
    end: 17 * 60,
    breakStart: 12 * 60
  },
  {
    id: 4,
    userId: 7,
    slug: 'felipe-rocha',
    bio: 'Cuidado completo e acabamento premium.',
    specialties: ['Corte', 'Tratamentos'],
    commissionServicePct: 46,
    commissionProductPct: 15,
    photo: '/seed/barber-4.svg',
    workdays: [1, 2, 3, 5, 6],
    start: 9 * 60 + 30,
    end: 18 * 60 + 30,
    breakStart: 12 * 60 + 30
  }
]
const barbers = barberProfiles.map(({workdays, start, end, breakStart, ...profile}) => ({...profile, pixKey: null, active: true}))
const schedules = []
for (const barber of barberProfiles) {
  for (const weekday of barber.workdays) {
    schedules.push({
      barberId: barber.id,
      weekday,
      ranges: [
        {
          start: `${String(Math.floor(barber.start / 60)).padStart(2, '0')}:${String(barber.start % 60).padStart(2, '0')}`,
          end: `${String(Math.floor(barber.end / 60)).padStart(2, '0')}:${String(barber.end % 60).padStart(2, '0')}`
        }
      ],
      breaks: [
        {
          start: `${String(Math.floor(barber.breakStart / 60)).padStart(2, '0')}:${String(barber.breakStart % 60).padStart(2, '0')}`,
          end: `${String(Math.floor((barber.breakStart + 60) / 60)).padStart(2, '0')}:${String((barber.breakStart + 60) % 60).padStart(2, '0')}`
        }
      ]
    })
  }
}

const serviceCategories = [
  {id: 1, name: 'Cortes', slug: 'cortes', order: 1},
  {id: 2, name: 'Barba', slug: 'barba', order: 2},
  {id: 3, name: 'Combos', slug: 'combos', order: 3},
  {id: 4, name: 'Cuidados', slug: 'cuidados', order: 4}
]
const serviceNames = [
  ['Corte tradicional', 1, 45, 6500],
  ['Degradê', 1, 50, 7500],
  ['Corte tesoura', 1, 50, 8000],
  ['Corte infantil', 1, 40, 6000],
  ['Corte máquina', 1, 30, 5000],
  ['Barba tradicional', 2, 35, 5500],
  ['Barba na toalha quente', 2, 45, 7500],
  ['Acabamento de barba', 2, 20, 3500],
  ['Corte + Barba', 3, 80, 11500],
  ['Corte + Barba premium', 3, 90, 14500],
  ['Corte + Sobrancelha', 3, 55, 8500],
  ['Hidratação capilar', 4, 30, 5000],
  ['Pigmentação de barba', 4, 30, 6000],
  ['Sobrancelha', 4, 15, 2500],
  ['Relaxamento capilar', 4, 45, 7500],
  ['Lavagem e finalização', 4, 20, 3000]
]
const services = serviceNames.map(([name, categoryId, durationMin, price], index) => ({
  id: index + 1,
  name,
  slug: name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, ''),
  categoryId,
  description: `${name} com produtos profissionais e acabamento cuidadoso.`,
  image: '',
  durationMin,
  bufferMin: index % 5 === 0 ? 5 : 0,
  price,
  commissionPct: 45,
  active: true,
  featured: [2, 9, 10].includes(index + 1)
}))
const barberServices = []
for (const barber of barbers) {
  for (const service of services) {
    if (barber.id === 2 && service.id === 4) continue
    barberServices.push({barberId: barber.id, serviceId: service.id, ...(service.id === 2 && barber.id === 1 ? {durationMin: 45, price: 7000} : {}), commissionPct: barber.commissionServicePct})
  }
}

const productCategories = [
  {id: 1, name: 'Cabelo', slug: 'cabelo'},
  {id: 2, name: 'Barba', slug: 'barba'},
  {id: 3, name: 'Cuidados', slug: 'cuidados'},
  {id: 4, name: 'Acessórios', slug: 'acessorios'}
]
const products = Array.from({length: 20}, (_, index) => {
  const categoryId = (index % 4) + 1
  const kind = index > 16 ? 'supply' : 'resale'
  const names = ['Pomada matte', 'Pomada efeito brilho', 'Shampoo diário', 'Óleo para barba', 'Balm para barba', 'Pente profissional', 'Pós-barba', 'Cera modeladora']
  return {
    id: index + 1,
    sku: `BAR-${String(index + 1).padStart(3, '0')}`,
    name: `${names[index % names.length]} ${index >= 8 ? `- ${Math.floor(index / 8) + 1}` : ''}`.trim(),
    categoryId,
    price: kind === 'supply' ? 0 : 3500 + (index % 6) * 1000,
    costCents: kind === 'supply' ? 800 : 1800 + (index % 5) * 600,
    stock: 35 + (index % 9),
    minStock: 5,
    kind,
    commissionPct: kind === 'resale' ? 10 : 0,
    image: `/seed/product-${['hair', 'beard', 'care', 'tools'][categoryId - 1]}.svg`,
    active: true
  }
})

const unitHolidays = []
for (const year of [Number(today.slice(0, 4)) - 1, Number(today.slice(0, 4)), Number(today.slice(0, 4)) + 1]) {
  for (const [date, name] of [
    [`${year}-01-01`, 'Confraternização Universal'],
    [`${year}-04-21`, 'Tiradentes'],
    [`${year}-05-01`, 'Dia do Trabalho'],
    [`${year}-09-07`, 'Independência do Brasil'],
    [`${year}-10-12`, 'Nossa Senhora Aparecida'],
    [`${year}-11-02`, 'Finados'],
    [`${year}-11-15`, 'Proclamação da República'],
    [`${year}-11-20`, 'Dia Nacional de Zumbi e da Consciência Negra'],
    [`${year}-01-25`, 'Aniversário da cidade de São Paulo'],
    [`${year}-07-09`, 'Revolução Constitucionalista de 1932'],
    [`${year}-12-25`, 'Natal']
  ])
    unitHolidays.push({date, name, closed: true, ranges: []})
}
const units = [
  {
    id: 1,
    name: 'Barbearia Estação',
    address: 'Rua das Palmeiras, 120 — São Paulo, SP',
    addressDetails: {zip: '01001-000', street: 'Rua das Palmeiras', number: '120', complement: '', neighborhood: 'Centro', city: 'São Paulo', state: 'SP', reference: ''},
    phone: '(11) 3333-1212',
    whatsapp: '551133331212',
    logo: null,
    amenities: ['Wi-Fi', 'Café', 'Acessível'],
    photos: ['/seed/barber-1.svg'],
    businessHours: [1, 2, 3, 4, 5, 6].map(weekday => ({weekday, ranges: [{start: '08:00', end: '20:00'}]})),
    holidays: unitHolidays
  }
]

const times = [
  [9 * 60, 10 * 60 + 30, 14 * 60, 15 * 60 + 30],
  [10 * 60, 11 * 60 + 30, 14 * 60, 15 * 60 + 30],
  [8 * 60 + 30, 10 * 60, 13 * 60, 14 * 60 + 30],
  [9 * 60 + 30, 11 * 60, 13 * 60 + 30, 15 * 60]
]
const candidates = []
for (let offset = -21; offset <= 10; offset += 1) {
  const date = dateOffset(offset)
  const weekday = new Date(`${date}T12:00:00-03:00`).getUTCDay()
  barberProfiles.forEach((barber, barberIndex) => {
    if (!barber.workdays.includes(weekday)) return
    if (barber.id === 3 && offset === 5) return
    const count = random() > 0.31 ? 1 : 2
    const selectedTimes = [...times[barberIndex]]
      .sort(() => random() - 0.5)
      .slice(0, count)
      .sort((a, b) => a - b)
    selectedTimes.forEach((minutes, index) => {
      const serviceId = 1 + Math.floor(random() * services.length)
      const service = services[serviceId - 1]
      const assignment = barberServices.find(entry => Number(entry.barberId) === Number(barber.id) && Number(entry.serviceId) === serviceId)
      candidates.push({
        date,
        offset,
        weekday,
        barberId: barber.id,
        minutes,
        serviceId,
        duration: Number(assignment?.durationMin ?? service.durationMin),
        price: Number(assignment?.price ?? service.price),
        commissionPct: Number(assignment?.commissionPct ?? barber.commissionServicePct),
        service,
        customerId: 8 + Math.floor(random() * 40),
        index
      })
    })
  })
}
const appointments = []
const tabs = []
const payments = []
const commissions = []
const stockMovements = []
const soldProducts = new Map()
const selectedCandidates = Array.from({length: 100}, (_, index) => candidates[Math.floor((index * candidates.length) / 100)])

selectedCandidates.forEach((candidate, index) => {
  const start = localTime(candidate.date, candidate.minutes)
  const end = localTime(candidate.date, candidate.minutes + candidate.duration + (Number(candidate.service.bufferMin) || 0))
  const isPast = new Date(start).getTime() < nowDate.getTime()
  const status =
    isPast && random() < 0.06 ? 'canceled'
    : isPast && random() < 0.04 ? 'no_show'
    : isPast ? 'done'
    : 'confirmed'
  const at = localTime(dateOffset(candidate.offset - 2), 10 * 60)
  const item = {serviceId: candidate.service.id, name: candidate.service.name, durationMin: candidate.duration, price: candidate.price, commissionPct: candidate.commissionPct}
  const appointment = {
    id: index + 1,
    code: `AG${String(index + 1).padStart(6, '0')}`,
    barberId: candidate.barberId,
    customerId: candidate.customerId,
    start,
    end,
    status,
    origin: index % 5 === 0 ? 'admin' : 'web',
    items: [item],
    subtotal: item.price,
    discount: 0,
    total: item.price,
    notes: index % 7 === 0 ? 'Preferência registrada no agendamento.' : '',
    rescheduleCount: index % 13 === 0 ? 1 : 0,
    startedAt: status === 'done' ? start : null,
    finishedAt: status === 'done' ? end : null,
    canceledReason: status === 'canceled' ? 'Ajuste de agenda' : null,
    events: [
      {at, type: 'created', by: candidate.customerId},
      ...(status === 'done' ? [{at: end, type: 'done', by: 3}]
      : status === 'confirmed' ? [{at, type: 'confirmed', by: candidate.customerId}]
      : [{at: end, type: status, by: 3}])
    ],
    createdAt: at
  }
  appointments.push(appointment)
  if (status !== 'done') return
  const hasProduct = index % 4 === 0
  const product = hasProduct ? products[index % 16] : null
  const tabItems = [{type: 'service', refId: item.serviceId, name: item.name, qty: 1, unitPrice: item.price, discount: 0, barberId: candidate.barberId, commissionPct: item.commissionPct}]
  if (product) {
    tabItems.push({type: 'product', refId: product.id, name: product.name, qty: 1, unitPrice: product.price, discount: 0, barberId: candidate.barberId, commissionPct: product.commissionPct})
    soldProducts.set(product.id, (soldProducts.get(product.id) || 0) + 1)
  }
  const total = tabItems.reduce((sum, tabItem) => sum + tabItem.unitPrice, 0)
  const tabId = tabs.length + 1
  const closedAt = end
  tabs.push({
    id: tabId,
    appointmentId: appointment.id,
    customerId: appointment.customerId,
    barberId: appointment.barberId,
    type: 'appointment',
    status: 'closed',
    items: tabItems,
    tip: 0,
    discount: 0,
    total,
    createdAt: start,
    closedAt
  })
  const method = index % 3 === 0 ? 'pix' : 'cash'
  payments.push({id: payments.length + 1, tabId, method, amountCents: total, status: 'paid', createdAt: closedAt})
  tabItems.forEach(tabItem => {
    const baseCents = tabItem.unitPrice * tabItem.qty - tabItem.discount
    commissions.push({
      id: commissions.length + 1,
      barberId: tabItem.barberId,
      tabId,
      kind: tabItem.type,
      baseCents,
      pct: tabItem.commissionPct,
      amountCents: Math.round((baseCents * tabItem.commissionPct) / 100),
      status: 'pending'
    })
    if (tabItem.type === 'product')
      stockMovements.push({id: stockMovements.length + 1, productId: tabItem.refId, type: 'sale', qty: -1, reason: 'Venda em comanda', userId: 3, tabId, createdAt: closedAt})
  })
})
for (const product of products) product.stock -= soldProducts.get(product.id) || 0

const cashPayments = payments.filter(payment => payment.method === 'cash')
const expectedOpenCash =
  50000 + cashPayments.filter(payment => new Date(payment.createdAt).getTime() >= new Date(localTime(today, 8 * 60)).getTime()).reduce((sum, payment) => sum + payment.amountCents, 0)
const cashSessions = [
  {
    id: 1,
    openedBy: 3,
    openingCents: 40000,
    closedBy: 1,
    countedByMethod: {cash: 81600, pix: 28500, debit: 0, credit: 0},
    expectedByMethod: {cash: 81600, pix: 28500, debit: 0, credit: 0},
    diffCents: 0,
    status: 'closed',
    openedAt: localTime(dateOffset(-12), 8 * 60),
    closedAt: localTime(dateOffset(-12), 19 * 60)
  },
  {
    id: 2,
    openedBy: 3,
    openingCents: 50000,
    closedBy: 2,
    countedByMethod: {cash: 102400, pix: 43100, debit: 0, credit: 0},
    expectedByMethod: {cash: 102400, pix: 43100, debit: 0, credit: 0},
    diffCents: 0,
    status: 'closed',
    openedAt: localTime(dateOffset(-5), 8 * 60),
    closedAt: localTime(dateOffset(-5), 19 * 60)
  },
  {id: 3, openedBy: 3, openingCents: 50000, closedBy: null, countedByMethod: null, expectedByMethod: null, diffCents: null, status: 'open', openedAt: localTime(today, 8 * 60), closedAt: null}
]
const notifications = []
for (const appointment of appointments) {
  if (!['confirmed', 'pending'].includes(appointment.status)) continue
  for (const [type, hours] of [
    ['reminder24', 24],
    ['reminder2', 2]
  ]) {
    const scheduledAt = new Date(new Date(appointment.start).getTime() - hours * 3600000).toISOString()
    if (new Date(scheduledAt).getTime() <= nowDate.getTime()) continue
    notifications.push({id: notifications.length + 1, userId: appointment.customerId, appointmentId: appointment.id, type, channel: 'whatsapp', status: 'scheduled', scheduledAt, sentAt: null})
  }
}

const db = {
  users,
  customerNotes: Array.from({length: 8}, (_, index) => ({
    id: index + 1,
    userId: index + 8,
    type: index % 2 ? 'preference' : 'general',
    text: index % 2 ? 'Prefere acabamento com tesoura.' : 'Cliente frequente.',
    pinned: index === 0,
    authorId: 3,
    createdAt: localTime(dateOffset(-index - 1), 12 * 60)
  })),
  units,
  barbers,
  schedules,
  timeBlocks: [{id: 1, barberId: 3, start: localTime(dateOffset(5), 8 * 60), end: localTime(dateOffset(5), 17 * 60), type: 'timeoff', reason: 'Folga programada'}],
  serviceCategories,
  services,
  barberServices,
  appointments,
  slotHolds: [],
  passwordResets: [],
  tabs,
  payments,
  cashSessions,
  cashMovements: [],
  commissions,
  products,
  productCategories,
  stockMovements,
  expenses: [
    {id: 1, description: 'Aluguel da unidade', category: 'Aluguel', amountCents: 320000, dueAt: localTime(dateOffset(2), 10 * 60), status: 'open', recurring: true, createdAt: nowIso},
    {
      id: 2,
      description: 'Produtos de limpeza',
      category: 'Produtos',
      amountCents: 28500,
      dueAt: localTime(dateOffset(-4), 10 * 60),
      status: 'paid',
      paidAt: nowIso,
      recurring: false,
      createdAt: nowIso
    },
    {id: 3, description: 'Conta de energia', category: 'Energia', amountCents: 74600, dueAt: localTime(dateOffset(4), 10 * 60), status: 'open', recurring: true, createdAt: nowIso}
  ],
  notifications,
  messageTemplates: [
    {id: 1, type: 'confirmation', text: 'Olá {nome}, seu horário com {barbeiro} está confirmado para {horario}.'},
    {id: 2, type: 'reminder24', text: 'Olá {nome}, lembrete: seu horário com {barbeiro} é amanhã, {horario}.'},
    {id: 3, type: 'reminder2', text: 'Olá {nome}, seu horário com {barbeiro} começa em breve: {horario}.'},
    {id: 4, type: 'post', text: 'Olá {nome}, obrigado pela visita! Esperamos você novamente.'}
  ],
  settings: [
    {
      id: 1,
      business: {name: 'Barbearia Estação', cnpj: '', email: 'contato@barbearia.test', socials: {instagram: '', facebook: '', tiktok: '', website: ''}, timezone: 'America/Sao_Paulo', unitId: 1},
      booking: {
        minAdvanceMin: 60,
        maxDays: 45,
        maxReschedules: 2,
        cancelBeforeHours: 4,
        rescheduleBeforeHours: 4,
        slotGranularityMin: 15,
        defaultBufferMin: 0,
        autoConfirm: true,
        maxFutureAppointments: 3,
        maxDiscountPct: 10
      },
      notifications: {
        events: {confirmation: true, reminder24: true, reminder2: true, post: true},
        channels: {whatsapp: true, email: false},
        quietHours: {enabled: true, start: '22:00', end: '08:00'},
        retentionDays: 180,
        reminders: true,
        reminderHours: [24, 2]
      }
    }
  ],
  auditLogs: [{id: 1, userId: 1, action: 'seed.initialize', entity: 'database', entityId: null, details: {appointments: appointments.length}, createdAt: nowIso}]
}

fs.writeFileSync(dbPath, `${JSON.stringify(db, null, 2)}\n`)
console.log(
  `Seed determinístico criado: ${users.length} usuários, ${barbers.length} barbeiros, ${services.length} serviços, ${products.length} produtos, ${appointments.length} agendamentos e ${tabs.length} comandas.`
)
console.log('Contas de demonstração usam a senha local: Barbearia@123')
