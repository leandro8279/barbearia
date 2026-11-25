import {z} from 'zod'
import {validators} from '@/shared/lib/validators'

export const customerDetailsSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome completo.').max(100, 'O nome deve ter até 100 caracteres.'),
  phone: z.string().refine(validators.phone, 'Informe um telefone válido com DDD.')
})

export type CustomerDetailsValues = z.infer<typeof customerDetailsSchema>
