import { z } from '@/shared/openapi/zod';

import { EMAIL_REGEX } from './register.schema';

export const loginBodySchema = z.object({
  email: z.string().trim().toLowerCase().max(255).regex(EMAIL_REGEX, 'E-mail inválido').openapi({ example: 'joao@email.com' }),
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres').max(72).openapi({ example: 'senha-forte-123' }),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
