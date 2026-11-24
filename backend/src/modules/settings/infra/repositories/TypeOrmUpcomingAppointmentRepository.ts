import { ACTIVE_APPOINTMENT_STATUSES } from '@/modules/appointments/domain/entities/Appointment';
import { AppointmentEntity } from '@/modules/appointments/infra/entities/AppointmentEntity';
import { BarberEntity } from '@/modules/catalog/infra/entities/BarberEntity';
import { IUpcomingAppointmentRepository, UpcomingAppointment } from '@/modules/settings/domain/repositories/UpcomingAppointmentRepositoryInterface';
import { UserEntity } from '@/modules/users/infra/entities/UserEntity';

import { DataSource, In, MoreThan } from 'typeorm';

export class TypeOrmUpcomingAppointmentRepository implements IUpcomingAppointmentRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findActiveAfter(now: Date): Promise<UpcomingAppointment[]> {
    const appointments = await this.dataSource.getRepository(AppointmentEntity).find({
      where: { status: In([...ACTIVE_APPOINTMENT_STATUSES]), start: MoreThan(now) },
      order: { start: 'ASC' },
    });
    if (!appointments.length) return [];

    const barbers = await this.dataSource.getRepository(BarberEntity).findBy({ id: In([...new Set(appointments.map((a) => a.barberId))]) });
    const userIds = new Set([...appointments.map((a) => a.customerId), ...barbers.map((b) => b.userId)]);
    const users = await this.dataSource.getRepository(UserEntity).find({ where: { id: In([...userIds]) }, select: { id: true, name: true } });

    const nameByUserId = new Map(users.map((user) => [user.id, user.name]));
    const userIdByBarberId = new Map(barbers.map((barber) => [barber.id, barber.userId]));

    return appointments.map((appointment) => ({
      id: appointment.id,
      start: appointment.start,
      end: appointment.end,
      status: appointment.status,
      customerName: nameByUserId.get(appointment.customerId) || 'Cliente',
      barberName: nameByUserId.get(userIdByBarberId.get(appointment.barberId) ?? '') || 'Profissional',
    }));
  }
}
