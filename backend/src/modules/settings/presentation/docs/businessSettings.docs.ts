import type { GetBusinessSettingsResponseDTO } from '@/modules/settings/application/dtos/GetBusinessSettingsDTO';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

export const TimeRangeSchema = z.object({
  start: z.string().openapi({ example: '08:00' }),
  end: z.string().openapi({ example: '20:00' }),
});

export const BusinessHourSchema = z.object({
  weekday: z.number().int().min(0).max(6).openapi({ example: 1, description: '0 = domingo ... 6 = sábado' }),
  ranges: z.array(TimeRangeSchema),
});

export const HolidaySchema = z.object({
  date: z.string().openapi({ example: '2026-12-25' }),
  name: z.string().openapi({ example: 'Natal' }),
  closed: z.boolean().openapi({ example: true }),
  ranges: z.array(TimeRangeSchema),
});

export const AddressDetailsSchema = z.object({
  zip: z.string().openapi({ example: '01001-000' }),
  street: z.string().openapi({ example: 'Rua das Palmeiras' }),
  number: z.string().openapi({ example: '120' }),
  complement: z.string(),
  neighborhood: z.string().openapi({ example: 'Centro' }),
  city: z.string().openapi({ example: 'São Paulo' }),
  state: z.string().openapi({ example: 'SP' }),
  reference: z.string(),
});

export const BusinessSettingsSchema = registry.register(
  'BusinessSettings',
  z.object({
    unit: z.object({
      id: z.string().uuid(),
      name: z.string().openapi({ example: 'Barbearia Estação' }),
      address: z.string().openapi({ example: 'Rua das Palmeiras, 120, Centro, São Paulo - SP, 01001-000' }),
      addressDetails: AddressDetailsSchema,
      phone: z.string().openapi({ example: '(11) 3333-1212' }),
      whatsapp: z.string().openapi({ example: '551133331212' }),
      logo: z.string().nullable(),
      amenities: z.array(z.string()).openapi({ example: ['Wi-Fi', 'Café', 'Acessível'] }),
      photos: z.array(z.string()).openapi({ example: ['/seed/barber-1.svg'] }),
      businessHours: z.array(BusinessHourSchema),
      holidays: z.array(HolidaySchema),
    }),
    business: z.object({
      unitId: z.string().uuid(),
      name: z.string().openapi({ example: 'Barbearia Estação' }),
      cnpj: z.string().openapi({ example: '' }),
      email: z.string().openapi({ example: 'contato@barbearia.test' }),
      socials: z.object({
        instagram: z.string(),
        facebook: z.string(),
        tiktok: z.string(),
        website: z.string(),
      }),
      timezone: z.string().openapi({ example: 'America/Sao_Paulo' }),
    }),
  }),
);

// Erro de compilação aqui = a documentação divergiu do DTO real.
type AssertDocMatchesDTO = GetBusinessSettingsResponseDTO extends z.infer<typeof BusinessSettingsSchema> ? true : never;
export const assertBusinessSettingsDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'get',
  path: '/api/admin/settings/business',
  tags: ['Configurações'],
  summary: 'Dados do negócio (admin)',
  description:
    'Devolve a unidade principal (endereço, contatos, fotos, comodidades, horários e feriados) e os dados do negócio (nome, CNPJ, e-mail, redes sociais, fuso). Sem configurações gravadas, os dados do negócio voltam vazios com o fuso America/Sao_Paulo. Exige a permissão settings.read.',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: { description: 'Unidade e dados do negócio', content: jsonContent(BusinessSettingsSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    404: { description: 'Unidade não encontrada', content: errorContent },
  },
});
