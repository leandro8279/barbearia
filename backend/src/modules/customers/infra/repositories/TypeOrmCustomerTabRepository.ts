import {
    CustomerTabRecord, ICustomerTabRepository
} from '@/modules/customers/domain/repositories/CustomerTabRepositoryInterface';
import { TabEntity } from '@/modules/tabs/infra/entities/TabEntity';
import { TabItemEntity } from '@/modules/tabs/infra/entities/TabItemEntity';

import { DataSource, In, Repository } from 'typeorm';

export class TypeOrmCustomerTabRepository implements ICustomerTabRepository {
  private readonly tabs: Repository<TabEntity>;
  private readonly items: Repository<TabItemEntity>;

  constructor(dataSource: DataSource) {
    this.tabs = dataSource.getRepository(TabEntity);
    this.items = dataSource.getRepository(TabItemEntity);
  }

  async findClosedByCustomer(customerId: string): Promise<CustomerTabRecord[]> {
    const tabs = await this.tabs.findBy({ customerId, status: 'closed' });
    if (!tabs.length) return [];

    const items = await this.items.findBy({ tabId: In(tabs.map((tab) => tab.id)) });
    const itemsByTab = Map.groupBy(items, (item) => item.tabId);

    return tabs
      .map((tab) => {
        const tabItems = itemsByTab.get(tab.id) ?? [];

        return {
          id: tab.id,
          appointmentId: tab.appointmentId,
          date: tab.closedAt ?? tab.createdAt,

          totalCents: tabItems.reduce((sum, item) => sum + item.qty * item.unitPrice - item.discount, 0),
          items: tabItems.map(({ name, qty }) => ({ name, qty })),
          payments: [],
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
