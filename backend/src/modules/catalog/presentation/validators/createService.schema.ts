import { z } from '@/shared/openapi/zod';
import { slugify } from '@/shared/utils/slug';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATA_IMAGE_REGEX = /^data:image\/(?:png|jpe?g|webp);base64,([A-Za-z0-9+/]*={0,2})$/;

export const MAX_SERVICE_IMAGE_BYTES = 1024 * 1024;

function isValidImage(value: string): boolean {
  if (!value.startsWith('data:')) return value.length <= 2048; // URL/caminho
  const match = DATA_IMAGE_REGEX.exec(value);

  return match !== null && Buffer.from(match[1], 'base64').byteLength <= MAX_SERVICE_IMAGE_BYTES;
}

const fiveMinutes = (message: string) => z.number().int(message).min(5, message).multipleOf(5, message);
const percentage = (message: string) => z.number().min(0, message).max(100, message);

const barberAssignmentSchema = z.object({
  barberId: z.string().uuid('Id de profissional inválido').openapi({ example: '3f6c2a1e-8b7d-4c9a-9e2f-1a2b3c4d5e6f' }),
  assigned: z.boolean().openapi({ example: true }),
  commissionPct: percentage('A comissão específica deve ficar entre 0% e 100%.').nullish().openapi({ example: 48 }),
});

export const createServiceBodySchema = z
  .object({
    name: z.string().trim().min(2, 'Informe o nome do serviço.').max(120).openapi({ example: 'Corte infantil' }),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(140)
      .regex(SLUG_REGEX, 'Slug inválido')
      .or(z.literal(''))
      .optional()
      .openapi({ example: 'corte-infantil', description: 'Opcional. Se omitido, é gerado a partir do nome.' }),
    categoryId: z.string().min(1, 'Selecione uma categoria válida.').openapi({ example: '3f6c2a1e-8b7d-4c9a-9e2f-1a2b3c4d5e6f' }),
    description: z.string().trim().max(2000).default('').openapi({ example: 'Corte para crianças até 10 anos' }),
    image: z
      .string()
      .refine(isValidImage, 'Use uma imagem PNG, JPG ou WebP válida (até 1 MB).')
      .default('')
      .openapi({ description: 'Data URL (PNG/JPG/WebP, até 1 MB) ou URL.' }),
    durationMin: fiveMinutes('A duração precisa ser múltipla de 5 minutos.').openapi({ example: 40 }),
    bufferMin: fiveMinutes('O intervalo precisa ser múltiplo de 5 minutos.').or(z.literal(0)).default(0).openapi({ example: 0 }),
    price: z.number().int('Informe um preço válido em centavos.').min(0, 'Informe um preço válido em centavos.').openapi({ example: 6000, description: 'Em centavos' }),
    commissionPct: percentage('A comissão deve ficar entre 0% e 100%.').openapi({ example: 45 }),
    active: z.boolean().default(true),
    featured: z.boolean().default(false),
    barberAssignments: z.array(barberAssignmentSchema),
  })
  .superRefine((value, ctx) => {
    if (!value.slug && !slugify(value.name)) {
      ctx.addIssue({ code: 'custom', message: 'O nome precisa ter letras ou números.', path: ['name'] });
    }

    const selected = value.barberAssignments.filter((assignment) => assignment.assigned);

    if (!selected.length) {
      ctx.addIssue({ code: 'custom', message: 'Selecione ao menos um profissional.', path: ['barberAssignments'] });
    }
    if (new Set(selected.map((assignment) => assignment.barberId)).size !== selected.length) {
      ctx.addIssue({ code: 'custom', message: 'Há profissionais duplicados nesta configuração.', path: ['barberAssignments'] });
    }
  });

export type CreateServiceBody = z.infer<typeof createServiceBodySchema>;
