import type { ListAdminProductsResponseDTO } from '@/modules/catalog/application/dtos/ListAdminProductsDTO';
import { PRODUCT_KINDS } from '@/modules/catalog/domain/entities/Product';
import { PRODUCT_SORT_FIELDS } from '@/modules/catalog/domain/repositories/ProductRepositoryInterface';
import { createProductBodySchema } from '@/modules/catalog/presentation/validators/createProduct.schema';
import { getAdminProductParamsSchema } from '@/modules/catalog/presentation/validators/getAdminProduct.schema';
import { updateProductBodySchema } from '@/modules/catalog/presentation/validators/updateProduct.schema';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

import type { ProductResponseDTO } from '@/modules/catalog/application/dtos/ProductResponseDTO';

type AssertProductDocMatchesDTO = ProductResponseDTO extends z.infer<typeof AdminProductSchema> ? true : never;
export const assertAdminProductDocMatchesDTO: AssertProductDocMatchesDTO = true;

export const AdminProductSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().openapi({ example: 'BAR-001' }),
  name: z.string().openapi({ example: 'Pomada matte' }),
  categoryId: z.string().uuid().openapi({ example: '3f6c2a1e-8b7d-4c9a-9e2f-1a2b3c4d5e6f' }),
  categoryName: z.string().openapi({ example: 'Cabelo' }),
  price: z.number().int().openapi({ example: 3500, description: 'Em centavos' }),
  costCents: z.number().int().openapi({ example: 1800, description: 'Em centavos' }),
  stock: z.number().int().openapi({ example: 33 }),
  minStock: z.number().int().openapi({ example: 5 }),
  kind: z.enum(PRODUCT_KINDS).openapi({ example: 'resale' }),
  commissionPct: z.number().openapi({ example: 10 }),
  image: z.string().openapi({ example: '/seed/product-hair.svg' }),
  active: z.boolean(),
});

registry.registerPath({
  method: 'post',
  path: '/api/admin/catalog/products',
  tags: ['Catálogo'],
  summary: 'Criar produto (admin)',
  description:
    'Cria o produto. O SKU é normalizado em maiúsculas e deve ser único. Saldo inicial opcional (padrão 0). Registra auditoria. Exige a permissão catalog.write.',
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: jsonContent(createProductBodySchema) } },
  responses: {
    201: { description: 'Produto criado', content: jsonContent(AdminProductSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    409: { description: 'SKU já cadastrado', content: errorContent },
    422: { description: 'Dados inválidos ou categoria inexistente', content: errorContent },
  },
});

export const AdminProductPageSchema = registry.register(
  'AdminProductPage',
  z.object({
    items: z.array(AdminProductSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
);

type AssertDocMatchesDTO = ListAdminProductsResponseDTO extends z.infer<typeof AdminProductPageSchema> ? true : never;
export const assertAdminProductPageDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'get',
  path: '/api/admin/catalog/products',
  tags: ['Catálogo'],
  summary: 'Listar produtos (admin)',
  description:
    'Lista paginada. Valores inválidos de paginação/filtro/ordenação voltam ao padrão. `stock=low` traz estoque abaixo do mínimo; `stock=ok`, igual ou acima. Exige a permissão catalog.read.',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({
      page: z.number().int().min(1).optional().openapi({ example: 1 }),
      limit: z.number().int().min(1).max(100).optional().openapi({ example: 20 }),
      q: z.string().optional().openapi({ description: 'Busca por nome ou SKU' }),
      categoryId: z.string().optional(),
      kind: z.enum(PRODUCT_KINDS).optional(),
      stock: z.enum(['low', 'ok']).optional(),
      sort: z.enum(PRODUCT_SORT_FIELDS).optional(),
      order: z.enum(['asc', 'desc']).optional(),
    }),
  },
  responses: {
    200: { description: 'Página de produtos', content: jsonContent(AdminProductPageSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/admin/catalog/products/{id}',
  tags: ['Catálogo'],
  summary: 'Detalhar produto (admin)',
  description: 'Devolve o produto com o nome da categoria. Exige a permissão catalog.write.',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: getAdminProductParamsSchema },
  responses: {
    200: { description: 'Produto', content: jsonContent(AdminProductSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    404: { description: 'Produto não encontrado', content: errorContent },
    422: { description: 'Id inválido', content: errorContent },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/admin/catalog/products/{id}',
  tags: ['Catálogo'],
  summary: 'Atualizar produto (admin)',
  description:
    'Atualização parcial (ao menos um campo). O SKU é normalizado em maiúsculas e deve ser único. O estoque não é alterado aqui: use adjust-stock. Registra auditoria. Exige a permissão catalog.write.',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: getAdminProductParamsSchema, body: { content: jsonContent(updateProductBodySchema) } },
  responses: {
    200: { description: 'Produto atualizado', content: jsonContent(AdminProductSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    404: { description: 'Produto não encontrado', content: errorContent },
    409: { description: 'SKU já cadastrado', content: errorContent },
    422: { description: 'Dados inválidos ou categoria inexistente', content: errorContent },
  },
});
