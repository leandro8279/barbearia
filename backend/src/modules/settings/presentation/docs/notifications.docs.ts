import type { ResendNotificationResponseDTO } from '@/modules/settings/application/dtos/ResendNotificationDTO';
import type { SaveNotificationSettingsResponseDTO } from '@/modules/settings/application/dtos/SaveNotificationSettingsDTO';
import {
    NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES, NOTIFICATION_TYPES
} from '@/modules/settings/domain/entities/Notification';
import {
    resendNotificationParamsSchema
} from '@/modules/settings/presentation/validators/resendNotification.schema';
import {
    saveNotificationSettingsBodySchema
} from '@/modules/settings/presentation/validators/saveNotificationSettings.schema';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

export const NotificationSettingsSchema = registry.register(
  'NotificationSettings',
  z.object({
    events: z.object({ confirmation: z.boolean(), reminder24: z.boolean(), reminder2: z.boolean(), post: z.boolean() }),
    channels: z.object({ whatsapp: z.boolean(), email: z.boolean() }),
    quietHours: z.object({
      enabled: z.boolean(),
      start: z.string().openapi({ example: '22:00' }),
      end: z.string().openapi({ example: '08:00' }),
    }),
    retentionDays: z.number().int().openapi({ example: 180 }),
    reminders: z.boolean().openapi({ description: 'Derivado: lembrete de 24h ou de 2h ativo' }),
    reminderHours: z.array(z.number().int()).openapi({ example: [24, 2] }),
  }),
);

type AssertSettingsNotificationSDocMatchesDTO = SaveNotificationSettingsResponseDTO extends z.infer<typeof NotificationSettingsSchema> ? true : never;
export const assertNotificationSettingsDocMatchesDTO: AssertSettingsNotificationSDocMatchesDTO = true;

registry.registerPath({
  method: 'patch',
  path: '/api/admin/settings/notifications',
  tags: ['Configurações'],
  summary: 'Salvar configurações de notificação (admin)',
  description:
    'Substitui eventos, canais, horário silencioso, retenção e os textos das quatro mensagens (corpo completo). Ao menos um canal precisa estar ativo. Registra auditoria. Exige a permissão settings.write.',
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: jsonContent(saveNotificationSettingsBodySchema) } },
  responses: {
    200: { description: 'Configurações salvas', content: jsonContent(NotificationSettingsSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    404: { description: 'Unidade não encontrada', content: errorContent },
    422: { description: 'Dados inválidos', content: errorContent },
  },
});

const NotificationListItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  appointmentId: z.string().uuid().nullable(),
  type: z.enum(NOTIFICATION_TYPES).openapi({ example: 'reminder24' }),
  channel: z.enum(NOTIFICATION_CHANNELS).openapi({ example: 'whatsapp' }),
  status: z.enum(NOTIFICATION_STATUSES).openapi({ example: 'ready' }),
  scheduledAt: z.string().datetime().nullable(),
  readyAt: z.string().datetime().nullable(),
  sentAt: z.string().datetime().nullable(),
  message: z.string().openapi({ example: 'Olá João, lembrete: seu horário com Rafael é amanhã, 25/11/2026 14:00.' }),
  resendOf: z.string().uuid().nullable(),
  customerName: z.string().openapi({ example: 'João Silva' }),
  customerPhone: z.string().openapi({ example: '62999998888' }),
  customerEmail: z.string().openapi({ example: 'joao@email.com' }),
  appointmentStart: z.string().datetime().nullable(),
  barberName: z.string().openapi({ example: 'Rafael Nogueira' }),
});

export const ResendNotificationResponseSchema = registry.register(
  'ResendNotificationResponse',
  z.object({
    notification: NotificationListItemSchema,
    url: z
      .string()
      .openapi({ example: 'https://wa.me/5562999998888?text=Ol%C3%A1%20Jo%C3%A3o', description: 'Link wa.me ou mailto com a mensagem pronta' }),
  }),
);

type AssertResendNotificationDocMatchesDTO = ResendNotificationResponseDTO extends z.infer<typeof ResendNotificationResponseSchema> ? true : never;
export const assertResendNotificationDocMatchesDTO: AssertResendNotificationDocMatchesDTO = true;

registry.registerPath({
  method: 'post',
  path: '/api/admin/settings/notifications/{id}/resend',
  tags: ['Configurações'],
  summary: 'Preparar reenvio de notificação (admin)',
  description:
    'Cria uma nova notificação "ready" a partir da original (usa a mensagem gravada ou renderiza o texto configurado) e devolve o link wa.me/mailto para envio manual. Barra reenvio quando o cliente não tem contato no canal ou recusou o tipo de mensagem. Registra auditoria. Exige a permissão settings.write.',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: resendNotificationParamsSchema },
  responses: {
    201: { description: 'Reenvio preparado', content: jsonContent(ResendNotificationResponseSchema) },
    400: { description: 'Cliente sem telefone/e-mail utilizável para o canal', content: errorContent },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
    404: { description: 'Notificação não encontrada', content: errorContent },
    409: { description: 'O cliente não pode receber a mensagem pelo canal selecionado', content: errorContent },
    422: { description: 'Id inválido', content: errorContent },
  },
});
