import {useEffect, useState} from 'react'
import {useLocation, Link} from 'wouter'
import {ArrowUpRight, CalendarDays, Check, Clock3, MapPin, MessageCircle, UserRound} from 'lucide-react'
import {useConfirmedAppointment} from '@/modules/booking/hooks/use-booking-data'
import {usePublicUnit} from '@/modules/site/hooks/use-public-unit'
import {ErrorState} from '@/shared/components/error-state'
import {PageHeader} from '@/shared/components/page-header'
import {formatBRL, formatDateTime, formatDuration} from '@/shared/lib/format'
import {Button} from '@/shared/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/shared/ui/card'
import {Skeleton} from '@/shared/ui/skeleton'

function getTokenFromFragment(): string | null {
  return new URLSearchParams(window.location.hash.slice(1)).get('token')
}

function toCalendarDate(value: string): string {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

function escapeCalendarText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function downloadCalendarFile(input: {id: number; code: string; start: string; end: string; title: string; description: string; location: string}) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Barbearia//Agendamento//PT-BR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${input.id}@barbearia`,
    `DTSTAMP:${toCalendarDate(new Date().toISOString())}`,
    `DTSTART:${toCalendarDate(input.start)}`,
    `DTEND:${toCalendarDate(input.end)}`,
    `SUMMARY:${escapeCalendarText(input.title)}`,
    `DESCRIPTION:${escapeCalendarText(input.description)}`,
    `LOCATION:${escapeCalendarText(input.location)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ]
  const file = new Blob([`${lines.join('\r\n')}\r\n`], {type: 'text/calendar;charset=utf-8'})
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = `agendamento-${input.code}.ics`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function BookingConfirmedPage() {
  const [location, navigate] = useLocation()
  const appointmentId = location.match(/^\/agendar\/confirmado\/(\d+)$/)?.[1] ?? ''
  const [guestToken, setGuestToken] = useState(getTokenFromFragment)
  const appointmentQuery = useConfirmedAppointment(appointmentId, guestToken)
  const unitQuery = usePublicUnit()
  const appointment = appointmentQuery.data
  const unit = unitQuery.data
  const address = unit?.address?.trim() ?? ''
  const serviceNames = appointment?.items.map(item => item.name).filter(Boolean) ?? []
  const serviceLabel = serviceNames.length ? serviceNames.join(', ') : 'Serviços agendados'
  const confirmationText =
    appointment ?
      `Agendamento ${appointment.code} confirmado para ${formatDateTime(appointment.start)} com ${appointment.barber.name}. Serviços: ${serviceLabel}. Total: ${formatBRL(appointment.total)}.`
    : ''
  const googleCalendarUrl =
    appointment ?
      `https://calendar.google.com/calendar/render?${new URLSearchParams({
        action: 'TEMPLATE',
        text: `Barbearia — ${serviceLabel}`,
        dates: `${toCalendarDate(appointment.start)}/${toCalendarDate(appointment.end)}`,
        details: confirmationText,
        location: address
      }).toString()}`
    : ''
  const whatsappUrl = appointment ? `https://wa.me/?text=${encodeURIComponent(confirmationText)}` : ''
  const directionsUrl = address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` : ''
  const rescheduleUrl = appointment ? `/conta/agendamentos?reagendar=1&appointmentId=${appointment.id}` : '/conta/agendamentos?reagendar=1'
  const cancelUrl = appointment ? `/conta/agendamentos?cancelar=1&appointmentId=${appointment.id}` : '/conta/agendamentos?cancelar=1'

  useEffect(() => {
    setGuestToken(getTokenFromFragment())
  }, [appointmentId])

  useEffect(() => {
    document.title = 'Agendamento confirmado | Barbearia'
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!description) {
      description = document.createElement('meta')
      description.name = 'description'
      document.head.append(description)
    }
    description.content = 'Confira os dados do seu agendamento confirmado.'
  }, [])

  if (!appointmentId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Agendamento confirmado" description="Use o link recebido após confirmar para consultar os dados do seu horário." />
        <ErrorState title="Link de confirmação inválido" description="O identificador deste agendamento não é válido." onRetry={() => navigate('/')} retryLabel="Voltar ao início" />
      </div>
    )
  }

  if (appointmentQuery.isPending) {
    return (
      <div className="space-y-6">
        <PageHeader title="Carregando confirmação" description="Estamos buscando os dados do seu agendamento." />
        <div className="space-y-4 rounded-xl border border-border bg-card p-6" aria-label="Carregando agendamento">
          <Skeleton className="mx-auto h-16 w-16 rounded-full" />
          <Skeleton className="mx-auto h-8 w-64" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    )
  }

  if (appointmentQuery.isError || !appointment) {
    return (
      <div className="space-y-6">
        <PageHeader title="Agendamento confirmado" description="Não conseguimos carregar os dados deste agendamento." />
        <ErrorState
          title="Não foi possível abrir a confirmação"
          description="Confira se o link de visitante está completo ou entre na conta usada para agendar."
          onRetry={() => void appointmentQuery.refetch()}
          retryLabel="Tentar novamente"
        />
        <div className="flex justify-center gap-3">
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/entrar">Entrar</Link>
          </Button>
          <Button asChild className="min-h-11">
            <Link href="/">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    )
  }

  const calendarDetails = {
    id: appointment.id,
    code: appointment.code,
    start: appointment.start,
    end: appointment.end,
    title: `Barbearia — ${serviceLabel}`,
    description: confirmationText,
    location: address
  }

  return (
    <div className="space-y-7">
      <section className="rounded-2xl border border-primary/30 bg-card px-5 py-8 text-center shadow-panel sm:px-8">
        <div className="booking-confirmation-check mx-auto grid size-16 place-items-center rounded-full bg-primary text-primary-foreground" aria-hidden="true">
          <Check className="size-8" strokeWidth={3} />
        </div>
        <p className="mt-5 text-sm font-semibold text-primary">Tudo certo</p>
        <h1 className="mt-1 text-3xl font-semibold">Seu agendamento está confirmado</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Código <span className="font-semibold text-foreground">{appointment.code}</span>. Guarde estas informações para consultar seu horário.
        </p>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do agendamento</CardTitle>
            <CardDescription>Pagamento presencial na barbearia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm text-muted-foreground">Data e horário</p>
                <p className="font-medium">{formatDateTime(appointment.start)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UserRound className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm text-muted-foreground">Profissional</p>
                <p className="font-medium">{appointment.barber.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm text-muted-foreground">Duração estimada</p>
                <p className="font-medium">{formatDuration(appointment.durationMin)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Serviços</p>
              <ul className="mt-1 list-inside list-disc space-y-1">
                {appointment.items.map(item => (
                  <li key={item.serviceId}>{item.name}</li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="font-medium">Total</span>
              <span className="font-heading text-xl font-semibold text-primary">{formatBRL(appointment.total)}</span>
            </div>
            {appointment.status !== 'confirmed' && (
              <p role="status" className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                Situação atual: {appointment.status === 'canceled' ? 'cancelado' : appointment.status.replaceAll('_', ' ')}.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Planeje sua visita</CardTitle>
            <CardDescription>Adicione o horário ao calendário ou consulte como chegar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button type="button" variant="outline" className="min-h-11 w-full justify-start" onClick={() => downloadCalendarFile(calendarDetails)}>
              <CalendarDays className="size-4" aria-hidden="true" />
              Baixar arquivo .ics
            </Button>
            <Button asChild variant="outline" className="min-h-11 w-full justify-start">
              <a href={googleCalendarUrl} target="_blank" rel="noreferrer">
                <CalendarDays className="size-4" aria-hidden="true" />
                Adicionar ao Google Calendar
                <ArrowUpRight className="ml-auto size-4" aria-hidden="true" />
              </a>
            </Button>
            <Button asChild variant="outline" className="min-h-11 w-full justify-start">
              <a href={whatsappUrl} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" aria-hidden="true" />
                Enviar por WhatsApp
                <ArrowUpRight className="ml-auto size-4" aria-hidden="true" />
              </a>
            </Button>
            {unitQuery.isPending ?
              <Skeleton className="h-11 w-full" aria-label="Carregando endereço" />
            : unitQuery.isError ?
              <div className="space-y-2">
                <p role="alert" className="text-sm text-destructive">
                  Não foi possível carregar o endereço da barbearia.
                </p>
                <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => void unitQuery.refetch()}>
                  Tentar carregar o endereço novamente
                </Button>
              </div>
            : directionsUrl ?
              <Button asChild variant="outline" className="min-h-11 w-full justify-start">
                <a href={directionsUrl} target="_blank" rel="noreferrer">
                  <MapPin className="size-4" aria-hidden="true" />
                  Como chegar
                  <ArrowUpRight className="ml-auto size-4" aria-hidden="true" />
                </a>
              </Button>
            : <p className="text-sm text-muted-foreground">O endereço da barbearia não está disponível no momento.</p>}
            {address && <p className="text-sm text-muted-foreground">{address}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Acompanhe seus próximos agendamentos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Crie uma conta usando o telefone informado para acessar seus horários.</p>
        </div>
        <Button asChild className="min-h-11 shrink-0">
          <Link href="/cadastrar">Criar conta para acompanhar seus agendamentos</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" className="min-h-11">
          <Link href={rescheduleUrl}>Reagendar</Link>
        </Button>
        <Button asChild variant="outline" className="min-h-11">
          <Link href={cancelUrl}>Cancelar</Link>
        </Button>
        <Button asChild variant="ghost" className="min-h-11">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  )
}
