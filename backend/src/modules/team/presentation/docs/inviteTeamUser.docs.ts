import { UserSchema } from '@/modules/auth/presentation/docs/user.schema';
import { inviteTeamUserBodySchema } from '@/modules/team/presentation/validators/inviteTeamUser.schema';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

import type { InviteTeamUserResponseDTO } from '@/modules/team/application/dtos/InviteTeamUserDTO';
export const InviteTeamUserResponseSchema = registry.register(
  'InviteTeamUserResponse',
  z.object({
    user: UserSchema.omit({ tokenVersion: true }),
    inviteToken: z.string().nullable().openapi({ example: null, description: 'Só vem preenchido quando o e-mail não pôde ser enviado.' }),
    inviteSent: z.boolean().openapi({ example: true }),
  }),
);

type AssertDocMatchesDTO = InviteTeamUserResponseDTO extends z.infer<typeof InviteTeamUserResponseSchema> ? true : never;
export const assertInviteTeamUserDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'post',
  path: '/api/admin/users/invite',
  tags: ['Equipe'],
  summary: 'Convidar membro da equipe (admin)',
  description:
    'Cria o usuário sem senha com o papel informado e envia um link de definição de senha (uso único, expira em 48 h; o convidado usa POST /api/auth/reset). Se o e-mail falhar, o token volta na resposta. Registra auditoria. Exige a permissão team.manage.',
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: jsonContent(inviteTeamUserBodySchema) } },
  responses: {
    201: { description: 'Convite criado', content: jsonContent(InviteTeamUserResponseSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    409: { description: 'E-mail já cadastrado', content: errorContent },
    422: { description: 'Dados inválidos', content: errorContent },
  },
});
