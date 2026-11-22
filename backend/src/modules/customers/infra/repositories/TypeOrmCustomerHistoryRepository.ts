import { AppointmentEntity } from '@/modules/appointments/infra/entities/AppointmentEntity';
import { AppointmentItemEntity } from '@/modules/appointments/infra/entities/AppointmentItemEntity';
import { BarberEntity } from '@/modules/catalog/infra/entities/BarberEntity';
import {
    CustomerAppointmentRecord, CustomerTabRecord, ICustomerHistoryRepository
} from '@/modules/customers/domain/repositories/CustomerHistoryRepositoryInterface';
import { TabEntity } from '@/modules/tabs/infra/entities/TabEntity';
import { TabItemEntity } from '@/modules/tabs/infra/entities/TabItemEntity';

import { DataSource, In, Repository } from 'typeorm';

export class TypeOrmCustomerHistoryRepository implements ICustomerHistoryRepository {
  private readonly appointments: Repository<AppointmentEntity>;
  private readonly appointmentItems: Repository<AppointmentItemEntity>;
  private readonly tabs: Repository<TabEntity>;
  private readonly tabItems: Repository<TabItemEntity>;

  constructor(dataSource: DataSource) {
    this.appointments = dataSource.getRepository(AppointmentEntity);
    this.appointmentItems = dataSource.getRepository(AppointmentItemEntity);
    this.tabs = dataSource.getRepository(TabEntity);
    this.tabItems = dataSource.getRepository(TabItemEntity);
  }

  async findDoneVisitDates(customerId: string): Promise<Date[]> {
    const rows = await this.appointments.find({ where: { customerId, status: 'done' }, select: { id: true, start: true } });

    return rows.map((row) => row.start);
  }

  async findAppointments(customerId: string, { barberUserId }: { barberUserId?: string }): Promise<CustomerAppointmentRecord[]> {
    const qb = this.appointments.createQueryBuilder('appointment').where('appointment.customerId = :customerId', { customerId });

    if (barberUserId) {
      qb.innerJoin(BarberEntity, 'barber', 'barber.id = appointment.barberId').andWhere('barber.userId = :barberUserId', { barberUserId });
    }

    const entities = await qb.orderBy('appointment.start', 'DESC').getMany();
    if (!entities.length) return [];

    const items = await this.appointmentItems.findBy({ appointmentId: In(entities.map((entity) => entity.id)) });
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

  async findClosedTabs(customerId: string): Promise<CustomerTabRecord[]> {
    const tabs = await this.tabs.findBy({ customerId, status: 'closed' });
    if (!tabs.length) return [];

    const items = await this.tabItems.findBy({ tabId: In(tabs.map((tab) => tab.id)) });
    const itemsByTab = Map.groupBy(items, (item) => item.tabId);

    return tabs
      .map((tab) => {
        const tabItems = itemsByTab.get(tab.id) ?? [];

        return {
          id: tab.id,
          appointmentId: tab.appointmentId,
          date: tab.closedAt ?? tab.createdAt,
          // ATENÇÃO: ver "Lacunas". Hoje o total vem da soma dos itens (sem gorjeta) e não há tabela de pagamentos.
          totalCents: tabItems.reduce((sum, item) => sum + item.qty * item.unitPrice - item.discount, 0),
          items: tabItems.map(({ name, qty }) => ({ name, qty })),
          payments: [],
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
