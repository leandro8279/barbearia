import React, { useEffect } from 'react';

import { BookingSummaryFooter } from '@/modules/booking/components/booking-summary-footer';

import { Countdown } from '@/shared/components/countdown';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { PhoneInput } from '@/shared/components/phone-input';
import { RenderComponent } from '@/shared/components/render-component';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';

import { CalendarClock, Clock3, UserRound } from 'lucide-react';
import { Observer } from 'mobx-react-lite';

import { useCustomerDetailsStepPage } from '../hooks/use-customer-details-step-page';

export default function CustomerDetailsStepPage() {
  const store = useCustomerDetailsStepPage();

  useEffect(() => {
    document.title = 'Seus dados | Barbearia';
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.append(description);
    }
    description.content = 'Informe seus dados de contato para continuar com o agendamento.';
  }, []);

  return (
    <React.Fragment>
      <Observer>
        {() => (
          <RenderComponent condition={!store.hasServices}>
            <div className="min-h-48" aria-label="Voltando à escolha de serviços" />;
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={store.hasServices}>
            <RenderComponent condition={!store.hasActiveReservation}>
              <div className="space-y-6">
                <PageHeader eyebrow="Etapa 4 de 4" title="Seus dados" description="Informe seus dados de contato antes de revisar o agendamento." />
                <ErrorState title={store.errorTitle} description={store.errorDescription} onRetry={() => store.returnToSlotSelection()} retryLabel="Escolher outro horário" />
              </div>
            </RenderComponent>

            <RenderComponent condition={store.hasActiveReservation}>
              <RenderComponent condition={store.hasActiveReservation}>
                <CustomerDetailsStepContent store={store} />
              </RenderComponent>
            </RenderComponent>
          </RenderComponent>
        )}
      </Observer>
    </React.Fragment>
  );
}

function CustomerDetailsStepContent({ store }: { store: ReturnType<typeof useCustomerDetailsStepPage> }) {
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Etapa 4 de 4" title="Seus dados" description="Informe ou confirme seus dados de contato para seguir para a revisão do agendamento." />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Como podemos falar com você?</CardTitle>
            <CardDescription>Seu telefone deve incluir o DDD.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...store.form}>
              <form id="booking-customer-details" onSubmit={(event) => void store.handleSubmit(event)} className="space-y-5">
                <FormField
                  control={store.form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="name" maxLength={100} placeholder="Como devemos chamar você?" className="min-h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={store.form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone ou WhatsApp</FormLabel>
                      <FormControl>
                        <PhoneInput id="booking-customer-phone" value={field.value} onValueChange={field.onChange} name={field.name} aria-label="Telefone ou WhatsApp com DDD" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seu agendamento</CardTitle>
            <CardDescription>O horário fica reservado enquanto você conclui os próximos passos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm text-muted-foreground">Data e horário</p>
                <Observer>{() => <p className="font-medium">{store.reservationDateTimeLabel}</p>}</Observer>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UserRound className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">Profissional</p>

                <Observer>
                  {() => (
                    <RenderComponent condition={store.isBarbersPending}>
                      <Skeleton className="mt-1 h-5 w-36" aria-label="Carregando profissional" />
                    </RenderComponent>
                  )}
                </Observer>

                <Observer>
                  {() => (
                    <RenderComponent condition={store.isBarbersError}>
                      <div className="mt-2 space-y-2">
                        <p role="alert" className="text-sm text-destructive">
                          Não foi possível carregar o profissional selecionado.
                        </p>
                        <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => store.retryBarbers()}>
                          Tentar novamente
                        </Button>
                      </div>
                    </RenderComponent>
                  )}
                </Observer>

                <Observer>
                  {() => (
                    <RenderComponent condition={store.isBarbersSuccess}>
                      <p className="font-medium">{store.selectedBarberName}</p>
                    </RenderComponent>
                  )}
                </Observer>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm text-muted-foreground">Reserva temporária</p>
                <Observer>{() => <Countdown expiresAt={store.holdExpiresAt ?? ''} onExpire={() => store.expireReservation()} className="font-medium" />}</Observer>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">Duração estimada</p>
              <Observer>
                {() => (
                  <RenderComponent condition={store.isEstimatePending}>
                    <Skeleton className="mt-1 h-5 w-28" aria-label="Carregando duração estimada" />
                  </RenderComponent>
                )}
              </Observer>

              <Observer>
                {() => (
                  <RenderComponent condition={store.isEstimateError}>
                    <div className="mt-2 space-y-2">
                      <p role="alert" className="text-sm text-destructive">
                        Não foi possível carregar a estimativa deste agendamento.
                      </p>
                      <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => store.retryEstimate()}>
                        Tentar novamente
                      </Button>
                    </div>
                  </RenderComponent>
                )}
              </Observer>

              <Observer>
                {() => (
                  <RenderComponent condition={store.isEstimateSuccess}>
                    <p className="font-medium">{store.durationLabel}</p>
                  </RenderComponent>
                )}
              </Observer>

              <p className="mt-3 text-sm text-muted-foreground">Valor estimado</p>
              <Observer>
                {() => (
                  <RenderComponent condition={store.isEstimatePending}>
                    <Skeleton className="mt-1 h-6 w-32" aria-label="Carregando valor estimado" />
                  </RenderComponent>
                )}
              </Observer>

              <Observer>
                {() => (
                  <RenderComponent condition={store.isEstimateError}>
                    <p className="font-heading text-lg text-muted-foreground">Indisponível</p>
                  </RenderComponent>
                )}
              </Observer>

              <Observer>
                {() => (
                  <RenderComponent condition={store.isEstimateSuccess}>
                    <p className="font-heading text-lg text-primary">{store.priceLabel}</p>
                  </RenderComponent>
                )}
              </Observer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" className="min-h-11" onClick={() => store.goToSlots()}>
          Voltar ao horário
        </Button>
        <p className="text-sm text-muted-foreground">Seus dados serão usados para identificar este agendamento.</p>
      </div>

      <Observer>{() => <BookingSummaryFooter actionLabel="Continuar para revisão" disabled={!store.canContinue} onContinue={() => void store.handleSubmit()} />}</Observer>
    </div>
  );
}
