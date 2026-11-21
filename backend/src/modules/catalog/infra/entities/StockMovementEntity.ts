import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

import type { StockMovementType } from '@/modules/catalog/domain/entities/StockMovement';

@Entity('stock_movements')
@Index('IDX_stock_movements_product', ['productId'])
export class StockMovementEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36, name: 'product_id' })
  productId!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: StockMovementType;

  @Column({ type: 'integer' })
  qty!: number;

  @Column({ type: 'varchar', length: 200 })
  reason!: string;

  @Column({ type: 'varchar', length: 36, name: 'user_id', nullable: true })
  userId!: string | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
