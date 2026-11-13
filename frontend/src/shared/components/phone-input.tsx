import { useId } from 'react';

import { formatPhone } from '@/shared/lib/format';
import { Input } from '@/shared/ui/input';

export interface PhoneInputProps {
  value: string;
  onValueChange: (digits: string) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export function PhoneInput({ value, onValueChange, id, name, disabled, ...props }: PhoneInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const digits = value
    .replace(/\D/g, '')
    .replace(/^55(?=\d{10,11}$)/, '')
    .slice(0, 11);

  return (
    <>
      <label htmlFor={inputId} className="sr-only">
        {props['aria-label'] ?? 'Telefone com DDD'}
      </label>
      <Input
        id={inputId}
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        maxLength={15}
        className="min-h-11"
        value={formatPhone(digits)}
        disabled={disabled}
        aria-label={props['aria-label'] ?? 'Telefone com DDD'}
        onChange={(event) =>
          onValueChange(
            event.target.value
              .replace(/\D/g, '')
              .replace(/^55(?=\d{10,11}$)/, '')
              .slice(0, 11),
          )
        }
      />
    </>
  );
}
