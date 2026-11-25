import {z} from 'zod'

export const expenseSchema = z.object({
  description: z.string().trim().min(2, 'Informe uma descrição.').max(120, 'Use até 120 caracteres.'),
  category: z.string().min(1, 'Selecione uma categoria.'),
  amountCents: z.number().int().min(1, 'O valor deve ser maior que zero.'),
  dueDate: z.string().min(1, 'Informe o vencimento.'),
  recurring: z.boolean()
})

export type ExpenseFormValues = z.infer<typeof expenseSchema>
