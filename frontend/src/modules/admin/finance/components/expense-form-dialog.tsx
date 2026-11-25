import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { AlertCircle, X } from 'lucide-react';
import type { Expense, ExpenseCategory, ExpenseInput } from '@/modules/admin/finance/api/finance';
import { expenseSchema, type ExpenseFormValues } from '@/modules/admin/finance/schemas/expense.schema';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/form-field';
import { formatDate } from '@/shared/lib/format';
import { MoneyInput } from '@/shared/components/money-input';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Switch } from '@/shared/ui/switch';

const defaultValues: ExpenseFormValues = { description: '', category: '', amountCents: 0, dueDate: '', recurring: false };

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
  categories,
  categoriesLoading,
  categoriesError,
  pending,
  onRetryCategories,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  categories: ExpenseCategory[];
  categoriesLoading: boolean;
  categoriesError: boolean;
  pending: boolean;
  onRetryCategories: () => void;
  onSave: (id: number | null, input: ExpenseInput) => Promise<void>;
}) {
  const [discardOpen, setDiscardOpen] = useState(false);
  const form = useForm<ExpenseFormValues>({ resolver: zodResolver(expenseSchema), defaultValues, mode: 'onChange' });
  const error = form.formState.errors.root?.server?.message;

  useEffect(() => {
    if (!open) return;
    form.reset({
      description: expense?.description ?? '',
      category: categories.find((item) => item.name === expense?.category)?.slug ?? expense?.category ?? '',
      amountCents: expense?.amountCents ?? 0,
      dueDate: expense ? formatDate(expense.dueAt, 'yyyy-MM-dd') : '',
      recurring: expense?.recurring ?? false,
    });
  }, [categories, expense, form, open]);

  function requestClose(nextOpen: boolean) {
    if (!nextOpen && pending) return;
    if (!nextOpen && form.formState.isDirty) {
      setDiscardOpen(true);
      return;
    }
    onOpenChange(nextOpen);
  }

  function discardChanges() {
    form.reset(defaultValues);
    setDiscardOpen(false);
    onOpenChange(false);
  }

  async function submit(values: ExpenseFormValues) {
    const input: ExpenseInput = { description: values.description, category: values.category, amountCents: values.amountCents, dueAt: `${values.dueDate}T12:00:00-03:00`, recurring: values.recurring };
    try {
      await onSave(expense?.id ?? null, input);
      form.reset(defaultValues);
      onOpenChange(false);
    } catch (saveError) {
      form.setError('root.server', { type: 'server', message: saveError instanceof Error ? saveError.message : 'Não foi possível salvar. Confira sua conexão e tente novamente.' });
    }
  }

  const categoryUnavailable = categoriesLoading || categoriesError || categories.length === 0;

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto pr-14 sm:max-w-xl" showCloseButton={false}>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon" className="absolute right-3 top-3 min-h-11 min-w-11" aria-label="Fechar formulário" disabled={pending}>
              <X aria-hidden="true" />
            </Button>
          </DialogClose>
          <DialogHeader>
            <DialogTitle>{expense ? 'Editar despesa' : 'Nova despesa'}</DialogTitle>
            <DialogDescription>{expense ? 'Atualize os dados deste compromisso financeiro.' : 'Registre um compromisso para manter o caixa em ordem.'}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input {...field} autoFocus maxLength={120} placeholder="Ex.: Aluguel do imóvel" className="min-h-11" disabled={pending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={categoryUnavailable || pending}>
                        <FormControl>
                          <SelectTrigger className="min-h-11 w-full">
                            <SelectValue placeholder={categoriesLoading ? 'Carregando categorias…' : 'Selecione uma categoria'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((item) => (
                            <SelectItem key={item.id} value={item.slug}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {categoriesError && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-destructive">
                          <span>Não foi possível carregar as categorias.</span>
                          <button type="button" className="min-h-8 font-medium underline underline-offset-4" onClick={onRetryCategories}>
                            Tentar novamente
                          </button>
                        </div>
                      )}
                      {!categoriesError && !categoriesLoading && categories.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma categoria disponível para cadastro.</p>}
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
                        <MoneyInput id="expense-amount" value={field.value} onValueChange={field.onChange} disabled={pending} aria-label="Valor da despesa em reais" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vencimento</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" className="min-h-11" disabled={pending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recurring"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50">
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={pending} aria-label="Repetir mensalmente" />
                      <span>
                        <span className="block font-medium">Repetir mensalmente</span>
                        <span className="block text-xs text-muted-foreground">Identifica esta despesa como recorrente mensal.</span>
                      </span>
                    </label>
                  </FormItem>
                )}
              />
              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              )}
              <DialogFooter className="flex-col-reverse sm:flex-row">
                <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => requestClose(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="min-h-11" disabled={pending || categoryUnavailable || !form.formState.isValid}>
                  {pending ?
                    'Salvando…'
                  : expense ?
                    'Salvar alterações'
                  : 'Cadastrar despesa'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Descartar alterações?"
        description="Os dados não salvos deste formulário serão perdidos."
        confirmLabel="Descartar"
        destructive
        onConfirm={discardChanges}
      />
    </>
  );
}
