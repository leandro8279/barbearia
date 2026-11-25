import { Column, Entity } from 'typeorm';

@Entity('tabs')
export class TabEntity {
  status!: TabStatus;

  @Column({ type: 'integer', default: 0 })
  discount!: number;

  @Column({ type: 'integer', default: 0 })
  tip!: number;

  @Column({ type: 'datetime', name: 'closed_at', nullable: true })
  closedAt!: Date;
}
