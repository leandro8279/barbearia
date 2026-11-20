// login.schema.ts
import { z } from '@/shared/openapi/zod';

import { EMAIL_REGEX } from './register.schema';

const PHONE_REGEX = /^[+\d\s().-]+$/;

export const loginBodySchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(255)
    .refine((v) => EMAIL_REGEX.test(v) || (PHONE_REGEX.test(v) && v.replace(/\D/g, '').length >= 10), 'Informe um e-mail ou telefone válido')
    .openapi({ example: 'joao@email.com', description: 'E-mail ou telefone (telefone não vale com staffOnly).' }),
  password: z.string().min(1, 'Informe a senha').max(72).openapi({ example: 'senha-forte-123' }),
  staffOnly: z.boolean().default(false).openapi({ example: false }),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
