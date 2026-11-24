import { SaveBusinessHoursDTO, SaveBusinessHoursResponseDTO, toImpactedAppointment } from '@/modules/settings/application/dtos/SaveBusinessHoursDTO';
import { ScheduleImpactsAppointmentsError } from '@/modules/settings/application/errors/ScheduleImpactsAppointmentsError';
import { IUnitRepository } from '@/modules/settings/domain/repositories/UnitRepositoryInterface';
import { IUpcomingAppointmentRepository } from '@/modules/settings/domain/repositories/UpcomingAppointmentRepositoryInterface';
import { isOutsideSchedule, normalizeSchedule } from '@/modules/settings/domain/services/businessSchedule';

import { Either, left, right } from '@/shared/core/Either';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';

export type SaveBusinessHoursOutput = Either<NotFoundError | ScheduleImpactsAppointmentsError, SaveBusinessHoursResponseDTO>;

export class SaveBusinessHoursUseCase implements IUseCase<SaveBusinessHoursDTO, SaveBusinessHoursOutput> {
  constructor(
    private readonly unitRepository: IUnitRepository,
    private readonly appointmentRepository: IUpcomingAppointmentRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute({ businessHours, holidays, confirmAffected, actorId }: SaveBusinessHoursDTO): Promise<SaveBusinessHoursOutput> {
    const unit = await this.unitRepository.findPrimary();
    if (!unit) return left(new NotFoundError('Unidade'));

    const schedule = normalizeSchedule({ businessHours, holidays });

    const upcoming = await this.appointmentRepository.findActiveAfter(new Date());
    const impacted = upcoming
      .filter((appointment) => isOutsideSchedule(schedule, appointment))
      .map(toImpactedAppointment)
      .sort((a, b) => a.start.localeCompare(b.start));

    if (impacted.length && !confirmAffected) return left(new ScheduleImpactsAppointmentsError(impacted));

    unit.updateSchedule(schedule);
    await this.unitRepository.updateSchedule(unit);

    await this.auditLogger.log({
      actorId,
      action: 'settings.hours.update',
      entity: 'units',
      entityId: unit.id,
      details: { impactedAppointmentIds: impacted.map((appointment) => appointment.id) },
    });

    return right({ businessHours: unit.businessHours, holidays: unit.holidays, impactedAppointments: impacted });
  }
}
