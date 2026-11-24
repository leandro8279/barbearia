import { APPOINTMENT_STATUSES } from '@/modules/appointments/domain/entities/Appointment';
import { BusinessHourSchema, HolidaySchema } from '@/modules/settings/presentation/docs/businessSettings.docs';
import { saveBusinessHoursBodySchema } from '@/modules/settings/presentation/validators/saveBusinessHours.schema';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

import type { SaveBusinessHoursResponseDTO } from '@/modules/settings/application/dtos/SaveBusinessHoursDTO';
const ImpactedAppointmentSchema = z.object({
  id: z.string().uuid(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  status: z.enum(APPOINTMENT_STATUSES).openapi({ example: 'confirmed' }),
  customerName: z.string().openapi({ example: 'João Silva' }),
  barberName: z.string().openapi({ example: 'Rafael Nogueira' }),
});

export const SaveBusinessHoursResponseSchema = registry.register(
  'SaveBusinessHoursResponse',
  z.object({
    businessHours: z.array(BusinessHourSchema),
    holidays: z.array(HolidaySchema),
    impactedAppointments: z.array(ImpactedAppointmentSchema),
  }),
);

// Erro de compilação aqui = a documentação divergiu do DTO real.
type AssertDocMatchesDTO = SaveBusinessHoursResponseDTO extends z.infer<typeof SaveBusinessHoursResponseSchema> ? true : never;
export const assertSaveBusinessHoursDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'patch',
  path: '/api/admin/settings/hours',
  tags: ['Configurações'],
  summary: 'Atualizar horários e feriados (admin)',
  description:
    'Substitui o horário semanal (os sete dias, até seis faixas por dia, sem sobreposição) e a lista de feriados/exceções (até 200, datas únicas) da unidade principal. Feriado fechado não guarda faixas. Se agendamentos futuros ativos ficarem fora do novo expediente, responde 409 com a lista, a menos que `confirmAffected` seja true; nesse caso grava e devolve os agendamentos impactados. Registra auditoria. Exige a permissão settings.write.',
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: jsonContent(saveBusinessHoursBodySchema) } },
  responses: {
    200: { description: 'Horários atualizados', content: jsonContent(SaveBusinessHoursResponseSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    404: { description: 'Unidade não encontrada', content: errorContent },
    409: { description: 'A mudança afeta agendamentos futuros (`details.impactedAppointments`)', content: errorContent },
    422: { description: 'Dados inválidos', content: errorContent },
  },
});
