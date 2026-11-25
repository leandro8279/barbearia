import type { ListExpensesResponseDTO } from '@/modules/finance/application/dtos/ListExpensesDTO';
import { EXPENSE_DISPLAY_STATUSES, EXPENSE_STATUSES } from '@/modules/finance/domain/entities/Expense';
import { EXPENSE_SORT_FIELDS, EXPENSE_STATUS_FILTERS } from '@/modules/finance/domain/repositories/ExpenseRepositoryInterface';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

const ExpenseSchema = z.object({
  id: z.string().uuid(),
  description: z.string().openapi({ example: 'Aluguel da unidade' }),
  category: z.string().openapi({ example: 'Aluguel' }),
  amountCents: z.number().int().openapi({ example: 320000, description: 'Em centavos' }),
  dueAt: z.string().datetime(),
  status: z.enum(EXPENSE_STATUSES).openapi({ example: 'open', description: 'Status gravado' }),
  displayStatus: z
    .enum(EXPENSE_DISPLAY_STATUSES)
    .openapi({ example: 'overdue', description: '`overdue` = aberta com vencimento anterior a hoje (America/Sao_Paulo)' }),
  paidAt: z.string().datetime().nullable(),
  recurring: z.boolean(),
  createdAt: z.string().datetime(),
});

export const ExpensePageSchema = registry.register(
  'ExpensePage',
  z.object({
    items: z.array(ExpenseSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    pageCount: z.number().int().openapi({ example: 3 }),
  }),
);

type AssertDocMatchesDTO = ListExpensesResponseDTO extends z.infer<typeof ExpensePageSchema> ? true : never;
export const assertExpensePageDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'get',
  path: '/api/admin/finance/expenses',
  tags: ['Financeiro'],
  summary: 'Listar despesas (admin)',
  description:
    'Lista paginada. Paginação/ordenação inválidas voltam ao padrão (página 1, 10 por página, vencimento crescente); `status` inválido retorna 422. `category` aceita slug ou nome (apelidos legados como "Estrutura" são resolvidos). `status=overdue` traz despesas abertas com vencimento anterior a hoje; `status=open`, as abertas ainda a vencer. `from`/`to` filtram o vencimento por dia no fuso America/Sao_Paulo (inclusivo). `q` busca em descrição e categoria. Exige a permissão finance.read.',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({
      page: z.number().int().min(1).optional().openapi({ example: 1 }),
      limit: z.number().int().min(1).max(100).optional().openapi({ example: 10 }),
      q: z.string().optional().openapi({ description: 'Busca por descrição ou categoria' }),
      category: z.string().optional().openapi({ example: 'aluguel', description: 'Slug ou nome da categoria' }),
      status: z.enum(EXPENSE_STATUS_FILTERS).optional().openapi({ example: 'overdue', description: 'Padrão: all' }),
      from: z.string().optional().openapi({ example: '2026-11-01', description: 'Vencimento a partir de AAAA-MM-DD' }),
      to: z.string().optional().openapi({ example: '2026-11-30', description: 'Vencimento até AAAA-MM-DD' }),
      sort: z.enum(EXPENSE_SORT_FIELDS).optional(),
      order: z.enum(['asc', 'desc']).optional(),
    }),
  },
  responses: {
    200: { description: 'Página de despesas', content: jsonContent(ExpensePageSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    422: { description: 'Status de despesa inválido', content: errorContent },
  },
});
