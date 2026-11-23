import { AppDataSource, connectDatabase, disconnectDatabase } from '@/config/database';
import { env } from '@/config/env';
import { logger } from '@/config/logger';

import { Product } from '@/modules/catalog/domain/entities/Product';
import { ProductCategory } from '@/modules/catalog/domain/entities/ProductCategory';
import { Service } from '@/modules/catalog/domain/entities/Service';
import { ServiceCategory } from '@/modules/catalog/domain/entities/ServiceCategory';
import { BarberEntity } from '@/modules/catalog/infra/entities/BarberEntity';
import { ProductCategoryEntity } from '@/modules/catalog/infra/entities/ProductCategoryEntity';
import { ProductEntity } from '@/modules/catalog/infra/entities/ProductEntity';
import { ServiceCategoryEntity } from '@/modules/catalog/infra/entities/ServiceCategoryEntity';
import { ServiceEntity } from '@/modules/catalog/infra/entities/ServiceEntity';
import { ProductMapper } from '@/modules/catalog/infra/mappers/ProductMapper';
import { ServiceMapper } from '@/modules/catalog/infra/mappers/ServiceMapper';
import { SettingsEntity } from '@/modules/settings/infra/entities/SettingsEntity';
import { UnitEntity } from '@/modules/settings/infra/entities/UnitEntity';
import { CreateUserInput, User } from '@/modules/users/domain/entities/User';
import { UserEntity } from '@/modules/users/infra/entities/UserEntity';
import { UserMapper } from '@/modules/users/infra/mappers/UserMapper';

import { BcryptHashProvider } from '@/shared/providers/hash/BcryptHashProvider';

import { randomUUID } from 'node:crypto';
import 'reflect-metadata';

import type { EntityTarget, FindOptionsWhere, ObjectLiteral, QueryDeepPartialEntity } from 'typeorm';

const isProd = env.NODE_ENV === 'production';
const hasher = new BcryptHashProvider();

async function ensure<T extends ObjectLiteral>(target: EntityTarget<T>, where: FindOptionsWhere<T>, data: QueryDeepPartialEntity<T>): Promise<T> {
  const repo = AppDataSource.getRepository(target);
  const found = await repo.findOneBy(where);
  if (found) return found;

  await repo.insert(data);
  return repo.findOneByOrFail(where);
}

async function ensureUser(input: CreateUserInput & { email: string }, password: string): Promise<UserEntity> {
  const repo = AppDataSource.getRepository(UserEntity);
  const existing = await repo.findOneBy({ email: input.email.toLowerCase() });
  if (existing) return existing;

  const user = User.create({ ...input, passwordHash: await hasher.hash(password) });
  await repo.insert(UserMapper.toPersistence(user) as QueryDeepPartialEntity<UserEntity>);

  return repo.findOneByOrFail({ id: user.id });
}

async function seedUnit(): Promise<void> {
  const weekdays = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, ranges: [{ start: '08:00', end: '20:00' }] }));
  const holidays = [2026, 2027].flatMap((year) =>
    [
      ['01-01', 'Confraternização Universal'],
      ['04-21', 'Tiradentes'],
      ['05-01', 'Dia do Trabalho'],
      ['09-07', 'Independência do Brasil'],
      ['12-25', 'Natal'],
    ].map(([monthDay, name]) => ({ date: `${year}-${monthDay}`, name, closed: true, ranges: [] })),
  );

  const unit = await ensure(
    UnitEntity,
    { name: 'Barbearia Estação' },
    {
      id: randomUUID(),
      name: 'Barbearia Estação',
      address: 'Rua das Palmeiras, 120, Centro, São Paulo - SP, 01001-000',
      addressDetails: {
        zip: '01001-000',
        street: 'Rua das Palmeiras',
        number: '120',
        complement: '',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        reference: '',
      },
      phone: '(11) 3333-1212',
      whatsapp: '551133331212',
      logo: null,
      amenities: ['Wi-Fi', 'Café', 'Acessível'],
      photos: ['/seed/barber-1.svg'],
      businessHours: weekdays,
      holidays,
    },
  );

  await ensure(
    SettingsEntity,
    { unitId: unit.id },
    {
      id: randomUUID(),
      unitId: unit.id,
      business: {
        name: 'Barbearia Estação',
        cnpj: '',
        email: 'contato@barbearia.test',
        socials: { instagram: '', facebook: '', tiktok: '', website: '' },
        timezone: 'America/Sao_Paulo',
      },
      booking: {},
      notifications: {},
    },
  );
}

async function seedAdmin(): Promise<void> {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@barbearia.local').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? (isProd ? '' : 'admin-dev-123');
  if (password.length < 8) throw new Error('Defina SEED_ADMIN_PASSWORD com no mínimo 8 caracteres');

  await ensureUser({ name: 'Administrador', email, role: 'admin' }, password);
}

async function seedCategories() {
  const serviceCategory = await ensure(ServiceCategoryEntity, { slug: 'cortes' }, { id: randomUUID(), name: 'Cortes', slug: 'cortes', order: 1 });
  await ensure(ServiceCategoryEntity, { slug: 'barba' }, { id: randomUUID(), name: 'Barba', slug: 'barba', order: 2 });
  const productCategory = await ensure(ProductCategoryEntity, { slug: 'cabelo' }, { id: randomUUID(), name: 'Cabelo', slug: 'cabelo' });

  return { serviceCategory, productCategory };
}

async function seedDemo(serviceCategory: ServiceCategoryEntity, productCategory: ProductCategoryEntity): Promise<void> {
  const barbers = [
    { name: 'Rafael Nogueira', slug: 'rafael', email: 'rafael@barbearia.local', phone: '62999990001' },
    { name: 'Bruno Alves', slug: 'bruno', email: 'bruno@barbearia.local', phone: '62999990002' },
  ];

  for (const b of barbers) {
    const user = await ensureUser({ name: b.name, email: b.email, phone: b.phone, role: 'barber' }, 'barber-dev-123');

    await ensure(
      BarberEntity,
      { slug: b.slug },
      {
        id: randomUUID(),
        userId: user.id,
        slug: b.slug,
        bio: '',
        specialties: [],
        commissionServicePct: 45,
        commissionProductPct: 10,
        photo: null,
        pixKey: null,
        active: true,
      },
    );
  }

  const category = ServiceCategory.restore({
    id: serviceCategory.id,
    name: serviceCategory.name,
    slug: serviceCategory.slug,
    order: serviceCategory.order,
  });

  const services = [
    { name: 'Corte masculino', slug: 'corte-masculino', durationMin: 40, price: 5000 },
    { name: 'Corte infantil', slug: 'corte-infantil', durationMin: 40, price: 6000 },
  ];

  for (const s of services) {
    const service = Service.create({ ...s, category, commissionPct: 45 });
    await ensure(ServiceEntity, { slug: s.slug }, ServiceMapper.toPersistence(service));
  }

  const productCat = ProductCategory.restore({ id: productCategory.id, name: productCategory.name, slug: productCategory.slug });

  const product = Product.create({
    sku: 'BAR-001',
    name: 'Pomada matte',
    category: productCat,
    price: 3500,
    costCents: 1800,
    stock: 30,
    minStock: 5,
    kind: 'resale',
    commissionPct: 10,
  });
  await ensure(ProductEntity, { sku: 'BAR-001' }, ProductMapper.toPersistence(product));
}

async function main(): Promise<void> {
  await connectDatabase(); // já aplica as migrations pendentes

  await seedAdmin();
  const { serviceCategory, productCategory } = await seedCategories();
  if (!isProd) await seedDemo(serviceCategory, productCategory);

  logger.info('Seed concluído');
}

main()
  .then(() => disconnectDatabase())
  .catch(async (err) => {
    logger.error({ err }, 'Falha no seed');
    await disconnectDatabase();
    process.exit(1);
  });
