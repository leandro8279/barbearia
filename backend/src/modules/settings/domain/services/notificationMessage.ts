import type { NotificationType } from '@/modules/settings/domain/entities/Notification';

export const DEFAULT_TEMPLATES: Record<NotificationType, string> = {
  confirmation: 'Olá {nome}, seu horário com {barbeiro} está confirmado para {horario}.',
  reminder24: 'Olá {nome}, lembrete: seu horário com {barbeiro} é amanhã, {horario}.',
  reminder2: 'Olá {nome}, seu horário com {barbeiro} começa em breve: {horario}.',
  post: 'Olá {nome}, obrigado pela visita! Esperamos você novamente.',
};

export interface MessageContext {
  customerName: string;
  barberName: string;
  appointmentStart: Date | null;
}

export function formatAppointmentTime(start: Date | null): string {
  if (!start) return '';

  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(start);
}

export function renderNotificationMessage(template: string, { customerName, barberName, appointmentStart }: MessageContext): string {
  return template
    .replaceAll('{nome}', () => customerName)
    .replaceAll('{barbeiro}', () => barberName)
    .replaceAll('{horario}', () => formatAppointmentTime(appointmentStart));
}
