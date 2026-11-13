import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';

export type AppointmentStatus = 'agendado' | 'confirmado' | 'aguardando' | 'em_atendimento' | 'concluido' | 'cancelado' | 'no_show';

export type TabStatus = 'aberta' | 'em_aberto' | 'parcial' | 'paga' | 'fechada' | 'cancelada';
export type StatusKind = 'appointment' | 'tab';

const statusStyles: Record<string, { label: string; className: string }> = {
  agendado: { label: 'Agendado', className: 'border-sky-800 bg-sky-950 text-sky-100' },
  confirmado: { label: 'Confirmado', className: 'border-blue-800 bg-blue-950 text-blue-100' },
  aguardando: { label: 'Aguardando', className: 'border-amber-800 bg-amber-950 text-amber-100' },
  em_atendimento: { label: 'Em atendimento', className: 'border-violet-800 bg-violet-950 text-violet-100' },
  concluido: { label: 'Concluído', className: 'border-emerald-800 bg-emerald-950 text-emerald-100' },
  cancelado: { label: 'Cancelado', className: 'border-red-800 bg-red-950 text-red-100' },
  no_show: { label: 'Não compareceu', className: 'border-orange-800 bg-orange-950 text-orange-100' },
  aberta: { label: 'Aberta', className: 'border-sky-800 bg-sky-950 text-sky-100' },
  em_aberto: { label: 'Em aberto', className: 'border-sky-800 bg-sky-950 text-sky-100' },
  parcial: { label: 'Pagamento parcial', className: 'border-amber-800 bg-amber-950 text-amber-100' },
  paga: { label: 'Paga', className: 'border-emerald-800 bg-emerald-950 text-emerald-100' },
  fechada: { label: 'Fechada', className: 'border-emerald-800 bg-emerald-950 text-emerald-100' },
  cancelada: { label: 'Cancelada', className: 'border-red-800 bg-red-950 text-red-100' },
};

export interface StatusBadgeProps {
  kind: StatusKind;
  status: AppointmentStatus | TabStatus | string;
  className?: string;
}

export function StatusBadge({ kind, status, className }: StatusBadgeProps) {
  const details = statusStyles[status] ?? { label: status.replaceAll('_', ' '), className: 'border-border bg-muted text-foreground' };
  return (
    <Badge variant="outline" className={cn('border px-2.5 py-1 capitalize', details.className, className)} data-status-kind={kind}>
      {details.label}
    </Badge>
  );
}
