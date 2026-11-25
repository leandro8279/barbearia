import {z} from 'zod'
import {validators} from '@/shared/lib/validators'

export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo.').max(100, 'Use até 100 caracteres.'),
  phone: z.string().trim().refine(validators.phone, 'Informe um telefone brasileiro válido com DDD.'),
  email: z
    .string()
    .trim()
    .refine(value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Informe um e-mail válido.'),
  birthDate: z.string().refine(value => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Informe uma data válida.'),
  cpf: z.string().refine(value => !value || validators.cpf(value), 'Informe um CPF válido.'),
  referralSource: z.string().trim().max(120, 'Use até 120 caracteres.'),
  tags: z.string().max(500, 'Use até 500 caracteres.'),
  reminders: z.boolean(),
  marketing: z.boolean()
})

export type CustomerFormValues = z.infer<typeof customerSchema>
