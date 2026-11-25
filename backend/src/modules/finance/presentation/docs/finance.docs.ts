import type { FinanceSummaryResponseDTO } from '@/modules/finance/application/dtos/GetFinanceSummaryDTO';
import { FINANCE_BASES } from '@/modules/finance/domain/entities/FinanceSummary';
import { PAYMENT_METHODS } from '@/modules/tabs/domain/entities/Payment';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

const FinanceMetricsSchema = registry.register(
  'FinanceMetrics',
  z.object({
    revenueCents: z.number().int().openapi({ example: 184500, description: 'Em centavos' }),
    expensesCents: z.number().int().openapi({ example: 74600, description: 'Em centavos' }),
    profitCents: z.number().int().openapi({ example: 109900, description: 'Receita - despesas, em centavos (pode ser negativo)' }),
    averageTicketCents: z.number().int().openapi({ example: 7687, description: 'Receita / comandas, arredondado' }),
    commissionsToPayCents: z.number().int().openapi({ example: 32100, description: 'Comissões pendentes das comandas do período' }),
    tabsCount: z.number().int().openapi({ example: 24 }),
  }),
);

export const FinanceSummarySchema = registry.register(
  'FinanceSummary',
  z.object({
    basis: z.enum(FINANCE_BASES).openapi({ example: 'cash' }),
    metrics: FinanceMetricsSchema,
    previous: FinanceMetricsSchema.openapi({ description: 'Mesmas métricas no período imediatamente anterior, de mesma duração' }),
    monthly: z.array(
      z.object({
        month: z.string().openapi({ example: '2026-11', description: 'AAAA-MM no fuso America/Sao_Paulo' }),
        incomeCents: z.number().int(),
        expensesCents: z.number().int(),
      }),
    ),
    paymentMethods: z.array(z.object({ method: z.enum(PAYMENT_METHODS).openapi({ example: 'pix' }), amountCents: z.number().int() })),
  }),
);

// Erro de compilação aqui = a documentação divergiu do DTO real.
type AssertDocMatchesDTO = FinanceSummaryResponseDTO extends z.infer<typeof FinanceSummarySchema> ? true : never;
export const assertFinanceSummaryDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'get',
  path: '/api/admin/finance/summary',
  tags: ['Financeiro'],
  summary: 'Resumo financeiro (admin)',
  description:
    'Receita, despesas, lucro, ticket médio, comissões a pagar e nº de comandas do período, comparados ao período imediatamente anterior (mesma duração), com série mensal e total por forma de pagamento. `basis=cash` (padrão) usa pagamentos e despesas pagas; `basis=accrual` usa comandas (data do atendimento) e despesas por vencimento. Datas `AAAA-MM-DD` valem no fuso America/Sao_Paulo (`from` no início do dia, `to` no fim do dia). Exige a permissão finance.read.',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({
      from: z.string().openapi({ example: '2026-11-01', description: 'AAAA-MM-DD ou data-hora ISO' }),
      to: z.string().openapi({ example: '2026-11-30', description: 'AAAA-MM-DD ou data-hora ISO; não pode ser anterior a `from`' }),
      basis: z.enum(FINANCE_BASES).optional().openapi({ example: 'cash', description: 'Regime financeiro. Padrão: cash' }),
    }),
  },
  responses: {
    200: { description: 'Resumo do período', content: jsonContent(FinanceSummarySchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    422: { description: 'Período ou regime financeiro inválido', content: errorContent },
  },
});
