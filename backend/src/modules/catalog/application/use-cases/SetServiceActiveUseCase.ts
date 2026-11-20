import { SetServiceActiveDTO, SetServiceActiveResponseDTO } from '@/modules/catalog/application/dtos/SetServiceActiveDTO';
import { IServiceRepository } from '@/modules/catalog/domain/repositories/ServiceRepositoryInterface';

import { Either, left, right } from '@/shared/core/Either';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';

export type SetServiceActiveOutput = Either<NotFoundError, SetServiceActiveResponseDTO>;

export class SetServiceActiveUseCase implements IUseCase<SetServiceActiveDTO, SetServiceActiveOutput> {
  constructor(
    private readonly serviceRepository: IServiceRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute({ id, active, actorId }: SetServiceActiveDTO): Promise<SetServiceActiveOutput> {
    const service = await this.serviceRepository.findById(id);
    if (!service) return left(new NotFoundError('Serviço'));
   
    if(service.active === active) return right({ id: service.id, active: service.active });
    
    service.setActive(active);
    await this.serviceRepository.updateActive(service);

    await this.auditLogger.log({ actorId, action: 'catalog.service.active', entity: 'services', entityId: service.id, details: { active } });

    return right({ id: service.id, active: service.active });
  }
}
