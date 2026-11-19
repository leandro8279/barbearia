import { z } from '@/shared/openapi/zod';

import { EMAIL_REGEX } from './register.schema';

export const guestBodySchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome').max(120).openapi({ example: 'João Silva' }),
  phone: z
    .string()
    .refine((value) => value.replace(/\D/g, '').length >= 10 && value.replace(/\D/g, '').length <= 20, 'Telefone inválido')
    .openapi({ example: '(62) 99999-8888' }),
  email: z.string().trim().max(255).regex(EMAIL_REGEX, 'E-mail inválido').or(z.literal('')).optional().openapi({ example: 'joao@email.com' }),
  reminders: z.boolean().default(false).openapi({ example: true }),
});

export type GuestBody = z.infer<typeof guestBodySchema>;
