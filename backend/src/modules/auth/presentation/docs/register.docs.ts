import type { RegisterResponseDTO } from '@/modules/auth/application/dtos/RegisterResponseDTO';
import { registerBodySchema } from '@/modules/auth/presentation/validators/register.schema';

import { errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';
import { UserSchema } from '@/modules/auth/presentation/docs/user.schema';

export const RegisterResponseSchema = registry.register(
  'RegisterResponse',
  z.object({
    user: UserSchema,
    token: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIs...' }),
  }),
);

// Erro de compilação aqui = a documentação divergiu do DTO real.
type AssertDocMatchesDTO = RegisterResponseDTO extends z.infer<typeof RegisterResponseSchema> ? true : never;
export const assertRegisterDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'post',
  path: '/api/auth/register',
  tags: ['Auth'],
  summary: 'Cadastro de cliente',
  description: 'Cria a conta. Se já existir um convidado (guest) com o mesmo telefone, ele é promovido e a resposta é 200.',
  request: { body: { content: jsonContent(registerBodySchema) } },
  responses: {
    201: { description: 'Conta criada', content: jsonContent(RegisterResponseSchema) },
    200: { description: 'Convidado promovido a cliente', content: jsonContent(RegisterResponseSchema) },
    409: { description: 'E-mail ou telefone já cadastrado', content: errorContent },
    422: { description: 'Dados inválidos', content: errorContent },
    429: { description: 'Muitas tentativas', content: errorContent },
  },
});
