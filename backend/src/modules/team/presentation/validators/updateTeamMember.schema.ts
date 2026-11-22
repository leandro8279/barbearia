import { STAFF_ROLES } from '@/modules/users';

import { PERMISSIONS } from '@/shared/auth/permissions';
import { z } from '@/shared/openapi/zod';

export const updateTeamMemberParamsSchema = z.object({
  id: z.string().uuid('Id inválido').openapi({ example: '3f6c2a1e-8b7d-4c9a-9e2f-1a2b3c4d5e6f' }),
});

export const updateTeamMemberBodySchema = z.object({
  role: z.enum(STAFF_ROLES, { error: 'Selecione um papel válido para a equipe.' }).optional().openapi({ example: 'reception' }),
  active: z.boolean({ error: 'Informe um status válido.' }).optional().openapi({ example: true }),
  permissions: z
    .array(z.enum(PERMISSIONS, { error: 'A matriz contém uma permissão inválida.' }), { error: 'A matriz contém uma permissão inválida.' })
    .optional()
    .openapi({ example: ['agenda.read', 'cash.read'], description: 'Permissões individuais, somadas às do papel. Duplicatas são ignoradas.' }),
});

export type UpdateTeamMemberBody = z.infer<typeof updateTeamMemberBodySchema>;
