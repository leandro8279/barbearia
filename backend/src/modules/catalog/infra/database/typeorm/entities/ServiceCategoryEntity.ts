import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('service_categories')
@Index('UQ_service_categories_slug', ['slug'], { unique: true })
export class ServiceCategoryEntity {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  slug!: string;

  @Column({ type: 'integer', name: 'sort_order', default: 0 })
  order!: number;
}
