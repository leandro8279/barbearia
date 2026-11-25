import {Button} from '@/shared/ui/button'
import {formatBRL, formatDuration} from '@/shared/lib/format'
import {useBookingEstimate} from '@/modules/booking/hooks/use-booking-data'
import {useBookingDraftStore} from '@/shared/stores/booking-draft-store'

interface BookingSummaryFooterProps {
  actionLabel: string
  disabled: boolean
  onContinue: () => void
}

function formatDurationRange(minimum: number, maximum: number): string {
  return minimum === maximum ? formatDuration(minimum) : `${formatDuration(minimum)}–${formatDuration(maximum)}`
}

export function BookingSummaryFooter({actionLabel, disabled, onContinue}: BookingSummaryFooterProps) {
  const serviceIds = useBookingDraftStore(state => state.serviceIds)
  const barberId = useBookingDraftStore(state => state.barberId)
  const estimateQuery = useBookingEstimate(serviceIds, barberId)
  const hasServices = serviceIds.length > 0
  const duration =
    !hasServices ? '—'
    : estimateQuery.isPending ? 'Calculando…'
    : estimateQuery.data ? formatDurationRange(estimateQuery.data.durationMin.min, estimateQuery.data.durationMin.max)
    : 'Indisponível'
  const price =
    !hasServices ? formatBRL(0)
    : estimateQuery.data ?
      estimateQuery.data.subtotal.min === estimateQuery.data.subtotal.max ?
        formatBRL(estimateQuery.data.subtotal.min)
      : `A partir de ${formatBRL(estimateQuery.data.subtotal.min)}`
    : '—'
  const selection = hasServices ? `${serviceIds.length} ${serviceIds.length === 1 ? 'serviço selecionado' : 'serviços selecionados'}` : 'Selecione serviços para continuar'

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
  )
}
