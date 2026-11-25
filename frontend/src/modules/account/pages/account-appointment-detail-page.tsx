import {useEffect} from 'react'
import {useRoute, Link} from 'wouter'
import {CalendarDays, Clock3, CreditCard, Scissors, UserRound} from 'lucide-react'
import {AppointmentActionOverlays} from '@/modules/account/components/appointment-action-overlays'
import {useAccountAppointment} from '@/modules/account/hooks/use-account-data'
import {EmptyState} from '@/shared/components/empty-state'
import {ErrorState} from '@/shared/components/error-state'
import {PageHeader} from '@/shared/components/page-header'
import {StatusBadge, type AppointmentStatus} from '@/shared/components/status-badge'
import {formatBRL, formatDateTime, formatDuration} from '@/shared/lib/format'
import {useOverlay} from '@/shared/hooks/use-overlay'
import {Button} from '@/shared/ui/button'
import {Card, CardContent, CardHeader, CardTitle} from '@/shared/ui/card'
import {Skeleton} from '@/shared/ui/skeleton'

const statusLabels: Record<string, AppointmentStatus> = {
  pending: 'agendado',
  confirmed: 'confirmado',
  checked_in: 'aguardando',
  in_service: 'em_atendimento',
  done: 'concluido',
  canceled: 'cancelado',
  no_show: 'no_show'
}

const eventLabels: Record<string, string> = {
  created: 'Agendamento criado',
  confirmed: 'Agendamento confirmado',
  rescheduled: 'Agendamento reagendado',
  checked_in: 'Cliente chegou',
  in_service: 'Atendimento iniciado',
  done: 'Atendimento concluído',
  canceled: 'Agendamento cancelado',
  no_show: 'Cliente não compareceu',
  items_updated: 'Serviços atualizados'
}

const paymentMethods: Record<string, string> = {cash: 'Dinheiro', pix: 'Pix', credit: 'Cartão de crédito', debit: 'Cartão de débito'}

function downloadCalendarEvent(appointment: NonNullable<ReturnType<typeof useAccountAppointment>['data']>) {
  const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
  const formatUtc = (value: string) =>
    new Date(value)
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z')
  const services = appointment.items.map(item => item.name).join(', ')
  const content = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Barbearia//Agendamentos//PT-BR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:appointment-${appointment.id}@barbearia.local`,
    `DTSTAMP:${formatUtc(new Date().toISOString())}`,
    `DTSTART:${formatUtc(appointment.start)}`,
    `DTEND:${formatUtc(appointment.end)}`,
    `SUMMARY:${escape(`Agendamento na Barbearia — ${services}`)}`,
    `DESCRIPTION:${escape(`Profissional: ${appointment.barber.name}\nCódigo: ${appointment.code}`)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([content], {type: 'text/calendar;charset=utf-8'}))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `agendamento-${appointment.code}.ics`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function AccountAppointmentDetailPage() {
  const [, params] = useRoute('/conta/agendamentos/:id')
  const id = params?.id ?? ''
  const validId = /^\d+$/.test(id)
  const appointmentQuery = useAccountAppointment(id, validId)
  const appointment = appointmentQuery.data
  const rescheduleOverlay = useOverlay('reagendar')
  const cancelOverlay = useOverlay('cancelar')

  useEffect(() => {
    document.title = `${appointment ? `Agendamento ${appointment.code}` : 'Detalhe do agendamento'} | Barbearia`
  }, [appointment])

  if (!validId) {
    return <ErrorState title="Agendamento não encontrado" description="Confira o endereço ou volte para sua lista de agendamentos." />
  }

  if (appointmentQuery.isPending) {
    return (
      <div className="space-y-6" aria-label="Carregando detalhes do agendamento">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    )
  }

  if (appointmentQuery.isError || !appointment) {
    return <ErrorState title="Não foi possível carregar este agendamento" description="Ele pode não existir ou não estar vinculado à sua conta." onRetry={() => void appointmentQuery.refetch()} />
  }

  const status = statusLabels[appointment.status] ?? appointment.status.replaceAll('_', ' ')
  const canActOnAppointment = new Date(appointment.start).getTime() > Date.now()
  const canReschedule = canActOnAppointment && ['pending', 'confirmed'].includes(appointment.status) && appointment.rescheduleCount < 2
  const canCancel = canActOnAppointment && ['pending', 'confirmed', 'checked_in'].includes(appointment.status)
  const events = [...(appointment.events ?? [])].sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime())

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Minha conta"
        title="Detalhe do agendamento"
        description={`Código ${appointment.code} · ${formatDateTime(appointment.start)}`}
        actions={
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/conta/agendamentos">Voltar aos agendamentos</Link>
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-primary/5">
          <div>
            <p className="text-sm text-muted-foreground">Resumo do horário</p>
            <CardTitle className="mt-1 text-xl">{formatDateTime(appointment.start)}</CardTitle>
          </div>
          <StatusBadge kind="appointment" status={status} />
        </CardHeader>
        <CardContent className="space-y-5 p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <UserRound className="mt-0.5 size-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm text-muted-foreground">Barbeiro</p>
                <p className="mt-1 font-medium">{appointment.barber.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 size-5 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm text-muted-foreground">Duração</p>
                <p className="mt-1 font-medium">{formatDuration(appointment.items.reduce((total, item) => total + item.durationMin, 0))}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {canReschedule && (
              <Button className="min-h-11" onClick={() => rescheduleOverlay.open()}>
                Reagendar
              </Button>
            )}
            {canCancel && (
              <Button variant="outline" className="min-h-11" onClick={() => cancelOverlay.open()}>
                Cancelar
              </Button>
            )}
            <Button variant="outline" className="min-h-11" onClick={() => downloadCalendarEvent(appointment)}>
              <CalendarDays aria-hidden="true" />
              Adicionar ao calendário
            </Button>
            {!canReschedule && !canCancel && <p className="self-center text-sm text-muted-foreground">As ações de alteração não estão disponíveis para este status.</p>}
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scissors className="size-5 text-primary" aria-hidden="true" />
              Serviços e valores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appointment.items.map(item => (
              <div key={`${appointment.id}-${item.serviceId}`} className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{formatDuration(item.durationMin)}</p>
                </div>
                <p className="shrink-0 font-medium">{formatBRL(item.price)}</p>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-3 font-semibold">
              <span>Total</span>
              <span>{formatBRL(appointment.total)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="size-5 text-primary" aria-hidden="true" />
              Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {appointment.payments.length ?
              appointment.payments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    {paymentMethods[payment.method] ?? payment.method} · {payment.status === 'paid' ? 'Pago' : payment.status}
                  </span>
                  <span className="font-medium">{formatBRL(payment.amountCents)}</span>
                </div>
              ))
            : <p className="text-sm text-muted-foreground">Ainda não há pagamento registrado para este agendamento.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observações</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {appointment.notes?.trim() || 'Nenhuma observação registrada.'}
            {appointment.canceledReason && (
              <p className="mt-3">
                <span className="font-medium text-foreground">Motivo do cancelamento:</span> {appointment.canceledReason}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Linha do tempo</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length ?
              <ol className="space-y-4">
                {events.map((event, index) => (
                  <li key={`${event.at}-${event.type}-${index}`} className="relative flex gap-3">
                    <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="font-medium">{eventLabels[event.type] ?? event.type.replaceAll('_', ' ')}</p>
                      <time className="text-sm text-muted-foreground" dateTime={event.at}>
                        {formatDateTime(event.at)}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            : <EmptyState title="Sem atualizações" description="As mudanças deste agendamento aparecerão aqui." />}
          </CardContent>
        </Card>
      </div>
      <AppointmentActionOverlays appointment={appointment} />
    </div>
  )
}
