import type { AppointmentStatus } from '@/modules/appointments/domain/entities/Appointment';
import type { BusinessHour, Holiday } from '@/modules/settings/domain/entities/Unit';
import type { UpcomingAppointment } from '@/modules/settings/domain/repositories/UpcomingAppointmentRepositoryInterface';

export interface SaveBusinessHoursDTO {
  businessHours: BusinessHour[];
  holidays: Holiday[];
  confirmAffected: boolean;
  actorId: string;
}

export interface ImpactedAppointmentDTO {
  id: string;
  start: string;
  end: string;
  status: AppointmentStatus;
  customerName: string;
  barberName: string;
}

export interface SaveBusinessHoursResponseDTO {
  businessHours: BusinessHour[];
  holidays: Holiday[];
  impactedAppointments: ImpactedAppointmentDTO[];
}

export function toImpactedAppointment(appointment: UpcomingAppointment): ImpactedAppointmentDTO {
  return {
    id: appointment.id,
    start: appointment.start.toISOString(),
    end: appointment.end.toISOString(),
    status: appointment.status,
    customerName: appointment.customerName,
    barberName: appointment.barberName,
  };
}
