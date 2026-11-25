import type {PublicBarber} from '@/modules/site/api/barbers'
import {getPublicUnit, type PublicUnit} from '@/modules/site/api/unit'
import {createGuestSession} from '@/modules/auth/api/auth'
import {apiRequest, buildQuery} from '@/shared/lib/http'

export interface AgendaAppointment {
  id: number
  code: string
  barberId: number
  barberName: string
  customerName: string
  start: string
  end: string
  durationMin: number
  status: string
  notes: string
  items: Array<{serviceId: number; name: string; price: number; durationMin: number}>
}

export interface AgendaTimeBlock {
  id: number
  barberId: number | null
  start: string
  end: string
  type: string
  reason?: string
}

export interface AgendaService {
  id: number
  name: string
  durationMin: number
  price: number
  active: boolean
}

export interface AgendaCustomer {
  id: number
  name: string
  phone?: string | null
  email?: string | null
  birthDate?: string | null
  avatar?: string | null
  guest?: boolean
}

export interface AgendaAvailabilityBarber extends PublicBarber {
  durationMin: number
  totalDurationMin: number
  subtotal: number
}

export interface AgendaAvailabilitySlot {
  barberId: number
  start: string
  end: string
  durationMin: number
  bufferMin: number
  subtotal: number
  total: number
}

export interface AgendaAppointmentEvent {
  at: string
  type: string
  by?: number
  from?: string
  to?: string
  reason?: string
}

export interface AgendaAppointmentRecord {
  id: number
  code: string
  barberId: number
  customerId: number
  start: string
  end: string
  status: string
  origin: 'admin' | 'web'
  expectedPaymentMethod?: string | null
  items: Array<{serviceId: number; name: string; price: number; durationMin: number}>
  subtotal: number
  discount: number
  total: number
  notes: string
  startedAt?: string | null
  finishedAt?: string | null
  actualDurationMin?: number | null
  rescheduleCount: number
  canceledReason: string | null
  events: AgendaAppointmentEvent[]
  createdAt: string
}

export interface AgendaPayment {
  id: number
  method: string
  amountCents: number
  status: string
  createdAt: string
}

export interface AgendaTab {
  id: number
  appointmentId?: number
  status: string
  total: number
  createdAt: string
  closedAt: string | null
}

export interface AgendaAppointmentDetail {
  appointment: AgendaAppointmentRecord
  customer: AgendaCustomer
  barber: PublicBarber
  history: AgendaAppointmentRecord[]
  tabs: AgendaTab[]
  payments: AgendaPayment[]
}

export type {PublicBarber, PublicUnit}

export function getAgendaBarbers(userId?: number): Promise<PublicBarber[]> {
  return apiRequest<PublicBarber[]>(`/barbers${buildQuery({userId, _page: 1, _limit: 100, _sort: 'name', _order: 'asc'})}`)
}

export function getAgendaUnit(): Promise<PublicUnit | null> {
  return getPublicUnit()
}

export async function getAgendaAppointments(from: string, to: string, barberId?: number | 'me'): Promise<AgendaAppointment[]> {
  return apiRequest<AgendaAppointment[]>(`/appointments${buildQuery({from, to, barberId, _sort: 'start', _order: 'asc'})}`)
}

export async function getAgendaTimeBlocks(): Promise<AgendaTimeBlock[]> {
  return apiRequest<AgendaTimeBlock[]>(`/timeBlocks${buildQuery({_sort: 'start', _order: 'asc', _limit: 500})}`)
}

export async function getAgendaServices(): Promise<AgendaService[]> {
  return apiRequest<AgendaService[]>(`/services${buildQuery({_page: 1, _limit: 100, _sort: 'name', _order: 'asc'})}`)
}

export async function getAgendaCustomerSuggestions(query: string): Promise<AgendaCustomer[]> {
  const result = await apiRequest<{customers: AgendaCustomer[]}>(`/search/suggest${buildQuery({q: query})}`)
  return result.customers
}

export async function createQuickAgendaCustomer(input: {name: string; phone: string}): Promise<AgendaCustomer> {
  const result = await createGuestSession(input)
  return {id: Number(result.user.id), name: result.user.name, phone: input.phone, guest: true}
}

export async function getAgendaEligibleBarbers(serviceIds: number[]): Promise<AgendaAvailabilityBarber[]> {
  return apiRequest<AgendaAvailabilityBarber[]>(`/availability/barbers${buildQuery({serviceIds: serviceIds.join(',')})}`)
}

export async function getAgendaAvailabilitySlots(input: {serviceIds: number[]; barberId: number; date: string; bypassAdvance: boolean; allowOutOfHours: boolean}): Promise<AgendaAvailabilitySlot[]> {
  return apiRequest<AgendaAvailabilitySlot[]>(
    `/availability${buildQuery({
      serviceIds: input.serviceIds.join(','),
      barberId: input.barberId,
      date: input.date,
      bypassAdvance: input.bypassAdvance ? 'true' : undefined,
      allowOutOfHours: input.allowOutOfHours ? 'true' : undefined
    })}`
  )
}

export interface AgendaTimeBlockConflict {
  id: number
  start: string
  end: string
  status: string
  customerName: string
  barberId: number
  barberName: string
}

export async function createAgendaTimeBlocks(input: {
  barberIds: number[] | null
  date: string
  startTime: string
  endTime: string
  allDay: boolean
  type: 'block' | 'timeoff'
  reason: string
  repeatWeeks: number
}): Promise<AgendaTimeBlock[]> {
  const result = await apiRequest<{items: AgendaTimeBlock[]}>('/timeBlocks', {method: 'POST', body: JSON.stringify(input)})
  return result.items
}

export async function getAgendaAppointmentDetail(id: number, barberMode = false): Promise<AgendaAppointmentDetail> {
  const appointment = await apiRequest<AgendaAppointmentRecord>(`/appointments/${id}`)
  const date = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Sao_Paulo'}).format(new Date(appointment.start))
  const [customer, barber, history, tabs] = await Promise.all([
    barberMode ?
      getAgendaAppointments(date, date, 'me').then(rows => ({id: appointment.customerId, name: rows.find(row => row.id === appointment.id)?.customerName ?? 'Cliente'}))
    : apiRequest<AgendaCustomer>(`/users/${appointment.customerId}`),
    apiRequest<PublicBarber>(`/barbers/${appointment.barberId}`),
    apiRequest<AgendaAppointmentRecord[]>(`/appointments${buildQuery({customerId: appointment.customerId, _sort: 'start', _order: 'desc', _limit: 8})}`),
    apiRequest<AgendaTab[]>(`/tabs${buildQuery({appointmentId: id, _sort: 'createdAt', _order: 'desc', _limit: 10})}`)
  ])
  const paymentGroups = await Promise.all(tabs.map(tab => apiRequest<AgendaPayment[]>(`/payments${buildQuery({tabId: tab.id, _sort: 'createdAt', _order: 'asc'})}`)))
  return {appointment, customer, barber, history, tabs, payments: paymentGroups.flat()}
}

export async function createAgendaAppointment(input: {
  customerId: number
  serviceIds: number[]
  barberId: number
  start: string
  notes: string
  expectedPaymentMethod: string | null
  bypassAdvance: boolean
  allowOutOfHours: boolean
}): Promise<AgendaAppointmentRecord> {
  return apiRequest<AgendaAppointmentRecord>('/appointments', {method: 'POST', body: JSON.stringify({...input, origin: 'admin'})})
}

export async function rescheduleAgendaAppointment(id: number, input: {barberId: number; start: string; reason: string; notifyCustomer: boolean}): Promise<AgendaAppointmentRecord> {
  return apiRequest<AgendaAppointmentRecord>(`/appointments/${id}/reschedule`, {method: 'PATCH', body: JSON.stringify(input)})
}

export async function updateAgendaAppointmentStatus(id: number, status: string): Promise<AgendaAppointmentRecord> {
  return apiRequest<AgendaAppointmentRecord>(`/appointments/${id}/status`, {method: 'PATCH', body: JSON.stringify({status})})
}

export async function startAgendaService(id: number, currentStatus: string): Promise<AgendaAppointmentRecord> {
  if (currentStatus === 'pending') await updateAgendaAppointmentStatus(id, 'confirmed')
  if (currentStatus === 'pending' || currentStatus === 'confirmed') await updateAgendaAppointmentStatus(id, 'checked_in')
  return updateAgendaAppointmentStatus(id, 'in_service')
}

export async function finishAgendaService(id: number): Promise<AgendaAppointmentRecord> {
  return apiRequest<AgendaAppointmentRecord>(`/appointments/${id}/finish`, {method: 'POST'})
}

export async function markAgendaAppointmentNoShow(id: number, reason: string): Promise<AgendaAppointmentRecord> {
  return apiRequest<AgendaAppointmentRecord>(`/appointments/${id}/no-show`, {method: 'PATCH', body: JSON.stringify({reason})})
}

export async function cancelAgendaAppointment(id: number, input: {reason: string; cancellationType: 'customer' | 'barbershop'; offerReschedule: boolean}): Promise<AgendaAppointmentRecord> {
  return apiRequest<AgendaAppointmentRecord>(`/appointments/${id}/cancel`, {method: 'PATCH', body: JSON.stringify(input)})
}

export async function updateAgendaAppointmentItems(id: number, input: {serviceIds: number[]; barberId: number}): Promise<AgendaAppointmentRecord> {
  return apiRequest<AgendaAppointmentRecord>(`/appointments/${id}/items`, {method: 'PATCH', body: JSON.stringify(input)})
}

export async function openAgendaAppointmentTab(appointmentId: number): Promise<AgendaTab> {
  return apiRequest<AgendaTab>('/tabs', {method: 'POST', body: JSON.stringify({appointmentId})})
}
