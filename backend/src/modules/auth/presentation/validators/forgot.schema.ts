import { z } from '@/shared/openapi/zod';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const forgotPasswordBodySchema = z.object({
  email: z.string().trim().toLowerCase().max(255).regex(EMAIL_REGEX, 'E-mail inválido').openapi({ example: 'joao@email.com' }),
});

export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;
