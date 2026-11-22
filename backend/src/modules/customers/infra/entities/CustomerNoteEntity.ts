import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('customer_notes')
@Index('IDX_customer_notes_user', ['userId'])
export class CustomerNoteEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 20, default: 'general' })
  type!: string;

  @Column({ type: 'text' })
  text!: string;

  @Column({ type: 'boolean', default: false })
  pinned!: boolean;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
