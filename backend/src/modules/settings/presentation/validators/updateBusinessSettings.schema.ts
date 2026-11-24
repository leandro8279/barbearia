import { z } from '@/shared/openapi/zod';
import { isValidCnpj } from '@/shared/utils/cnpj';
import { isValidBrazilianPhone } from '@/shared/utils/phone';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINK_REGEX = /^https?:\/\/[^ ]+$/i;
const DATA_IMAGE_REGEX = /^data:image\/(?:png|jpe?g|webp|svg\+xml);base64,([a-z\d+/=]+)$/i;

export const MAX_BUSINESS_IMAGE_BYTES = 200 * 1024;
const IMAGE_MESSAGE = 'Use uma imagem válida em URL ou data URL (até 200 KB).';

function isValidImage(value: string): boolean {
  if (!value) return true;
  if (!value.startsWith('data:')) return value.length <= 2048 && (value.startsWith('/') || LINK_REGEX.test(value));

  const match = DATA_IMAGE_REGEX.exec(value);

  return match !== null && Buffer.from(match[1], 'base64').byteLength <= MAX_BUSINESS_IMAGE_BYTES;
}

/** O logo também limita o tamanho da data URL inteira (como no legado). */
const isValidLogo = (value: string) => isValidImage(value) && Buffer.byteLength(value, 'utf8') <= MAX_BUSINESS_IMAGE_BYTES;

const addressField = (max = 120) => z.string().trim().max(max, `Cada campo do endereço aceita até ${max} caracteres.`).default('');
const socialLink = () =>
  z
    .string()
    .trim()
    .max(500, 'O link deve ter no máximo 500 caracteres.')
    .refine((value) => value === '' || LINK_REGEX.test(value), 'Informe um link válido.')
    .default('');

export const updateBusinessSettingsBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome da barbearia.')
    .max(120, 'O nome deve ter no máximo 120 caracteres.')
    .openapi({ example: 'Barbearia Estação' }),
  cnpj: z
    .string()
    .trim()
    .max(24, 'O CNPJ deve ter no máximo 24 caracteres.')
    .refine((value) => value === '' || isValidCnpj(value), 'Informe um CNPJ válido.')
    .default('')
    .openapi({ example: '11.222.333/0001-81', description: 'Opcional. Vazio remove o CNPJ.' }),
  phone: z
    .string()
    .trim()
    .min(1, 'Informe o telefone.')
    .max(24, 'O telefone deve ter no máximo 24 caracteres.')
    .refine(isValidBrazilianPhone, 'Informe um telefone brasileiro válido com DDD.')
    .openapi({ example: '(11) 3333-1212' }),
  whatsapp: z
    .string()
    .trim()
    .max(24, 'O WhatsApp deve ter no máximo 24 caracteres.')
    .refine((value) => value === '' || isValidBrazilianPhone(value), 'Informe um WhatsApp brasileiro válido com DDD.')
    .default('')
    .openapi({ example: '551133331212' }),
  email: z
    .string()
    .trim()
    .max(160, 'O e-mail deve ter no máximo 160 caracteres.')
    .refine((value) => value === '' || EMAIL_REGEX.test(value), 'Informe um e-mail válido.')
    .default('')
    .openapi({ example: 'contato@barbearia.test' }),
  addressDetails: z
    .object({
      zip: addressField(),
      street: addressField(),
      number: addressField(),
      complement: addressField(),
      neighborhood: addressField(),
      city: addressField(),
      state: addressField(),
      reference: addressField(200),
    })
    .default({ zip: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', reference: '' })
    .openapi({ description: 'O campo `address` (texto corrido) é montado a partir destes campos.' }),
  logo: z
    .string()
    .refine(isValidLogo, IMAGE_MESSAGE)
    .default('')
    .openapi({ description: 'URL, caminho ou data URL (até 200 KB). Vazio remove o logo.' }),
  photos: z
    .array(z.string().trim().refine(isValidImage, IMAGE_MESSAGE))
    .max(8, 'Cadastre no máximo oito fotos.')
    .default([])
    .openapi({ example: ['/seed/barber-1.svg'], description: 'Strings vazias são ignoradas. Máximo de 8, até 200 KB cada.' }),
  amenities: z
    .array(z.string().trim().max(60, 'Cada comodidade aceita até 60 caracteres.'))
    .max(20, 'Cadastre no máximo vinte comodidades.')
    .default([])
    .openapi({ example: ['Wi-Fi', 'Café'], description: 'Vazias e duplicadas são ignoradas.' }),
  socials: z
    .object({ instagram: socialLink(), facebook: socialLink(), tiktok: socialLink(), website: socialLink() })
    .default({ instagram: '', facebook: '', tiktok: '', website: '' }),
});

export type UpdateBusinessSettingsBody = z.infer<typeof updateBusinessSettingsBodySchema>;
