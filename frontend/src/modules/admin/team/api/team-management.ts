import { apiRequest } from '@/shared/lib/http';
import type { TeamBarber } from '@/modules/admin/team/api/team';

export interface TeamServiceAssignment {
  serviceId: number;
  name: string;
  durationMin: number | null;
  defaultDurationMin: number;
  price: number | null;
  defaultPrice: number;
  commissionPct: number | null;
  defaultCommissionPct: number;
  assigned: boolean;
}

export interface TeamProfileUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  role: string;
  active: boolean;
  hasPassword: boolean;
}

export interface TeamProfile {
  barber: TeamBarber & { bio: string; pixKey: string; commissionServicePct: number; commissionProductPct: number };
  user: TeamProfileUser;
  services: TeamServiceAssignment[];
}

export interface TeamProfileInput {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  bio: string;
  specialties: string[];
  photo: string;
  pixKey: string;
  commissionServicePct: number;
  commissionProductPct: number;
  active: boolean;
  services: Array<{ serviceId: number; assigned: boolean; durationMin: number | null; price: number | null; commissionPct: number | null }>;
}

export interface TeamScheduleRange {
  start: string;
  end: string;
}

export interface TeamScheduleDay {
  weekday: number;
  ranges: TeamScheduleRange[];
  breaks: TeamScheduleRange[];
  businessHours: TeamScheduleRange[];
}

export interface TeamSchedule {
  barber: { id: number; name: string };
  days: TeamScheduleDay[];
}

export interface TeamScheduleImpact {
  id: number;
  start: string;
  end: string;
  status: string;
  customerName: string;
  barberId: number;
  barberName: string;
}

export interface TeamScheduleInput {
  days: Array<Pick<TeamScheduleDay, 'weekday' | 'ranges' | 'breaks'>>;
}

export interface TimeOffInput {
  barberIds: number[];
  fromDate: string;
  toDate: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  reason: 'Folga' | 'Férias' | 'Atestado' | 'Curso';
}

export interface TimeOffPreview {
  conflicts: TeamScheduleImpact[];
  count: number;
}

export async function getTeamServiceCatalog() {
  return apiRequest<TeamServiceAssignment[]>('/admin/team/services');
}

export async function getTeamTimeOffBarbers() {
  return apiRequest<TeamBarber[]>('/admin/team/timeoff/barbers');
}

export async function getTeamProfile(id: string) {
  return apiRequest<TeamProfile>(`/admin/team/${encodeURIComponent(id)}`);
}

export async function saveTeamProfile(id: string | null, input: TeamProfileInput) {
  return apiRequest<TeamProfile & { inviteToken: string | null; inviteSent: boolean }>(id ? `/admin/team/${encodeURIComponent(id)}` : '/admin/team', {
    method: id ? 'PATCH' : 'POST',
    body: JSON.stringify(input),
  });
}

export async function getTeamSchedule(id: string) {
  return apiRequest<TeamSchedule>(`/admin/team/${encodeURIComponent(id)}/schedule`);
}

export async function previewTeamSchedule(id: string, input: TeamScheduleInput) {
  return apiRequest<{ days: TeamScheduleDay[]; impactedAppointments: TeamScheduleImpact[] }>(`/admin/team/${encodeURIComponent(id)}/schedule/preview`, { method: 'POST', body: JSON.stringify(input) });
}

export async function saveTeamSchedule(id: string, input: TeamScheduleInput, confirmAffected = false) {
  return apiRequest<{ days: TeamScheduleDay[]; impactedAppointments: TeamScheduleImpact[] }>(`/admin/team/${encodeURIComponent(id)}/schedule`, {
    method: 'PATCH',
    body: JSON.stringify({ ...input, confirmAffected }),
  });
}

export async function previewTimeOff(input: TimeOffInput) {
  return apiRequest<TimeOffPreview>('/admin/team/timeoff/preview', { method: 'POST', body: JSON.stringify(input) });
}

export async function createTimeOff(input: TimeOffInput) {
  return apiRequest<{ items: Array<{ id: number; barberId: number; start: string; end: string; type: 'timeoff'; reason: string }> }>('/admin/team/timeoff', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
