import { z } from '@/shared/openapi/zod';
import { registry } from '@/shared/openapi/registry';
import type { RegisterResponseDTO } from '@/modules/auth/application/dtos/RegisterResponseDTO';

export const RegisterResponseSchema = registry.register(
  'RegisterResponse',
  z.object({
    id: z.string().uuid().openapi({ example: '3f6c2a1e-8b7d-4c9a-9e2f-1a2b3c4d5e6f' }),
    name: z.string().openapi({ example: 'Exemplo' }),
    createdAt: z.string().datetime().openapi({ example: '2026-11-18T12:00:00.000Z' }),
  }),
);

// Erro de compilação aqui = a documentação divergiu do DTO real.
type AssertDocMatchesDTO = RegisterResponseDTO extends z.infer<typeof RegisterResponseSchema> ? true : never;
export const assertDocMatchesDTO: AssertDocMatchesDTO = true;

// TODO: registre as rotas com registry.registerPath({ ... }) (veja users/presentation/docs/user.docs.ts)
