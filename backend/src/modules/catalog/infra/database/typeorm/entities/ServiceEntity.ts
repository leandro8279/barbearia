import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { ServiceCategoryEntity } from '@/modules/catalog/infra/database/typeorm/entities/ServiceCategoryEntity';

@Entity('services')
@Index('UQ_services_slug', ['slug'], { unique: true })
@Index('IDX_services_category', ['categoryId'])
export class ServiceEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 140 })
  slug!: string;

  @Column({ type: 'varchar', length: 36, name: 'category_id' })
  categoryId!: string;

  @ManyToOne(() => ServiceCategoryEntity, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'category_id' })
  category!: ServiceCategoryEntity;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'varchar', default: '' })
  image!: string;

  @Column({ type: 'integer', name: 'duration_min' })
  durationMin!: number;

  @Column({ type: 'integer', name: 'buffer_min', default: 0 })
  bufferMin!: number;

  /** Em centavos (6000 = R$ 60,00). */
  @Column({ type: 'integer' })
  price!: number;

  @Column({ type: 'integer', name: 'commission_pct', default: 0 })
  commissionPct!: number;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'boolean', default: false })
  featured!: boolean;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
