import { cn } from '@/shared/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardFooter } from '@/shared/ui/card';

import { CalendarClock, Scissors } from 'lucide-react';

import { RenderComponent } from './render-component';

import type { ReactNode } from 'react';
export interface BarberCardProps {
  name: string;
  photoUrl?: string;
  specialties?: string[];
  nextAvailable?: string;
  availabilityText?: string;
  footer?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function BarberCard({ name, photoUrl, specialties = [], nextAvailable, availabilityText, footer, selected = false, disabled = false, onSelect }: BarberCardProps) {
  const content = (
    <Card className={cn('h-full transition-colors', selected && 'border-primary ring-2 ring-primary/30')}>
      <CardContent className="flex min-h-32 items-start gap-4">
        <Avatar size="lg" className="size-14">
          {photoUrl && <AvatarImage src={photoUrl} alt={`Foto de ${name}`} />}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{name}</h3>
          <RenderComponent condition={specialties.length > 0}>
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Especialidades">
              {specialties.map((specialty) => (
                <Badge key={specialty} variant="secondary" className="rounded-full font-normal">
                  <Scissors className="size-3" aria-hidden="true" />
                  {specialty}
                </Badge>
              ))}
            </div>
          </RenderComponent>
          <RenderComponent condition={availabilityText}>
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary">
              <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
              {availabilityText}
            </p>
          </RenderComponent>

          <RenderComponent condition={!availabilityText && nextAvailable}>
            <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary">
              <CalendarClock className="size-4" aria-hidden="true" />
              Próximo horário: {nextAvailable}
            </p>
          </RenderComponent>
        </div>
      </CardContent>
      <RenderComponent condition={footer}>
        <CardFooter className="mt-auto justify-end gap-3 border-t pt-4">{footer}</CardFooter>
      </RenderComponent>
    </Card>
  );

  if (!onSelect) return content;
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={cn('block min-h-11 w-full rounded-xl text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', disabled && 'cursor-not-allowed opacity-60')}
      aria-pressed={selected}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onSelect();
      }}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      {content}
    </div>
  );
}
