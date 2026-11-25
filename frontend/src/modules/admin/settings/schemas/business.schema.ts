import { z } from 'zod';
import { validators } from '@/shared/lib/validators';

const optionalUrl = z
  .string()
  .trim()
  .max(500, 'Use no máximo 500 caracteres.')
  .refine((value) => !value || /^https?:\/\/[^ ]+$/i.test(value), 'Informe um link http ou https válido.');

export const businessSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do negócio.').max(120, 'Use no máximo 120 caracteres.'),
  cnpj: z
    .string()
    .trim()
    .refine((value) => !value || validators.cnpj(value), 'Informe um CNPJ válido.'),
  phone: z.string().trim().refine(validators.phone, 'Informe um telefone brasileiro válido com DDD.'),
  whatsapp: z
    .string()
    .trim()
    .refine((value) => !value || validators.phone(value), 'Informe um WhatsApp válido com DDD.'),
  email: z
    .string()
    .trim()
    .refine((value) => !value || z.email().safeParse(value).success, 'Informe um e-mail válido.'),
  logo: z.string(),
  addressDetails: z.object({
    zip: z.string().trim().max(12),
    street: z.string().trim().min(2, 'Informe o endereço.').max(120),
    number: z.string().trim().max(20),
    complement: z.string().trim().max(120),
    neighborhood: z.string().trim().max(120),
    city: z.string().trim().min(2, 'Informe a cidade.').max(120),
    state: z
      .string()
      .trim()
      .min(2, 'Informe o estado.')
      .max(2)
      .transform((value) => value.toUpperCase()),
    reference: z.string().trim().max(200),
  }),
  socials: z.object({ instagram: optionalUrl, facebook: optionalUrl, tiktok: optionalUrl, website: optionalUrl }),
  amenities: z.array(z.string().trim().min(1).max(60)).max(20),
  photos: z.array(z.string()).max(8),
});

export type BusinessFormValues = z.infer<typeof businessSchema>;
