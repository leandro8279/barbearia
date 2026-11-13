/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useId, useState } from 'react';

import { formatBRL } from '@/shared/lib/format';
import { Input } from '@/shared/ui/input';

export interface MoneyInputProps {
  value: number;
  onValueChange: (cents: number) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

function parseCents(value: string): number {
  const cleaned = value.replace(/[^\d,.]/g, '');
  const hasComma = cleaned.includes(',');
  const lastDot = cleaned.lastIndexOf('.');
  const decimalDigits = lastDot < 0 ? 0 : cleaned.length - lastDot - 1;
  const normalized =
    hasComma ? cleaned.replace(/\./g, '').replace(',', '.')
    : lastDot >= 0 && decimalDigits <= 2 ? cleaned
    : cleaned.replace(/\./g, '');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
}

export function MoneyInput({ value, onValueChange, id, name, disabled, ...props }: MoneyInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const formattedValue = formatBRL(Math.max(0, Math.round(value || 0))).replace(/^R\$\s?/, '');
  const [draft, setDraft] = useState(formattedValue);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(formattedValue);
  }, [editing, formattedValue]);

  return (
    <div className="relative">
      <label htmlFor={inputId} className="sr-only">
        {props['aria-label'] ?? 'Valor em reais'}
      </label>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground" aria-hidden="true">
        R$
      </span>
      <Input
        id={inputId}
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className="min-h-11 pl-10 text-right tabular-nums"
        value={draft}
        disabled={disabled}
        aria-label={props['aria-label'] ?? 'Valor em reais'}
        onFocus={() => setEditing(true)}
        onChange={(event) => {
          const next = event.target.value.replace(/[^\d,.]/g, '');
          setDraft(next);
          onValueChange(parseCents(next));
        }}
        onBlur={() => {
          setEditing(false);
          setDraft(formatBRL(parseCents(draft)).replace(/^R\$\s?/, ''));
        }}
      />
    </div>
  );
}
