import { z } from '@/shared/openapi/zod';

export const changePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual').max(72).openapi({ example: 'senha-antiga-123' }),
    password: z.string().min(8, 'A nova senha deve ter pelo menos 8 caracteres').max(72).openapi({ example: 'nova-senha-123' }),
  })
  .refine((v) => v.password !== v.currentPassword, { message: 'A nova senha deve ser diferente da atual', path: ['password'] });

export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;
