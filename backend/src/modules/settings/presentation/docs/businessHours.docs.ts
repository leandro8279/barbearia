import type { GetBusinessHoursResponseDTO } from '@/modules/settings/application/dtos/GetBusinessHoursDTO';
import { BusinessHourSchema, HolidaySchema } from '@/modules/settings/presentation/docs/businessSettings.docs';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

export const BusinessHoursSchema = registry.register(
  'BusinessHours',
  z.object({
    businessHours: z.array(BusinessHourSchema),
    holidays: z.array(
      HolidaySchema.extend({
        isDefault: z.boolean().openapi({ example: true, description: 'true quando a data coincide com um feriado padrão do sistema' }),
      }),
    ),
  }),
);

// Erro de compilação aqui = a documentação divergiu do DTO real.
type AssertDocMatchesDTO = GetBusinessHoursResponseDTO extends z.infer<typeof BusinessHoursSchema> ? true : never;
export const assertBusinessHoursDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'get',
  path: '/api/admin/settings/hours',
  tags: ['Configurações'],
  summary: 'Horários de funcionamento e feriados (admin)',
  description:
    'Devolve os horários semanais da unidade principal e a lista de feriados/exceções, que une os salvos aos feriados padrão (do ano anterior até dois anos à frente). Feriado salvo prevalece sobre o padrão da mesma data. Ordenado por data. Exige a permissão settings.write.',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: { description: 'Horários e feriados', content: jsonContent(BusinessHoursSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    404: { description: 'Unidade não encontrada', content: errorContent },
  },
});
