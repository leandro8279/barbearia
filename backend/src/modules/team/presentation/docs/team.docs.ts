import type { ListTeamUsersResponseDTO } from '@/modules/team/application/dtos/ListTeamUsersDTO';
import { UserSchema } from '@/modules/auth/presentation/docs/user.schema';
import { STAFF_ROLES } from '@/modules/users';

import { PERMISSIONS } from '@/shared/auth/permissions';
import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

const PermissionSchema = z.enum(PERMISSIONS);
const StaffRoleSchema = z.enum(STAFF_ROLES);

const TeamUserSchema = UserSchema.omit({ tokenVersion: true }).extend({
  effectivePermissions: z.array(PermissionSchema).openapi({ description: 'Permissões do papel somadas às individuais' }),
  hasPassword: z.boolean(),
});

export const ListTeamUsersResponseSchema = registry.register(
  'ListTeamUsersResponse',
  z.object({
    users: z.array(TeamUserSchema),
    roles: z.array(StaffRoleSchema),
    permissionKeys: z.array(PermissionSchema),
    roleDefaults: z.record(StaffRoleSchema, z.array(PermissionSchema)),
  }),
);

type AssertDocMatchesDTO = ListTeamUsersResponseDTO extends z.infer<typeof ListTeamUsersResponseSchema> ? true : never;
export const assertListTeamUsersDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'get',
  path: '/api/admin/users',
  tags: ['Equipe'],
  summary: 'Listar equipe (admin)',
  description:
    'Lista usuários que não são clientes, ordenados por nome, com permissões efetivas, catálogo de permissões e padrões por papel. Exige a permissão team.manage.',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: { description: 'Equipe e catálogo de permissões', content: jsonContent(ListTeamUsersResponseSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
  },
});
