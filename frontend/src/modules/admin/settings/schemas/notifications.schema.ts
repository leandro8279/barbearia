import { z } from 'zod';

export const notificationSchema = z.object({
  events: z.object({ confirmation: z.boolean(), reminder24: z.boolean(), reminder2: z.boolean(), post: z.boolean() }),
  channels: z.object({ whatsapp: z.boolean(), email: z.boolean() }).refine((value) => value.whatsapp || value.email, 'Ative pelo menos um canal.'),
  quietHours: z
    .object({
      enabled: z.boolean(),
      start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.'),
      end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Informe um horário válido.'),
    })
    .refine((value) => value.start !== value.end, 'Os horários silenciosos precisam ser diferentes.'),
  retentionDays: z.number().int().min(30).max(730),
  templates: z.object({
    confirmation: z.string().trim().min(3).max(1000),
    reminder24: z.string().trim().min(3).max(1000),
    reminder2: z.string().trim().min(3).max(1000),
    post: z.string().trim().min(3).max(1000),
  }),
});

export type NotificationFormValues = z.infer<typeof notificationSchema>;
