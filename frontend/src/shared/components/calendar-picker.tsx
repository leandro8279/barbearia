import { useId } from 'react';
import { Matcher } from 'react-day-picker';

import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Calendar } from '@/shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';

import { ptBR } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';

export interface CalendarPickerProps {
  value: Date | null;
  onValueChange: (date: Date | null) => void;
  disabled?: Matcher | Matcher[];
  disabledDays?: Matcher | Matcher[];
  placeholder?: string;
  label?: string;
  id?: string;
}

export function CalendarPicker({ value, onValueChange, disabled, disabledDays, placeholder = 'Escolher data', label = 'Data', id }: CalendarPickerProps) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const disabledMatchers = disabledDays ?? disabled;

  return (
    <div className="grid gap-2">
      <span id={`${triggerId}-label`} className="text-sm font-medium">
        {label}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <Button id={triggerId} type="button" variant="outline" className="min-h-11 w-full justify-start text-left font-normal" aria-labelledby={`${triggerId}-label`}>
            <CalendarDays className="size-4" aria-hidden="true" />
            {value ? formatDate(value, 'dd/MM/yyyy') : <span className="text-muted-foreground">{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            className="[--cell-size:--spacing(11)]"
            mode="single"
            selected={value ?? undefined}
            onSelect={(day) => onValueChange(day ?? null)}
            disabled={disabledMatchers}
            locale={ptBR}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
