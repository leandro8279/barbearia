import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('password_resets')
@Index('UQ_password_resets_token_hash', ['tokenHash'], { unique: true })
@Index('IDX_password_resets_user', ['userId'])
export class PasswordResetEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 64, name: 'token_hash' })
  tokenHash!: string;

  @Column({ type: 'datetime', name: 'expires_at' })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;
}
