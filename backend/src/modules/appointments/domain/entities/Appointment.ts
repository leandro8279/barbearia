export const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'checked_in', 'in_service', 'done', 'canceled', 'no_show'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const ACTIVE_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = ['pending', 'confirmed', 'checked_in', 'in_service'];

export const APPOINTMENT_ORIGINS = ['admin', 'web'] as const;
export type AppointmentOrigin = (typeof APPOINTMENT_ORIGINS)[number];

export const APPOINTMENT_EVENT_TYPES = ['created', 'confirmed', 'rescheduled', 'checked_in', 'started', 'done', 'canceled', 'no_show'] as const;
export type AppointmentEventType = (typeof APPOINTMENT_EVENT_TYPES)[number];

export interface AppointmentEvent {
  at: string; // ISO UTC
  type: AppointmentEventType;
  by: string | null; // userId
}

export interface AppointmentItem {
  serviceId: string;
  name: string;
  durationMin: number;
  price: number; // centavos, snapshot
  commissionPct: number; // snapshot
}
