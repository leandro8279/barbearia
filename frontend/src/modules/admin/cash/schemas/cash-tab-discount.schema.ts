import {z} from 'zod'

export const cashTabDiscountSchema = z.object({discountCents: z.number().int('Informe um valor em centavos.').min(0, 'O desconto não pode ser negativo.')})

export type CashTabDiscountValues = z.infer<typeof cashTabDiscountSchema>
