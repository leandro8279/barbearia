import { GetAdminServiceResponseDTO, toGetAdminServiceResponse } from '@/modules/catalog/application/dtos/GetAdminServiceDTO';
import { UpdateServiceDTO } from '@/modules/catalog/application/dtos/UpdateServiceDTO';
import { InvalidBarberAssignmentError } from '@/modules/catalog/application/errors/InvalidBarberAssignmentError';
import { InvalidServiceCategoryError } from '@/modules/catalog/application/errors/InvalidServiceCategoryError';
import { ServiceSlugAlreadyExistsError } from '@/modules/catalog/application/errors/ServiceSlugAlreadyExistsError';
import { IBarberRepository } from '@/modules/catalog/domain/repositories/BarberRepositoryInterface';
import { IServiceCategoryRepository } from '@/modules/catalog/domain/repositories/ServiceCategoryRepositoryInterface';
import { IServiceRepository } from '@/modules/catalog/domain/repositories/ServiceRepositoryInterface';

import { Either, left, right } from '@/shared/core/Either';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';
import { slugify } from '@/shared/utils/slug';

export type UpdateServiceError = NotFoundError | InvalidServiceCategoryError | InvalidBarberAssignmentError | ServiceSlugAlreadyExistsError;
export type UpdateServiceOutput = Either<UpdateServiceError, GetAdminServiceResponseDTO>;

export class UpdateServiceUseCase implements IUseCase<UpdateServiceDTO, UpdateServiceOutput> {
  constructor(
    private readonly serviceRepository: IServiceRepository,
    private readonly categoryRepository: IServiceCategoryRepository,
    private readonly barberRepository: IBarberRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute({ id, actorId, barberAssignments, categoryId, slug, ...data }: UpdateServiceDTO): Promise<UpdateServiceOutput> {
    const service = await this.serviceRepository.findById(id);
    if (!service) return left(new NotFoundError('Serviço'));

    const category = await this.categoryRepository.findById(categoryId);
    if (!category) return left(new InvalidServiceCategoryError());

    const activeBarberIds = new Set((await this.barberRepository.findActive()).map((barber) => barber.id));
    if (barberAssignments.some(({ barberId }) => !activeBarberIds.has(barberId))) return left(new InvalidBarberAssignmentError());

    const finalSlug = slug || slugify(data.name);
    if (finalSlug !== service.slug) {
      const owner = await this.serviceRepository.findBySlug(finalSlug);
      if (owner && owner.id !== service.id) return left(new ServiceSlugAlreadyExistsError());
    }

    service.update({ ...data, slug: finalSlug, category });
    const assignments = barberAssignments.map(({ barberId, commissionPct }) => ({
      barberId,
      commissionPct: commissionPct ?? service.commissionPct,
    }));

    try {
      await this.serviceRepository.update(service, assignments);
    } catch (error) {
      if (error instanceof ServiceSlugAlreadyExistsError) return left(error);
      throw error;
    }

    await this.auditLogger.log({
      actorId,
      action: 'catalog.service.update',
      entity: 'services',
      entityId: service.id,
      details: { barberCount: assignments.length },
    });

    const barbers = await this.barberRepository.findActive();

    return right(toGetAdminServiceResponse(service, barbers));
  }
}
