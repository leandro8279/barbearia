import {
    CustomerNoteRecord, ICustomerNoteRepository
} from '@/modules/customers/domain/repositories/CustomerNoteRepositoryInterface';
import { CustomerNoteEntity } from '@/modules/customers/infra/entities/CustomerNoteEntity';

import { DataSource, Repository } from 'typeorm';

export class TypeOrmCustomerNoteRepository implements ICustomerNoteRepository {
  private readonly repository: Repository<CustomerNoteEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(CustomerNoteEntity);
  }

  async findByCustomer(customerId: string): Promise<CustomerNoteRecord[]> {
    const entities = await this.repository.find({ where: { userId: customerId }, order: { pinned: 'DESC', createdAt: 'DESC' } });

    return entities.map(({ id, type, text, pinned, createdAt }) => ({ id, type, text, pinned, createdAt }));
  }
}
