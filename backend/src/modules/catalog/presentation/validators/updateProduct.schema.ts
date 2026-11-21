import { PRODUCT_KINDS } from '@/modules/catalog/domain/entities/Product';
import { isValidImage } from '@/modules/catalog/presentation/validators/createProduct.schema';

import { z } from '@/shared/openapi/zod';

const INT_MESSAGE = 'Informe um valor inteiro não negativo.';
const nonNegativeInt = () => z.number(INT_MESSAGE).int(INT_MESSAGE).min(0, INT_MESSAGE);
const PCT_MESSAGE = 'A comissão deve ficar entre 0% e 100%.';

export const updateProductBodySchema = z
  .object({
    sku: z.string().trim().toUpperCase().min(2, 'Informe um SKU válido.').max(60).optional().openapi({ example: 'BAR-021' }),
    name: z.string().trim().min(2, 'Informe o nome do produto.').max(120).optional().openapi({ example: 'Pomada matte' }),
    categoryId: z.string().min(1, 'Selecione uma categoria válida.').optional().openapi({ example: '3f6c2a1e-8b7d-4c9a-9e2f-1a2b3c4d5e6f' }),
    price: nonNegativeInt().optional().openapi({ example: 3500, description: 'Em centavos' }),
    costCents: nonNegativeInt().optional().openapi({ example: 1800, description: 'Em centavos' }),
    minStock: nonNegativeInt().optional().openapi({ example: 5 }),
    commissionPct: z.number(PCT_MESSAGE).min(0, PCT_MESSAGE).max(100, PCT_MESSAGE).optional().openapi({ example: 10 }),
    kind: z.enum(PRODUCT_KINDS, { error: 'Selecione se o produto é para revenda ou uso interno.' }).optional().openapi({ example: 'resale' }),
    image: z
      .string()
      .refine(isValidImage, 'Use uma imagem PNG, JPG ou WebP válida (até 200 KB).')
      .optional()
      .openapi({ description: 'Data URL (PNG/JPG/WebP, até 200 KB) ou URL. String vazia remove a imagem.' }),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), { message: 'Informe ao menos um campo para atualizar.' });

export type UpdateProductBody = z.infer<typeof updateProductBodySchema>;
