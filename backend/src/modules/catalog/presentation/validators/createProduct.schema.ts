import { PRODUCT_KINDS } from '@/modules/catalog/domain/entities/Product';

import { z } from '@/shared/openapi/zod';

const DATA_IMAGE_REGEX = /^data:image\/(?:png|jpe?g|webp);base64,([A-Za-z0-9+/]*={0,2})$/;

export const MAX_PRODUCT_IMAGE_BYTES = 200 * 1024;

function isValidImage(value: string): boolean {
  if (!value.startsWith('data:')) return value.length <= 2048; // URL/caminho
  const match = DATA_IMAGE_REGEX.exec(value);

  return match !== null && Buffer.from(match[1], 'base64').byteLength <= MAX_PRODUCT_IMAGE_BYTES;
}

const nonNegativeInt = (message: string) => z.number(message).int(message).min(0, message);
const INT_MESSAGE = 'Informe um valor inteiro não negativo.';

export const createProductBodySchema = z.object({
  sku: z.string().trim().toUpperCase().min(2, 'Informe um SKU válido.').max(60).openapi({ example: 'BAR-021' }),
  name: z.string().trim().min(2, 'Informe o nome do produto.').max(120).openapi({ example: 'Pomada matte' }),
  categoryId: z.string().min(1, 'Selecione uma categoria válida.').openapi({ example: '3f6c2a1e-8b7d-4c9a-9e2f-1a2b3c4d5e6f' }),
  price: nonNegativeInt(INT_MESSAGE).openapi({ example: 3500, description: 'Em centavos' }),
  costCents: nonNegativeInt(INT_MESSAGE).openapi({ example: 1800, description: 'Em centavos' }),
  stock: nonNegativeInt(INT_MESSAGE).default(0).openapi({ example: 10, description: 'Saldo inicial (padrão 0)' }),
  minStock: nonNegativeInt(INT_MESSAGE).openapi({ example: 5 }),
  commissionPct: z.number('A comissão deve ficar entre 0% e 100%.').min(0, 'A comissão deve ficar entre 0% e 100%.').max(100, 'A comissão deve ficar entre 0% e 100%.').openapi({ example: 10 }),
  kind: z.enum(PRODUCT_KINDS, { error: 'Selecione se o produto é para revenda ou uso interno.' }).openapi({ example: 'resale' }),
  image: z
    .string()
    .refine(isValidImage, 'Use uma imagem PNG, JPG ou WebP válida (até 200 KB).')
    .default('')
    .openapi({ description: 'Data URL (PNG/JPG/WebP, até 200 KB) ou URL.' }),
  active: z.boolean().default(true),
});

export type CreateProductBody = z.infer<typeof createProductBodySchema>;
