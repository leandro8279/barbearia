import {useEffect} from 'react'
import {useLocation, Link} from 'wouter'
import {CalendarDays, Clock3, MapPin, Repeat2, Scissors, UserRound} from 'lucide-react'
import {useAccountAppointments, useAccountBarbers, useAccountUser} from '@/modules/account/hooks/use-account-data'
import {useRepeatAppointment} from '@/modules/account/hooks/use-repeat-appointment'
import {usePublicUnit} from '@/modules/site/hooks/use-public-unit'
import {EmptyState} from '@/shared/components/empty-state'
import {ErrorState} from '@/shared/components/error-state'
import {PageHeader} from '@/shared/components/page-header'
import {StatusBadge, type AppointmentStatus} from '@/shared/components/status-badge'
import {formatBRL, formatDateTime} from '@/shared/lib/format'
import {Button} from '@/shared/ui/button'
import {Card, CardContent, CardHeader, CardTitle} from '@/shared/ui/card'
import {Skeleton} from '@/shared/ui/skeleton'

const apiStatusLabels: Record<string, AppointmentStatus> = {
  pending: 'agendado',
  confirmed: 'confirmado',
  checked_in: 'aguardando',
  in_service: 'em_atendimento',
  done: 'concluido',
  canceled: 'cancelado',
  no_show: 'no_show'
}

export default function AccountOverviewPage() {
  const [, navigate] = useLocation()
  const userQuery = useAccountUser()
  const upcomingQuery = useAccountAppointments({view: 'upcoming', page: 1, limit: 1})
  const lastCutQuery = useAccountAppointments({view: 'past', page: 1, limit: 1, status: 'done'})
  const barbersQuery = useAccountBarbers()
  const unitQuery = usePublicUnit()
  const repeatAppointment = useRepeatAppointment()
  const upcoming = upcomingQuery.data?.items[0]
  const lastCut = lastCutQuery.data?.items[0]

  useEffect(() => {
    document.title = 'Visão geral | Barbearia'
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!description) {
      description = document.createElement('meta')
      description.name = 'description'
      document.head.append(description)
    }
    description.content = 'Consulte seu próximo horário e acesse rapidamente seus agendamentos.'
  }, [])

  const header = (
    <PageHeader
      eyebrow="Minha conta"
      title={userQuery.data ? `Olá, ${userQuery.data.name.split(' ')[0]}` : 'Visão geral'}
      description="Acompanhe seus horários e volte a agendar quando quiser."
      actions={
        <Button asChild className="min-h-11">
          <Link href="/agendar">
            <CalendarDays aria-hidden="true" />
            Agendar de novo
          </Link>
        </Button>
      }
    />
  )

  if (userQuery.isPending || upcomingQuery.isPending || lastCutQuery.isPending) {
    return (
      <div className="space-y-6">
        {header}
        <Skeleton className="h-64 rounded-2xl" aria-label="Carregando seu próximo agendamento" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    )
  }

  if (userQuery.isError || upcomingQuery.isError || lastCutQuery.isError) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState
          title="Não foi possível carregar sua conta"
          description="Confira sua conexão e tente carregar os dados novamente."
          onRetry={() => {
            void userQuery.refetch()
            void upcomingQuery.refetch()
            void lastCutQuery.refetch()
          }}
        />
      </div>
    )
  }

  const barberName = upcoming ? (barbersQuery.data?.find(barber => barber.id === upcoming.barberId)?.name ?? 'Profissional') : ''
  const mapDestination = unitQuery.data?.address?.trim() || unitQuery.data?.name?.trim() || 'barbearia'
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapDestination)}`
  const serviceNames = upcoming?.items.map(item => item.name).filter(Boolean) ?? []

  return (
    <div className="space-y-6">
      {header}

      <Card className="overflow-hidden border-primary/25">
        <CardHeader className="border-b border-border/70 bg-primary/5">
          <p className="text-sm font-semibold text-primary">Seu próximo agendamento</p>
          <CardTitle className="text-xl">Um horário reservado para você</CardTitle>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          {upcoming ?
            <div className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data e hora</p>
                    <p className="mt-1 font-semibold">{formatDateTime(upcoming.start)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <UserRound className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm text-muted-foreground">Barbeiro</p>
                    <p className="mt-1 font-semibold">{barberName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:col-span-2">
                  <Scissors className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm text-muted-foreground">Serviços</p>
                    <p className="mt-1 font-semibold">{serviceNames.length ? serviceNames.join(' · ') : 'Serviços não informados'}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <div className="flex items-center gap-3">
                  <StatusBadge kind="appointment" status={apiStatusLabels[upcoming.status] ?? upcoming.status.replaceAll('_', ' ')} />
                  <span className="text-sm text-muted-foreground">Total {formatBRL(upcoming.total)}</span>
                </div>
                <span className="text-xs text-muted-foreground">Código {upcoming.code}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild className="min-h-11">
                  <Link href={`/conta/agendamentos?reagendar=1&appointmentId=${upcoming.id}`}>Reagendar</Link>
                </Button>
                <Button asChild variant="outline" className="min-h-11">
                  <Link href={`/conta/agendamentos?cancelar=1&appointmentId=${upcoming.id}`}>Cancelar</Link>
                </Button>
                <Button asChild variant="outline" className="min-h-11">
                  <a href={directionsUrl} target="_blank" rel="noreferrer">
                    <MapPin aria-hidden="true" />
                    Como chegar
                  </a>
                </Button>
              </div>
            </div>
          : <EmptyState
              title="Você ainda não tem um próximo horário"
              description="Escolha um serviço e encontre um horário para sua próxima visita."
              actionLabel="Agendar horário"
              onAction={() => navigate('/agendar')}
            />
          }
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Atalhos de agendamento">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-primary" aria-hidden="true" />
              Agendar de novo
            </CardTitle>
            <p className="text-sm text-muted-foreground">Veja os serviços e horários disponíveis.</p>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="min-h-11 w-full">
              <Link href="/agendar">Escolher horário</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Repeat2 className="size-4 text-primary" aria-hidden="true" />
              Repetir último corte
            </CardTitle>
            <p className="text-sm text-muted-foreground">Use os mesmos serviços e profissional do último atendimento concluído.</p>
          </CardHeader>
          <CardContent>
            <Button className="min-h-11 w-full" variant="outline" disabled={!lastCut?.items.length} onClick={() => lastCut && repeatAppointment(lastCut)}>
              <Scissors aria-hidden="true" />
              {lastCut ? 'Repetir serviços e barbeiro' : 'Nenhum corte anterior'}
            </Button>
          </CardContent>
        </Card>
      </section>

      {!upcoming && lastCut && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock3 className="size-4" aria-hidden="true" />
          Seu último atendimento foi em {formatDateTime(lastCut.start)}.
        </p>
      )}
    </div>
  )
}
