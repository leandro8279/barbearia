import {useEffect} from 'react'
import {Link, useLocation, useSearch} from 'wouter'
import {ArrowDownUp, ArrowRight, CircleDollarSign, Clock3, Plus, Receipt, ShoppingBag} from 'lucide-react'
import {CashCloseDialog} from '@/modules/admin/cash/components/cash-close-dialog'
import {CashMovementDialog} from '@/modules/admin/cash/components/cash-movement-dialog'
import {useCashSummary, useCreateCounterTab} from '@/modules/admin/cash/hooks/use-cash'
import {EmptyState} from '@/shared/components/empty-state'
import {ErrorState} from '@/shared/components/error-state'
import {PageHeader} from '@/shared/components/page-header'
import {formatBRL, formatDateTime} from '@/shared/lib/format'
import {useSessionStore} from '@/shared/stores/session-store'
import {useOverlay} from '@/shared/hooks/use-overlay'
import {Badge} from '@/shared/ui/badge'
import {Button} from '@/shared/ui/button'
import {Card, CardContent, CardTitle} from '@/shared/ui/card'
import {Skeleton} from '@/shared/ui/skeleton'

export default function CashPage() {
  const [, setLocation] = useLocation()
  const search = useSearch()
  const closeOverlay = useOverlay('fechar')
  const movementOverlay = useOverlay('movimento')
  const user = useSessionStore(state => state.user)
  const summaryQuery = useCashSummary()
  const createTab = useCreateCounterTab()
  const summary = summaryQuery.data ?? {session: null, balanceByMethod: null, openTabs: []}
  const session = summary?.session
  const canWriteCash = Boolean(user && (['admin', 'manager', 'reception'].includes(user.role) || user.permissions.includes('cash.write')))
  const tabIdParam = new URLSearchParams(search).get('tabId')
  const selectedTabId = Number(tabIdParam)
  const closeTabId = tabIdParam && Number.isInteger(selectedTabId) && selectedTabId > 0 ? selectedTabId : null

  useEffect(() => {
    document.title = 'Comandas e caixa | Painel administrativo'
  }, [])

  function createSale() {
    createTab.mutate(undefined, {onSuccess: tab => setLocation(`/admin/caixa/comandas/${tab.id}`)})
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Painel administrativo"
        title="Comandas e caixa"
        description="Acompanhe o saldo do caixa e as comandas que aguardam fechamento."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
              <Link href="/admin/caixa/sessao">
                <CircleDollarSign className="size-4" aria-hidden="true" />
                {session ? 'Fechar caixa' : 'Abrir caixa'}
              </Link>
            </Button>
            {session && canWriteCash && (
              <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
                <Link href="/admin/caixa?movimento=1">
                  <ArrowDownUp className="size-4" aria-hidden="true" />
                  Movimentação
                </Link>
              </Button>
            )}
            <Button className="min-h-11 w-full sm:w-auto" disabled={!canWriteCash || createTab.isPending} onClick={createSale}>
              <Plus className="size-4" aria-hidden="true" />
              {createTab.isPending ? 'Criando comanda…' : 'Nova comanda'}
            </Button>
          </div>
        }
      />

      {summaryQuery.isError ?
        <ErrorState title="Não foi possível carregar o caixa" description="Confira sua conexão e tente novamente." onRetry={() => void summaryQuery.refetch()} />
      : summaryQuery.isPending ?
        <Skeleton className="h-36 rounded-xl" />
      : <>
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-start gap-4">
                <div className={`flex size-12 shrink-0 items-center justify-center rounded-full ${session ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <CircleDollarSign className="size-6" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">Status do caixa</h2>
                    <Badge variant={session ? 'default' : 'secondary'}>{session ? 'Aberto' : 'Fechado'}</Badge>
                  </div>
                  {session ?
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock3 className="size-4" aria-hidden="true" />
                      Aberto {formatDateTime(session.openedAt)}
                    </p>
                  : <p className="mt-1 text-sm text-muted-foreground">Abra o caixa para registrar recebimentos em dinheiro.</p>}
                </div>
              </div>
              <div className="sm:text-right">
                <p className="text-sm text-muted-foreground">Saldo esperado em dinheiro</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{formatBRL(summary.balanceByMethod?.cash ?? 0)}</p>
                {session && <p className="mt-1 text-xs text-muted-foreground">Pix, débito e crédito não fazem parte do saldo em espécie.</p>}
              </div>
            </CardContent>
          </Card>

          {!canWriteCash && <p className="text-sm text-muted-foreground">Seu perfil permite acompanhar o caixa, mas não criar comandas ou operar a sessão.</p>}

          <section className="space-y-4" aria-label="Comandas abertas">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Comandas abertas</h2>
                <p className="text-sm text-muted-foreground">Atualização automática a cada 30 segundos.</p>
              </div>
              <Badge variant="outline">{summary.openTabs.length}</Badge>
            </div>

            {summary.openTabs.length ?
              <div className="grid gap-3">
                {summary.openTabs.map(tab => (
                  <Card key={tab.id} className={selectedTabId === tab.id ? 'border-primary ring-1 ring-primary/20' : undefined}>
                    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        {tab.type === 'counter' ?
                          <ShoppingBag className="size-5" aria-hidden="true" />
                        : <Receipt className="size-5" aria-hidden="true" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-base">{tab.customerName}</CardTitle>
                          <Badge variant="outline">#{tab.id}</Badge>
                          {tab.type === 'counter' && <Badge variant="secondary">Venda avulsa</Badge>}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {tab.barberName ? `${tab.barberName} · ` : ''}
                          {tab.itemCount} {tab.itemCount === 1 ? 'item' : 'itens'} · Aberta {formatDateTime(tab.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <p className="text-lg font-semibold tabular-nums">{formatBRL(tab.totalCents)}</p>
                        <Button asChild variant="ghost" size="icon" className="size-11 shrink-0" aria-label={`Abrir comanda ${tab.id}`}>
                          <Link href={`/admin/caixa/comandas/${tab.id}`}>
                            <ArrowRight className="size-4" aria-hidden="true" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            : <EmptyState
                title="Nenhuma comanda aberta"
                description="As comandas de agendamentos entram aqui após o check-in. Você também pode iniciar uma venda avulsa."
                icon={<Receipt className="size-8" />}
                actionLabel={canWriteCash ? 'Nova comanda' : undefined}
                onAction={canWriteCash ? createSale : undefined}
              />
            }
          </section>
        </>
      }
      <CashCloseDialog
        open={closeOverlay.isOpen}
        onOpenChange={isOpen => {
          if (isOpen) closeOverlay.open()
          else setLocation('/admin/caixa')
        }}
        tabId={closeTabId}
        openTabs={summary.openTabs}
        cashSessionOpen={Boolean(session)}
        tabListLoading={summaryQuery.isPending}
        tabListError={summaryQuery.isError}
        onRetryTabList={() => void summaryQuery.refetch()}
        onSelectTab={id => setLocation(`/admin/caixa?fechar=1&tabId=${id}`)}
      />
      <CashMovementDialog
        open={movementOverlay.isOpen}
        onOpenChange={isOpen => movementOverlay.setOpen(isOpen)}
        cashSessionOpen={Boolean(session)}
        cashSessionLoading={summaryQuery.isPending}
        cashSessionError={summaryQuery.isError}
        onRetryCashSession={() => void summaryQuery.refetch()}
        cashBalanceCents={summary.balanceByMethod?.cash ?? 0}
        responsibleName={user?.name ?? 'Equipe'}
      />
    </div>
  )
}
