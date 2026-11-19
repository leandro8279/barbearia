import { randomUUID } from 'node:crypto';

export type UserRole = 'admin' | 'customer' | 'barber' | 'reception' | 'manager';

export interface UserAddress {
  id?: string;
  name?: string;
  street?: string;
  number?: string;
  complement?: string | null;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  [key: string]: unknown;
}

export interface UserConsent {
  reminders: boolean;
  marketing: boolean;
  at: Date;
}

export interface UserProps {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  passwordHash: string | null;
  cpf: string | null;
  birthDate: Date | null;
  addresses: UserAddress[];
  tags: string[];
  referralSource: string | null;
  avatar: string | null;
  permissions: string[];
  active: boolean;
  guest: boolean;
  tokenVersion: number;
  lastAccessAt: Date | null;
  consent: UserConsent | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  name: string;
  email?: string | null;
  passwordHash?: string | null;
  phone?: string | null;
  role?: UserRole;
  cpf?: string | null;
  birthDate?: Date | null;
  addresses?: UserAddress[];
  tags?: string[];
  referralSource?: string | null;
  avatar?: string | null;
  permissions?: string[];
  active?: boolean;
  guest?: boolean;
  tokenVersion?: number;
  lastAccessAt?: Date | null;
  consent?: UserConsent | null;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(input: CreateUserInput): User {
    const now = new Date();

    return new User({
      id: randomUUID(),
      name: input.name.trim(),
      email: input.email?.trim().toLowerCase() ?? null,
      phone: input.phone ?? null,
      role: input.role ?? 'customer',
      passwordHash: input.passwordHash ?? null,
      cpf: input.cpf ?? null,
      birthDate: input.birthDate ?? null,
      addresses: input.addresses ?? [],
      tags: input.tags ?? [],
      referralSource: input.referralSource ?? null,
      avatar: input.avatar ?? null,
      permissions: input.permissions ?? [],
      active: input.active ?? true,
      guest: input.guest ?? false,
      tokenVersion: input.tokenVersion ?? 0,
      lastAccessAt: input.lastAccessAt ?? null,
      consent: input.consent ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: UserProps): User {
    return new User({
      ...props,
      addresses: [...props.addresses],
      tags: [...props.tags],
      permissions: [...props.permissions],
      consent: props.consent ? { ...props.consent } : null,
    });
  }

  completeRegistration(input: {
    name: string;
    email: string;
    phone: string;
    passwordHash: string;
    birthDate: Date | null;
    consent: UserConsent;
  }): void {
    if (!this.props.guest) throw new Error('Apenas convidados podem concluir o cadastro');

    Object.assign(this.props, {
      name: input.name.trim(),
      email: input.email?.trim().toLowerCase() ?? null,
      phone: input.phone,
      passwordHash: input.passwordHash ?? null,
      birthDate: input.birthDate,
      consent: input.consent,
      guest: false,
      updatedAt: new Date(),
    });
  }

  revokeTokens(): void {
    this.props.tokenVersion += 1;
    this.props.updatedAt = new Date();
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get email(): string | null {
    return this.props.email;
  }

  get phone(): string | null {
    return this.props.phone;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get passwordHash(): string | null {
    return this.props.passwordHash;
  }

  get cpf(): string | null {
    return this.props.cpf;
  }

  get birthDate(): Date | null {
    return this.props.birthDate;
  }

  get addresses(): UserAddress[] {
    return [...this.props.addresses];
  }

  get tags(): string[] {
    return [...this.props.tags];
  }

  get referralSource(): string | null {
    return this.props.referralSource;
  }

  get avatar(): string | null {
    return this.props.avatar;
  }

  get permissions(): string[] {
    return [...this.props.permissions];
  }

  get active(): boolean {
    return this.props.active;
  }

  get guest(): boolean {
    return this.props.guest;
  }

  get tokenVersion(): number {
    return this.props.tokenVersion;
  }

  get lastAccessAt(): Date | null {
    return this.props.lastAccessAt;
  }

  get consent(): UserConsent | null {
    return this.props.consent ? { ...this.props.consent } : null;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
