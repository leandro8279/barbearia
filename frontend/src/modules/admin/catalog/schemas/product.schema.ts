import {z} from 'zod'

export const productSchema = z.object({
  sku: z.string().trim().min(2, 'Informe um SKU válido.').max(40, 'Use até 40 caracteres.'),
  name: z.string().trim().min(2, 'Informe o nome do produto.').max(100, 'Use até 100 caracteres.'),
  categoryId: z.number().int().positive('Selecione uma categoria.'),
  price: z.number().int().min(0, 'O preço não pode ser negativo.'),
  costCents: z.number().int().min(0, 'O custo não pode ser negativo.'),
  stock: z.number().int().min(0, 'O saldo não pode ser negativo.'),
  minStock: z.number().int().min(0, 'O estoque mínimo não pode ser negativo.'),
  kind: z.enum(['resale', 'supply']),
  commissionPct: z.number().min(0).max(100, 'A comissão deve ficar entre 0% e 100%.'),
  image: z.string(),
  active: z.boolean()
})

export const stockAdjustmentSchema = z.object({
  newStock: z.number().int().min(0, 'Informe um saldo inteiro não negativo.'),
  reason: z.string().trim().min(3, 'Explique o motivo do ajuste.').max(200, 'Use até 200 caracteres.')
})

export type ProductFormValues = z.infer<typeof productSchema>
export type StockAdjustmentValues = z.infer<typeof stockAdjustmentSchema>
