import { formatBRL } from '@/shared/lib/format';

export interface PriceTagProps {
  cents: number;
  label?: string;
  className?: string;
}

export function PriceTag({ cents, label, className = '' }: PriceTagProps) {
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-1 font-semibold tabular-nums ${className}`}>
      {label && <span className="text-xs font-normal text-muted-foreground">{label}</span>}
      <span>{formatBRL(cents)}</span>
    </span>
  );
}
