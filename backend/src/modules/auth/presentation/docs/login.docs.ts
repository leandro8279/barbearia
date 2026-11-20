import type { LoginResponseDTO } from '@/modules/auth/application/dtos/LoginResponseDTO';
import { UserSchema } from '@/modules/auth/presentation/docs/user.schema';
import { loginBodySchema } from '@/modules/auth/presentation/validators/login.schema';

import { errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

export const LoginResponseSchema = registry.register(
  'LoginResponse',
  z.object({
    user: UserSchema.omit({ tokenVersion: true }),
    token: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIs...' }),
  }),
);

// type AssertDocMatchesDTO = LoginResponseDTO extends z.infer<typeof LoginResponseSchema> ? true : never;
// export const assertDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  tags: ['Auth'],
  summary: 'Login',
  description:
    'Autentica por e-mail ou telefone. Com `staffOnly`, só perfis de equipe entram (e só por e-mail). Apenas tentativas inválidas contam no limite.',
  request: { body: { content: jsonContent(loginBodySchema) } },
  responses: {
    200: { description: 'Autenticado', content: jsonContent(LoginResponseSchema) },
    401: { description: 'Credenciais inválidas', content: errorContent },
    403: { description: 'Usuário inativo ou bloqueado', content: errorContent },
    422: { description: 'Dados inválidos', content: errorContent },
    429: { description: 'Muitas tentativas inválidas', content: errorContent },
  },
});
