import type { NotificationType } from '@/modules/settings/domain/entities/Notification';
import {
    IMessageTemplateRepository
} from '@/modules/settings/domain/repositories/MessageTemplateRepositoryInterface';
import { MessageTemplateEntity } from '@/modules/settings/infra/entities/MessageTemplateEntity';

import { DataSource, Repository } from 'typeorm';

export class TypeOrmMessageTemplateRepository implements IMessageTemplateRepository {
  private readonly repository: Repository<MessageTemplateEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(MessageTemplateEntity);
  }

  async findTextsByType(): Promise<Partial<Record<NotificationType, string>>> {
    const rows = await this.repository.find();

    return Object.fromEntries(rows.map(({ type, text }) => [type, text])) as Partial<Record<NotificationType, string>>;
  }
}
