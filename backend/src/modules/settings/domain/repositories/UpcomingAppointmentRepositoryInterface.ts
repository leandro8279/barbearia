import type { AppointmentStatus } from '@/modules/appointments/domain/entities/Appointment';

export interface UpcomingAppointment {
  id: string;
  start: Date;
  end: Date;
  status: AppointmentStatus;
  customerName: string;
  barberName: string;
}

export interface IUpcomingAppointmentRepository {
  findActiveAfter(now: Date): Promise<UpcomingAppointment[]>;
}
