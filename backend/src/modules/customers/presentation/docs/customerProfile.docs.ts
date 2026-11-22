import type { GetAdminCustomerProfileResponseDTO } from '@/modules/customers/application/dtos/GetAdminCustomerProfileDTO';
import {
    getAdminCustomerProfileParamsSchema
} from '@/modules/customers/presentation/validators/getAdminCustomerProfile.schema';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

export const AdminCustomerProfileSchema = registry.register(
  'AdminCustomerProfile',
  z.object({
    customer: z.object({
      id: z.string().uuid(),
      name: z.string().openapi({ example: 'João Silva' }),
      email: z.string().nullable(),
      phone: z.string().openapi({ example: '62999998888', description: 'Mascarado (**) *****-**88 sem customers.write' }),
      phoneMasked: z.boolean(),
      avatar: z.string().nullable(),
      birthDate: z.string().nullable().openapi({ example: '1995-04-20' }),
      cpf: z.string().nullable().openapi({ description: 'Só com customers.write' }),
      tags: z.array(z.string()),
      referralSource: z.string().nullable(),
      guest: z.boolean(),
      consent: z
        .object({ reminders: z.boolean(), marketing: z.boolean(), at: z.string().datetime().nullable() })
        .nullable()
        .openapi({ description: 'Só com customers.write' }),
    }),
    metrics: z.object({
      visitsCount: z.number().int(),
      averageTicketCents: z.number().int(),
      medianIntervalDays: z.number().nullable(),
      lastVisit: z.string().datetime().nullable(),
      totalSpentCents: z.number().int(),
    }),
    permissions: z.object({ history: z.boolean(), financial: z.boolean(), notes: z.boolean(), edit: z.boolean(), schedule: z.boolean() }),
    appointments: z
      .array(
        z.object({
          id: z.string().uuid(),
          code: z.string(),
          start: z.string().datetime(),
          end: z.string().datetime(),
          status: z.string(),
          items: z.array(z.object({ name: z.string(), priceCents: z.number().int(), durationMin: z.number().int() })),
        }),
      )
      .openapi({ description: 'Vazio sem agenda.read. Barbeiro só vê os próprios atendimentos.' }),
    financial: z
      .array(
        z.object({
          id: z.string().uuid(),
          appointmentId: z.string().uuid().nullable(),
          date: z.string().datetime(),
          totalCents: z.number().int(),
          items: z.array(z.object({ name: z.string(), qty: z.number().int() })),
          payments: z.array(z.object({ method: z.string(), amountCents: z.number().int() })),
        }),
      )
      .openapi({ description: 'Vazio sem cash.read.' }),
    notes: z
      .array(z.object({ id: z.string().uuid(), type: z.string(), text: z.string(), pinned: z.boolean(), createdAt: z.string().datetime() }))
      .openapi({ description: 'Vazio sem customers.write.' }),
  }),
);

type AssertDocMatchesDTO = GetAdminCustomerProfileResponseDTO extends z.infer<typeof AdminCustomerProfileSchema> ? true : never;
export const assertAdminCustomerProfileDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'get',
  path: '/api/admin/customers/{id}',
  tags: ['Clientes'],
  summary: 'Perfil do cliente (admin)',
  description:
    'Devolve dados, métricas, histórico, financeiro e notas. Os blocos variam por permissão: customers.write libera telefone completo, CPF, consentimento e notas; agenda.read libera o histórico; cash.read libera o financeiro. Exige a permissão customers.read.',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: getAdminCustomerProfileParamsSchema },
  responses: {
    200: { description: 'Perfil do cliente', content: jsonContent(AdminCustomerProfileSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    404: { description: 'Cliente não encontrado', content: errorContent },
    422: { description: 'Id inválido', content: errorContent },
  },
});
