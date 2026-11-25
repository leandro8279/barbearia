import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useParams } from 'wouter';
import { useForm, useWatch } from 'react-hook-form';
import { ArrowLeft, Printer, Receipt, ShoppingBag, Scissors, Percent } from 'lucide-react';
import { CashItemSheet } from '@/modules/admin/cash/components/cash-item-sheet';
import { useCashTabDetail, useUpdateCashTabDiscount } from '@/modules/admin/cash/hooks/use-cash';
import { cashTabDiscountSchema, type CashTabDiscountValues } from '@/modules/admin/cash/schemas/cash-tab-discount.schema';
import { useOverlay } from '@/shared/hooks/use-overlay';
import { useCan } from '@/shared/hooks/use-can';
import { MoneyInput } from '@/shared/components/money-input';
import { calculatePricing } from '@/shared/lib/pricing';
import { formatBRL, formatDateTime, formatDuration } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { Skeleton } from '@/shared/ui/skeleton';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';

export default function CashTabDetailPage() {
  const params = useParams<{ id: string }>();
  const tabId = Number(params.id);
  const tabQuery = useCashTabDetail(tabId);
  const itemOverlay = useOverlay('item');
  const canManageDiscount = useCan('cash.manage');
  const updateDiscount = useUpdateCashTabDiscount();
  const discountForm = useForm<CashTabDiscountValues>({ resolver: zodResolver(cashTabDiscountSchema), defaultValues: { discountCents: 0 } });
  const { reset, setError, clearErrors } = discountForm;
  const discountDraft = useWatch({ control: discountForm.control, name: 'discountCents' }) ?? 0;

  useEffect(() => {
    document.title = Number.isInteger(tabId) && tabId > 0 ? `Comanda #${tabId} | Painel administrativo` : 'Comanda | Painel administrativo';
  }, [tabId]);

  useEffect(() => {
    if (tabQuery.data) reset({ discountCents: tabQuery.data.tab.discount });
  }, [reset, tabQuery.data?.tab.discount]);

  if (!Number.isInteger(tabId) || tabId <= 0) {
    return <ErrorState title="Comanda inválida" description="Confira o endereço e tente novamente." />;
  }

  if (tabQuery.isError) {
    return <ErrorState title="Não foi possível carregar a comanda" description="A comanda pode não existir ou seu acesso pode ter mudado." onRetry={() => void tabQuery.refetch()} />;
  }

  if (tabQuery.isPending || !tabQuery.data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  const { tab, appointment, customer, barber, barbers, maxDiscountPct } = tabQuery.data;
  const pricing = calculatePricing(
    tab.items.map((item) => ({ quantity: item.qty, unitPriceCents: item.unitPrice, discountCents: item.discount })),
    tab.discount,
    tab.tip,
  );
  const discountExceedsSubtotal = discountDraft > pricing.subtotalCents;
  const discountNeedsPermission = discountDraft > 0 && pricing.subtotalCents > 0 && (discountDraft / pricing.subtotalCents) * 100 > maxDiscountPct && !canManageDiscount;
  const applyDiscount = discountForm.handleSubmit((values) => {
    if (values.discountCents > pricing.subtotalCents) {
      setError('discountCents', { message: 'O desconto não pode exceder o subtotal da comanda.' });
      return;
    }
    if (values.discountCents > 0 && pricing.subtotalCents > 0 && (values.discountCents / pricing.subtotalCents) * 100 > maxDiscountPct && !canManageDiscount) {
      setError('discountCents', { message: `Descontos acima de ${maxDiscountPct}% exigem permissão cash.manage.` });
      return;
    }
    clearErrors('discountCents');
    updateDiscount.mutate({ id: tab.id, discountCents: values.discountCents });
  });

  return (
    <div id="cash-receipt" className="space-y-6">
      <PageHeader
        eyebrow="Comandas e caixa"
        title={`Comanda #${tab.id}`}
        description="Confira os itens e os valores registrados nesta comanda."
        actions={
          <div className="cash-receipt-hidden flex flex-wrap gap-2">
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/admin/caixa">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Voltar ao caixa
              </Link>
            </Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden="true" />
              Imprimir recibo
            </Button>
            {tab.status === 'open' && (
              <Button asChild variant="outline" className="min-h-11">
                <Link href={`/admin/caixa?fechar=1&tabId=${tab.id}`}>
                  <Receipt className="size-4" aria-hidden="true" />
                  Fechar conta
                </Link>
              </Button>
            )}
            <Button type="button" className="min-h-11" disabled={tab.status !== 'open'} onClick={() => itemOverlay.open()}>
              <ShoppingBag className="size-4" aria-hidden="true" />
              Adicionar item
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Situação</p>
            <Badge className="mt-2" variant={tab.status === 'open' ? 'default' : 'secondary'}>
              {tab.status === 'open' ?
                'Aberta'
              : tab.status === 'closed' ?
                'Fechada'
              : 'Cancelada'}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Cliente</p>
            <p className="mt-2 font-medium">{customer?.name ?? (tab.type === 'counter' ? 'Venda avulsa' : 'Cliente')}</p>
            {customer?.phone && <p className="mt-1 text-xs text-muted-foreground">{customer.phone}</p>}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Barbeiro responsável</p>
            <p className="mt-2 font-medium">{barber?.name ?? 'Não definido'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Criada em</p>
            <p className="mt-2 font-medium">{formatDateTime(tab.createdAt)}</p>
            {appointment && (
              <p className="mt-1 text-xs text-muted-foreground">
                Agendamento #{appointment.id} · {formatDuration(appointment.actualDurationMin ?? Math.round((new Date(appointment.end).getTime() - new Date(appointment.start).getTime()) / 60_000))}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Itens da comanda</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {tab.items.length} {tab.items.length === 1 ? 'item' : 'itens'}
              </p>
            </div>
            {tab.type === 'appointment' && <Badge variant="outline">Atendimento</Badge>}
          </CardHeader>
          <CardContent className="space-y-3">
            {tab.items.length ?
              tab.items.map((item, index) => {
                const linePricing = calculatePricing([{ quantity: item.qty, unitPriceCents: item.unitPrice, discountCents: item.discount }]);
                return (
                  <article key={`${item.type}-${item.refId}-${index}`} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.type === 'service' ?
                          <Scissors className="size-4 text-muted-foreground" aria-hidden="true" />
                        : <ShoppingBag className="size-4 text-muted-foreground" aria-hidden="true" />}
                        <h3 className="font-medium">{item.name}</h3>
                        <Badge variant="secondary">{item.type === 'service' ? 'Serviço' : 'Produto'}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.qty} × {formatBRL(item.unitPrice)}
                        {' · '}
                        {item.barberId ? (barbers.find((itemBarber) => itemBarber.id === item.barberId)?.name ?? 'Profissional') : 'Sem profissional'}
                      </p>
                      {item.discount > 0 && <p className="mt-1 text-xs text-muted-foreground">Desconto no item: {formatBRL(item.discount)}</p>}
                    </div>
                    <p className="text-right font-semibold tabular-nums">{formatBRL(linePricing.totalCents)}</p>
                  </article>
                );
              })
            : <EmptyState
                title="Nenhum item na comanda"
                description="Adicione um serviço ou produto para continuar."
                icon={<Receipt className="size-8" />}
                actionLabel={tab.status === 'open' ? 'Adicionar item' : undefined}
                onAction={tab.status === 'open' ? () => itemOverlay.open() : undefined}
              />
            }
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatBRL(pricing.subtotalCents)}</span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Descontos</span>
              <span className="tabular-nums">− {formatBRL(pricing.discountCents)}</span>
            </div>
            {tab.status === 'open' && (
              <Form {...discountForm}>
                <form onSubmit={applyDiscount} className="space-y-3 border-t border-border pt-3">
                  <FormField
                    control={discountForm.control}
                    name="discountCents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Desconto da comanda</FormLabel>
                        <FormControl>
                          <MoneyInput
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              clearErrors('discountCents');
                            }}
                            aria-label="Desconto da comanda"
                            disabled={updateDiscount.isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">Descontos acima de {maxDiscountPct}% exigem permissão cash.manage.</p>
                  {(discountExceedsSubtotal || discountNeedsPermission) && !discountForm.formState.errors.discountCents && (
                    <p className="text-sm text-destructive">
                      {discountExceedsSubtotal ? 'O desconto não pode exceder o subtotal da comanda.' : `Descontos acima de ${maxDiscountPct}% exigem permissão cash.manage.`}
                    </p>
                  )}
                  <Button type="submit" variant="secondary" className="min-h-11 w-full" disabled={updateDiscount.isPending || discountExceedsSubtotal || discountNeedsPermission}>
                    <Percent className="size-4" aria-hidden="true" />
                    {updateDiscount.isPending ? 'Aplicando desconto…' : 'Aplicar desconto'}
                  </Button>
                </form>
              </Form>
            )}
            <div className="flex justify-between gap-3 border-t border-border pt-3 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatBRL(pricing.totalCents)}</span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Gorjeta</span>
              <span className="tabular-nums">{formatBRL(pricing.tipCents)}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-border pt-3 text-lg font-semibold">
              <span>Total com gorjeta</span>
              <span className="tabular-nums">{formatBRL(pricing.grandTotalCents)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Preços e comissões dos itens foram registrados no momento da inclusão.</p>
          </CardContent>
        </Card>
      </section>

      <CashItemSheet open={itemOverlay.isOpen && tab.status === 'open'} onOpenChange={(isOpen) => itemOverlay.setOpen(isOpen)} tabId={tab.id} defaultBarberId={tab.barberId} />
    </div>
  );
}
