import {z} from 'zod'

const nullableDuration = z.number().int().min(5).multipleOf(5).nullable()
const nullablePrice = z.number().int().min(0).nullable()
const nullableCommission = z.number().min(0).max(100).nullable()

export const serviceSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do serviço.').max(80, 'Use até 80 caracteres.'),
  categoryId: z.number().int().positive('Selecione uma categoria.'),
  description: z.string().max(500, 'Use até 500 caracteres.'),
  image: z.string(),
  durationMin: z.number().int().min(5, 'A duração mínima é 5 minutos.').multipleOf(5, 'Use intervalos de 5 minutos.'),
  bufferMin: z.number().int().min(0).multipleOf(5, 'Use intervalos de 5 minutos.'),
  price: z.number().int().min(0, 'O preço não pode ser negativo.'),
  commissionPct: z.number().min(0).max(100, 'A comissão deve ficar entre 0% e 100%.'),
  active: z.boolean(),
  featured: z.boolean(),
  barberAssignments: z
    .array(
      z.object({
        barberId: z.number().int().positive(),
        name: z.string(),
        photo: z.string().nullable(),
        assigned: z.boolean(),
        durationMin: nullableDuration,
        price: nullablePrice,
        commissionPct: nullableCommission
      })
    )
    .refine(items => items.some(item => item.assigned), 'Selecione ao menos um profissional.')
})

export type ServiceFormValues = z.infer<typeof serviceSchema>
