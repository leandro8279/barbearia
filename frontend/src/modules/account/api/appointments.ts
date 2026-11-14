import { apiRequest, buildQuery } from '@/shared/lib/http';

import type { PublicBarber } from '@/modules/site/api/barbers';

export type AppointmentListView = 'upcoming' | 'past' | 'canceled';

export interface AppointmentItem {
  serviceId: number;
  name: string;
  price: number;
  durationMin: number;
}

export interface CustomerAppointment {
  id: number;
  code: string;
  barberId: number;
  start: string;
  end: string;
  status: string;
  items: Array<{ serviceId: number; name: string; price: number; durationMin: number }>;
  subtotal: number;
  total: number;
}

export interface AppointmentEvent {
  at: string;
  type: string;
  by?: number;
}

export interface AppointmentPayment {
  id: number;
  method: string;
  amountCents: number;
  status: string;
  createdAt: string;
}

export interface CustomerAppointmentDetail extends CustomerAppointment {
  customerId: number;
  notes: string;
  rescheduleCount: number;
  canceledReason: string | null;
  events: AppointmentEvent[];
  barber: PublicBarber;
  payments: AppointmentPayment[];
}

interface AppointmentTab {
  id: number;
}

export interface AppointmentListParams {
  view: AppointmentListView;
  page: number;
  limit: number;
  from?: string;
  to?: string;
  status?: string;
}

export interface CustomerAppointmentPage {
  items: CustomerAppointment[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getMyAppointments(params: AppointmentListParams): Promise<CustomerAppointmentPage> {
  return apiRequest<CustomerAppointmentPage>(
    `/appointments${buildQuery({ view: params.view, page: params.page, limit: params.limit, from: params.from, to: params.to, status: params.status })}`,
  );
}

export async function getMyAppointment(id: string): Promise<CustomerAppointmentDetail> {
  const appointment = await apiRequest<Omit<CustomerAppointmentDetail, 'barber' | 'payments'>>(`/appointments/${encodeURIComponent(id)}`);
  const [barber, tabs] = await Promise.all([
    apiRequest<PublicBarber>(`/barbers/${encodeURIComponent(String(appointment.barberId))}`),
    apiRequest<AppointmentTab[]>(`/tabs${buildQuery({ appointmentId: appointment.id, _sort: 'createdAt', _order: 'desc', _limit: 1 })}`),
  ]);
  const payments =
    tabs[0] ? await apiRequest<AppointmentPayment[]>(`/payments${buildQuery({ tabId: tabs[0].id, _sort: 'createdAt', _order: 'asc' })}`) : [];
  return { ...appointment, barber, payments };
}

export async function rescheduleMyAppointment(id: number, input: { start: string; barberId: number; holdKey: string }): Promise<CustomerAppointment> {
  return apiRequest<CustomerAppointment>(`/appointments/${id}/reschedule`, { method: 'PATCH', data: input });
}

export async function cancelMyAppointment(id: number, reason: string): Promise<CustomerAppointment> {
  return apiRequest<CustomerAppointment>(`/appointments/${id}/cancel`, { method: 'PATCH', data: { reason } });
}
