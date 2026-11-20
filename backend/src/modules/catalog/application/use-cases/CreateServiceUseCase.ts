import { CreateServiceDTO } from '@/modules/catalog/application/dtos/CreateServiceDTO';
import { GetAdminServiceResponseDTO, toGetAdminServiceResponse } from '@/modules/catalog/application/dtos/GetAdminServiceDTO';
import { InvalidBarberAssignmentError } from '@/modules/catalog/application/errors/InvalidBarberAssignmentError';
import { InvalidServiceCategoryError } from '@/modules/catalog/application/errors/InvalidServiceCategoryError';
import { ServiceSlugAlreadyExistsError } from '@/modules/catalog/application/errors/ServiceSlugAlreadyExistsError';
import { Service } from '@/modules/catalog/domain/entities/Service';
import { IBarberRepository } from '@/modules/catalog/domain/repositories/BarberRepositoryInterface';
import { IServiceCategoryRepository } from '@/modules/catalog/domain/repositories/ServiceCategoryRepositoryInterface';
import { IServiceRepository } from '@/modules/catalog/domain/repositories/ServiceRepositoryInterface';

import { Either, left, right } from '@/shared/core/Either';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';
import { slugify } from '@/shared/utils/slug';

export type CreateServiceError = InvalidServiceCategoryError | InvalidBarberAssignmentError | ServiceSlugAlreadyExistsError;
export type CreateServiceOutput = Either<CreateServiceError, GetAdminServiceResponseDTO>;

export class CreateServiceUseCase implements IUseCase<CreateServiceDTO, CreateServiceOutput> {
  constructor(
    private readonly serviceRepository: IServiceRepository,
    private readonly categoryRepository: IServiceCategoryRepository,
    private readonly barberRepository: IBarberRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute({ actorId, barberAssignments, categoryId, slug, ...data }: CreateServiceDTO): Promise<CreateServiceOutput> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) return left(new InvalidServiceCategoryError());

    const activeBarberIds = new Set((await this.barberRepository.findActive()).map((barber) => barber.id));
    if (barberAssignments.some(({ barberId }) => !activeBarberIds.has(barberId))) return left(new InvalidBarberAssignmentError());

    const finalSlug = slug || slugify(data.name);
    if (await this.serviceRepository.findBySlug(finalSlug)) return left(new ServiceSlugAlreadyExistsError());

    const service = Service.create({ ...data, slug: finalSlug, category });
    const assignments = barberAssignments.map(({ barberId, commissionPct }) => ({
      barberId,
      commissionPct: commissionPct ?? service.commissionPct,
    }));

    try {
      await this.serviceRepository.create(service, assignments);
    } catch (error) {
      // Requisição concorrente criou o mesmo slug entre a checagem e o insert.
      if (error instanceof ServiceSlugAlreadyExistsError) return left(error);
      throw error;
    }

    await this.auditLogger.log({
      actorId,
      action: 'catalog.service.create',
      entity: 'services',
      entityId: service.id,
      details: { barberCount: assignments.length },
    });

    // Recarrega para a resposta refletir os vínculos recém-gravados.
    const barbers = await this.barberRepository.findActive();

    return right(toGetAdminServiceResponse(service, barbers));
  }
}
