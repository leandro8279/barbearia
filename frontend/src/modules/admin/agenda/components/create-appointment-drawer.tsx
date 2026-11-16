import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { ErrorState } from '@/shared/components/error-state';
import { RenderComponent } from '@/shared/components/render-component';
import { SlotGrid } from '@/shared/components/slot-grid';
import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Skeleton } from '@/shared/ui/skeleton';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAppointmentDrawer(props: Props) {
  const { onOpenChange, open } = props;

  return (
    <Sheet open={open} onOpenChange={closeDrawer}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl" aria-describedby="create-appointment-description">
        <SheetHeader className="border-b border-border px-5 py-5 pr-14 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Novo agendamento</p>
          <SheetTitle className="text-left text-2xl">Agendar atendimento</SheetTitle>
          <SheetDescription id="create-appointment-description">Crie um horário para um cliente da barbearia.</SheetDescription>
          <ol className="grid grid-cols-4 gap-2 pt-3" aria-label="Etapas do agendamento">
            {stepTitles.map((title, index) => (
              <li
                key={title}
                aria-current={step === index ? 'step' : undefined}
                className={`rounded-md px-2 py-2 text-center text-xs ${
                  step === index ? 'bg-primary text-primary-foreground'
                  : index < step ? 'bg-primary/10 text-foreground'
                  : 'bg-muted text-muted-foreground'
                }`}
              >
                <span className="font-semibold">{index + 1}.</span> {title}
              </li>
            ))}
          </ol>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-6 px-5 py-5 pb-32 sm:px-6">
            <RenderComponent condition={step === 0}>
              <section className="space-y-4" aria-labelledby="appointment-customer-title">
                <div>
                  <h3 id="appointment-customer-title" className="font-semibold">
                    Quem será atendido?
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">Busque por nome ou telefone e selecione o cadastro.</p>
                </div>

                <RenderComponent condition={selectedCustomer}>
                  <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <div>
                      <p className="font-semibold">{selectedCustomer.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{phoneForDisplay(selectedCustomer.phone)}</p>
                      {selectedCustomer.email && <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 shrink-0"
                      onClick={() => {
                        setSelectedCustomer(null);
                        form.setValue('customerId', '', { shouldValidate: true, shouldDirty: true });
                      }}
                    >
                      Trocar
                    </Button>
                  </div>
                </RenderComponent>
                <RenderComponent condition={!selectedCustomer}>
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={() => (
                      <FormItem>
                        <FormLabel>Buscar cliente</FormLabel>
                        <FormControl>
                          <Input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Nome ou telefone"
                            className="min-h-11"
                            autoFocus
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <RenderComponent condition={customerSuggestions.isFetching}>
                    <Skeleton className="h-20 rounded-lg" aria-label="Buscando clientes" />
                  </RenderComponent>

                  <RenderComponent condition={customerSuggestions.isError}>
                    <ErrorState title="Não foi possível buscar clientes" onRetry={() => void customerSuggestions.refetch()} />
                  </RenderComponent>

                  <RenderComponent condition={(customerSuggestions.data?.length ?? 0) > 0}>
                    <ul
                      className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-border p-2"
                      aria-label="Resultados da busca de clientes"
                    >
                      {customerSuggestions.data?.map((customer) => (
                        <li key={customer.id}>
                          <button
                            type="button"
                            className="min-h-14 w-full rounded-md px-3 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => chooseCustomer(customer)}
                          >
                            <span className="block font-medium">{customer.name}</span>
                            <span className="block text-sm text-muted-foreground">{phoneForDisplay(customer.phone)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </RenderComponent>

                  <RenderComponent
                    condition={
                      searchTerm.trim().length >= 2 &&
                      !customerSuggestions.isFetching &&
                      !customerSuggestions.data?.length &&
                      !customerSuggestions.isError
                    }
                  >
                    <p className="text-sm text-muted-foreground">Nenhum cliente encontrado. Você pode fazer um cadastro rápido abaixo.</p>
                  </RenderComponent>
                  <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
                    <h4 className="font-medium">Cadastro rápido</h4>
                    <label className="grid gap-2 text-sm font-medium" htmlFor="quick-customer-name">
                      Nome
                      <Input
                        id="quick-customer-name"
                        value={quickCustomerName}
                        onChange={(event) => setQuickCustomerName(event.target.value)}
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
                        value={quickCustomerPhone}
                        onChange={(event) => setQuickCustomerPhone(event.target.value)}
                        placeholder="(11) 99999-9999"
                        className="min-h-11"
                      />
                    </label>
                    <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => void registerQuickCustomer()}>
                      Cadastrar e selecionar cliente
                    </Button>

                    <RenderComponent condition={quickCustomerError}>
                      <p role="alert" className="text-sm text-destructive">
                        {quickCustomerError}
                      </p>
                    </RenderComponent>
                  </div>
                </RenderComponent>

                <RenderComponent condition={!selectedCustomer && form.formState.errors.customerId}>
                  <p role="alert" className="text-sm text-destructive">
                    {form.formState.errors.customerId.message}
                  </p>
                </RenderComponent>
              </section>
            </RenderComponent>

            <RenderComponent condition={step === 1}>
              <section className="space-y-4" aria-labelledby="appointment-services-title">
                <div>
                  <h3 id="appointment-services-title" className="font-semibold">
                    Quais serviços serão feitos?
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Escolha de um a quatro serviços. O servidor calcula duração e valor conforme o profissional.
                  </p>
                </div>

                <RenderComponent condition={servicesQuery.isPending}>
                  <div className="space-y-2">
                    {Array.from({ length: 4 }, (_, index) => (
                      <Skeleton key={index} className="h-16 rounded-lg" />
                    ))}
                  </div>
                </RenderComponent>

                <RenderComponent condition={servicesQuery.isError}>
                  <ErrorState title="Não foi possível carregar os serviços" onRetry={() => void servicesQuery.refetch()} />
                </RenderComponent>

                <RenderComponent condition={servicesQuery.isSuccess}>
                  <div className="space-y-2">
                    {servicesQuery.data.map((service) => {
                      const checked = serviceIds.includes(String(service.id));
                      return (
                        <button
                          key={service.id}
                          type="button"
                          aria-pressed={checked}
                          onClick={() => selectService(service.id)}
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

                <RenderComponent condition={serviceError}>
                  <p role="alert" className="text-sm text-destructive">
                    {serviceError}
                  </p>
                </RenderComponent>

                <RenderComponent condition={formError}>
                  <p role="alert" className="text-sm text-destructive">
                    {formError}
                  </p>
                </RenderComponent>
              </section>
            </RenderComponent>

            <RenderComponent condition={step === 2}>
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
                    <Select value={barberId} onValueChange={selectBarber} disabled={isBarber || barberOptions.isPending || !eligibleBarbers.length}>
                      <SelectTrigger id="appointment-barber" className="min-h-11 w-full">
                        <SelectValue placeholder={barberOptions.isPending ? 'Carregando...' : 'Selecione'} />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleBarbers.map((barber) => (
                          <SelectItem key={barber.id} value={String(barber.id)}>
                            {barber.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <RenderComponent condition={barberOptions.isError}>
                      <p role="alert" className="text-sm text-destructive">
                        Não foi possível carregar os profissionais disponíveis.
                      </p>
                    </RenderComponent>

                    <RenderComponent condition={eligibleBarbers.length === 0 && !barberOptions.isPending && !barberOptions.isError}>
                      <p className="text-sm text-muted-foreground">Nenhum profissional realiza todos os serviços selecionados.</p>
                    </RenderComponent>
                  </div>
                  <label className="grid gap-2 text-sm font-medium" htmlFor="appointment-date">
                    Data
                    <Input id="appointment-date" type="date" value={date} onChange={(event) => selectDate(event.target.value)} className="min-h-11" />
                  </label>
                </div>

                <RenderComponent condition={canManage}>
                  <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
                    <p className="text-sm font-semibold">Exceções de agenda</p>
                    <label className="flex min-h-11 items-start gap-3 text-sm">
                      <Checkbox
                        checked={allowOutOfHours}
                        onCheckedChange={(checked) => {
                          form.setValue('allowOutOfHours', checked === true, { shouldDirty: true });
                          form.setValue('start', '', { shouldDirty: true });
                        }}
                      />
                      <span>
                        <span className="font-medium">Encaixe fora do horário normal</span>
                        <span className="mt-1 block text-muted-foreground">
                          Mantém bloqueios, reservas e outros atendimentos protegidos. Exige agenda.manage.
                        </span>
                      </span>
                    </label>
                    <label className="flex min-h-11 items-start gap-3 text-sm">
                      <Checkbox
                        checked={bypassAdvance}
                        onCheckedChange={(checked) => {
                          form.setValue('bypassAdvance', checked === true, { shouldDirty: true });
                          form.setValue('start', '', { shouldDirty: true });
                        }}
                      />
                      <span>
                        <span className="font-medium">Ignorar antecedência mínima</span>
                        <span className="mt-1 block text-muted-foreground">
                          A regra ainda valida jornada, bloqueios e conflitos, salvo encaixe autorizado.
                        </span>
                      </span>
                    </label>
                  </div>
                </RenderComponent>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold">Horários disponíveis</h4>
                    <p className="text-sm text-muted-foreground">Selecione um horário sugerido para confirmar o encaixe.</p>
                  </div>

                  <RenderComponent condition={availability.isPending}>
                    <Skeleton className="h-32 rounded-lg" aria-label="Buscando horários livres" />
                  </RenderComponent>

                  <RenderComponent condition={availability.isError}>
                    <ErrorState
                      title="Não foi possível consultar horários"
                      description="Tente novamente ou selecione outra data."
                      onRetry={() => void availability.refetch()}
                    />
                  </RenderComponent>

                  <RenderComponent condition={availability.isSuccess}>
                    <SlotGrid
                      slots={timeSlots}
                      selectedTime={selectedSlot ? localTime(selectedSlot.start) : null}
                      onSelect={(time) => {
                        const slot = slots.find((item) => localTime(item.start) === time);
                        form.setValue('start', slot?.start ?? '', { shouldValidate: true, shouldDirty: true });
                      }}
                      emptyMessage={
                        date && barberId ?
                          'Sem horários livres. Altere a data ou use uma exceção autorizada.'
                        : 'Selecione serviços, profissional e data para ver sugestões.'
                      }
                    />
                  </RenderComponent>
                  <RenderComponent condition={form.formState.errors.start}>
                    <p role="alert" className="text-sm text-destructive">
                      {form.formState.errors.start.message}
                    </p>
                  </RenderComponent>
                </div>

                <RenderComponent condition={selectedBarber}>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="font-medium">{selectedBarber.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Duração {formatDuration(estimatedDuration ?? selectedBarber.totalDurationMin)}
                      {estimatedTotal !== undefined ? ` · ${formatBRL(estimatedTotal)}` : ''}
                    </p>
                  </div>
                </RenderComponent>
              </section>
            </RenderComponent>

            <RenderComponent condition={step === 3}>
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
                    <p className="font-medium">{selectedCustomer?.name || queryClientId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Profissional</p>
                    <p className="font-medium">{selectedBarber?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Horário</p>
                    <p className="font-medium">{selectedSlot ? formatDateTime(selectedSlot.start) : 'Selecione um horário'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Serviços</p>
                    <p className="font-medium">{selectedServices.map((service) => service.name).join(', ') || '—'}</p>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-border pt-3">
                    <span className="text-muted-foreground">Duração e total</span>
                    <span className="text-right font-semibold">
                      {estimatedDuration ? formatDuration(estimatedDuration) : '—'}
                      {estimatedTotal !== undefined ? ` · ${formatBRL(estimatedTotal)}` : ''}
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
                    value={expectedPaymentMethod}
                    onValueChange={(value) =>
                      form.setValue('expectedPaymentMethod', value as CreateAppointmentValues['expectedPaymentMethod'], { shouldDirty: true })
                    }
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
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 px-2"
                    onClick={() => form.setValue('expectedPaymentMethod', '', { shouldDirty: true })}
                  >
                    Limpar forma prevista
                  </Button>
                </div>

                <RenderComponent condition={formError}>
                  <p role="alert" className="text-sm text-destructive">
                    {formError}
                  </p>
                </RenderComponent>

                <RenderComponent condition={bypassAdvance || allowOutOfHours}>
                  <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-900 dark:text-amber-200">
                    Este horário usa uma exceção de agenda autorizada. A criação será registrada na auditoria.
                  </p>
                </RenderComponent>
              </section>
            </RenderComponent>
          </form>
        </Form>

        <SheetFooter className="fixed bottom-0 right-0 z-10 w-full border-t border-border bg-background px-5 py-4 sm:max-w-xl sm:px-6">
          <RenderComponent condition={step > 0}>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={createMutation.isPending}
              onClick={() => {
                setFormError('');
                setStep((current) => Math.max(0, current - 1));
              }}
            >
              Voltar
            </Button>
          </RenderComponent>

          <RenderComponent condition={step < stepTitles.length - 1}>
            <Button type="button" className="min-h-11" onClick={() => void continueStep()}>
              Continuar
            </Button>
          </RenderComponent>

          <RenderComponent condition={!(step < stepTitles.length - 1)}>
            <Button type="button" className="min-h-11" disabled={createMutation.isPending} onClick={() => void form.handleSubmit(submit)()}>
              {createMutation.isPending ? 'Salvando...' : 'Criar agendamento'}
            </Button>
          </RenderComponent>
        </SheetFooter>
      </SheetContent>
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Descartar novo agendamento?"
        description="Há informações não salvas. Quer fechar o drawer e descartar o rascunho?"
        confirmLabel="Descartar rascunho"
        destructive
        onConfirm={() => {
          setDiscardOpen(false);
          form.reset();
          onOpenChange(false);
          setLocation('/admin/agenda');
        }}
      />
    </Sheet>
  );
}
