import { CreateServiceUseCase } from '@/modules/catalog/application/use-cases/CreateServiceUseCase';
import { Barber } from '@/modules/catalog/domain/entities/Barber';
import { ServiceCategory } from '@/modules/catalog/domain/entities/ServiceCategory';

import { describe, expect, it, vi } from 'vitest';

import { InMemoryBarberRepository } from '../fakes/InMemoryBarberRepository';
import { InMemoryServiceCategoryRepository } from '../fakes/InMemoryServiceCategoryRepository';
import { InMemoryServiceRepository } from '../fakes/InMemoryServiceRepository';

const makeBarber = (id: string, active = true) =>
  Barber.restore({
    id,
    userId: `user-${id}`,
    name: `Barbeiro ${id}`,
    slug: `barbeiro-${id}`,
    bio: '',
    specialties: [],
    commissionServicePct: 45,
    commissionProductPct: 10,
    photo: null,
    pixKey: null,
    active,
    serviceLinks: [],
  });

const baseInput = {
  name: 'Corte infantil',
  categoryId: 'cat-1',
  description: '',
  image: '',
  durationMin: 40,
  bufferMin: 0,
  price: 6000,
  commissionPct: 45,
  active: true,
  featured: false,
  barberAssignments: [{ barberId: 'b1', commissionPct: 48 }],
  actorId: 'user-1',
};

function makeSut() {
  const services = new InMemoryServiceRepository();
  const categories = new InMemoryServiceCategoryRepository();
  const barbers = new InMemoryBarberRepository();
  const auditLogger = { log: vi.fn(async () => {}) };
  const sut = new CreateServiceUseCase(services, categories, barbers, auditLogger);

  categories.items.push(ServiceCategory.restore({ id: 'cat-1', name: 'Cortes', slug: 'cortes', order: 1 }));
  barbers.items.push(makeBarber('b1'), makeBarber('b2'));

  return { services, categories, barbers, auditLogger, sut };
}

describe('CreateServiceUseCase', () => {
  it('cria o serviço, grava os vínculos e audita', async () => {
    const { services, auditLogger, sut } = makeSut();

    const result = await sut.execute(baseInput);

    if (result.isLeft()) throw result.value;
    expect(result.value).toMatchObject({ name: 'Corte infantil', slug: 'corte-infantil', categoryName: 'Cortes', price: 6000, active: true });
    expect(services.items).toHaveLength(1);
    expect(services.assignments).toEqual([{ serviceId: result.value.id, barberId: 'b1', commissionPct: 48 }]);
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'catalog.service.create', actorId: 'user-1', entityId: result.value.id, details: { barberCount: 1 } }),
    );
  });

  it('usa a comissão do serviço quando o vínculo não define uma', async () => {
    const { services, sut } = makeSut();

    await sut.execute({ ...baseInput, barberAssignments: [{ barberId: 'b1', commissionPct: null }] });

    expect(services.assignments[0]).toMatchObject({ barberId: 'b1', commissionPct: 45 });
  });

  it('gera o slug a partir do nome, sem acentos e símbolos', async () => {
    const { sut } = makeSut();

    const result = await sut.execute({ ...baseInput, name: 'Barba & Bigode Clássico' });

    if (result.isLeft()) throw result.value;
    expect(result.value.slug).toBe('barba-bigode-classico');
  });

  it('devolve Left(422) quando a categoria não existe e não audita', async () => {
    const { services, auditLogger, sut } = makeSut();

    const result = await sut.execute({ ...baseInput, categoryId: 'inexistente' });

    expect(result.value).toMatchObject({ statusCode: 422, code: 'INVALID_SERVICE_CATEGORY' });
    expect(services.items).toHaveLength(0);
    expect(auditLogger.log).not.toHaveBeenCalled();
  });

  it('devolve Left(422) quando o profissional não existe ou está inativo', async () => {
    const { barbers, services, sut } = makeSut();
    barbers.items.push(makeBarber('b3', false));

    const unknown = await sut.execute({ ...baseInput, barberAssignments: [{ barberId: 'x', commissionPct: null }] });
    const inactive = await sut.execute({ ...baseInput, barberAssignments: [{ barberId: 'b3', commissionPct: null }] });

    expect(unknown.value).toMatchObject({ statusCode: 422, code: 'INVALID_BARBER_ASSIGNMENT' });
    expect(inactive.isLeft()).toBe(true);
    expect(services.items).toHaveLength(0);
  });

  it('devolve Left(409) quando o slug já existe', async () => {
    const { services, auditLogger, sut } = makeSut();
    await sut.execute(baseInput);

    const result = await sut.execute(baseInput);

    expect(result.value).toMatchObject({ statusCode: 409, code: 'SERVICE_SLUG_ALREADY_EXISTS' });
    expect(services.items).toHaveLength(1);
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
  });
});
