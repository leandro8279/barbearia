import { RenderComponent } from '@/shared/components/render-component';

import { Scissors } from 'lucide-react';
import { Link } from 'wouter';

interface BrandProps {
  compact?: boolean;
}

export function Brand({ compact = false }: BrandProps) {
  return (
    <Link href="/" aria-label="Barbearia — página inicial" className="inline-flex min-h-11 items-center gap-2 text-foreground">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Scissors aria-hidden="true" className="size-4.5" />
      </span>
      <RenderComponent condition={!compact}>
        <span className="font-heading text-lg font-semibold uppercase tracking-[0.12em]">Barbearia</span>
      </RenderComponent>
    </Link>
  );
}
