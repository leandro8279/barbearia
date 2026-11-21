import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('product_categories')
@Index('UQ_product_categories_slug', ['slug'], { unique: true })
export class ProductCategoryEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  slug!: string;
}
