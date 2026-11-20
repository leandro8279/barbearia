import { GetAdminServiceUseCase } from '@/modules/catalog/application/use-cases/GetAdminServiceUseCase';
import { Barber, BarberServiceLink } from '@/modules/catalog/domain/entities/Barber';
import { Service } from '@/modules/catalog/domain/entities/Service';
import { ServiceCategory } from '@/modules/catalog/domain/entities/ServiceCategory';

import { describe, expect, it } from 'vitest';

import { InMemoryBarberRepository } from '../fakes/InMemoryBarberRepository';
import { InMemoryServiceRepository } from '../fakes/InMemoryServiceRepository';

const now = new Date();

const makeService = (id = 'svc-1') =>
  Service.restore({
    id,
    name: 'Corte infantil',
    slug: 'corte-infantil',
    category: ServiceCategory.restore({ id: 'cat-1', name: 'Cortes', slug: 'cortes', order: 1 }),
    description: '',
    image: '',
    durationMin: 40,
    bufferMin: 0,
    price: 6000,
    commissionPct: 45,
    active: true,
    featured: false,
    createdAt: now,
    updatedAt: now,
  });

const makeBarber = (id: string, name: string, serviceLinks: BarberServiceLink[] = [], active = true) =>
  Barber.restore({
    id,
    userId: `user-${id}`,
    name,
    slug: name.toLowerCase(),
    bio: '',
    specialties: [],
    commissionServicePct: 45,
    commissionProductPct: 10,
    photo: null,
    pixKey: null,
    active,
    serviceLinks,
  });

function makeSut() {
  const services = new InMemoryServiceRepository();
  const barbers = new InMemoryBarberRepository();
  const sut = new GetAdminServiceUseCase(services, barbers);

  return { services, barbers, sut };
}

describe('GetAdminServiceUseCase', () => {
  it('devolve Left(NotFoundError) quando o serviço não existe', async () => {
    const { sut } = makeSut();

    const result = await sut.execute({ id: 'inexistente' });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toMatchObject({ statusCode: 404 });
  });

  it('devolve o serviço com a categoria achatada', async () => {
    const { services, sut } = makeSut();
    services.items.push(makeService());

    const result = await sut.execute({ id: 'svc-1' });

    if (result.isLeft()) throw result.value;
    expect(result.value).toMatchObject({ id: 'svc-1', categoryId: 'cat-1', categoryName: 'Cortes', price: 6000 });
  });

  it('barbeiro sem vínculos aparece como atribuído; com vínculo a outro serviço, não', async () => {
    const { services, barbers, sut } = makeSut();
    services.items.push(makeService());
    barbers.items.push(
      makeBarber('b1', 'Rafael'),
      makeBarber('b2', 'Bruno', [{ serviceId: 'svc-1', commissionPct: 48 }]),
      makeBarber('b3', 'Diego', [{ serviceId: 'outro', commissionPct: 42 }]),
    );

    const result = await sut.execute({ id: 'svc-1' });

    if (result.isLeft()) throw result.value;
    expect(result.value.barberAssignments).toEqual([
      expect.objectContaining({ name: 'Bruno', assigned: true, commissionPct: 48 }),
      expect.objectContaining({ name: 'Diego', assigned: false, commissionPct: null }),
      expect.objectContaining({ name: 'Rafael', assigned: true, commissionPct: null }),
    ]);
  });

  it('ignora barbeiros inativos', async () => {
    const { services, barbers, sut } = makeSut();
    services.items.push(makeService());
    barbers.items.push(makeBarber('b1', 'Rafael', [], false));

    const result = await sut.execute({ id: 'svc-1' });

    if (result.isLeft()) throw result.value;
    expect(result.value.barberAssignments).toHaveLength(0);
  });
});
