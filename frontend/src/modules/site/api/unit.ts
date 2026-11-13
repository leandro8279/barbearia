import { apiRequest } from '@/shared/lib/http';

export type UnitHoursRange = { start: string; end: string } | [start: string, end: string];

export interface UnitBusinessHours {
  weekday: number;
  ranges: UnitHoursRange[];
}

export interface UnitHoliday {
  date: string;
  name: string;
  closed?: boolean;
  ranges?: UnitHoursRange[];
}

export interface PublicUnit {
  id: number;
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  amenities?: string[];
  businessHours?: UnitBusinessHours[];
  holidays?: UnitHoliday[];
}

export async function getPublicUnit(): Promise<PublicUnit | null> {
  return apiRequest<PublicUnit | null>('/units/1');
}
