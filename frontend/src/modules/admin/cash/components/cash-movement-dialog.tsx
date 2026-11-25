import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'wouter';
import { useCreateCashMovement } from '@/modules/admin/cash/hooks/use-cash';
import { cashMovementSchema, type CashMovementValues } from '@/modules/admin/cash/schemas/cash-movement.schema';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { MoneyInput } from '@/shared/components/money-input';
import { formatBRL } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Textarea } from '@/shared/ui/textarea';

interface CashMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashSessionOpen: boolean;
  cashSessionLoading: boolean;
  cashSessionError: boolean;
  onRetryCashSession: () => void;
  cashBalanceCents: number;
  responsibleName: string;
}

const defaultValues: CashMovementValues = { type: 'withdraw', amountCents: 0, reason: '' };

export function CashMovementDialog({ open, onOpenChange, cashSessionOpen, cashSessionLoading, cashSessionError, onRetryCashSession, cashBalanceCents, responsibleName }: CashMovementDialogProps) {
  const movement = useCreateCashMovement();
  const [formError, setFormError] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const form = useForm<CashMovementValues>({ resolver: zodResolver(cashMovementSchema), defaultValues, mode: 'onChange' });
  const busy = movement.isPending;

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues);
      setFormError('');
      return;
    }
    form.reset(defaultValues);
    setFormError('');
    const frame = window.requestAnimationFrame(() => document.getElementById('cash-movement-type')?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [form.reset, open]);

  function requestClose(nextOpen: boolean) {
    if (!nextOpen && busy) return;
    if (!nextOpen && form.formState.isDirty) {
      setDiscardOpen(true);
      return;
    }
    setFormError('');
    onOpenChange(nextOpen);
  }

  function discardChanges() {
    form.reset(defaultValues);
    setFormError('');
    setDiscardOpen(false);
    onOpenChange(false);
  }

  async function submit(values: CashMovementValues) {
    if (!cashSessionOpen) {
      setFormError('Abra uma sessão de caixa antes de registrar movimentações.');
      return;
    }
    try {
      await movement.mutateAsync(values);
      form.reset(defaultValues);
      setFormError('');
      onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível registrar a movimentação. Nenhuma alteração foi gravada.');
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sangria e suprimento</DialogTitle>
            <DialogDescription>Registre uma retirada ou entrada de dinheiro na sessão aberta.</DialogDescription>
          </DialogHeader>

          {cashSessionLoading ?
            <Skeleton className="h-24 rounded-lg" aria-label="Verificando sessão do caixa" />
          : cashSessionError ?
            <div className="space-y-3">
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                Não foi possível verificar se há uma sessão de caixa aberta.
              </p>
              <Button type="button" variant="outline" className="min-h-11 w-full" onClick={onRetryCashSession}>
                Tentar novamente
              </Button>
            </div>
          : !cashSessionOpen ?
            <div className="space-y-4">
              <p role="status" className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Abra uma sessão de caixa antes de registrar uma sangria ou suprimento.
              </p>
              <Button asChild className="min-h-11 w-full">
                <Link href="/admin/caixa/sessao">Abrir caixa</Link>
              </Button>
            </div>
          : <Form {...form}>
              <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Saldo disponível em dinheiro</span>
                    <span className="font-semibold tabular-nums">{formatBRL(cashBalanceCents)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">A sangria reduz este saldo; o suprimento aumenta.</p>
                </div>

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de movimentação</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setFormError('');
                        }}
                        disabled={busy}
                      >
                        <FormControl>
                          <SelectTrigger id="cash-movement-type" className="min-h-11 w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="withdraw">Sangria — retirar dinheiro</SelectItem>
                          <SelectItem value="supply">Suprimento — adicionar dinheiro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amountCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor</FormLabel>
                      <FormControl>
                        <MoneyInput
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            setFormError('');
                          }}
                          aria-label="Valor da movimentação"
                          disabled={busy}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          maxLength={250}
                          rows={3}
                          placeholder="Ex.: pagamento de entrega"
                          disabled={busy}
                          onChange={(event) => {
                            field.onChange(event);
                            setFormError('');
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="rounded-lg border p-3 text-sm">
                  <span className="text-muted-foreground">Responsável</span>
                  <p className="mt-1 font-medium">{responsibleName || 'Equipe'}</p>
                </div>

                {formError && (
                  <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {formError}
                  </p>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => requestClose(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="min-h-11" disabled={busy}>
                    {busy ? 'Registrando…' : 'Registrar movimentação'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          }
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Descartar movimentação?"
        description="Os dados preenchidos serão perdidos."
        confirmLabel="Descartar"
        cancelLabel="Continuar preenchendo"
        destructive
        onConfirm={discardChanges}
      />
    </>
  );
}
