import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

interface SettingsFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  type?: string;
  description?: string;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
}

export function SettingsField<T extends FieldValues>({ control, name, label, placeholder, type = 'text', description, multiline, rows = 3, disabled }: SettingsFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {multiline ?
              <Textarea {...field} value={String(field.value ?? '')} rows={rows} placeholder={placeholder} disabled={disabled} />
            : <Input {...field} value={String(field.value ?? '')} type={type} placeholder={placeholder} disabled={disabled} />}
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
