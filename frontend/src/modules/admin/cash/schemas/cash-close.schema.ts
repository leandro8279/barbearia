import {z} from 'zod'

const centsSchema = z.number().int('Informe um valor inteiro em centavos.').min(0, 'O valor não pode ser negativo.')

export const cashCloseSchema = (eligibleBarberCount: number) =>
  z
    .object({
      cashAmountCents: centsSchema,
      cashReceivedCents: centsSchema,
      pixCents: centsSchema,
      debitCents: centsSchema,
      creditCents: centsSchema,
      tipCents: centsSchema,
      tipAllocations: z.array(z.object({barberId: z.number().int().positive(), amountCents: centsSchema}))
    })
    .superRefine((values, context) => {
      if (values.cashReceivedCents < values.cashAmountCents) {
        context.addIssue({code: 'custom', path: ['cashReceivedCents'], message: 'O valor recebido deve cobrir o pagamento em dinheiro.'})
      }
      if (values.cashAmountCents === 0 && values.cashReceivedCents > 0) {
        context.addIssue({code: 'custom', path: ['cashReceivedCents'], message: 'Informe quanto será pago em dinheiro.'})
      }

      const barberIds = values.tipAllocations.map(allocation => allocation.barberId)
      if (new Set(barberIds).size !== barberIds.length) {
        context.addIssue({code: 'custom', path: ['tipAllocations'], message: 'Cada barbeiro pode aparecer uma vez no rateio.'})
      }
      if (eligibleBarberCount === 0 && values.tipAllocations.length > 0) {
        context.addIssue({code: 'custom', path: ['tipAllocations'], message: 'Não há barbeiros vinculados a esta comanda.'})
      }
      if (eligibleBarberCount > 0 && values.tipAllocations.reduce((sum, allocation) => sum + allocation.amountCents, 0) !== values.tipCents) {
        context.addIssue({code: 'custom', path: ['tipAllocations'], message: 'O rateio deve corresponder ao valor total da gorjeta.'})
      }
    })

export type CashCloseValues = z.infer<ReturnType<typeof cashCloseSchema>>
