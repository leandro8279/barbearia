import {apiRequest, buildQuery} from '@/shared/lib/http'

export type CommissionStatus = 'pending' | 'paid' | 'void'

export interface CommissionRecord {
  id: number
  barberId: number
  barberName: string
  tabId: number
  appointmentId: number | null
  kind: 'service' | 'product'
  baseCents: number
  pct: number
  amountCents: number
  status: CommissionStatus
  closedAt: string
}

export interface BarberCommissionTotal {
  barberId: number
  barberName: string
  servicesCents: number
  productsCents: number
  tipsCents: number
  refundsCents: number
  pendingCents: number
  paidCents: number
  totalCents: number
  toPayCents: number
}

export interface CommissionSummaryResponse {
  totals: BarberCommissionTotal[]
  commissions: CommissionRecord[]
  pagination: {page: number; pageSize: number; total: number; pageCount: number}
}

export interface CommissionFilters {
  from: string
  to: string
  status: 'all' | 'pending' | 'paid'
  page: number
  pageSize: number
}

export async function getCommissionSummary(filters: CommissionFilters, isBarber = false) {
  const endpoint = isBarber ? '/commissions/summary' : '/admin/commissions/summary'
  const query = {from: filters.from, to: filters.to, status: filters.status, page: filters.page, pageSize: filters.pageSize}
  return apiRequest<CommissionSummaryResponse>(`${endpoint}${buildQuery(query)}`)
}

export async function settleCommissionPeriod(input: {barberId: number; from: string; to: string; periodLabel: string}) {
  return apiRequest<{updated: number; expense: {id: number; description: string; amountCents: number; status: 'paid'}}>('/commissions/settle', {method: 'POST', body: JSON.stringify(input)})
}
