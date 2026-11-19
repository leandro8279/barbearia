import { AuditLogEntity } from '@/shared/database/entities/AuditLogEntity';
import { AuditEntry, IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';

import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';

import type { Logger } from 'pino';

export class TypeOrmAuditLogger implements IAuditLogger {
  private readonly repository: Repository<AuditLogEntity>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: Logger,
  ) {
    this.repository = this.dataSource.getRepository(AuditLogEntity);
  }

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.repository.save(
        this.repository.create({
          id: randomUUID(),
          userId: entry.actorId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          details: entry.details ?? {},
        }),
      );
    } catch (err) {
      this.logger.error({ err, action: entry.action, entity: entry.entity, entityId: entry.entityId }, 'Falha ao gravar audit log');
    }
  }
}
