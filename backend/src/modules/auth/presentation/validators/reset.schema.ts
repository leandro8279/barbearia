import { z } from '@/shared/openapi/zod';

export const resetBodySchema = z.object({
  token: z.string().min(1, 'Informe o token').openapi({ example: 'a1b2c3...' }),
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres').max(72).openapi({ example: 'nova-senha-123' }),
});

export type ResetBody = z.infer<typeof resetBodySchema>;
