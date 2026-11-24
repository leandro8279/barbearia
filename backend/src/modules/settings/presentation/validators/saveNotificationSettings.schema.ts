import { z } from '@/shared/openapi/zod';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const EVENTS_MESSAGE = 'Confira quando as notificações serão enviadas.';
const CHANNELS_MESSAGE = 'Escolha os canais de notificação.';
const QUIET_HOURS_MESSAGE = 'Confira o horário silencioso.';
const RETENTION_MESSAGE = 'A retenção deve ser de 30 a 730 dias.';
const TEMPLATE_REQUIRED = 'Informe o texto da mensagem.';

const eventFlag = () => z.boolean({ error: EVENTS_MESSAGE });
const channelFlag = () => z.boolean({ error: CHANNELS_MESSAGE });
const time = (example: string) => z.string({ error: QUIET_HOURS_MESSAGE }).regex(TIME_REGEX, QUIET_HOURS_MESSAGE).openapi({ example });
const template = (example: string) =>
  z
    .string({ error: TEMPLATE_REQUIRED })
    .trim()
    .min(3, 'Cada mensagem precisa ter pelo menos três caracteres.')
    .max(1000, 'A mensagem deve ter no máximo 1000 caracteres.')
    .openapi({ example, description: 'Variáveis: {nome}, {barbeiro}, {horario}' });

export const saveNotificationSettingsBodySchema = z
  .object({
    events: z.object({ confirmation: eventFlag(), reminder24: eventFlag(), reminder2: eventFlag(), post: eventFlag() }, { error: EVENTS_MESSAGE }),
    channels: z.object({ whatsapp: channelFlag(), email: channelFlag() }, { error: CHANNELS_MESSAGE }),
    quietHours: z
      .object({ enabled: z.boolean().default(false), start: time('22:00'), end: time('08:00') }, { error: QUIET_HOURS_MESSAGE })
      .refine((value) => value.start !== value.end, { message: QUIET_HOURS_MESSAGE, path: ['end'] }),
    retentionDays: z
      .number({ error: RETENTION_MESSAGE })
      .int(RETENTION_MESSAGE)
      .min(30, RETENTION_MESSAGE)
      .max(730, RETENTION_MESSAGE)
      .openapi({ example: 180 }),
    templates: z.object(
      {
        confirmation: template('Olá {nome}, seu horário com {barbeiro} está confirmado para {horario}.'),
        reminder24: template('Olá {nome}, lembrete: seu horário com {barbeiro} é amanhã, {horario}.'),
        reminder2: template('Olá {nome}, seu horário com {barbeiro} começa em breve: {horario}.'),
        post: template('Olá {nome}, obrigado pela visita! Esperamos você novamente.'),
      },
      { error: TEMPLATE_REQUIRED },
    ),
  })
  .refine((value) => value.channels.whatsapp || value.channels.email, { message: 'Ative pelo menos um canal de envio.', path: ['channels'] });

export type SaveNotificationSettingsBody = z.infer<typeof saveNotificationSettingsBodySchema>;
