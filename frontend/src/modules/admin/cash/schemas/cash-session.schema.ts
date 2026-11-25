import { z } from 'zod';

const nonNegativeCents = z.number().int('Informe um valor inteiro em centavos.').min(0, 'O valor não pode ser negativo.');
const nonNegativeCount = z.number().int('Informe uma quantidade inteira.').min(0, 'A quantidade não pode ser negativa.');

export const cashSessionOpenSchema = z.object({ openingCents: nonNegativeCents });

export const cashSessionCloseSchema = z.object({
  countedByMethod: z.object({ cash: nonNegativeCents, pix: nonNegativeCents, debit: nonNegativeCents, credit: nonNegativeCents }),
  countedCashByDenomination: z.object({
    '20000': nonNegativeCount,
    '10000': nonNegativeCount,
    '5000': nonNegativeCount,
    '2000': nonNegativeCount,
    '1000': nonNegativeCount,
    '500': nonNegativeCount,
    '200': nonNegativeCount,
  }),
  countedOtherCashCents: nonNegativeCents,
  closingNote: z.string().max(500, 'A observação deve ter até 500 caracteres.'),
});

export type CashSessionOpenValues = z.infer<typeof cashSessionOpenSchema>;
export type CashSessionCloseValues = z.infer<typeof cashSessionCloseSchema>;
