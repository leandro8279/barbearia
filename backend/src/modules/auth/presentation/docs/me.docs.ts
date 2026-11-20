import type { GetMeResponseDTO } from '@/modules/auth/application/dtos/GetMeResponseDTO';
import { UserSchema } from '@/modules/auth/presentation/docs/user.schema';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

const MeUserSchema = UserSchema.omit({ tokenVersion: true });

export const GetMeResponseSchema = registry.register('GetMeResponse', z.object({ user: MeUserSchema }));

// type AssertDocMatchesDTO = GetMeResponseDTO extends z.infer<typeof GetMeResponseSchema> ? true : never;

// export const assertDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'get',
  path: '/api/auth/me',
  tags: ['Auth'],
  summary: 'Usuário autenticado',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: { description: 'Dados do usuário logado', content: jsonContent(GetMeResponseSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
  },
});
