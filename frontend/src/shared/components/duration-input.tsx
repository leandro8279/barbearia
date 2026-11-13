/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useId, useState } from 'react';

import { Input } from '@/shared/ui/input';

export interface DurationInputProps {
  value: number;
  onValueChange: (minutes: number) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  'aria-label'?: string;
}

function nearestFive(value: number, min: number, max?: number): number {
  const rounded = Math.max(min, Math.round(value / 5) * 5);
  return max === undefined ? rounded : Math.min(max - (max % 5), rounded);
}

export function DurationInput({ value, onValueChange, id, name, disabled, min = 5, max, ...props }: DurationInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [editing, value]);

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={inputId} className="sr-only">
        {props['aria-label'] ?? 'Duração em minutos'}
      </label>
      <Input
        id={inputId}
        name={name}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={5}
        className="min-h-11"
        value={draft}
        disabled={disabled}
        aria-label={props['aria-label'] ?? 'Duração em minutos'}
        onFocus={() => setEditing(true)}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);
          if (nextDraft === '') return;
          const numeric = Number(nextDraft);
          if (Number.isFinite(numeric)) onValueChange(nearestFive(numeric, min, max));
        }}
        onBlur={() => {
          const numeric = Number(draft);
          const nextValue = Number.isFinite(numeric) ? nearestFive(numeric, min, max) : min;
          setDraft(String(nextValue));
          onValueChange(nextValue);
          setEditing(false);
        }}
      />
      <span className="text-sm text-muted-foreground">minutos</span>
    </div>
  );
}
