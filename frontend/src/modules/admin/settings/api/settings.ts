import { apiRequest } from '@/shared/lib/http';

export interface ClockRange {
  start: string;
  end: string;
}

export interface BusinessHourDay {
  weekday: number;
  ranges: ClockRange[];
}

export interface BusinessHoliday {
  date: string;
  name: string;
  closed: boolean;
  ranges: ClockRange[];
  isDefault?: boolean;
}

export interface BusinessFormValues {
  name: string;
  cnpj: string;
  phone: string;
  whatsapp: string;
  email: string;
  logo: string;
  addressDetails: { zip: string; street: string; number: string; complement: string; neighborhood: string; city: string; state: string; reference: string };
  socials: { instagram: string; facebook: string; tiktok: string; website: string };
  amenities: string[];
  photos: string[];
}

export interface BusinessSettingsResponse {
  unit: Partial<BusinessFormValues> & { id: number; address?: string; addressDetails?: BusinessFormValues['addressDetails'] | null };
  business: { name?: string; cnpj?: string; email?: string; socials?: Partial<BusinessFormValues['socials']> };
}

export interface BookingRules {
  slotGranularityMin: 15 | 30;
  minAdvanceMin: number;
  maxDays: number;
  defaultBufferMin: number;
  cancelBeforeHours: number;
  rescheduleBeforeHours: number;
  maxReschedules: number;
  autoConfirm: boolean;
  maxFutureAppointments: number;
}

export interface NotificationConfig {
  events: { confirmation: boolean; reminder24: boolean; reminder2: boolean; post: boolean };
  channels: { whatsapp: boolean; email: boolean };
  quietHours: { enabled: boolean; start: string; end: string };
  retentionDays: number;
}

export type NotificationTemplateType = 'confirmation' | 'reminder24' | 'reminder2' | 'post';
export type NotificationTemplates = Record<NotificationTemplateType, string>;

export interface NotificationLogRow {
  id: number;
  userId: number;
  appointmentId?: number;
  type: NotificationTemplateType | 'rescheduled';
  channel: 'whatsapp' | 'email';
  status: string;
  scheduledAt: string;
  sentAt: string | null;
  message?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  appointmentStart: string | null;
  barberName: string;
  resendOf?: number;
}

export async function getBusinessSettings() {
  return apiRequest<BusinessSettingsResponse>('/admin/settings/business');
}

export async function saveBusinessSettings(input: BusinessFormValues) {
  return apiRequest<BusinessSettingsResponse>('/admin/settings/business', { method: 'PATCH', body: JSON.stringify(input) });
}

export async function getBusinessHours() {
  return apiRequest<{ businessHours: BusinessHourDay[]; holidays: BusinessHoliday[] }>('/admin/settings/hours');
}

export async function saveBusinessHours(input: { businessHours: BusinessHourDay[]; holidays: BusinessHoliday[]; confirmAffected?: boolean }) {
  return apiRequest<{
    businessHours: BusinessHourDay[];
    holidays: BusinessHoliday[];
    impactedAppointments: Array<{ id: number; start: string; end: string; status: string; customerName: string; barberName: string }>;
  }>('/admin/settings/hours', { method: 'PATCH', body: JSON.stringify(input) });
}

export async function getBookingRules() {
  return apiRequest<BookingRules>('/admin/settings/booking');
}

export async function saveBookingRules(input: BookingRules) {
  return apiRequest<BookingRules>('/admin/settings/booking', { method: 'PATCH', body: JSON.stringify(input) });
}

export async function getNotificationSettings() {
  return apiRequest<{ settings: NotificationConfig; templates: NotificationTemplates; notifications: NotificationLogRow[] }>('/admin/settings/notifications');
}

export async function saveNotificationSettings(input: NotificationConfig & { templates: NotificationTemplates }) {
  return apiRequest<NotificationConfig>('/admin/settings/notifications', { method: 'PATCH', body: JSON.stringify(input) });
}

export async function resendNotification(id: number) {
  return apiRequest<{ notification: NotificationLogRow; url: string }>(`/admin/settings/notifications/${id}/resend`, { method: 'POST', body: JSON.stringify({}) });
}

export async function markNotificationSent(id: number) {
  return apiRequest<NotificationLogRow>(`/admin/settings/notifications/${id}/mark-sent`, { method: 'POST', body: JSON.stringify({}) });
}
