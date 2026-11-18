import { User, UserProps } from '@/modules/users/domain/entities/User';
import { UserEntity } from '@/modules/users/infra/database/typeorm/entities/UserEntity';

export class UserMapper {
  static toDomain(entity: UserEntity): User {
    const props: UserProps = {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      phone: entity.phone,
      role: entity.role,
      passwordHash: entity.passwordHash,
      cpf: entity.cpf,
      birthDate: entity.birthDate ? new Date(`${entity.birthDate}T00:00:00.000Z`) : null,
      addresses: entity.addresses ?? [],
      tags: entity.tags ?? [],
      referralSource: entity.referralSource,
      avatar: entity.avatar,
      permissions: entity.permissions ?? [],
      active: entity.active,
      guest: entity.guest,
      tokenVersion: entity.tokenVersion,
      lastAccessAt: entity.lastAccessAt,
      consent: entity.consent
        ? {
            reminders: entity.consent.reminders,
            marketing: entity.consent.marketing,
            at: new Date(entity.consent.at),
          }
        : null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    return User.restore(props);
  }

  static toPersistence(user: User): Partial<UserEntity> {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      passwordHash: user.passwordHash,
      cpf: user.cpf,
      birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : null,
      addresses: user.addresses,
      tags: user.tags,
      referralSource: user.referralSource,
      avatar: user.avatar,
      permissions: user.permissions,
      active: user.active,
      guest: user.guest,
      tokenVersion: user.tokenVersion,
      lastAccessAt: user.lastAccessAt,
      consent: user.consent,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
