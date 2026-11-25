import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { OpenCashTab } from '@/modules/admin/cash/api/cash';
import { useCashTabDetail, useCloseCashTab } from '@/modules/admin/cash/hooks/use-cash';
import { cashCloseSchema, CashCloseValues } from '@/modules/admin/cash/schemas/cash-close.schema';

import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { ErrorState } from '@/shared/components/error-state';
import { MoneyInput } from '@/shared/components/money-input';
import { formatBRL } from '@/shared/lib/format';
import { calculatePricing } from '@/shared/lib/pricing';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';

interface CashCloseDialogProps {
  open: boolean;
  tabId: number | null;
  openTabs: OpenCashTab[];
  cashSessionOpen: boolean;
  tabListLoading: boolean;
  tabListError: boolean;
  onRetryTabList: () => void;
  onSelectTab: (id: number) => void;
  onOpenChange: (open: boolean) => void;
}

const emptyFormValues: CashCloseValues = { cashAmountCents: 0, cashReceivedCents: 0, pixCents: 0, debitCents: 0, creditCents: 0, tipCents: 0, tipAllocations: [] };

function splitTipEvenly(amountCents: number, barbers: { id: number }[]) {
  if (!barbers.length) return [];
  const baseAmount = Math.floor(amountCents / barbers.length);
  const extraCents = amountCents % barbers.length;
  return barbers.map((barber, index) => ({ barberId: barber.id, amountCents: baseAmount + (index < extraCents ? 1 : 0) }));
}

export function CashCloseDialog({ open, onOpenChange, tabId, openTabs, cashSessionOpen, tabListLoading, tabListError, onRetryTabList, onSelectTab }: CashCloseDialogProps) {
  const tabQuery = useCashTabDetail(tabId ?? 0);
  const closeTab = useCloseCashTab();
  const [formError, setFormError] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const eligibleBarbers = useMemo(() => {
    const detail = tabQuery.data;
    if (!detail) return [];
    const ids = [...new Set(detail.tab.items.map((item) => item.barberId).filter((id): id is number => id !== null))];
    return ids.map((id) => ({ id, name: detail.barbers.find((barber) => barber.id === id)?.name ?? `Barbeiro #${id}` }));
  }, [tabQuery.data]);
  const schema = useMemo(() => cashCloseSchema(eligibleBarbers.length), [eligibleBarbers.length]);
  const form = useForm<CashCloseValues>({ resolver: zodResolver(schema), defaultValues: emptyFormValues, mode: 'onChange' });
  const { reset, setValue, watch } = form;
  const values = watch();
  const tab = tabQuery.data?.tab;
  const pricing =
    tab ?
      calculatePricing(
        tab.items.map((item) => ({ quantity: item.qty, unitPriceCents: item.unitPrice, discountCents: item.discount })),
        tab.discount,
      )
    : null;
  const tipCents = values.tipCents ?? 0;
  const totalDueCents = (pricing?.totalCents ?? 0) + tipCents;
  const paymentTotalCents = (values.cashAmountCents ?? 0) + (values.pixCents ?? 0) + (values.debitCents ?? 0) + (values.creditCents ?? 0);
  const remainingCents = totalDueCents - paymentTotalCents;
  const cashChangeCents = Math.max(0, (values.cashReceivedCents ?? 0) - (values.cashAmountCents ?? 0));
  const tipAllocationTotal = (values.tipAllocations ?? []).reduce((sum, allocation) => sum + allocation.amountCents, 0);
  const busy = closeTab.isPending;
  const hasUnsavedChanges = form.formState.isDirty;

  useEffect(() => {
    if (!open) {
      reset(emptyFormValues);
      setFormError('');
      return;
    }
    if (tab) {
      reset({ ...emptyFormValues, tipAllocations: eligibleBarbers.map((barber) => ({ barberId: barber.id, amountCents: 0 })) });
      setFormError('');
    }
  }, [eligibleBarbers, open, reset, tab]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(tabId ? 'cash-close-cash-amount' : 'cash-close-tab-select')?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, openTabs.length, tabId, tab, tabListLoading]);

  function requestClose(nextOpen: boolean) {
    if (!nextOpen && busy) return;
    if (!nextOpen && hasUnsavedChanges) {
      setDiscardOpen(true);
      return;
    }
    setFormError('');
    onOpenChange(nextOpen);
  }

  function setTipAmount(amountCents: number) {
    setValue('tipCents', amountCents, { shouldDirty: true, shouldValidate: true });
    setValue('tipAllocations', splitTipEvenly(amountCents, eligibleBarbers), { shouldDirty: true, shouldValidate: true });
    setFormError('');
  }

  async function submit(valuesToSubmit: CashCloseValues) {
    if (!tab || tab.status !== 'open' || !pricing) return;
    if (valuesToSubmit.cashAmountCents + valuesToSubmit.pixCents + valuesToSubmit.debitCents + valuesToSubmit.creditCents !== pricing.totalCents + valuesToSubmit.tipCents) {
      setFormError('A soma dos pagamentos deve ser igual ao total da comanda mais a gorjeta.');
      return;
    }
    const payments = [
      { method: 'cash' as const, amountCents: valuesToSubmit.cashAmountCents },
      { method: 'pix' as const, amountCents: valuesToSubmit.pixCents },
      { method: 'debit' as const, amountCents: valuesToSubmit.debitCents },
      { method: 'credit' as const, amountCents: valuesToSubmit.creditCents },
    ].filter((payment) => payment.amountCents > 0);
    try {
      await closeTab.mutateAsync({ id: tab.id, input: { tipCents: valuesToSubmit.tipCents, tipAllocations: valuesToSubmit.tipAllocations, payments } });
      reset(emptyFormValues);
      setFormError('');
      onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível fechar a conta. Nenhuma alteração foi gravada.');
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fechar conta</DialogTitle>
            <DialogDescription>{tab ? `Comanda #${tab.id} · ${tabQuery.data?.customer?.name ?? 'Venda avulsa'}` : 'Registre os pagamentos e finalize a comanda.'}</DialogDescription>
          </DialogHeader>

          {!tabId ?
            <div className="space-y-3">
              <label htmlFor="cash-close-tab-select" className="text-sm font-medium">
                Comanda a fechar
              </label>
              {tabListError ?
                <ErrorState title="Não foi possível carregar as comandas" description="Tente novamente antes de continuar." onRetry={onRetryTabList} />
              : tabListLoading ?
                <Skeleton className="h-11 rounded-md" />
              : openTabs.length ?
                <Select value="" onValueChange={(value) => onSelectTab(Number(value))}>
                  <SelectTrigger id="cash-close-tab-select" className="min-h-11 w-full">
                    <SelectValue placeholder="Selecione uma comanda aberta" />
                  </SelectTrigger>
                  <SelectContent>
                    {openTabs.map((openTab) => (
                      <SelectItem key={openTab.id} value={String(openTab.id)}>
                        #{openTab.id} · {openTab.customerName} · {formatBRL(openTab.totalCents)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              : <p role="status" className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Não há comandas abertas para fechar.
                </p>
              }
            </div>
          : tabQuery.isPending ?
            <Skeleton className="h-64 rounded-xl" aria-label="Carregando comanda" />
          : tabQuery.isError || !tab ?
            <ErrorState title="Não foi possível carregar a comanda" description="Confira se a comanda existe e se você tem acesso." onRetry={() => void tabQuery.refetch()} />
          : tab.status !== 'open' ?
            <ErrorState title="Esta comanda não está aberta" description="Atualize a lista de comandas para escolher uma conta pendente." />
          : pricing ?
            <Form {...form}>
              <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
                <Card>
                  <CardContent className="grid gap-2 p-4 text-sm sm:grid-cols-2">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="tabular-nums">{formatBRL(pricing.subtotalCents)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Descontos</span>
                      <span className="tabular-nums">− {formatBRL(pricing.discountCents)}</span>
                    </div>
                    <div className="flex justify-between gap-3 border-t pt-2 font-medium sm:col-span-2">
                      <span>Total da comanda</span>
                      <span className="tabular-nums">{formatBRL(pricing.totalCents)}</span>
                    </div>
                  </CardContent>
                </Card>

                <section className="space-y-3" aria-labelledby="cash-close-tip-title">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 id="cash-close-tip-title" className="font-semibold">
                        Gorjeta
                      </h3>
                      <p className="text-sm text-muted-foreground">A gorjeta não gera comissão sobre os itens.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[5, 10, 15].map((percentage) => (
                        <Button key={percentage} type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => setTipAmount(Math.round((pricing.totalCents * percentage) / 100))}>
                          {percentage}%
                        </Button>
                      ))}
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="tipCents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor livre</FormLabel>
                        <FormControl>
                          <MoneyInput
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              setValue('tipAllocations', splitTipEvenly(value, eligibleBarbers), { shouldDirty: true, shouldValidate: true });
                              setFormError('');
                            }}
                            aria-label="Valor da gorjeta"
                            disabled={busy}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {eligibleBarbers.length ?
                    <div className="space-y-3 rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">Dividir entre barbeiros</p>
                          <p className="text-xs text-muted-foreground">
                            Rateio atual: {formatBRL(tipAllocationTotal)} de {formatBRL(tipCents)}.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-11"
                          disabled={busy || tipCents === 0}
                          onClick={() => setValue('tipAllocations', splitTipEvenly(tipCents, eligibleBarbers), { shouldDirty: true, shouldValidate: true })}
                        >
                          Dividir igualmente
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {eligibleBarbers.map((barber) => {
                          const allocationIndex = values.tipAllocations.findIndex((allocation) => allocation.barberId === barber.id);
                          if (allocationIndex < 0) return null;
                          return (
                            <FormField
                              key={barber.id}
                              control={form.control}
                              name={`tipAllocations.${allocationIndex}.amountCents`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{barber.name}</FormLabel>
                                  <FormControl>
                                    <MoneyInput value={field.value} onValueChange={field.onChange} aria-label={`Gorjeta para ${barber.name}`} disabled={busy} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          );
                        })}
                      </div>
                      {tipAllocationTotal !== tipCents && (
                        <p role="alert" className="text-sm text-destructive">
                          O rateio precisa somar o valor da gorjeta.
                        </p>
                      )}
                    </div>
                  : <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Esta comanda não tem barbeiros vinculados. A gorjeta será registrada sem rateio.</p>}
                </section>

                <section className="space-y-3" aria-labelledby="cash-close-payments-title">
                  <div>
                    <h3 id="cash-close-payments-title" className="font-semibold">
                      Pagamentos
                    </h3>
                    <p className="text-sm text-muted-foreground">Combine formas de pagamento. O total deve incluir a gorjeta.</p>
                  </div>
                  {!cashSessionOpen && (
                    <p role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                      Abra o caixa para receber pagamentos em dinheiro. Pix, débito e crédito continuam disponíveis.
                    </p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="cashAmountCents"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parte paga em dinheiro</FormLabel>
                          <FormControl>
                            <MoneyInput id="cash-close-cash-amount" value={field.value} onValueChange={field.onChange} aria-label="Parte paga em dinheiro" disabled={busy || !cashSessionOpen} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cashReceivedCents"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dinheiro recebido</FormLabel>
                          <FormControl>
                            <MoneyInput value={field.value} onValueChange={field.onChange} aria-label="Dinheiro recebido" disabled={busy || !cashSessionOpen} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {(
                      [
                        { name: 'pixCents', label: 'Pix' },
                        { name: 'debitCents', label: 'Débito' },
                        { name: 'creditCents', label: 'Crédito' },
                      ] as const
                    ).map((method) => (
                      <FormField
                        key={method.name}
                        control={form.control}
                        name={method.name}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{method.label}</FormLabel>
                            <FormControl>
                              <MoneyInput value={field.value} onValueChange={field.onChange} aria-label={`Valor pago em ${method.label}`} disabled={busy} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-muted-foreground">Total a pagar</p>
                      <p className="font-semibold tabular-nums">{formatBRL(totalDueCents)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pagamentos informados</p>
                      <p className="font-semibold tabular-nums">{formatBRL(paymentTotalCents)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        {remainingCents > 0 ?
                          'Falta pagar'
                        : remainingCents < 0 ?
                          'Valor excedente'
                        : 'Troco em dinheiro'}
                      </p>
                      <p className="font-semibold tabular-nums">{remainingCents === 0 ? formatBRL(cashChangeCents) : formatBRL(Math.abs(remainingCents))}</p>
                    </div>
                  </div>
                  {remainingCents !== 0 && (
                    <p role="status" className="text-sm text-muted-foreground">
                      A soma dos pagamentos precisa corresponder ao total a pagar.
                    </p>
                  )}
                  {remainingCents === 0 && cashChangeCents > 0 && (
                    <p role="status" className="text-sm text-muted-foreground">
                      Troco a devolver: {formatBRL(cashChangeCents)}. Apenas o valor aplicado será registrado como pagamento.
                    </p>
                  )}
                </section>

                {formError && (
                  <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                    {formError}
                  </p>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => requestClose(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="min-h-11" disabled={busy || !form.formState.isValid || remainingCents !== 0}>
                    {busy ? 'Concluindo…' : 'Concluir'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Descartar fechamento?"
        description="Os valores informados ainda não foram salvos. Deseja sair sem concluir?"
        confirmLabel="Descartar"
        destructive
        onConfirm={() => {
          setDiscardOpen(false);
          reset(emptyFormValues);
          setFormError('');
          onOpenChange(false);
        }}
      />
    </>
  );
}
