import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import type { UserAddress, UserConsent, UserRole } from '@/modules/users/domain/entities/User';

@Entity('users')
@Index('UQ_users_email', ['email'], { unique: true })
@Index('UQ_users_cpf', ['cpf'], { unique: true })
@Index('UQ_users_phone_registered', ['phone'], { unique: true, where: '"guest" = 0 AND "phone" IS NOT NULL' })
export class UserEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'customer' })
  role!: UserRole;

  @Column({ type: 'varchar', name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 14, nullable: true })
  cpf!: string | null;

  @Column({ type: 'date', name: 'birth_date', nullable: true })
  birthDate!: string | null;

  @Column({ type: 'simple-json', default: '[]' })
  addresses!: UserAddress[];

  @Column({ type: 'simple-json', default: '[]' })
  tags!: string[];

  @Column({ type: 'varchar', name: 'referral_source', nullable: true })
  referralSource!: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatar!: string | null;

  @Column({ type: 'simple-json', default: '[]' })
  permissions!: string[];

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'boolean', default: false })
  guest!: boolean;

  @Column({ type: 'integer', name: 'token_version', default: 0 })
  tokenVersion!: number;

  @Column({ type: 'datetime', name: 'last_access_at', nullable: true })
  lastAccessAt!: Date | null;

  @Column({ type: 'simple-json', nullable: true })
  consent!: UserConsent | null;

  @CreateDateColumn({ type: 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'updated_at' })
  updatedAt!: Date;
}
