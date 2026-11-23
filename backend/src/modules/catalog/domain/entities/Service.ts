import type { ServiceCategory } from '@/modules/catalog/domain/entities/ServiceCategory';
import { randomUUID } from 'node:crypto';

export interface ServiceProps {
  id: string;
  name: string;
  slug: string;
  category: ServiceCategory;
  description: string;
  image: string;
  durationMin: number;
  bufferMin: number;
  price: number;
  commissionPct: number;
  active: boolean;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateServiceInput {
  name: string;
  slug: string;
  category: ServiceCategory;
  description?: string;
  image?: string;
  durationMin: number;
  bufferMin?: number;
  price: number;
  commissionPct: number;
  active?: boolean;
  featured?: boolean;
}

export interface UpdateServiceInput {
  name: string;
  slug: string;
  category: ServiceCategory;
  description: string;
  image: string;
  durationMin: number;
  bufferMin: number;
  price: number;
  commissionPct: number;
  active: boolean;
  featured: boolean;
}

export class Service {
  private constructor(private readonly props: ServiceProps) {}

  static create(input: CreateServiceInput): Service {
    const now = new Date();

    return new Service({
      id: randomUUID(),
      name: input.name.trim(),
      slug: input.slug,
      category: input.category,
      description: (input.description ?? '').trim(),
      image: input.image ?? '',
      durationMin: input.durationMin,
      bufferMin: input.bufferMin ?? 0,
      price: input.price,
      commissionPct: input.commissionPct,
      active: input.active ?? true,
      featured: input.featured ?? false,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: ServiceProps): Service {
    return new Service({ ...props });
  }

  update(input: UpdateServiceInput): void {
    Object.assign(this.props, {
      ...input,
      name: input.name.trim(),
      description: input.description.trim(),
      updatedAt: new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get category(): ServiceCategory {
    return this.props.category;
  }

  get categoryId(): string {
    return this.props.category.id;
  }

  get description(): string {
    return this.props.description;
  }

  get image(): string {
    return this.props.image;
  }

  get durationMin(): number {
    return this.props.durationMin;
  }

  get bufferMin(): number {
    return this.props.bufferMin;
  }

  get price(): number {
    return this.props.price;
  }

  get commissionPct(): number {
    return this.props.commissionPct;
  }

  get active(): boolean {
    return this.props.active;
  }

  get featured(): boolean {
    return this.props.featured;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  setActive(active: boolean): void {
    this.props.active = active;
    this.props.updatedAt = new Date();
  }
}
