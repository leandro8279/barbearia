import {apiRequest, buildQuery} from '@/shared/lib/http'

export interface AdminCustomer {
  id: number
  name: string
  phone: string
  phoneMasked: boolean
  lastVisit: string | null
  visitsCount: number
  totalSpentCents: number
  tags: string[]
}

export interface CustomerConsent {
  reminders: boolean
  marketing: boolean
  at: string | null
}

export interface AdminCustomerRecord {
  id: number
  name: string
  phone: string
  phoneMasked: boolean
  email: string | null
  avatar: string | null
  birthDate: string | null
  cpf: string | null
  tags: string[]
  referralSource: string | null
  guest: boolean
  consent: CustomerConsent | null
}

export interface CustomerAppointmentSummary {
  id: number
  code: string
  start: string
  end: string
  status: string
  items: Array<{name: string; priceCents: number; durationMin: number}>
}

export interface CustomerFinancialRecord {
  id: number
  appointmentId: number | null
  date: string
  totalCents: number
  items: Array<{name: string; qty: number}>
  payments: Array<{method: string; amountCents: number}>
}

export interface CustomerNote {
  id: number
  type: string
  text: string
  pinned: boolean
  createdAt: string
}

export interface AdminCustomerProfile {
  customer: AdminCustomerRecord
  metrics: {visitsCount: number; averageTicketCents: number; medianIntervalDays: number | null; lastVisit: string | null; totalSpentCents: number}
  permissions: {history: boolean; financial: boolean; notes: boolean; edit: boolean; schedule: boolean}
  appointments: CustomerAppointmentSummary[]
  financial: CustomerFinancialRecord[]
  notes: CustomerNote[]
}

export interface AdminCustomerInput {
  name: string
  phone: string
  email: string
  birthDate: string
  cpf: string
  referralSource: string
  tags: string[]
  consent: {reminders: boolean; marketing: boolean}
}

export interface CustomerDuplicate {
  id: number
  name: string
  phone: string
  matchedBy: Array<'phone' | 'name'>
}

export interface AdminCustomerQuery {
  page: number
  pageSize: number
  query: string
  noVisitDays?: number
  birthday?: 'month'
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export interface AdminCustomerPage {
  items: AdminCustomer[]
  total: number
  page: number
  pageSize: number
}

export async function getAdminCustomers(params: AdminCustomerQuery) {
  return apiRequest<AdminCustomerPage>(
    `/admin/customers${buildQuery({
      _page: params.page,
      _limit: params.pageSize,
      q: params.query,
      noVisitDays: params.noVisitDays,
      birthday: params.birthday,
      _sort: params.sortBy,
      _order: params.sortOrder
    })}`
  )
}

export async function getAdminCustomerProfile(id: string) {
  return apiRequest<AdminCustomerProfile>(`/admin/customers/${id}`)
}

export async function getAdminCustomerDuplicates(params: {phone: string; name: string; excludeId?: string}) {
  return apiRequest<CustomerDuplicate[]>(`/admin/customers/duplicates${buildQuery(params)}`)
}

export async function saveAdminCustomer(id: string | null, input: AdminCustomerInput) {
  return apiRequest<AdminCustomerRecord>(id ? `/admin/customers/${id}` : '/admin/customers', {method: id ? 'PATCH' : 'POST', body: JSON.stringify(input)})
}
