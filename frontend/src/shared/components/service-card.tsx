import { PriceTag } from '@/shared/components/price-tag';
import { RenderComponent } from '@/shared/components/render-component';
import { formatDuration } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Card, CardContent, CardFooter } from '@/shared/ui/card';

import { Clock3 } from 'lucide-react';

import type { ReactNode } from 'react';
export interface ServiceCardProps {
  name: string;
  description?: string;
  durationMinutes: number;
  priceCents: number;
  priceCaption?: string;
  footer?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

export function ServiceCard({ name, description, durationMinutes, priceCents, priceCaption, footer, selected = false, disabled = false, onSelect }: ServiceCardProps) {
  const content = (
    <Card className={cn('h-full transition-colors', selected && 'border-primary ring-2 ring-primary/30')}>
      <CardContent className="flex min-h-28 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{name}</h3>
          <RenderComponent condition={description}>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>
          </RenderComponent>
          <RenderComponent condition={!footer}>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock3 className="size-4" aria-hidden="true" />
              {formatDuration(durationMinutes)}
            </span>
          </RenderComponent>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <RenderComponent condition={priceCaption}>
            <span className="text-xs text-muted-foreground">{priceCaption}</span>
          </RenderComponent>
          <PriceTag cents={priceCents} />
        </div>
      </CardContent>
      <RenderComponent condition={footer}>
        <CardFooter className="mt-auto justify-between gap-3 border-t pt-4">{footer}</CardFooter>
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
