import { SetServiceActiveUseCase } from '@/modules/catalog/application/use-cases/SetServiceActiveUseCase';
import { Service } from '@/modules/catalog/domain/entities/Service';
import { ServiceCategory } from '@/modules/catalog/domain/entities/ServiceCategory';

import { describe, expect, it, vi } from 'vitest';

import { InMemoryServiceRepository } from '../fakes/InMemoryServiceRepository';

const now = new Date();

const makeService = (active = true) =>
  Service.restore({
    id: 'svc-1',
    name: 'Corte infantil',
    slug: 'corte-infantil',
    category: ServiceCategory.restore({ id: 'cat-1', name: 'Cortes', slug: 'cortes', order: 1 }),
    description: '',
    image: '',
    durationMin: 40,
    bufferMin: 0,
    price: 6000,
    commissionPct: 45,
    active,
    featured: false,
    createdAt: now,
    updatedAt: now,
  });

function makeSut() {
  const services = new InMemoryServiceRepository();
  const auditLogger = { log: vi.fn(async () => {}) };
  const sut = new SetServiceActiveUseCase(services, auditLogger);

  return { services, auditLogger, sut };
}

describe('SetServiceActiveUseCase', () => {
  it('desativa o serviço e audita', async () => {
    const { services, auditLogger, sut } = makeSut();
    const service = makeService(true);
    services.items.push(service);

    const result = await sut.execute({ id: 'svc-1', active: false, actorId: 'user-1' });

    if (result.isLeft()) throw result.value;
    expect(result.value).toEqual({ id: 'svc-1', active: false });
    expect(service.active).toBe(false);
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'catalog.service.active', actorId: 'user-1', entityId: 'svc-1', details: { active: false } }),
    );
  });

  it('reativa o serviço', async () => {
    const { services, sut } = makeSut();
    const service = makeService(false);
    services.items.push(service);

    const result = await sut.execute({ id: 'svc-1', active: true, actorId: 'user-1' });

    expect(result.isRight()).toBe(true);
    expect(service.active).toBe(true);
  });

  it('devolve Left(NotFoundError) quando o serviço não existe e não audita', async () => {
    const { auditLogger, sut } = makeSut();

    const result = await sut.execute({ id: 'inexistente', active: false, actorId: 'user-1' });

    expect(result.value).toMatchObject({ statusCode: 404 });
    expect(auditLogger.log).not.toHaveBeenCalled();
  });
});
