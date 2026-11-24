import type { GetNotificationSettingsResponseDTO } from '@/modules/settings/application/dtos/GetNotificationSettingsDTO';
import {
    NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES, NOTIFICATION_TYPES
} from '@/modules/settings/domain/entities/Notification';

import { bearerAuth, errorContent, jsonContent, registry } from '@/shared/openapi/registry';
import { z } from '@/shared/openapi/zod';

const NotificationTypeSchema = z.enum(NOTIFICATION_TYPES);
const NotificationChannelSchema = z.enum(NOTIFICATION_CHANNELS);
const NotificationStatusSchema = z.enum(NOTIFICATION_STATUSES);

const NotificationLogItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  appointmentId: z.string().uuid().nullable(),
  type: NotificationTypeSchema.openapi({ example: 'reminder24' }),
  channel: NotificationChannelSchema.openapi({ example: 'whatsapp' }),
  status: NotificationStatusSchema.openapi({ example: 'scheduled' }),
  scheduledAt: z.string().datetime(),
  sentAt: z.string().datetime().nullable(),
  readyAt: z.string().datetime().nullable(),
  resendOf: z.string().uuid().nullable(),
  sentFrom: z.string().uuid().nullable(),
  message: z.string().openapi({ example: 'Olá João, lembrete: seu horário com Rafael é amanhã, 10:00.' }),
  customerName: z.string().openapi({ example: 'João Silva' }),
  customerPhone: z.string().openapi({ example: '62999998888' }),
  customerEmail: z.string().openapi({ example: 'joao@email.com' }),
  appointmentStart: z.string().datetime().nullable(),
  barberName: z.string().openapi({ example: 'Rafael Nogueira' }),
});

export const NotificationSettingsResponseSchema = registry.register(
  'NotificationSettingsResponse',
  z.object({
    settings: z.object({
      events: z
        .record(NotificationTypeSchema, z.boolean())
        .openapi({ example: { confirmation: true, reminder24: true, reminder2: true, post: true } }),
      channels: z.record(NotificationChannelSchema, z.boolean()).openapi({ example: { whatsapp: true, email: false } }),
      quietHours: z.object({
        enabled: z.boolean().openapi({ example: true }),
        start: z.string().openapi({ example: '22:00' }),
        end: z.string().openapi({ example: '08:00' }),
      }),
      retentionDays: z.number().int().openapi({ example: 180 }),
      reminders: z.boolean().openapi({ description: 'Derivado: true se algum lembrete (24h ou 2h) estiver ativo' }),
      reminderHours: z.array(z.number().int()).openapi({ example: [24, 2] }),
    }),
    templates: z.record(NotificationTypeSchema, z.string()).openapi({
      description: 'Texto de cada mensagem. Variáveis: {nome}, {barbeiro}, {horario}.',
      example: { confirmation: 'Olá {nome}, seu horário com {barbeiro} está confirmado para {horario}.' },
    }),
    notifications: z.array(NotificationLogItemSchema),
  }),
);

// Erro de compilação aqui = a documentação divergiu do DTO real.
type AssertDocMatchesDTO = GetNotificationSettingsResponseDTO extends z.infer<typeof NotificationSettingsResponseSchema> ? true : never;
export const assertNotificationSettingsDocMatchesDTO: AssertDocMatchesDTO = true;

registry.registerPath({
  method: 'get',
  path: '/api/admin/settings/notifications',
  tags: ['Configurações'],
  summary: 'Configurações de notificações (admin)',
  description:
    'Devolve a configuração de envio (eventos, canais, horário silencioso e retenção), os textos das mensagens e as 100 notificações mais recentes. Campos ausentes na configuração e textos vazios voltam aos padrões. Exige a permissão settings.write.',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: { description: 'Configurações, modelos e histórico', content: jsonContent(NotificationSettingsResponseSchema) },
    401: { description: 'Token ausente, inválido ou expirado', content: errorContent },
    403: { description: 'Sem permissão', content: errorContent },
  },
});
