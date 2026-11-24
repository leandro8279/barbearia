import type { ImpactedAppointmentDTO } from '@/modules/settings/application/dtos/SaveBusinessHoursDTO';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { AppError } from '@/shared/errors/AppError';

export class ScheduleImpactsAppointmentsError extends AppError {
  constructor(impactedAppointments: ImpactedAppointmentDTO[]) {
    super(
      'A mudança afeta agendamentos futuros. Revise o impacto e confirme que vai remarcar esses horários.',
      HttpStatus.CONFLICT,
      'SCHEDULE_AFFECTS_APPOINTMENTS',
      { impactedAppointments },
    );
  }
}
