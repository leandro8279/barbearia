import type { ProductKind } from '@/modules/catalog/domain/entities/Product';
import { ProductCategoryEntity } from '@/modules/catalog/infra/entities/ProductCategoryEntity';

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('products')
@Index('UQ_products_sku', ['sku'], { unique: true })
@Index('IDX_products_category', ['categoryId'])
export class ProductEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 60 })
  sku!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 36, name: 'category_id' })
  categoryId!: string;

  @ManyToOne(() => ProductCategoryEntity, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'category_id' })
  category!: ProductCategoryEntity;

  @Column({ type: 'integer', default: 0 })
  price!: number;

  @Column({ type: 'integer', name: 'cost_cents', default: 0 })
  costCents!: number;

  @Column({ type: 'integer', default: 0 })
  stock!: number;

  @Column({ type: 'integer', name: 'min_stock', default: 0 })
  minStock!: number;

  @Column({ type: 'varchar', length: 20, default: 'resale' })
  kind!: ProductKind;

  @Column({ type: 'integer', name: 'commission_pct', default: 0 })
  commissionPct!: number;

  @Column({ type: 'varchar', default: '' })
  image!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
