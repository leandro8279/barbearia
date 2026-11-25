import {useEffect} from 'react'
import {Link, useParams, useSearch} from 'wouter'
import {ArrowLeft, CalendarPlus, Clock3, DollarSign, MessageCircle, Pin, Scissors, UserRound} from 'lucide-react'
import {CustomerDrawer} from '@/modules/admin/customers/components/customer-drawer'
import {useAdminCustomerProfile} from '@/modules/admin/customers/hooks/use-customers'
import {useOverlay} from '@/shared/hooks/use-overlay'
import {formatBRL, formatDate, formatDateTime, formatPhone} from '@/shared/lib/format'
import {ErrorState} from '@/shared/components/error-state'
import {PageHeader} from '@/shared/components/page-header'
import {EmptyState} from '@/shared/components/empty-state'
import {Avatar, AvatarFallback, AvatarImage} from '@/shared/ui/avatar'
import {Badge} from '@/shared/ui/badge'
import {Button} from '@/shared/ui/button'
import {Skeleton} from '@/shared/ui/skeleton'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/shared/ui/tabs'

const appointmentStatus: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  checked_in: 'Aguardando',
  in_service: 'Em atendimento',
  done: 'Concluído',
  canceled: 'Cancelado',
  no_show: 'Não compareceu'
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toLocaleUpperCase('pt-BR')
}

export default function CustomerProfilePage() {
  const {id = ''} = useParams<{id: string}>()
  const search = useSearch()
  const overlay = useOverlay('cliente', '')
  const drawerId = new URLSearchParams(search).get('cliente')
  const profileQuery = useAdminCustomerProfile(id)
  const profile = profileQuery.data

  useEffect(() => {
    document.title = `${profile?.customer.name ?? 'Perfil do cliente'} | Painel administrativo`
  }, [profile?.customer.name])

  if (profileQuery.isPending) {
    return (
      <div className="space-y-6" role="status" aria-label="Carregando perfil do cliente">
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  if (profileQuery.isError || !profile) {
    return <ErrorState title="Não foi possível carregar o perfil" description="Confira se o cliente ainda existe e tente novamente." onRetry={() => void profileQuery.refetch()} />
  }

  const {customer, metrics, permissions, appointments, financial, notes} = profile
  const phoneDigits = customer.phone.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  const whatsappNumber = phoneDigits.length >= 10 ? `55${phoneDigits}` : ''
  const medianFrequency =
    metrics.medianIntervalDays === null ? 'Sem histórico suficiente' : `A cada ${new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 1}).format(metrics.medianIntervalDays)} dias`

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Painel administrativo · Clientes"
        title={customer.name}
        description="Perfil, histórico de atendimento e relacionamento."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/admin/clientes">
                <ArrowLeft aria-hidden="true" />
                Clientes
              </Link>
            </Button>
            {permissions.schedule && (
              <Button asChild className="min-h-11">
                <Link href="/admin/agenda?novo=1">
                  <CalendarPlus aria-hidden="true" />
                  Agendar
                </Link>
              </Button>
            )}
            {permissions.edit && whatsappNumber && (
              <Button asChild variant="outline" className="min-h-11">
                <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá, ${customer.name}!`)}`} target="_blank" rel="noreferrer">
                  <MessageCircle aria-hidden="true" />
                  WhatsApp
                </a>
              </Button>
            )}
            {permissions.edit && (
              <Button className="min-h-11" onClick={() => overlay.open(String(customer.id))}>
                Editar
              </Button>
            )}
          </div>
        }
      />

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:p-6" aria-label="Dados do cliente">
        <Avatar size="lg" className="size-16 text-lg">
          {customer.avatar && <AvatarImage src={customer.avatar} alt="" />}
          <AvatarFallback>{initials(customer.name) || <UserRound aria-hidden="true" />}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{customer.name}</h2>
            {customer.guest && <Badge variant="secondary">Visitante</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{customer.phoneMasked ? customer.phone : formatPhone(customer.phone) || 'Telefone não informado'}</span>
            {customer.email && <span className="break-all">{customer.email}</span>}
            {customer.birthDate && <span>Nascimento: {formatDate(customer.birthDate)}</span>}
          </div>
          {customer.referralSource && <p className="mt-2 text-sm text-muted-foreground">Conheceu por: {customer.referralSource}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {customer.tags.length ?
              customer.tags.map((tag, index) => (
                <Badge key={`${tag}-${index}`} variant="secondary">
                  {tag}
                </Badge>
              ))
            : <span className="text-sm text-muted-foreground">Sem tags</span>}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Indicadores do cliente">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Scissors className="size-4" aria-hidden="true" />
            Visitas
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{metrics.visitsCount.toLocaleString('pt-BR')}</p>
          <p className="mt-1 text-xs text-muted-foreground">Última visita: {metrics.lastVisit ? formatDate(metrics.lastVisit) : 'Ainda não visitou'}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="size-4" aria-hidden="true" />
            Ticket médio
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{formatBRL(metrics.averageTicketCents)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Por comanda finalizada</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="size-4" aria-hidden="true" />
            Frequência
          </div>
          <p className="mt-2 text-2xl font-semibold">{medianFrequency}</p>
          <p className="mt-1 text-xs text-muted-foreground">Mediana entre visitas concluídas</p>
        </div>
      </section>

      <Tabs defaultValue="historico" className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-3 sm:p-4">
          <TabsList className="grid h-auto w-full grid-cols-3">
            <TabsTrigger className="min-h-11" value="historico">
              Histórico
            </TabsTrigger>
            <TabsTrigger className="min-h-11" value="financeiro">
              Financeiro
            </TabsTrigger>
            <TabsTrigger className="min-h-11" value="notas">
              Notas
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="historico" className="space-y-3 p-4 sm:p-6">
          {!permissions.history ?
            <EmptyState title="Histórico indisponível" description="Sua conta não tem permissão para consultar a agenda." />
          : appointments.length === 0 ?
            <EmptyState title="Nenhum agendamento encontrado" description="O histórico deste cliente aparecerá aqui." />
          : appointments.map(appointment => (
              <article key={appointment.id} className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{appointment.items.map(item => item.name).join(' + ') || 'Agendamento'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDateTime(appointment.start)} · {appointment.code}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={appointment.status === 'done' ? 'default' : 'secondary'}>{appointmentStatus[appointment.status] ?? appointment.status}</Badge>
                  {appointment.items.length > 0 && (
                    <span className="text-sm tabular-nums text-muted-foreground">{formatBRL(appointment.items.reduce((total, item) => total + item.priceCents, 0))}</span>
                  )}
                </div>
              </article>
            ))
          }
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-3 p-4 sm:p-6">
          {!permissions.financial ?
            <EmptyState title="Dados financeiros indisponíveis" description="Sua conta não tem permissão para consultar o caixa." />
          : financial.length === 0 ?
            <EmptyState title="Nenhuma comanda finalizada" description="As comandas fechadas deste cliente aparecerão aqui." />
          : financial.map(tab => (
              <article key={tab.id} className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">Comanda #{tab.id}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(tab.date)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{tab.items.map(item => `${item.qty}× ${item.name}`).join(', ') || 'Sem itens'}</p>
                  {tab.payments.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{tab.payments.map(payment => `${payment.method}: ${formatBRL(payment.amountCents)}`).join(' · ')}</p>}
                </div>
                <p className="shrink-0 text-lg font-semibold tabular-nums">{formatBRL(tab.totalCents)}</p>
              </article>
            ))
          }
        </TabsContent>

        <TabsContent value="notas" className="space-y-3 p-4 sm:p-6">
          {!permissions.notes ?
            <EmptyState title="Notas indisponíveis" description="Sua conta não tem permissão para consultar as notas internas." />
          : notes.length === 0 ?
            <EmptyState title="Nenhuma nota registrada" description="As observações sobre este cliente aparecerão aqui." />
          : notes.map(note => (
              <article key={note.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="whitespace-pre-wrap text-sm">{note.text}</p>
                  {note.pinned && <Pin className="size-4 shrink-0 text-primary" aria-label="Nota fixada" />}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {note.type === 'preference' ? 'Preferência' : 'Nota'} · {formatDateTime(note.createdAt)}
                </p>
              </article>
            ))
          }
        </TabsContent>
      </Tabs>

      <CustomerDrawer open={overlay.isOpen && permissions.edit} customerId={drawerId} onOpenChange={open => overlay.setOpen(open, drawerId ?? String(customer.id))} />
    </div>
  )
}
