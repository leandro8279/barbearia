import {z} from 'zod'

export const cashItemSchema = z.object({
  qty: z.number().int('Informe uma quantidade inteira.').min(1, 'A quantidade mínima é 1.').max(50, 'A quantidade máxima é 50.'),
  barberId: z.number().int().positive().nullable()
})

export type CashItemValues = z.infer<typeof cashItemSchema>
