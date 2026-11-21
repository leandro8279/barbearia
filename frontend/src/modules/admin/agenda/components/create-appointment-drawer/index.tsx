import { CreateAppointmentValues } from '@/modules/admin/agenda/schemas/create-appointment.schema';

import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { ErrorState } from '@/shared/components/error-state';
import { RenderComponent } from '@/shared/components/render-component';
import { SlotGrid } from '@/shared/components/slot-grid';
import { formatBRL, formatDateTime, formatDuration, localTime, phoneForDisplay } from '@/shared/lib/format';
import { sessionStore } from '@/shared/stores/session-store';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Skeleton } from '@/shared/ui/skeleton';
import { Textarea } from '@/shared/ui/textarea';

import { Observer } from 'mobx-react-lite';
import { useLocation } from 'wouter';

import { useCreateAppointmentDrawer } from './useCreateAppointmentDrawer';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const stepTitles = ['Cliente', 'Serviços', 'Horário', 'Revisão'];

export function CreateAppointmentDrawer(props: Props) {
  const { onOpenChange, open } = props;
  const [, setLocation] = useLocation();
  const { store, form, submit, ...state } = useCreateAppointmentDrawer(onOpenChange);

  return (
    <Sheet open={open} onOpenChange={state.closeDrawer}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl" aria-describedby="create-appointment-description">
        <SheetHeader className="border-b border-border px-5 py-5 pr-14 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Novo agendamento</p>
          <SheetTitle className="text-left text-2xl">Agendar atendimento</SheetTitle>
          <SheetDescription id="create-appointment-description">Crie um horário para um cliente da barbearia.</SheetDescription>
          <ol className="grid grid-cols-4 gap-2 pt-3" aria-label="Etapas do agendamento">
            {stepTitles.map((title, index) => (
              <Observer key={index + 1}>
                {() => (
                  <li
                    key={title}
                    aria-current={store.step === index ? 'step' : undefined}
                    className={`rounded-md px-2 py-2 text-center text-xs ${
                      store.step === index ? 'bg-primary text-primary-foreground'
                      : index < store.step ? 'bg-primary/10 text-foreground'
                      : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <span className="font-semibold">{index + 1}.</span> {title}
                  </li>
                )}
              </Observer>
            ))}
          </ol>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-6 px-5 py-5 pb-32 sm:px-6">
            <Observer>
              {() => (
                <RenderComponent condition={store.step === 0}>
                  <section className="space-y-4" aria-labelledby="appointment-customer-title">
                    <div>
                      <h3 id="appointment-customer-title" className="font-semibold">
                        Quem será atendido?
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">Busque por nome ou telefone e selecione o cadastro.</p>
                    </div>

                    <RenderComponent condition={store.selectedCustomer}>
                      <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                        <div>
                          <p className="font-semibold">{store.selectedCustomer?.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{phoneForDisplay(store.selectedCustomer?.phone)}</p>
                          <RenderComponent condition={store.selectedCustomer?.email}>
                            <p className="text-sm text-muted-foreground">{store.selectedCustomer?.email}</p>
                          </RenderComponent>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-11 shrink-0"
                          onClick={() => {
                            store.setSelectedCustomer(null);
                            form.setValue('customerId', '', { shouldValidate: true, shouldDirty: true });
                          }}
                        >
                          Trocar
                        </Button>
                      </div>
                    </RenderComponent>
                    <RenderComponent condition={!store.selectedCustomer}>
                      <FormField
                        control={form.control}
                        name="customerId"
                        render={() => (
                          <FormItem>
                            <FormLabel>Buscar cliente</FormLabel>
                            <FormControl>
                              <Input value={store.searchTerm} onChange={(event) => store.setSearchTerm(event.target.value)} placeholder="Nome ou telefone" className="min-h-11" autoFocus />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <RenderComponent condition={state.customerSuggestions.isPending}>
                        <Skeleton className="h-20 rounded-lg" aria-label="Buscando clientes" />
                      </RenderComponent>

                      <RenderComponent condition={state.customerSuggestions.isError}>
                        <ErrorState title="Não foi possível buscar clientes" onRetry={() => void state.customerSuggestions.refetch()} />
                      </RenderComponent>

                      <RenderComponent condition={(state.customerSuggestions.data?.length ?? 0) > 0}>
                        <ul className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-border p-2" aria-label="Resultados da busca de clientes">
                          {state.customerSuggestions.data?.map((customer) => (
                            <li key={customer.id}>
                              <button
                                type="button"
                                className="min-h-14 w-full rounded-md px-3 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                onClick={() => state.chooseCustomer(customer)}
                              >
                                <span className="block font-medium">{customer.name}</span>
                                <span className="block text-sm text-muted-foreground">{phoneForDisplay(customer.phone)}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </RenderComponent>

                      <RenderComponent
                        condition={store.searchTerm.trim().length >= 2 && !state.customerSuggestions.isFetching && !state.customerSuggestions.data?.length && !state.customerSuggestions.isError}
                      >
                        <p className="text-sm text-muted-foreground">Nenhum cliente encontrado. Você pode fazer um cadastro rápido abaixo.</p>
                      </RenderComponent>
                      <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
                        <h4 className="font-medium">Cadastro rápido</h4>
                        <label className="grid gap-2 text-sm font-medium" htmlFor="quick-customer-name">
                          Nome
                          <Input
                            id="quick-customer-name"
                            value={store.quickCustomerName}
                            onChange={(event) => store.setQuickCustomerName(event.target.value)}
                            placeholder="Nome do cliente"
                            className="min-h-11"
                          />
                        </label>
                        <label className="grid gap-2 text-sm font-medium" htmlFor="quick-customer-phone">
                          Telefone
                          <Input
                            id="quick-customer-phone"
                            type="tel"
                            inputMode="tel"
                            value={store.quickCustomerPhone}
                            onChange={(event) => store.setQuickCustomerPhone(event.target.value)}
                            placeholder="(11) 99999-9999"
                            className="min-h-11"
                          />
                        </label>
                        <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => void state.registerQuickCustomer()}>
                          Cadastrar e selecionar cliente
                        </Button>

                        <RenderComponent condition={store.quickCustomerError}>
                          <p role="alert" className="text-sm text-destructive">
                            {store.quickCustomerError}
                          </p>
                        </RenderComponent>
                      </div>
                    </RenderComponent>

                    <RenderComponent condition={!store.selectedCustomer && form.formState.errors.customerId}>
                      <p role="alert" className="text-sm text-destructive">
                        {form.formState.errors.customerId?.message}
                      </p>
                    </RenderComponent>
                  </section>
                </RenderComponent>
              )}
            </Observer>

            <Observer>
              {() => (
                <RenderComponent condition={store.step === 1}>
                  <section className="space-y-4" aria-labelledby="appointment-services-title">
                    <div>
                      <h3 id="appointment-services-title" className="font-semibold">
                        Quais serviços serão feitos?
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">Escolha de um a quatro serviços. O servidor calcula duração e valor conforme o profissional.</p>
                    </div>

                    <RenderComponent condition={state.servicesQuery.isPending}>
                      <div className="space-y-2">
                        {Array.from({ length: 4 }, (_, index) => (
                          <Skeleton key={index} className="h-16 rounded-lg" />
                        ))}
                      </div>
                    </RenderComponent>

                    <RenderComponent condition={state.servicesQuery.isError}>
                      <ErrorState title="Não foi possível carregar os serviços" onRetry={() => void state.servicesQuery.refetch()} />
                    </RenderComponent>

                    <RenderComponent condition={state.servicesQuery.isSuccess}>
                      <div className="space-y-2">
                        {state.servicesQuery.data?.map((service) => {
                          const checked = state.serviceIds.includes(String(service.id));
                          return (
                            <button
                              key={service.id}
                              type="button"
                              aria-pressed={checked}
                              onClick={() => state.selectService(service.id)}
                              className={`flex min-h-16 w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                            >
                              <Checkbox checked={checked} aria-hidden="true" tabIndex={-1} />
                              <span className="min-w-0 flex-1">
                                <span className="block font-medium">{service.name}</span>
                                <span className="text-sm text-muted-foreground">{formatDuration(service.durationMin)}</span>
                              </span>
                              <span className="text-sm font-semibold">{formatBRL(service.price)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </RenderComponent>

                    <RenderComponent condition={state.serviceError}>
                      <p role="alert" className="text-sm text-destructive">
                        {state.serviceError}
                      </p>
                    </RenderComponent>

                    <RenderComponent condition={store.formError}>
                      <p role="alert" className="text-sm text-destructive">
                        {store.formError}
                      </p>
                    </RenderComponent>
                  </section>
                </RenderComponent>
              )}
            </Observer>

            <Observer>
              {() => (
                <RenderComponent condition={store.step === 2}>
                  <section className="space-y-5" aria-labelledby="appointment-time-title">
                    <div>
                      <h3 id="appointment-time-title" className="font-semibold">
                        Escolha profissional e horário
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">Os horários livres são calculados no servidor para a duração selecionada.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor="appointment-barber" className="text-sm font-medium">
                          Barbeiro
                        </label>
                        <Select value={state.barberId} onValueChange={state.selectBarber} disabled={sessionStore.isBarber || state.barberOptions.isPending || !store.eligibleBarbers.length}>
                          <SelectTrigger id="appointment-barber" className="min-h-11 w-full">
                            <SelectValue placeholder={state.barberOptions.isPending ? 'Carregando...' : 'Selecione'} />
                          </SelectTrigger>
                          <SelectContent>
                            {store.eligibleBarbers.map((barber) => (
                              <SelectItem key={barber.id} value={String(barber.id)}>
                                {barber.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <RenderComponent condition={state.barberOptions.isError}>
                          <p role="alert" className="text-sm text-destructive">
                            Não foi possível carregar os profissionais disponíveis.
                          </p>
                        </RenderComponent>

                        <RenderComponent condition={store.eligibleBarbers.length === 0 && !state.barberOptions.isPending && !state.barberOptions.isError}>
                          <p className="text-sm text-muted-foreground">Nenhum profissional realiza todos os serviços selecionados.</p>
                        </RenderComponent>
                      </div>
                      <label className="grid gap-2 text-sm font-medium" htmlFor="appointment-date">
                        Data
                        <Input id="appointment-date" type="date" value={state.date} onChange={(event) => state.selectDate(event.target.value)} className="min-h-11" />
                      </label>
                    </div>

                    <RenderComponent condition={store.canManage}>
                      <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
                        <p className="text-sm font-semibold">Exceções de agenda</p>
                        <label className="flex min-h-11 items-start gap-3 text-sm">
                          <Checkbox
                            checked={state.allowOutOfHours}
                            onCheckedChange={(checked) => {
                              form.setValue('allowOutOfHours', checked === true, { shouldDirty: true });
                              form.setValue('start', '', { shouldDirty: true });
                            }}
                          />
                          <span>
                            <span className="font-medium">Encaixe fora do horário normal</span>
                            <span className="mt-1 block text-muted-foreground">Mantém bloqueios, reservas e outros atendimentos protegidos. Exige agenda.manage.</span>
                          </span>
                        </label>
                        <label className="flex min-h-11 items-start gap-3 text-sm">
                          <Checkbox
                            checked={state.bypassAdvance}
                            onCheckedChange={(checked) => {
                              form.setValue('bypassAdvance', checked === true, { shouldDirty: true });
                              form.setValue('start', '', { shouldDirty: true });
                            }}
                          />
                          <span>
                            <span className="font-medium">Ignorar antecedência mínima</span>
                            <span className="mt-1 block text-muted-foreground">A regra ainda valida jornada, bloqueios e conflitos, salvo encaixe autorizado.</span>
                          </span>
                        </label>
                      </div>
                    </RenderComponent>

                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold">Horários disponíveis</h4>
                        <p className="text-sm text-muted-foreground">Selecione um horário sugerido para confirmar o encaixe.</p>
                      </div>

                      <RenderComponent condition={state.availability.isPending}>
                        <Skeleton className="h-32 rounded-lg" aria-label="Buscando horários livres" />
                      </RenderComponent>

                      <RenderComponent condition={state.availability.isError}>
                        <ErrorState title="Não foi possível consultar horários" description="Tente novamente ou selecione outra data." onRetry={() => void state.availability.refetch()} />
                      </RenderComponent>

                      <RenderComponent condition={state.availability.isSuccess}>
                        <SlotGrid
                          slots={store.timeSlots}
                          selectedTime={store.selectedSlot ? localTime(store.selectedSlot.start) : null}
                          onSelect={(time) => {
                            const slot = store.slots.find((item) => localTime(item.start) === time);
                            form.setValue('start', slot?.start ?? '', { shouldValidate: true, shouldDirty: true });
                          }}
                          emptyMessage={
                            state.date && state.barberId ? 'Sem horários livres. Altere a data ou use uma exceção autorizada.' : 'Selecione serviços, profissional e data para ver sugestões.'
                          }
                        />
                      </RenderComponent>
                      <RenderComponent condition={form.formState.errors.start}>
                        <p role="alert" className="text-sm text-destructive">
                          {form.formState.errors.start?.message}
                        </p>
                      </RenderComponent>
                    </div>

                    <RenderComponent condition={store.selectedBarber}>
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="font-medium">{store.selectedBarber?.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Duração {formatDuration(store.estimatedDuration ?? store.selectedBarber?.totalDurationMin ?? 0)}
                          {store.estimatedTotal !== undefined ? ` · ${formatBRL(store.estimatedTotal)}` : ''}
                        </p>
                      </div>
                    </RenderComponent>
                  </section>
                </RenderComponent>
              )}
            </Observer>

            <Observer>
              {() => (
                <RenderComponent condition={store.step === 3}>
                  <section className="space-y-5" aria-labelledby="appointment-review-title">
                    <div>
                      <h3 id="appointment-review-title" className="font-semibold">
                        Revise os detalhes
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">Confira os dados antes de salvar.</p>
                    </div>
                    <div className="space-y-3 rounded-lg border border-border p-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Cliente</p>
                        <p className="font-medium">{store.selectedCustomer?.name || state.queryClientId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Profissional</p>
                        <p className="font-medium">{store.selectedBarber?.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Horário</p>
                        <p className="font-medium">{store.selectedSlot ? formatDateTime(store.selectedSlot.start) : 'Selecione um horário'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Serviços</p>
                        <p className="font-medium">{store.selectedServices.map((service) => service.name).join(', ') || '—'}</p>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-border pt-3">
                        <span className="text-muted-foreground">Duração e total</span>
                        <span className="text-right font-semibold">
                          {store.estimatedDuration ? formatDuration(store.estimatedDuration) : '—'}
                          {store.estimatedTotal !== undefined ? ` · ${formatBRL(store.estimatedTotal)}` : ''}
                        </span>
                      </div>
                    </div>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} maxLength={500} placeholder="Preferências ou informações importantes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2">
                      <label htmlFor="expected-payment-method" className="text-sm font-medium">
                        Forma de pagamento prevista
                      </label>
                      <Select
                        value={state.expectedPaymentMethod}
                        onValueChange={(value) => form.setValue('expectedPaymentMethod', value as CreateAppointmentValues['expectedPaymentMethod'], { shouldDirty: true })}
                      >
                        <SelectTrigger id="expected-payment-method" className="min-h-11 w-full">
                          <SelectValue placeholder="Não informada" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                          <SelectItem value="pix">Pix</SelectItem>
                          <SelectItem value="debit">Cartão de débito</SelectItem>
                          <SelectItem value="credit">Cartão de crédito</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="ghost" className="min-h-11 px-2" onClick={() => form.setValue('expectedPaymentMethod', '', { shouldDirty: true })}>
                        Limpar forma prevista
                      </Button>
                    </div>

                    <RenderComponent condition={store.formError}>
                      <p role="alert" className="text-sm text-destructive">
                        {store.formError}
                      </p>
                    </RenderComponent>

                    <RenderComponent condition={state.bypassAdvance || state.allowOutOfHours}>
                      <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-900 dark:text-amber-200">
                        Este horário usa uma exceção de agenda autorizada. A criação será registrada na auditoria.
                      </p>
                    </RenderComponent>
                  </section>
                </RenderComponent>
              )}
            </Observer>
          </form>
        </Form>

        <SheetFooter className="fixed bottom-0 right-0 z-10 w-full border-t border-border bg-background px-5 py-4 sm:max-w-xl sm:px-6">
          <Observer>
            {() => (
              <RenderComponent condition={store.step > 0}>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={state.createMutation.isLoading}
                  onClick={() => {
                    store.setFormError('');
                    store.setStep(Math.max(0, store.step - 1));
                  }}
                >
                  Voltar
                </Button>
              </RenderComponent>
            )}
          </Observer>

          <Observer>
            {() => (
              <RenderComponent condition={store.step < stepTitles.length - 1}>
                <Button type="button" className="min-h-11" onClick={() => void state.continueStep()}>
                  Continuar
                </Button>
              </RenderComponent>
            )}
          </Observer>

          <Observer>
            {() => (
              <RenderComponent condition={!(store.step < stepTitles.length - 1)}>
                <Button type="button" className="min-h-11" disabled={state.createMutation.isLoading} onClick={() => void form.handleSubmit(submit)()}>
                  {state.createMutation.isLoading ? 'Salvando...' : 'Criar agendamento'}
                </Button>
              </RenderComponent>
            )}
          </Observer>
        </SheetFooter>
      </SheetContent>
      <Observer>
        {() => (
          <ConfirmDialog
            open={store.discardOpen}
            onOpenChange={store.setDiscardOpen}
            title="Descartar novo agendamento?"
            description="Há informações não salvas. Quer fechar o drawer e descartar o rascunho?"
            confirmLabel="Descartar rascunho"
            destructive
            onConfirm={() => {
              store.setDiscardOpen(false);
              form.reset();
              onOpenChange(false);
              setLocation('/admin/agenda');
            }}
          />
        )}
      </Observer>
    </Sheet>
  );
}
