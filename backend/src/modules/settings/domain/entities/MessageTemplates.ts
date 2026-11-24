import {
    NOTIFICATION_TYPES, NotificationType
} from '@/modules/settings/domain/entities/Notification';

export const DEFAULT_MESSAGE_TEMPLATES: Record<NotificationType, string> = {
  confirmation: 'Olá {nome}, seu horário com {barbeiro} está confirmado para {horario}.',
  reminder24: 'Olá {nome}, lembrete: seu horário com {barbeiro} é amanhã, {horario}.',
  reminder2: 'Olá {nome}, seu horário com {barbeiro} começa em breve: {horario}.',
  post: 'Olá {nome}, obrigado pela visita! Esperamos você novamente.',
};

export class MessageTemplates {
  private constructor(private readonly texts: Record<NotificationType, string>) {}

  static resolve(saved: Partial<Record<NotificationType, string>> = {}): MessageTemplates {
    const texts = Object.fromEntries(NOTIFICATION_TYPES.map((type) => [type, saved[type] || DEFAULT_MESSAGE_TEMPLATES[type]])) as Record<
      NotificationType,
      string
    >;

    return new MessageTemplates(texts);
  }

  get byType(): Record<NotificationType, string> {
    return { ...this.texts };
  }
}
