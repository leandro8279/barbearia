import type { UpdateTeamMemberResponseDTO } from '@/modules/team/application/dtos/UpdateTeamMemberResponseDTO';
import { UserSchema } from '@/modules/auth/presentation/docs/user.schema';
import { updateTeamMemberBodySchema, updateTeamMemberParamsSchema } from '@/modules/team/presentation/validators/updateTeamMember.schema';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

export const UpdateTeamMemberResponseSchema = registry.register(
  'UpdateTeamMemberResponse',
  z.object({ user: UserSchema.omit({ tokenVersion: true }) }),
);

type AssertDocMatchesDTO = UpdateTeamMemberResponseDTO extends z.infer<typeof UpdateTeamMemberResponseSchema> ? true : never;
export const assertUpdateTeamMemberDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'patch',
  path: '/api/admin/users/{id}',
  tags: ['Equipe'],
  summary: 'Atualizar membro da equipe (admin)',
  description:
    'Altera papel, status e/ou permissões individuais (campos omitidos permanecem). Mudar o papel invalida os tokens do usuário. Sincroniza o perfil de barbeiro (ativo só se ativo e papel barbeiro). Não permite remover ou desativar o último administrador ativo. Registra auditoria. Exige a permissão team.manage.',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: updateTeamMemberParamsSchema, body: { content: jsonContent(updateTeamMemberBodySchema) } },
  responses: {
    200: { description: 'Membro atualizado', content: jsonContent(UpdateTeamMemberResponseSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    404: { description: 'Usuário da equipe não encontrado', content: errorContent },
    409: { description: 'Seria removido o último administrador ativo', content: errorContent },
    422: { description: 'Dados inválidos', content: errorContent },
  },
});
