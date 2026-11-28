import { ConfirmedAppointment, getConfirmedAppointment } from '@/modules/booking/api/booking';
import { getPublicUnit } from '@/modules/site/api/unit';

import { formatBRL, formatDateTime } from '@/shared/lib/format';
import { MobxQuery } from '@/shared/lib/query';

import { makeAutoObservable } from 'mobx';

type Unit = Awaited<ReturnType<typeof getPublicUnit>>;

type BookingConfirmedPageStoreExclude = 'appointmentQuery' | 'unitQuery' | 'navigate';

interface CalendarFileInput {
  id: number;
  code: string;
  start: string;
  end: string;
  title: string;
  description: string;
  location: string;
}

const CONFIRMED_PATH = /^\/agendar\/confirmado\/(\d+)$/;

function readTokenFromFragment(): string | null {
  return new URLSearchParams(window.location.hash.slice(1)).get('token');
}

function toCalendarDate(value: string): string {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function escapeCalendarText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function downloadCalendarFile(input: CalendarFileInput) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Barbearia//Agendamento//PT-BR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${input.id}@barbearia`,
    `DTSTAMP:${toCalendarDate(new Date().toISOString())}`,
    `DTSTART:${toCalendarDate(input.start)}`,
    `DTEND:${toCalendarDate(input.end)}`,
    `SUMMARY:${escapeCalendarText(input.title)}`,
    `DESCRIPTION:${escapeCalendarText(input.description)}`,
    `LOCATION:${escapeCalendarText(input.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const file = new Blob([`${lines.join('\r\n')}\r\n`], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = `agendamento-${input.code}.ics`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export class BookingConfirmedPageStore {
  location: string;
  guestToken: string | null = readTokenFromFragment();

  private readonly navigate: (path: string) => void;
  private readonly appointmentQuery = new MobxQuery<ConfirmedAppointment>();
  private readonly unitQuery = new MobxQuery<Unit>();

  constructor(navigate: (path: string) => void, location: string) {
    this.navigate = navigate;
    this.location = location;
    makeAutoObservable<BookingConfirmedPageStore, BookingConfirmedPageStoreExclude>(this, { appointmentQuery: false, unitQuery: false, navigate: false }, { autoBind: true });
  }

  // ---------- Rota ----------
  get appointmentId() {
    return this.location.match(CONFIRMED_PATH)?.[1] ?? '';
  }

  get hasValidId() {
    return Boolean(this.appointmentId);
  }

  // ---------- Query results (computed) ----------
  private get appointmentResult() {
    const id = this.appointmentId;
    const guestToken = this.guestToken;
    return this.appointmentQuery.query({
      queryKey: ['confirmed-appointment', { id, hasGuestToken: Boolean(guestToken) }],
      queryFn: () => getConfirmedAppointment(id, guestToken),
      enabled: /^\d+$/.test(id),
      staleTime: 30_000,
      retry: 1,
    });
  }

  private get unitResult() {
    return this.unitQuery.query({ queryKey: ['units', { id: 1 }], queryFn: getPublicUnit, staleTime: 5 * 60 * 1000 });
  }

  // ---------- Estados ----------
  get appointment() {
    return this.appointmentResult.data;
  }

  get isPending() {
    return this.appointmentResult.isPending;
  }

  get isError() {
    return this.appointmentResult.isError;
  }

  get isSuccess() {
    return this.appointmentResult.isSuccess && this.appointment;
  }

  get unitIsPending() {
    return this.unitResult.isPending;
  }

  get unitIsError() {
    return this.unitResult.isError;
  }

  get unitIsSuccess() {
    return this.unitResult.isSuccess;
  }

  // ---------- Dados derivados ----------
  get address() {
    return this.unitResult.data?.address?.trim() ?? '';
  }

  get serviceNames() {
    return this.appointment?.items.map((item) => item.name).filter(Boolean) ?? [];
  }

  get serviceLabel() {
    return this.serviceNames.length ? this.serviceNames.join(', ') : 'Serviços agendados';
  }

  get confirmationText() {
    const appointment = this.appointment;
    if (!appointment) return '';
    return `Agendamento ${appointment.code} confirmado para ${formatDateTime(appointment.start)} com ${appointment.barber.name}. Serviços: ${this.serviceLabel}. Total: ${formatBRL(appointment.total)}.`;
  }

  get googleCalendarUrl() {
    const appointment = this.appointment;
    if (!appointment) return '';
    return `https://calendar.google.com/calendar/render?${new URLSearchParams({
      action: 'TEMPLATE',
      text: `Barbearia — ${this.serviceLabel}`,
      dates: `${toCalendarDate(appointment.start)}/${toCalendarDate(appointment.end)}`,
      details: this.confirmationText,
      location: this.address,
    }).toString()}`;
  }

  get whatsappUrl() {
    return this.appointment ? `https://wa.me/?text=${encodeURIComponent(this.confirmationText)}` : '';
  }

  get directionsUrl() {
    return this.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(this.address)}` : '';
  }

  get rescheduleUrl() {
    return this.appointment ? `/conta/agendamentos?reagendar=1&appointmentId=${this.appointment.id}` : '/conta/agendamentos?reagendar=1';
  }

  get cancelUrl() {
    return this.appointment ? `/conta/agendamentos?cancelar=1&appointmentId=${this.appointment.id}` : '/conta/agendamentos?cancelar=1';
  }

  get calendarDetails(): CalendarFileInput | null {
    const appointment = this.appointment;
    if (!appointment) return null;
    return {
      id: appointment.id,
      code: appointment.code,
      start: appointment.start,
      end: appointment.end,
      title: `Barbearia — ${this.serviceLabel}`,
      description: this.confirmationText,
      location: this.address,
    };
  }

  get statusNotice() {
    const appointment = this.appointment;
    if (!appointment || appointment.status === 'confirmed') return null;
    return `Situação atual: ${appointment.status === 'canceled' ? 'cancelado' : appointment.status.replaceAll('_', ' ')}.`;
  }

  // ---------- Actions ----------
  setLocation(location: string) {
    this.location = location;
    this.guestToken = readTokenFromFragment();
  }

  refetch() {
    void this.appointmentResult.refetch();
  }

  refetchUnit() {
    void this.unitResult.refetch();
  }

  goToHome() {
    this.navigate('/');
  }

  downloadCalendar() {
    const details = this.calendarDetails;
    if (details) downloadCalendarFile(details);
  }
}
