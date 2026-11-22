import { STAFF_ROLES } from '@/modules/team/domain/entities/StaffRole';

import { z } from '@/shared/openapi/zod';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const inviteTeamUserBodySchema = z.object({
  email: z.string().trim().toLowerCase().max(255).regex(EMAIL_REGEX, 'Informe um e-mail válido.').openapi({ example: 'rafael@barbearia.com' }),
  role: z.enum(STAFF_ROLES, { error: 'Selecione um papel válido para a equipe.' }).openapi({ example: 'barber' }),
});

export type InviteTeamUserBody = z.infer<typeof inviteTeamUserBodySchema>;
