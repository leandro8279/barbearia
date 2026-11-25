import { z } from 'zod';

export const resetPasswordSchema = z
  .object({ password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.').max(128, 'A senha deve ter até 128 caracteres.'), confirmPassword: z.string().min(1, 'Confirme sua senha.') })
  .superRefine((values, context) => {
    if (values.password !== values.confirmPassword) {
      context.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'As senhas não coincidem.' });
    }
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
