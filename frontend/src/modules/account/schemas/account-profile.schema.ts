import {z} from 'zod'
import {validators} from '@/shared/lib/validators'

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Sao_Paulo'}).format(new Date())
}

export const accountProfileSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe seu nome completo.').max(100, 'O nome deve ter até 100 caracteres.'),
    email: z.string().trim().email('Informe um e-mail válido.').max(160, 'O e-mail deve ter até 160 caracteres.'),
    phone: z.string().refine(validators.phone, 'Informe um telefone válido com DDD.'),
    cpf: z.string().refine(value => !value.trim() || validators.cpf(value), 'Informe um CPF válido ou deixe o campo vazio.'),
    birthDate: z.string().refine(value => !value || (isValidDate(value) && value <= todayInSaoPaulo()), 'Informe uma data válida, que não seja futura.'),
    originalEmail: z.string(),
    currentPassword: z.string().optional()
  })
  .superRefine((values, context) => {
    if (values.email.trim().toLowerCase() !== values.originalEmail.trim().toLowerCase() && !values.currentPassword?.trim()) {
      context.addIssue({code: 'custom', path: ['currentPassword'], message: 'Informe sua senha atual para alterar o e-mail.'})
    }
  })

export const accountAddressSchema = z.object({
  label: z.string().trim().min(1, 'Informe um nome para o endereço.').max(40, 'Use até 40 caracteres.'),
  zip: z.string().refine(value => value.replace(/\D/g, '').length === 8, 'Informe um CEP válido.'),
  street: z.string().trim().min(2, 'Informe a rua ou avenida.').max(100, 'Use até 100 caracteres.'),
  number: z.string().trim().min(1, 'Informe o número ou “sem número”.').max(20, 'Use até 20 caracteres.'),
  complement: z.string().trim().max(80, 'Use até 80 caracteres.'),
  neighborhood: z.string().trim().min(2, 'Informe o bairro.').max(80, 'Use até 80 caracteres.'),
  city: z.string().trim().min(2, 'Informe a cidade.').max(80, 'Use até 80 caracteres.'),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Informe a UF com duas letras.'),
  reference: z.string().trim().max(120, 'Use até 120 caracteres.')
})

export type AccountProfileValues = z.input<typeof accountProfileSchema>
export type AccountAddressValues = z.input<typeof accountAddressSchema>
