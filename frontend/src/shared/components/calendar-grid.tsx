import { useMemo, useRef, useSyncExternalStore } from 'react';

import { StatusBadge } from '@/shared/components/status-badge';
import { formatDate, formatDuration } from '@/shared/lib/format';
import { BUSINESS_TIME_ZONE, FIXED_OFFSET } from '@/shared/lib/time';
import { Button } from '@/shared/ui/button';

import { RenderComponent } from './render-component';

import type { KeyboardEvent } from 'react';
export interface CalendarBarber {
  id: string;
  name: string;
}

export interface CalendarAppointment {
  id: string;
  barberId: string;
  startsAt: string;
  durationMinutes: number;
  customerName: string;
  serviceName: string;
  status: string;
  canMove?: boolean;
}

export interface CalendarBlock {
  id: string;
  barberId: string | null;
  startsAt: string;
  endsAt: string;
  type?: string;
  reason?: string;
}

export interface CalendarDropTarget {
  barberId: string;
  date: string;
  time: string;
}

export interface CalendarGridProps {
  date: Date;
  barbers: CalendarBarber[];
  appointments: CalendarAppointment[];
  allAppointments?: CalendarAppointment[];
  blocks?: CalendarBlock[];
  view?: 'day' | 'week';
  startHour?: number;
  endHour?: number;
  intervalMinutes?: number;
  onSelectAppointment?: (appointment: CalendarAppointment) => void;
  onSelectSlot?: (target: CalendarDropTarget) => void;
  onMoveAppointment?: (appointmentId: string, target: CalendarDropTarget) => void;
}

interface CalendarColumn {
  date: Date;
  barber: CalendarBarber;
}

interface PointerDrag {
  appointmentId: string;
  startX: number;
  startY: number;
  moved: boolean;
}

const statusLabels: Record<string, string> = {
  pending: 'agendado',
  confirmed: 'confirmado',
  checked_in: 'aguardando',
  in_service: 'em_atendimento',
  done: 'concluido',
  canceled: 'cancelado',
  no_show: 'no_show',
};

const statusClasses: Record<string, string> = {
  pending: 'border-sky-500/50 bg-sky-500/15 text-foreground',
  confirmed: 'border-blue-500/50 bg-blue-500/15 text-foreground',
  checked_in: 'border-amber-500/50 bg-amber-500/20 text-foreground',
  in_service: 'border-violet-500/50 bg-violet-500/20 text-foreground',
  done: 'border-emerald-500/50 bg-emerald-500/15 text-foreground',
  canceled: 'border-red-500/50 bg-red-500/10 text-muted-foreground',
  no_show: 'border-orange-500/50 bg-orange-500/15 text-foreground',
};

const statusCellClasses: Record<string, string> = { pending: 'bg-sky-500/10', confirmed: 'bg-blue-500/10', checked_in: 'bg-amber-500/10', in_service: 'bg-violet-500/10', done: 'bg-emerald-500/10' };

function dateKey(value: Date | string): string {
  return formatDate(value, 'yyyy-MM-dd');
}

let clockSnapshot = Date.now();
let clockTimer: ReturnType<typeof setInterval> | undefined;
const clockListeners = new Set<() => void>();

function subscribeToClock(listener: () => void) {
  clockListeners.add(listener);
  if (!clockTimer) {
    clockTimer = setInterval(() => {
      clockSnapshot = Date.now();
      clockListeners.forEach((subscriber) => subscriber());
    }, 30_000);
  }
  return () => {
    clockListeners.delete(listener);
    if (!clockListeners.size && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = undefined;
    }
  };
}

function readClock() {
  return clockSnapshot;
}

function useClockSnapshot() {
  return useSyncExternalStore(subscribeToClock, readClock, readClock);
}

function CurrentTimeAxisLabel({ time, slotMinute, step, hasToday }: { time: string; slotMinute: number; step: number; hasToday: boolean }) {
  const now = useClockSnapshot();
  const nowMinute = minuteOfDay(new Date(now).toISOString());
  const current = hasToday && nowMinute >= slotMinute && nowMinute < slotMinute + step;
  return (
    <th scope="row" className={`border-r border-border px-2 py-3 text-left font-normal tabular-nums ${current ? 'text-destructive' : 'text-muted-foreground'}`}>
      {current && <span className="mr-1 inline-block size-2 rounded-full bg-destructive" aria-hidden="true" />}
      {time}
    </th>
  );
}

function CurrentTimeIndicator({ day, slotMinute, step }: { day: string; slotMinute: number; step: number }) {
  const now = useClockSnapshot();
  const currentDate = new Date(now);
  const nowMinute = minuteOfDay(currentDate.toISOString());
  if (dateKey(currentDate) !== day || nowMinute < slotMinute || nowMinute >= slotMinute + step) return null;
  return <span className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 bg-destructive" aria-hidden="true" />;
}

function isoAt(day: string, minute: number): string {
  const offsetDays = Math.floor(minute / 1440);
  const time = ((minute % 1440) + 1440) % 1440;
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return `${date.toISOString().slice(0, 10)}T${timeLabel(time)}:00${FIXED_OFFSET}`;
}

function timeInBusinessZone(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: BUSINESS_TIME_ZONE }).format(date);
}

function minuteOfDay(value: string): number {
  const [hours, minutes] = timeInBusinessZone(value).split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function timeLabel(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function dateAtNoon(value: string): Date {
  return new Date(`${value}T12:00:00${FIXED_OFFSET}`);
}

function weekDates(date: Date): Date[] {
  const monday = new Date(`${dateKey(date)}T12:00:00.000Z`);
  const offset = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - offset);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + index);
    return dateAtNoon(day.toISOString().slice(0, 10));
  });
}

function blockForSlot(blocks: CalendarBlock[], barberId: string, day: string, startMinute: number, step: number): CalendarBlock | undefined {
  const start = new Date(isoAt(day, startMinute)).getTime();
  const end = new Date(isoAt(day, startMinute + step)).getTime();
  return blocks.find((block) => {
    const blockStart = new Date(block.startsAt).getTime();
    const blockEnd = new Date(block.endsAt).getTime();
    return (block.barberId === null || block.barberId === barberId) && blockStart < end && blockEnd > start;
  });
}

export function CalendarGrid({
  date,
  barbers,
  appointments,
  allAppointments,
  blocks = [],
  view = 'day',
  startHour = 8,
  endHour = 20,
  intervalMinutes = 15,
  onSelectAppointment,
  onSelectSlot,
  onMoveAppointment,
}: CalendarGridProps) {
  const pointerDrag = useRef<PointerDrag | null>(null);
  const draggedButton = useRef<HTMLButtonElement | null>(null);
  const dragTargetCell = useRef<HTMLElement | null>(null);
  const busyAppointments = (allAppointments ?? appointments).filter((appointment) => !['canceled', 'no_show'].includes(appointment.status));
  const suppressClick = useRef(false);
  const columns = useMemo<CalendarColumn[]>(() => {
    const dates = view === 'week' ? weekDates(date) : [date];
    return dates.flatMap((day) => barbers.map((barber) => ({ date: day, barber })));
  }, [barbers, date, view]);
  const slots = useMemo(() => {
    const result: number[] = [];
    const step = Math.max(15, intervalMinutes);
    for (let minute = startHour * 60; minute < endHour * 60; minute += step) result.push(minute);
    return result;
  }, [endHour, intervalMinutes, startHour]);

  const step = Math.max(15, intervalMinutes);

  function handleMoveKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) return;
    const grid = event.currentTarget.closest('[data-calendar-grid]');
    const cards = grid ? Array.from(grid.querySelectorAll<HTMLButtonElement>('[data-calendar-appointment]')) : [];
    const index = cards.indexOf(event.currentTarget);
    if (index < 0 || cards.length < 2) return;
    event.preventDefault();
    const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
    cards[(index + direction + cards.length) % cards.length].focus();
  }

  function handleSlotKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    const grid = event.currentTarget.closest('[data-calendar-grid]');
    const buttons = grid ? Array.from(grid.querySelectorAll<HTMLButtonElement>('[data-calendar-keyboard-slot]')) : [];
    const currentRow = Number(event.currentTarget.dataset.calendarRow);
    const currentColumn = Number(event.currentTarget.dataset.calendarColumn);
    const inSameRow = buttons.filter((button) => Number(button.dataset.calendarRow) === currentRow);
    let target: HTMLButtonElement | undefined;

    if (event.key === 'Home' || event.key === 'End') {
      target = inSameRow.reduce((left, right) =>
        event.key === 'Home' ?
          Number(left.dataset.calendarColumn) < Number(right.dataset.calendarColumn) ?
            left
          : right
        : Number(left.dataset.calendarColumn) > Number(right.dataset.calendarColumn) ? left
        : right,
      );
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      target = inSameRow
        .filter((button) => (direction > 0 ? Number(button.dataset.calendarColumn) > currentColumn : Number(button.dataset.calendarColumn) < currentColumn))
        .sort((left, right) => direction * (Number(left.dataset.calendarColumn) - Number(right.dataset.calendarColumn)))[0];
    } else {
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      target = buttons
        .filter(
          (button) => Number(button.dataset.calendarColumn) === currentColumn && (direction > 0 ? Number(button.dataset.calendarRow) > currentRow : Number(button.dataset.calendarRow) < currentRow),
        )
        .sort((left, right) => direction * (Number(left.dataset.calendarRow) - Number(right.dataset.calendarRow)))[0];
    }

    if (!target) return;
    event.preventDefault();
    target.focus();
  }
  function readDropTarget(element: Element | null): CalendarDropTarget | null {
    const slot = element?.closest<HTMLElement>('[data-calendar-slot]');
    const barberId = slot?.dataset.barberId;
    const day = slot?.dataset.day;
    const time = slot?.dataset.time;
    return barberId && day && time ? { barberId, date: day, time } : null;
  }

  function clearDragPreview() {
    dragTargetCell.current?.removeAttribute('data-drag-target');
    draggedButton.current?.removeAttribute('data-dragging');
    dragTargetCell.current = null;
    draggedButton.current = null;
  }

  return (
    <div data-calendar-grid className="overflow-x-auto rounded-xl border border-border" role="region" aria-label="Agenda da equipe" tabIndex={0}>
      <table className="w-full min-w-max border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-card">
          <tr>
            <th scope="col" className="w-20 border-b border-r border-border p-2 text-left">
              Hora
            </th>
            {columns.map((column) => (
              <th key={`${dateKey(column.date)}-${column.barber.id}`} scope="col" className="min-w-48 border-b border-r border-border p-2 text-left">
                <span className="block text-xs text-muted-foreground">{formatDate(column.date, view === 'week' ? 'EEE, dd/MM' : 'dd/MM/yyyy')}</span>
                <span>{column.barber.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slotMinute) => {
            const time = timeLabel(slotMinute);
            return (
              <tr key={time} className="h-16 align-top">
                <CurrentTimeAxisLabel time={time} slotMinute={slotMinute} step={step} hasToday={columns.some((column) => dateKey(column.date) === dateKey(new Date()))} />
                {columns.map((column, columnIndex) => {
                  const day = dateKey(column.date);
                  const columnAppointments = busyAppointments.filter((appointment) => appointment.barberId === column.barber.id && dateKey(appointment.startsAt) === day);
                  const visibleColumnAppointments = appointments.filter((appointment) => appointment.barberId === column.barber.id && dateKey(appointment.startsAt) === day);
                  const slotAppointments = visibleColumnAppointments.filter((appointment) => {
                    const starts = minuteOfDay(appointment.startsAt);
                    return starts >= slotMinute && starts < slotMinute + step;
                  });
                  const occupied = columnAppointments.some((appointment) => {
                    const starts = minuteOfDay(appointment.startsAt);
                    const ends = starts + Math.max(15, appointment.durationMinutes);
                    return starts < slotMinute + step && ends > slotMinute;
                  });
                  const visibleOccupant = visibleColumnAppointments.find((appointment) => {
                    const starts = minuteOfDay(appointment.startsAt);
                    const ends = starts + Math.max(15, appointment.durationMinutes);
                    return starts < slotMinute + step && ends > slotMinute;
                  });
                  const block = blockForSlot(blocks, column.barber.id, day, slotMinute, step);
                  const target = { barberId: column.barber.id, date: day, time };
                  const canDrop = !occupied && !block;
                  const dropProps = canDrop ? { 'data-calendar-slot': onMoveAppointment ? 'true' : undefined, 'data-barber-id': column.barber.id, 'data-day': day, 'data-time': time } : {};
                  return (
                    <td
                      key={`${day}-${column.barber.id}-${time}`}
                      {...dropProps}
                      aria-label={block ? `Bloqueio: ${block.reason || block.type || 'Horário bloqueado'}` : undefined}
                      title={block ? block.reason || 'Bloqueio de horário' : undefined}
                      className={`relative min-w-48 border-r border-t border-border p-1 ${
                        block ? 'bg-[repeating-linear-gradient(135deg,var(--border)_0,var(--border)_1px,transparent_1px,transparent_7px)]'
                        : visibleOccupant ? (statusCellClasses[visibleOccupant.status] ?? 'bg-muted/40')
                        : occupied ? 'bg-muted/40'
                        : ''
                      } data-[drag-target=true]:bg-primary/10 data-[drag-target=true]:ring-2 data-[drag-target=true]:ring-inset data-[drag-target=true]:ring-primary`}
                    >
                      {block && (slotMinute === slots[0] || new Date(block.startsAt).getTime() >= new Date(`${day}T${time}:00${FIXED_OFFSET}`).getTime()) && (
                        <span className="absolute left-2 top-1 z-10 max-w-[90%] truncate rounded bg-background/90 px-1.5 py-0.5 text-[10px] text-muted-foreground">{block.reason || 'Bloqueado'}</span>
                      )}
                      <CurrentTimeIndicator day={day} slotMinute={slotMinute} step={step} />
                      {!occupied && !block && onSelectSlot && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-h-11 w-full justify-start px-2 text-xs text-muted-foreground"
                          aria-label={`Criar horário para ${column.barber.name} em ${formatDate(column.date, 'dd/MM')} às ${time}`}
                          data-calendar-keyboard-slot
                          data-calendar-row={slotMinute}
                          data-calendar-column={columnIndex}
                          onKeyDown={handleSlotKey}
                          onClick={() => onSelectSlot(target)}
                        >
                          ＋ Horário
                        </Button>
                      )}
                      <div className="space-y-1">
                        {slotAppointments.map((appointment) => {
                          const movable = Boolean(onMoveAppointment && appointment.canMove);
                          const className = statusClasses[appointment.status] ?? 'border-border bg-muted text-foreground';
                          return (
                            <button
                              key={appointment.id}
                              type="button"
                              data-calendar-appointment="true"
                              className={`block min-h-14 w-full rounded-md border px-2 py-1 text-left text-xs focus-visible:ring-2 focus-visible:ring-ring ${className} ${movable ? 'touch-none cursor-grab active:cursor-grabbing' : ''} data-[dragging=true]:opacity-60`}
                              aria-label={`${timeInBusinessZone(appointment.startsAt)}, ${appointment.customerName}, ${appointment.serviceName}`}
                              onPointerDown={(event) => {
                                if (!movable) return;
                                pointerDrag.current = { appointmentId: appointment.id, startX: event.clientX, startY: event.clientY, moved: false };
                                draggedButton.current = event.currentTarget;
                                event.currentTarget.dataset.dragging = 'true';
                                event.currentTarget.setPointerCapture(event.pointerId);
                              }}
                              onPointerMove={(event) => {
                                const drag = pointerDrag.current;
                                if (drag && (Math.abs(event.clientX - drag.startX) > 6 || Math.abs(event.clientY - drag.startY) > 6)) drag.moved = true;
                                if (!drag?.moved) return;
                                const targetCell = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-calendar-slot]') ?? null;
                                if (dragTargetCell.current === targetCell) return;
                                dragTargetCell.current?.removeAttribute('data-drag-target');
                                dragTargetCell.current = targetCell;
                                targetCell?.setAttribute('data-drag-target', 'true');
                              }}
                              onPointerUp={(event) => {
                                const drag = pointerDrag.current;
                                pointerDrag.current = null;
                                clearDragPreview();
                                if (!drag?.moved) return;
                                const dropTarget = readDropTarget(document.elementFromPoint(event.clientX, event.clientY));
                                if (dropTarget) onMoveAppointment?.(drag.appointmentId, dropTarget);
                                suppressClick.current = true;
                                window.setTimeout(() => {
                                  suppressClick.current = false;
                                }, 200);
                              }}
                              onPointerCancel={() => {
                                pointerDrag.current = null;
                                clearDragPreview();
                              }}
                              onKeyDown={handleMoveKey}
                              onClick={() => {
                                if (suppressClick.current) {
                                  suppressClick.current = false;
                                  return;
                                }
                                onSelectAppointment?.(appointment);
                              }}
                            >
                              <span className="block truncate font-semibold">
                                {timeInBusinessZone(appointment.startsAt)} · {appointment.customerName}
                              </span>
                              <span className="block truncate">
                                {appointment.serviceName} · {formatDuration(appointment.durationMinutes)}
                              </span>
                              <StatusBadge kind="appointment" status={statusLabels[appointment.status] ?? appointment.status} />
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <RenderComponent condition={barbers.length === 0}>
        <p className="p-6 text-center text-sm text-muted-foreground">Nenhum profissional para exibir.</p>
      </RenderComponent>
    </div>
  );
}
