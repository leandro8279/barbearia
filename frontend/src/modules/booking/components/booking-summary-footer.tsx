import { formatBRL, formatDurationRange } from '@/shared/lib/format';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';
import { Button } from '@/shared/ui/button';

import { observer } from 'mobx-react-lite';

import { useBookingEstimate } from '../hooks/use-booking-data';

interface Props {
  actionLabel: string;
  disabled: boolean;
  onContinue: () => void;
}

export const BookingSummaryFooter = observer((props: Props) => {
  const bookingDraftStore = useBookingDraftStore();
  const { actionLabel, disabled, onContinue } = props;
  const estimateQuery = useBookingEstimate(() => ({ barberId: bookingDraftStore.barberId, serviceIds: bookingDraftStore.serviceIds }));

  const hasServices = bookingDraftStore.serviceIds.length > 0;
  const duration =
    !hasServices ? '—'
    : estimateQuery.isPending ? 'Calculando…'
    : estimateQuery.estimate ? formatDurationRange(estimateQuery.estimate.durationMin.min, estimateQuery.estimate.durationMin.max)
    : 'Indisponível';
  const price =
    !hasServices ? formatBRL(0)
    : estimateQuery.estimate ?
      estimateQuery.estimate.subtotal.min === estimateQuery.estimate.subtotal.max ?
        formatBRL(estimateQuery.estimate.subtotal.min)
      : `A partir de ${formatBRL(estimateQuery.estimate.subtotal.min)}`
    : '—';
  const selection =
    hasServices ?
      `${bookingDraftStore.serviceIds.length} ${bookingDraftStore.serviceIds.length === 1 ? 'serviço selecionado' : 'serviços selecionados'}`
    : 'Selecione serviços para continuar';

  return (
    <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 shadow-panel backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">Resumo do agendamento</p>
          <p className="truncate text-xs text-muted-foreground" aria-live="polite">
            {selection} · {duration}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-heading text-lg text-primary">{price}</p>
          <p className="text-xs text-muted-foreground">valor estimado</p>
        </div>
        <Button type="button" className="min-h-11 shrink-0" disabled={disabled} onClick={onContinue}>
          {actionLabel}
        </Button>
      </div>
    </aside>
  );
});
