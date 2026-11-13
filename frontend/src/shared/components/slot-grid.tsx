import type { KeyboardEvent } from 'react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface SlotGridProps {
  slots: TimeSlot[];
  selectedTime?: string | null;
  onSelect: (time: string) => void;
  emptyMessage?: string;
}

const periods = [
  { label: 'Manhã', from: 5, to: 12 },
  { label: 'Tarde', from: 12, to: 18 },
  { label: 'Noite', from: 18, to: 24 },
];

function hourOf(time: string): number {
  const hour = Number(time.split(':')[0]);
  return Number.isFinite(hour) ? hour : 0;
}

export function SlotGrid({ slots, selectedTime, onSelect, emptyMessage = 'Não há horários para esta data.' }: SlotGridProps) {
  if (slots.length === 0) {
    return <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const firstAvailable = slots.find((slot) => slot.available)?.time;
  const focusTime = selectedTime && slots.some((slot) => slot.available && slot.time === selectedTime) ? selectedTime : firstAvailable;

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    const group = event.currentTarget.closest('[data-slot-grid]');
    const buttons = group ? Array.from(group.querySelectorAll<HTMLButtonElement>('button[data-slot-time]:not(:disabled)')) : [];
    const index = buttons.indexOf(event.currentTarget);
    if (index < 0 || buttons.length < 2) return;

    const nextIndex =
      event.key === 'Home' ? 0
      : event.key === 'End' ? buttons.length - 1
      : (index + (event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[nextIndex].focus();
  }

  return (
    <div className="space-y-5" data-slot-grid>
      {periods.map((period) => {
        const periodSlots = slots.filter((slot) => hourOf(slot.time) >= period.from && hourOf(slot.time) < period.to);
        if (periodSlots.length === 0) return null;
        return (
          <section key={period.label} aria-label={`Horários da ${period.label.toLowerCase()}`}>
            <h3 className="mb-2 text-sm font-semibold">{period.label}</h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {periodSlots.map((slot) => {
                const selected = selectedTime === slot.time;
                return (
                  <Button
                    key={slot.time}
                    type="button"
                    variant={selected ? 'default' : 'outline'}
                    className={cn('min-h-11 tabular-nums', !slot.available && 'cursor-not-allowed opacity-60')}
                    aria-pressed={selected}
                    aria-label={`${slot.time}, ${slot.available ? 'disponível' : 'indisponível'}`}
                    data-slot-time
                    tabIndex={slot.time === focusTime ? 0 : -1}
                    disabled={!slot.available}
                    onKeyDown={handleKeyDown}
                    onClick={() => onSelect(slot.time)}
                  >
                    {slot.time}
                  </Button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
