import type { ListAdminCustomersResponseDTO } from '@/modules/customers/application/dtos/ListAdminCustomersDTO';
import { CUSTOMER_DUPLICATE_MATCHES, FindCustomerDuplicatesResponseDTO } from '@/modules/customers/application/dtos/FindCustomerDuplicatesDTO';
import { CUSTOMER_SORT_FIELDS } from '@/modules/customers/domain/entities/CustomerSummary';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

const AdminCustomerListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().openapi({ example: 'João Silva' }),
  phone: z.string().openapi({ example: '62999998888', description: 'Mascarado (`(**) *****-**88`) sem a permissão customers.write' }),
  phoneMasked: z.boolean(),
  lastVisit: z.string().datetime().nullable(),
  visitsCount: z.number().int().openapi({ example: 4 }),
  totalSpentCents: z.number().int().openapi({ example: 24000, description: 'Em centavos' }),
  tags: z.array(z.string()).openapi({ example: ['VIP', 'Aniversariante'] }),
});

export const AdminCustomerPageSchema = registry.register(
  'AdminCustomerPage',
  z.object({
    items: z.array(AdminCustomerListItemSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
);

type AssertDocMatchesDTO = ListAdminCustomersResponseDTO extends z.infer<typeof AdminCustomerPageSchema> ? true : never;
export const assertAdminCustomerPageDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'get',
  path: '/api/admin/customers',
  tags: ['Clientes'],
  summary: 'Listar clientes (admin)',
  description:
    'Lista paginada com métricas (visitas, última visita, total gasto). Paginação/ordenação inválidas voltam ao padrão. `noVisitDays` inválido retorna 422. Telefone mascarado e busca por telefone só com customers.write. Exige a permissão customers.read.',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({
      page: z.number().int().min(1).optional().openapi({ example: 1 }),
      limit: z.number().int().min(1).max(100).optional().openapi({ example: 20 }),
      q: z.string().optional().openapi({ description: 'Busca por nome (sem acento) ou telefone' }),
      noVisitDays: z.number().int().min(1).max(3650).optional().openapi({ description: 'Sem visita há N dias (inclui quem nunca veio)' }),
      birthday: z.enum(['month']).optional().openapi({ description: 'Aniversariantes do mês' }),
      sort: z.enum(CUSTOMER_SORT_FIELDS).optional(),
      order: z.enum(['asc', 'desc']).optional(),
    }),
  },
  responses: {
    200: { description: 'Página de clientes', content: jsonContent(AdminCustomerPageSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    422: { description: 'Filtro inválido', content: errorContent },
  },
});

const CustomerDuplicateSchema = registry.register(
  'CustomerDuplicate',
  z.object({
    id: z.string().uuid().openapi({ example: '3f6c2a1e-8b7d-4c9a-9e2f-1a2b3c4d5e6f' }),
    name: z.string().openapi({ example: 'João Silva' }),
    phone: z.string().openapi({ example: '62999998888' }),
    matchedBy: z.array(z.enum(CUSTOMER_DUPLICATE_MATCHES)).openapi({ example: ['phone'] }),
  }),
);

export const CustomerDuplicatesSchema = z.array(CustomerDuplicateSchema);

type AssertDuplicateDocMatchesDTO = FindCustomerDuplicatesResponseDTO extends z.infer<typeof CustomerDuplicatesSchema> ? true : never;
export const assertCustomerDuplicatesDocMatchesDTO: AssertDuplicateDocMatchesDTO = true;

registry.registerPath({
  method: 'get',
  path: '/api/admin/customers/duplicates',
  tags: ['Clientes'],
  summary: 'Buscar clientes duplicados (admin)',
  description:
    'Procura clientes com o mesmo telefone (a partir de 10 dígitos, ignorando máscara e DDI 55) ou o mesmo nome (a partir de 3 caracteres, ignorando acentos e maiúsculas). Sem critério suficiente, devolve lista vazia. Telefone primeiro, depois ordem alfabética; no máximo 5 resultados. Exige a permissão customers.write.',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({
      phone: z.string().optional().openapi({ example: '(62) 99999-8888' }),
      name: z.string().optional().openapi({ example: 'João Silva' }),
      excludeId: z.string().uuid().optional().openapi({ description: 'Id do cliente a ignorar (ex.: o que está sendo editado)' }),
    }),
  },
  responses: {
    200: { description: 'Possíveis duplicados', content: jsonContent(CustomerDuplicatesSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
  },
});
