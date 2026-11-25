import { apiRequest, buildQuery } from '@/shared/lib/http';

export interface TeamBarber {
  id: number;
  name: string;
  photo: string | null;
  specialties: string[];
  active: boolean;
}

export interface TeamSchedule {
  barberId: number;
  weekday: number;
  ranges: Array<{ start: string; end: string }>;
  breaks: Array<{ start: string; end: string }>;
}

export interface TeamWeekAppointment {
  id: number;
  barberId: number;
  start: string;
  end: string;
  durationMin: number;
  status: string;
}

export interface TeamWeekData {
  barbers: TeamBarber[];
  schedules: TeamSchedule[];
  appointments: TeamWeekAppointment[];
}

export async function getTeamWeekData(from: string, to: string): Promise<TeamWeekData> {
  const [barbers, schedules, appointments] = await Promise.all([
    apiRequest<TeamBarber[]>('/admin/team'),
    apiRequest<TeamSchedule[]>(`/schedules${buildQuery({ _page: 1, _limit: 1000 })}`),
    apiRequest<TeamWeekAppointment[]>(`/appointments${buildQuery({ from, to, _sort: 'start', _order: 'asc' })}`),
  ]);

  return { barbers, schedules, appointments };
}
