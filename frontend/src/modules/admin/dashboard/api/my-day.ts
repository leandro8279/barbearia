import {apiRequest, buildQuery} from '@/shared/lib/http'

export interface MyDayAppointment {
  id: number
  code: string
  start: string
  end: string
  status: string
  customerName: string
  barberId: number
  barberName: string
  notes: string
  items: Array<{serviceId: number; name: string; price: number; durationMin: number}>
}

export interface MyDayCommissionTotal {
  barberId: number
  servicesCents: number
  productsCents: number
  pendingCents: number
  paidCents: number
  totalCents: number
}

interface CommissionSummary {
  totals: MyDayCommissionTotal[]
}

export async function getMyDayAppointments(date: string): Promise<MyDayAppointment[]> {
  return apiRequest<MyDayAppointment[]>(`/appointments${buildQuery({barberId: 'me', date, _sort: 'start', _order: 'asc'})}`)
}

export async function updateAppointmentStatus(id: number, status: 'checked_in' | 'in_service'): Promise<void> {
  await apiRequest(`/appointments/${id}/status`, {method: 'PATCH', body: JSON.stringify({status})})
}

export async function getMyDayCommissions(date: string): Promise<CommissionSummary> {
  return apiRequest<CommissionSummary>(`/commissions/summary${buildQuery({from: `${date}T00:00:00.000-03:00`, to: `${date}T23:59:59.999-03:00`})}`)
}
