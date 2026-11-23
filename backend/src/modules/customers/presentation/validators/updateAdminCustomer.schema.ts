import { z } from '@/shared/openapi/zod';
import { isValidCpf, normalizeCpf } from '@/shared/utils/cpf';
import { isValidBrazilianPhone } from '@/shared/utils/phone';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export const updateAdminCustomerBodySchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do cliente.').max(100, 'Informe o nome do cliente.').openapi({ example: 'João Silva' }),
  phone: z.string().refine(isValidBrazilianPhone, 'Informe um telefone brasileiro válido com DDD.').openapi({ example: '(62) 99999-8888' }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(255)
    .refine((value) => value === '' || EMAIL_REGEX.test(value), 'Informe um e-mail válido.')
    .nullish()
    .openapi({ example: 'joao@email.com', description: 'Vazio ou nulo remove o e-mail.' }),
  birthDate: z
    .string()
    .trim()
    .refine((value) => value === '' || isRealDate(value), 'Informe uma data de nascimento válida.')
    .nullish()
    .openapi({ example: '1995-04-20' }),
  cpf: z
    .string()
    .refine((value) => normalizeCpf(value) === '' || isValidCpf(value), 'Informe um CPF válido.')
    .nullish()
    .openapi({ example: '529.982.247-25', description: 'Vazio ou nulo remove o CPF.' }),
  referralSource: z.string().trim().max(120, 'Como conheceu a barbearia deve ter até 120 caracteres.').nullish().openapi({ example: 'Instagram' }),
  tags: z
    .array(z.string())
    .default([])
    .openapi({ example: ['VIP'], description: 'Duplicadas e vazias são ignoradas; no máximo 12.' }),
  consent: z
    .object({
      reminders: z.boolean().default(false),
      marketing: z.boolean().default(false),
    })
    .default({ reminders: false, marketing: false }),
});

export type UpdateAdminCustomerBody = z.infer<typeof updateAdminCustomerBodySchema>;
