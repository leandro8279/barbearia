import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'wouter';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { customerSchema, type CustomerFormValues } from '@/modules/admin/customers/schemas/customer.schema';
import { useAdminCustomerDuplicates, useAdminCustomerProfile, useSaveAdminCustomer } from '@/modules/admin/customers/hooks/use-customers';
import type { AdminCustomerInput } from '@/modules/admin/customers/api/customers';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { formatDateTime, formatPhone } from '@/shared/lib/format';
import { HttpError } from '@/shared/lib/http';
import { ErrorState } from '@/shared/components/error-state';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/form-field';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Switch } from '@/shared/ui/switch';

interface CustomerDrawerProps {
  open: boolean;
  customerId: string | null;
  onOpenChange: (open: boolean) => void;
}

function emptyCustomer(): CustomerFormValues {
  return { name: '', phone: '', email: '', birthDate: '', cpf: '', referralSource: '', tags: '', reminders: true, marketing: false };
}

export function CustomerDrawer({ open, customerId, onOpenChange }: CustomerDrawerProps) {
  const editingId = customerId && customerId !== 'novo' ? customerId : null;
  const customerQuery = useAdminCustomerProfile(editingId, open);
  const saveCustomer = useSaveAdminCustomer();
  const form = useForm<CustomerFormValues>({ resolver: zodResolver(customerSchema), defaultValues: emptyCustomer() });
  const phone = useDebounce(form.watch('phone'), 300);
  const name = useDebounce(form.watch('name'), 300);
  const phoneDigits = phone.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  const canCheckDuplicates = open && (phoneDigits.length >= 10 || name.trim().length >= 3);
  const duplicatesQuery = useAdminCustomerDuplicates({ phone, name, excludeId: editingId ?? undefined }, canCheckDuplicates);
  const duplicates = duplicatesQuery.data ?? [];
  const phoneDuplicate = duplicates.some((duplicate) => duplicate.matchedBy.includes('phone'));
  const waitingForCustomer = Boolean(editingId) && customerQuery.isPending;
  const customerLoadError = Boolean(editingId) && customerQuery.isError;

  useEffect(() => {
    if (!open) return;
    if (!editingId) {
      form.reset(emptyCustomer());
      return;
    }
    const customer = customerQuery.data?.customer;
    if (!customer) return;
    form.reset({
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? '',
      birthDate: customer.birthDate ?? '',
      cpf: customer.cpf ?? '',
      referralSource: customer.referralSource ?? '',
      tags: customer.tags.join(', '),
      reminders: customer.consent?.reminders ?? false,
      marketing: customer.consent?.marketing ?? false,
    });
  }, [customerQuery.data, editingId, form, open]);

  function requestOpenChange(nextOpen: boolean) {
    if (!nextOpen && form.formState.isDirty && !window.confirm('Descartar as alterações deste cliente?')) return;
    if (!nextOpen) form.reset();
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: CustomerFormValues) {
    if (phoneDuplicate) {
      form.setError('phone', { message: 'Este telefone já está cadastrado. Abra o cliente existente.' });
      return;
    }
    const input: AdminCustomerInput = {
      name: values.name.trim(),
      phone: values.phone,
      email: values.email.trim(),
      birthDate: values.birthDate,
      cpf: values.cpf,
      referralSource: values.referralSource.trim(),
      tags: [
        ...new Set(
          values.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      ].slice(0, 12),
      consent: { reminders: values.reminders, marketing: values.marketing },
    };
    form.clearErrors('root.server');
    try {
      await saveCustomer.mutateAsync({ id: editingId, input });
      form.reset(values);
      onOpenChange(false);
    } catch (error) {
      const responseError =
        error instanceof HttpError && typeof error.details === 'object' && error.details !== null && 'error' in error.details && typeof error.details.error === 'string' ? error.details.error : null;
      const message = responseError ?? (error instanceof Error ? error.message : 'Não foi possível salvar o cliente.');
      if (message.toLocaleLowerCase('pt-BR').includes('telefone')) form.setError('phone', { message });
      else form.setError('root.server', { message });
    }
  }

  return (
    <Sheet open={open} onOpenChange={requestOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border pr-12">
          <SheetTitle>{editingId ? 'Editar cliente' : 'Novo cliente'}</SheetTitle>
          <SheetDescription>Atualize os dados de contato e as preferências de comunicação.</SheetDescription>
        </SheetHeader>

        {customerLoadError ?
          <div className="p-5">
            <ErrorState title="Não foi possível carregar o cliente" onRetry={() => void customerQuery.refetch()} />
          </div>
        : waitingForCustomer ?
          <div className="flex min-h-64 items-center justify-center p-6 text-muted-foreground" role="status">
            <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
            Carregando dados do cliente...
          </div>
        : <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input {...field} autoFocus autoComplete="name" placeholder="Nome do cliente" className="min-h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone / WhatsApp</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" className="min-h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" autoComplete="email" placeholder="cliente@email.com" className="min-h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {(duplicates.length > 0 || duplicatesQuery.isError) && (
                  <section className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3" aria-label="Possíveis clientes duplicados">
                    <div className="flex gap-2">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
                      <div className="min-w-0 space-y-2">
                        <p className="text-sm font-medium">
                          {duplicatesQuery.isError ? 'Não foi possível conferir possíveis duplicados. O telefone será validado ao salvar.' : 'Encontramos cadastros que podem ser desta pessoa.'}
                        </p>
                        {duplicates.length > 0 && (
                          <ul className="space-y-2">
                            {duplicates.map((duplicate) => (
                              <li key={duplicate.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background/70 px-3 py-2 text-sm">
                                <span className="min-w-0">
                                  <span className="block font-medium">{duplicate.name}</span>
                                  <span className="text-muted-foreground">{formatPhone(duplicate.phone)}</span>
                                  {duplicate.matchedBy.includes('phone') && <span className="ml-2 text-destructive">Telefone já utilizado</span>}
                                </span>
                                <Button asChild type="button" variant="outline" size="sm" className="min-h-10">
                                  <Link href={`/admin/clientes/${duplicate.id}`}>Abrir perfil</Link>
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de nascimento</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" className="min-h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} inputMode="numeric" placeholder="000.000.000-00" className="min-h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="referralSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Como conheceu a barbearia?</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Indicação, Instagram, passagem..." className="min-h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Frequente, prefere tesoura" className="min-h-11" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Separe as tags por vírgula.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3 rounded-lg border border-border p-4">
                  <p className="font-medium">Consentimentos</p>
                  <FormField
                    control={form.control}
                    name="reminders"
                    render={({ field }) => (
                      <FormItem className="flex min-h-11 items-center justify-between gap-4">
                        <FormLabel className="cursor-pointer">Receber lembretes de agendamento</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Consentimento para lembretes" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="marketing"
                    render={({ field }) => (
                      <FormItem className="flex min-h-11 items-center justify-between gap-4">
                        <FormLabel className="cursor-pointer">Receber novidades e ofertas</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Consentimento para marketing" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {editingId && customerQuery.data?.customer.consent?.at && (
                    <p className="text-xs text-muted-foreground">Último consentimento registrado em {formatDateTime(customerQuery.data.customer.consent.at)}.</p>
                  )}
                </div>

                {form.formState.errors.root?.server?.message && (
                  <p className="text-sm text-destructive" role="alert">
                    {form.formState.errors.root.server.message}
                  </p>
                )}
              </div>

              <SheetFooter className="sticky bottom-0 border-t border-border bg-background">
                <Button type="button" variant="outline" className="min-h-11" onClick={() => requestOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="min-h-11" disabled={saveCustomer.isPending || phoneDuplicate}>
                  {saveCustomer.isPending ?
                    'Salvando...'
                  : editingId ?
                    'Salvar alterações'
                  : 'Cadastrar cliente'}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        }
      </SheetContent>
    </Sheet>
  );
}
