import {z} from 'zod'
import {validators} from '@/shared/lib/validators'

const optionalPixKey = z
  .string()
  .trim()
  .max(120, 'A chave Pix deve ter até 120 caracteres.')
  .refine(value => {
    if (!value) return true
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true
    if (validators.cpf(value) || validators.cnpj(value) || validators.phone(value)) return true
    return /^(?:[a-f\d]{32}|[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})$/i.test(value)
  }, 'Informe uma chave Pix válida.')

const optionalOverride = z.number().nullable()

export const teamProfileSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe o nome do profissional.').max(100, 'Use até 100 caracteres.'),
    email: z.string().trim().email('Informe um e-mail válido.').max(160, 'Use até 160 caracteres.'),
    phone: z.string().refine(value => validators.phone(value), 'Informe um telefone válido com DDD.'),
    cpf: z.string().refine(value => !value.trim() || validators.cpf(value), 'Informe um CPF válido ou deixe o campo vazio.'),
    bio: z.string().max(600, 'A biografia deve ter até 600 caracteres.'),
    specialties: z.array(z.string().trim().min(1).max(40)).max(12, 'Informe até 12 especialidades.'),
    photo: z.string().max(120_000, 'A foto deve ter até 90 KB.'),
    pixKey: optionalPixKey,
    commissionServicePct: z.number().min(0, 'A comissão não pode ser negativa.').max(100, 'A comissão deve ficar até 100%.'),
    commissionProductPct: z.number().min(0, 'A comissão não pode ser negativa.').max(100, 'A comissão deve ficar até 100%.'),
    active: z.boolean(),
    services: z
      .array(z.object({serviceId: z.number().int().positive(), assigned: z.boolean(), durationMin: optionalOverride, price: optionalOverride, commissionPct: optionalOverride}))
      .min(1, 'Cadastre ao menos um serviço.')
  })
  .superRefine((values, context) => {
    if (!values.services.some(service => service.assigned)) {
      context.addIssue({code: 'custom', path: ['services'], message: 'Selecione ao menos um serviço para este profissional.'})
    }
    if (values.services.some(service => service.durationMin !== null && (!Number.isInteger(service.durationMin) || service.durationMin < 5 || service.durationMin % 5 !== 0))) {
      context.addIssue({code: 'custom', path: ['services'], message: 'A duração específica deve ser múltipla de 5 minutos.'})
    }
    if (values.services.some(service => service.price !== null && (!Number.isInteger(service.price) || service.price < 0))) {
      context.addIssue({code: 'custom', path: ['services'], message: 'Informe preços específicos em centavos inteiros.'})
    }
    if (values.services.some(service => service.commissionPct !== null && (service.commissionPct < 0 || service.commissionPct > 100))) {
      context.addIssue({code: 'custom', path: ['services'], message: 'A comissão específica deve ficar entre 0% e 100%.'})
    }
  })

export type TeamProfileValues = z.infer<typeof teamProfileSchema>
