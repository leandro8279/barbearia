import type { RegisterResponseDTO } from '@/modules/auth/application/dtos/RegisterResponseDTO';
import { registerBodySchema } from '@/modules/auth/presentation/validators/register.schema';

import { errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

const UserSchema = z.object({
  id: z.string().uuid().openapi({ example: '3f6c2a1e-8b7d-4c9a-9e2f-1a2b3c4d5e6f' }),
  name: z.string().openapi({ example: 'João Silva' }),
  email: z.string().nullable().openapi({ example: 'joao@email.com' }),
  phone: z.string().nullable().openapi({ example: '62999998888' }),
  role: z.string().openapi({ example: 'customer' }),
  cpf: z.string().nullable().openapi({ example: null }),
  birthDate: z.string().nullable().openapi({ example: '1995-04-20' }),
  addresses: z.array(z.record(z.string(), z.unknown())),
  tags: z.array(z.string()),
  referralSource: z.string().nullable(),
  avatar: z.string().nullable(),
  permissions: z.array(z.string()),
  active: z.boolean(),
  guest: z.boolean(),
  tokenVersion: z.number().int(),
  lastAccessAt: z.string().datetime().nullable(),
  consent: z.object({ reminders: z.boolean(), marketing: z.boolean(), at: z.string().datetime() }).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const RegisterResponseSchema = registry.register(
  'RegisterResponse',
  z.object({
    user: UserSchema,
    token: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIs...' }),
  }),
);

// Erro de compilação aqui = a documentação divergiu do DTO real.
type AssertDocMatchesDTO = RegisterResponseDTO extends z.infer<typeof RegisterResponseSchema> ? true : never;
export const assertDocMatchesDTO: AssertDocMatchesDTO = true;

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
