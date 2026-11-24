import type { GetBookingSettingsResponseDTO } from '@/modules/settings/application/dtos/GetBookingSettingsDTO';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

export const BookingSettingsSchema = registry.register(
  'BookingSettings',
  z.object({
    slotGranularityMin: z.number().int().openapi({ example: 15, description: 'Grade de horários, em minutos' }),
    minAdvanceMin: z.number().int().openapi({ example: 60, description: 'Antecedência mínima para agendar, em minutos' }),
    maxDays: z.number().int().openapi({ example: 45, description: 'Quantos dias à frente a agenda fica aberta' }),
    defaultBufferMin: z.number().int().openapi({ example: 0, description: 'Intervalo padrão entre atendimentos, em minutos' }),
    cancelBeforeHours: z.number().int().openapi({ example: 4, description: 'Janela de cancelamento, em horas' }),
    rescheduleBeforeHours: z.number().int().openapi({ example: 4, description: 'Janela de reagendamento, em horas' }),
    maxReschedules: z.number().int().openapi({ example: 2 }),
    autoConfirm: z.boolean().openapi({ example: true }),
    maxFutureAppointments: z.number().int().openapi({ example: 3 }),
  }),
);

// Erro de compilação aqui = a documentação divergiu do DTO real.
type AssertDocMatchesDTO = GetBookingSettingsResponseDTO extends z.infer<typeof BookingSettingsSchema> ? true : never;
export const assertBookingSettingsDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'get',
  path: '/api/admin/settings/booking',
  tags: ['Configurações'],
  summary: 'Regras de agendamento (admin)',
  description:
    'Devolve as regras de agendamento da unidade principal. Campos ausentes na configuração salva voltam aos padrões. Exige a permissão settings.write.',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: { description: 'Regras de agendamento', content: jsonContent(BookingSettingsSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
  },
});
