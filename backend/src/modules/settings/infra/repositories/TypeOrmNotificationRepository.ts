import { AppointmentEntity } from '@/modules/appointments/infra/entities/AppointmentEntity';
import { BarberEntity } from '@/modules/catalog/infra/entities/BarberEntity';
import {
    INotificationRepository, NotificationAppointmentContext
} from '@/modules/settings/domain/repositories/NotificationRepositoryInterface';
import { NotificationEntity } from '@/modules/settings/infra/entities/NotificationEntity';
import { NotificationMapper } from '@/modules/settings/infra/mappers/NotificationMapper';
import { UserEntity } from '@/modules/users/infra/entities/UserEntity';

import { DataSource, In, Repository } from 'typeorm';

import type { Notification, NotificationLogEntry } from '@/modules/settings/domain/entities/Notification';
const unique = <T>(values: Array<T | null | undefined>): T[] => [...new Set(values.filter((value): value is T => value != null))];

export class TypeOrmNotificationRepository implements INotificationRepository {
  private readonly notifications: Repository<NotificationEntity>;
  private readonly appointments: Repository<AppointmentEntity>;
  private readonly barbers: Repository<BarberEntity>;
  private readonly users: Repository<UserEntity>;

  constructor(dataSource: DataSource) {
    this.notifications = dataSource.getRepository(NotificationEntity);
    this.appointments = dataSource.getRepository(AppointmentEntity);
    this.barbers = dataSource.getRepository(BarberEntity);
    this.users = dataSource.getRepository(UserEntity);
  }

  async findRecent(limit: number): Promise<NotificationLogEntry[]> {
    const rows = await this.notifications.find({ order: { scheduledAt: 'DESC', createdAt: 'DESC', id: 'ASC' }, take: limit });
    if (!rows.length) return [];

    const appointmentIds = unique(rows.map((row) => row.appointmentId));
    const appointments = appointmentIds.length
      ? await this.appointments.find({ where: { id: In(appointmentIds) }, select: { id: true, start: true, barberId: true } })
      : [];

    const barbers = appointments.length
      ? await this.barbers.find({ where: { id: In(unique(appointments.map((a) => a.barberId))) }, select: { id: true, userId: true, slug: true } })
      : [];

    const users = await this.users.find({
      where: { id: In(unique([...rows.map((row) => row.userId), ...barbers.map((barber) => barber.userId)])) },
      select: { id: true, name: true, phone: true, email: true },
    });

    const appointmentById = new Map(appointments.map((appointment) => [appointment.id, appointment]));
    const barberById = new Map(barbers.map((barber) => [barber.id, barber]));
    const userById = new Map(users.map((user) => [user.id, user]));

    return rows.map((row) => {
      const appointment = row.appointmentId ? appointmentById.get(row.appointmentId) : undefined;
      const barber = appointment ? barberById.get(appointment.barberId) : undefined;
      const barberUser = barber ? userById.get(barber.userId) : undefined;

      return NotificationMapper.toLogEntry(row, {
        customer: userById.get(row.userId),
        appointmentStart: appointment?.start,
        barberName: barberUser?.name || barber?.slug,
      });
    });
  }

  async findById(id: string): Promise<Notification | null> {
    const entity = await this.notifications.findOneBy({ id });

    return entity ? NotificationMapper.toDomain(entity) : null;
  }

  async create(notification: Notification): Promise<void> {
    await this.notifications.insert(NotificationMapper.toPersistence(notification));
  }

  async findAppointmentContext(appointmentId: string): Promise<NotificationAppointmentContext | null> {
    const appointment = await this.appointments.findOne({ where: { id: appointmentId }, select: { id: true, start: true, barberId: true } });
    if (!appointment) return null;

    const barber = await this.barbers.findOne({ where: { id: appointment.barberId }, select: { id: true, userId: true } });
    const barberUser = barber ? await this.users.findOne({ where: { id: barber.userId }, select: { id: true, name: true } }) : null;

    return { start: appointment.start, barberName: barberUser?.name ?? '' };
  }
}
