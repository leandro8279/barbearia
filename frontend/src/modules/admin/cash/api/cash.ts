import type {PublicBarber} from '@/modules/site/api/barbers'
import {apiRequest, buildQuery} from '@/shared/lib/http'

export interface CashSessionSummary {
  id: number
  openingCents: number
  openedAt: string
  openedBy: number
  openedByName?: string
}

export type CashPaymentMethod = 'cash' | 'pix' | 'debit' | 'credit'
export type CashDenominationKey = '20000' | '10000' | '5000' | '2000' | '1000' | '500' | '200'
export type CashMethodTotals = Record<CashPaymentMethod, number>

export interface CashSessionRecord extends CashSessionSummary {
  closedBy: number | null
  countedByMethod: CashMethodTotals | null
  expectedByMethod: CashMethodTotals | null
  diffCents: number | null
  countedCashByDenomination: Record<CashDenominationKey, number> | null
  countedOtherCashCents: number | null
  closingNote: string
  differenceApprovedBy: number | null
  transferredTabIds: number[]
  status: 'open' | 'closed'
  closedAt: string | null
  closedByName?: string
}

export interface CashSessionCloseInput {
  countedByMethod: CashMethodTotals
  countedCashByDenomination: Record<CashDenominationKey, number>
  countedOtherCashCents: number
  closingNote: string
  approveDifference?: boolean
}

export interface CashMovement {
  id: number
  sessionId: number
  type: 'withdraw' | 'supply'
  amountCents: number
  reason: string
  userId: number
  createdAt: string
}

export interface CashMovementInput {
  type: 'withdraw' | 'supply'
  amountCents: number
  reason: string
}

export interface OpenCashTab {
  id: number
  appointmentId: number | null
  type: 'appointment' | 'counter'
  customerName: string
  barberName: string | null
  totalCents: number
  itemCount: number
  createdAt: string
}

export interface CashSummary {
  session: CashSessionSummary | null
  balanceByMethod: {cash: number; pix: number; debit: number; credit: number} | null
  openTabs: OpenCashTab[]
}

export interface CashTabItem {
  type: 'service' | 'product'
  refId: number
  name: string
  qty: number
  unitPrice: number
  discount: number
  barberId: number | null
  commissionPct: number
}

export interface CashTab {
  id: number
  appointmentId: number | null
  customerId: number | null
  barberId: number | null
  type: 'appointment' | 'counter'
  status: 'open' | 'closed' | 'void'
  items: CashTabItem[]
  tip: number
  discount: number
  total: number
  createdAt: string
  closedAt: string | null
}

export interface CashAppointment {
  id: number
  code: string
  start: string
  end: string
  status: string
  actualDurationMin?: number | null
}

export interface CashCustomer {
  id: number
  name: string
  phone?: string | null
}

export interface CashCatalogService {
  id: number
  name: string
  description: string
  durationMin: number
  price: number
}

export interface CashCatalogProduct {
  id: number
  sku: string
  name: string
  price: number
  image?: string
}

export interface CashCatalog {
  services: CashCatalogService[]
  products: CashCatalogProduct[]
  barbers: PublicBarber[]
}

export interface CashTabDetail {
  tab: CashTab
  appointment: CashAppointment | null
  customer: CashCustomer | null
  barber: PublicBarber | null
  barbers: PublicBarber[]
  maxDiscountPct: number
}

export interface CashTabPaymentInput {
  method: 'cash' | 'pix' | 'debit' | 'credit'
  amountCents: number
}

export interface CloseCashTabInput {
  tipCents: number
  tipAllocations: {barberId: number; amountCents: number}[]
  payments: CashTabPaymentInput[]
}

export async function getCashSummary() {
  return apiRequest<CashSummary>('/admin/cash/summary')
}

export async function getCashSessionMovements(sessionId: number) {
  return apiRequest<CashMovement[]>(`/cashMovements${buildQuery({sessionId, _sort: 'createdAt', _order: 'asc'})}`)
}

export async function createCashMovement(input: CashMovementInput) {
  return apiRequest<CashMovement>('/cashMovements', {method: 'POST', body: JSON.stringify(input)})
}

export async function openCashSession(openingCents: number) {
  return apiRequest<CashSessionRecord>('/cashSessions/open', {method: 'POST', body: JSON.stringify({openingCents})})
}

export async function closeCashSession(id: number, input: CashSessionCloseInput) {
  return apiRequest<CashSessionRecord>(`/cashSessions/${id}/close`, {method: 'POST', body: JSON.stringify(input)})
}

export async function getCashTabDetail(id: number): Promise<CashTabDetail> {
  const tabs = await apiRequest<CashTab[]>(`/tabs${buildQuery({id, _limit: 1})}`)
  const tab = tabs[0]
  if (!tab) throw new Error('Comanda não encontrada.')
  const [appointment, customer, barbers, discountPolicy] = await Promise.all([
    tab.appointmentId ? apiRequest<CashAppointment>(`/appointments/${tab.appointmentId}`) : Promise.resolve(null),
    tab.customerId ? apiRequest<CashCustomer>(`/users/${tab.customerId}`) : Promise.resolve(null),
    apiRequest<PublicBarber[]>(`/barbers${buildQuery({_page: 1, _limit: 100, _sort: 'name', _order: 'asc'})}`),
    apiRequest<{maxDiscountPct: number}>('/admin/cash/discount-policy')
  ])

  return {tab, appointment, customer, barbers, barber: barbers.find(item => item.id === tab.barberId) ?? null, maxDiscountPct: discountPolicy.maxDiscountPct}
}

export async function getCashCatalog(): Promise<CashCatalog> {
  const [services, products, barbers] = await Promise.all([
    apiRequest<CashCatalogService[]>(`/services${buildQuery({_page: 1, _limit: 100, _sort: 'name', _order: 'asc'})}`),
    apiRequest<CashCatalogProduct[]>(`/products${buildQuery({kind: 'resale', _page: 1, _limit: 100, _sort: 'name', _order: 'asc'})}`),
    apiRequest<PublicBarber[]>(`/barbers${buildQuery({_page: 1, _limit: 100, _sort: 'name', _order: 'asc'})}`)
  ])

  return {services, products, barbers}
}

export async function addCashTabItem(id: number, item: {type: 'service' | 'product'; refId: number; qty: number; barberId: number | null}) {
  return apiRequest<CashTab>(`/tabs/${id}/items`, {method: 'POST', body: JSON.stringify(item)})
}

export async function updateCashTabDiscount(id: number, discountCents: number) {
  return apiRequest<CashTab>(`/tabs/${id}/discount`, {method: 'POST', body: JSON.stringify({discountCents})})
}

export async function closeCashTab(id: number, input: CloseCashTabInput) {
  return apiRequest<CashTab>(`/tabs/${id}/close`, {method: 'POST', body: JSON.stringify(input)})
}

export async function createCounterTab() {
  return apiRequest<{id: number}>('/tabs', {method: 'POST', body: JSON.stringify({})})
}
