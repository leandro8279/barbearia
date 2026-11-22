import { UpdateTeamMemberDTO } from '@/modules/team/application/dtos/UpdateTeamMemberDTO';
import { toUpdateTeamMemberResponse, UpdateTeamMemberResponseDTO } from '@/modules/team/application/dtos/UpdateTeamMemberResponseDTO';
import { LastActiveAdminError } from '@/modules/team/application/errors/LastActiveAdminError';
import { ITeamRepository } from '@/modules/team/domain/repositories/TeamRepositoryInterface';
import { IUserRepository } from '@/modules/users';

import { Either, left, right } from '@/shared/core/Either';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';
import { IAuditLogger } from '@/shared/providers/audit/AuditLoggerInterface';

export type UpdateTeamMemberOutput = Either<NotFoundError | LastActiveAdminError, UpdateTeamMemberResponseDTO>;

export class UpdateTeamMemberUseCase implements IUseCase<UpdateTeamMemberDTO, UpdateTeamMemberOutput> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly teamRepository: ITeamRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  async execute({ id, role, active, permissions, actorId }: UpdateTeamMemberDTO): Promise<UpdateTeamMemberOutput> {
    const member = await this.userRepository.findById(id);
    if (!member || !member.isStaff) return left(new NotFoundError('Usuário da equipe'));

    const next = {
      role: role ?? member.role,
      active: active ?? member.active,
      permissions: permissions ?? member.permissions,
    };

    const removesActiveAdmin = member.role === 'admin' && member.active && (next.role !== 'admin' || !next.active);

    // A checagem aqui dá o erro rápido; a do repositório protege contra corrida entre requisições.
    if (removesActiveAdmin && (await this.teamRepository.countOtherActiveAdmins(member.id)) === 0) {
      return left(new LastActiveAdminError());
    }

    const { roleChanged } = member.updateTeamAccess(next);

    const saved = await this.teamRepository.saveAccess(member, { guardLastAdmin: removesActiveAdmin });
    if (!saved) return left(new LastActiveAdminError());

    await this.auditLogger.log({
      actorId,
      action: 'team.user.update',
      entity: 'users',
      entityId: member.id,
      details: { role: member.role, active: member.active, permissions: member.permissions, roleChanged },
    });

    return right(toUpdateTeamMemberResponse(member));
  }
}
