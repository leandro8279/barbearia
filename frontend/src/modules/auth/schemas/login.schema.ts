import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Informe seu e-mail ou telefone.'),
  password: z.string().min(1, 'Informe sua senha.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
