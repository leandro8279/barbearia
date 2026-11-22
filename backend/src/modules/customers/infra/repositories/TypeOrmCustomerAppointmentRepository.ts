import { AppointmentEntity } from '@/modules/appointments/infra/entities/AppointmentEntity';
import { AppointmentItemEntity } from '@/modules/appointments/infra/entities/AppointmentItemEntity';
import { BarberEntity } from '@/modules/catalog/infra/entities/BarberEntity';
import {
    CustomerAppointmentRecord, ICustomerAppointmentRepository
} from '@/modules/customers/domain/repositories/CustomerAppointmentRepositoryInterface';

import { DataSource, In, Repository } from 'typeorm';

export class TypeOrmCustomerAppointmentRepository implements ICustomerAppointmentRepository {
  private readonly appointments: Repository<AppointmentEntity>;
  private readonly items: Repository<AppointmentItemEntity>;

  constructor(dataSource: DataSource) {
    this.appointments = dataSource.getRepository(AppointmentEntity);
    this.items = dataSource.getRepository(AppointmentItemEntity);
  }

  async findDoneVisitDates(customerId: string): Promise<Date[]> {
    const rows = await this.appointments.find({ where: { customerId, status: 'done' }, select: { id: true, start: true } });

    return rows.map((row) => row.start);
  }

  async findByCustomer(customerId: string, { barberUserId }: { barberUserId?: string }): Promise<CustomerAppointmentRecord[]> {
    const qb = this.appointments.createQueryBuilder('appointment').where('appointment.customerId = :customerId', { customerId });

    if (barberUserId) {
      qb.innerJoin(BarberEntity, 'barber', 'barber.id = appointment.barberId').andWhere('barber.userId = :barberUserId', { barberUserId });
    }

    const entities = await qb.orderBy('appointment.start', 'DESC').getMany();
    if (!entities.length) return [];

    const items = await this.items.findBy({ appointmentId: In(entities.map((entity) => entity.id)) });
    const itemsByAppointment = Map.groupBy(items, (item) => item.appointmentId);

    return entities.map((entity) => ({
      id: entity.id,
      code: entity.code,
      start: entity.start,
      end: entity.end,
      status: entity.status,
      items: (itemsByAppointment.get(entity.id) ?? []).map(({ name, price, durationMin }) => ({ name, price, durationMin })),
    }));
  }
}
