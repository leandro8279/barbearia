import { useEffect } from 'react';

import { useAccountAppointment } from '@/modules/account/hooks/use-account-data';

import { AppointmentStatus } from '@/shared/components/status-badge';
import { useOverlay } from '@/shared/hooks/use-overlay';

import { reaction } from 'mobx';
import { useRoute } from 'wouter';

const statusLabels: Record<string, AppointmentStatus> = {
  pending: 'agendado',
  confirmed: 'confirmado',
  checked_in: 'aguardando',
  in_service: 'em_atendimento',
  done: 'concluido',
  canceled: 'cancelado',
  no_show: 'no_show',
};

export function downloadCalendarEvent(appointment: NonNullable<ReturnType<typeof useAccountAppointment>['appointment']>) {
  const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const formatUtc = (value: string) =>
    new Date(value)
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');
  const services = appointment.items.map((item) => item.name).join(', ');
  const content = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Barbearia//Agendamentos//PT-BR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:appointment-${appointment.id}@barbearia.local`,
    `DTSTAMP:${formatUtc(new Date().toISOString())}`,
    `DTSTART:${formatUtc(appointment.start)}`,
    `DTEND:${formatUtc(appointment.end)}`,
    `SUMMARY:${escape(`Agendamento na Barbearia — ${services}`)}`,
    `DESCRIPTION:${escape(`Profissional: ${appointment.barber.name}\nCódigo: ${appointment.code}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `agendamento-${appointment.code}.ics`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const useAccountAppointmentDetailPage = () => {
  const [, params] = useRoute('/conta/agendamentos/:id');
  const id = params?.id ?? '';
  const validId = /^\d+$/.test(id);
  const cancelOverlay = useOverlay('cancelar');
  const rescheduleOverlay = useOverlay('reagendar');
  const query = useAccountAppointment(() => ({ id, validId }));

  useEffect(() => {
    const dispose = reaction(
      () => query.appointment,
      (appointment) => {
        document.title = `${appointment ? `Agendamento ${appointment.code}` : 'Detalhe do agendamento'} | Barbearia`;
      },
    );

    return () => dispose();
  }, [query]);

  return {
    state: { validId, cancelOverlay, rescheduleOverlay },
    get store() {
      const appointment = query.appointment!;
      const canActOnAppointment = new Date(appointment.start).getTime() > Date.now();
      return {
        appointment: appointment,
        isError: query.isError,
        isPending: query.isPending,
        isSuccess: query.isSuccess,
        canReschedule: canActOnAppointment && ['pending', 'confirmed'].includes(appointment.status) && appointment.rescheduleCount < 2,
        canCancel: canActOnAppointment && ['pending', 'confirmed', 'checked_in'].includes(appointment.status),
        events: [...(appointment.events ?? [])].sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime()),
        status: statusLabels[appointment.status] ?? appointment.status.replaceAll('_', ' '),
      };
    },
    actions: {
      retry: () => query.refetch(),
      cancelOverlay: () => cancelOverlay.open(),
      rescheduleOverlay: () => rescheduleOverlay.open(),
    },
  };
};
