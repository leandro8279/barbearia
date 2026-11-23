import { z } from '@/shared/openapi/zod';
import { isValidCpf } from '@/shared/utils/cpf';
import { isValidBrazilianPhone } from '@/shared/utils/phone';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export const createAdminCustomerBodySchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do cliente.').max(100, 'Informe o nome do cliente.').openapi({ example: 'João Silva' }),
  phone: z.string().refine(isValidBrazilianPhone, 'Informe um telefone brasileiro válido com DDD.').openapi({ example: '(62) 99999-8888' }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(255)
    .regex(EMAIL_REGEX, 'Informe um e-mail válido.')
    .or(z.literal(''))
    .nullish()
    .openapi({ example: 'joao@email.com' }),
  birthDate: z
    .string()
    .trim()
    .refine((value) => value === '' || isRealDate(value), 'Informe uma data de nascimento válida.')
    .nullish()
    .openapi({ example: '1995-04-20' }),
  cpf: z
    .string()
    .refine((value) => value.trim() === '' || isValidCpf(value), 'Informe um CPF válido.')
    .nullish()
    .openapi({ example: '529.982.247-25', description: 'Com ou sem máscara.' }),
  referralSource: z.string().trim().max(120, 'Como conheceu a barbearia deve ter até 120 caracteres.').nullish().openapi({ example: 'Instagram' }),
  tags: z
    .array(z.string())
    .default([])
    .openapi({ example: ['VIP'], description: 'Aparadas, sem duplicatas, no máximo 12.' }),
  consent: z.object({ reminders: z.boolean().default(false), marketing: z.boolean().default(false) }).default({ reminders: false, marketing: false }),
});

export type CreateAdminCustomerBody = z.infer<typeof createAdminCustomerBodySchema>;
