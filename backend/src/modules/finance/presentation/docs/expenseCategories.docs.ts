import type { ListExpenseCategoriesResponseDTO } from '@/modules/finance/application/dtos/ListExpenseCategoriesDTO';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

const ExpenseCategorySchema = registry.register(
  'ExpenseCategory',
  z.object({
    id: z.number().int().openapi({ example: 1 }),
    name: z.string().openapi({ example: 'Aluguel' }),
    slug: z.string().openapi({ example: 'aluguel' }),
  }),
);

export const ExpenseCategoryListSchema = z.array(ExpenseCategorySchema);

// Erro de compilação aqui = a documentação divergiu do DTO real.
type AssertDocMatchesDTO = ListExpenseCategoriesResponseDTO extends z.infer<typeof ExpenseCategoryListSchema> ? true : never;
export const assertExpenseCategoryListDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'get',
  path: '/api/admin/finance/expense-categories',
  tags: ['Financeiro'],
  summary: 'Listar categorias de despesa (admin)',
  description: 'Devolve o catálogo fixo de categorias de despesa (id, nome e slug), na ordem de cadastro. Exige a permissão finance.read.',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: { description: 'Categorias de despesa', content: jsonContent(ExpenseCategoryListSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
  },
});
