import React, { useEffect } from 'react';

import { useBookingConfirmedPage } from '@/modules/booking/hooks/use-booking-confirmed-page';

import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { RenderComponent } from '@/shared/components/render-component';
import { formatBRL, formatDateTime, formatDuration } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

import { ArrowUpRight, CalendarDays, Check, Clock3, MapPin, MessageCircle, UserRound } from 'lucide-react';
import { Observer } from 'mobx-react-lite';
import { Link } from 'wouter';

export default function BookingConfirmedPage() {
  const store = useBookingConfirmedPage();

  useEffect(() => {
    document.title = 'Agendamento confirmado | Barbearia';
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.append(description);
    }
    description.content = 'Confira os dados do seu agendamento confirmado.';
  }, []);

  return (
    <React.Fragment>
      <Observer>
        {() => (
          <RenderComponent condition={!store.hasValidId}>
            <div className="space-y-6">
              <PageHeader title="Agendamento confirmado" description="Use o link recebido após confirmar para consultar os dados do seu horário." />
              <ErrorState title="Link de confirmação inválido" description="O identificador deste agendamento não é válido." onRetry={() => store.goToHome()} retryLabel="Voltar ao início" />
            </div>
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={store.isPending}>
            <div className="space-y-6">
              <PageHeader title="Carregando confirmação" description="Estamos buscando os dados do seu agendamento." />
              <div className="space-y-4 rounded-xl border border-border bg-card p-6" aria-label="Carregando agendamento">
                <Skeleton className="mx-auto h-16 w-16 rounded-full" />
                <Skeleton className="mx-auto h-8 w-64" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={store.isError || !store.appointment}>
            <div className="space-y-6">
              <PageHeader title="Agendamento confirmado" description="Não conseguimos carregar os dados deste agendamento." />
              <ErrorState
                title="Não foi possível abrir a confirmação"
                description="Confira se o link de visitante está completo ou entre na conta usada para agendar."
                onRetry={() => store.refetch()}
                retryLabel="Tentar novamente"
              />
              <div className="flex justify-center gap-3">
                <Button asChild variant="outline" className="min-h-11">
                  <Link href="/entrar">Entrar</Link>
                </Button>
                <Button asChild className="min-h-11">
                  <Link href="/">Voltar ao início</Link>
                </Button>
              </div>
            </div>
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={store.isSuccess}>
            <BookingConfirmedContent store={store} />
          </RenderComponent>
        )}
      </Observer>
    </React.Fragment>
  );
}

function BookingConfirmedContent({ store }: { store: ReturnType<typeof useBookingConfirmedPage> }) {
  return (
    <div className="space-y-7">
      <section className="rounded-2xl border border-primary/30 bg-card px-5 py-8 text-center shadow-panel sm:px-8">
        <div className="booking-confirmation-check mx-auto grid size-16 place-items-center rounded-full bg-primary text-primary-foreground" aria-hidden="true">
          <Check className="size-8" strokeWidth={3} />
        </div>
        <p className="mt-5 text-sm font-semibold text-primary">Tudo certo</p>
        <h1 className="mt-1 text-3xl font-semibold">Seu agendamento está confirmado</h1>
        <Observer>
          {() => (
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              Código <span className="font-semibold text-foreground">{store.appointment?.code}</span>. Guarde estas informações para consultar seu horário.
            </p>
          )}
        </Observer>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do agendamento</CardTitle>
            <CardDescription>Pagamento presencial na barbearia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm text-muted-foreground">Data e horário</p>
                <Observer>{() => <p className="font-medium">{formatDateTime(store.appointment?.start ?? '')}</p>}</Observer>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UserRound className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm text-muted-foreground">Profissional</p>
                <Observer>{() => <p className="font-medium">{store.appointment?.barber.name}</p>}</Observer>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm text-muted-foreground">Duração estimada</p>
                <Observer>{() => <p className="font-medium">{formatDuration(store.appointment?.durationMin ?? 0)}</p>}</Observer>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Serviços</p>
              <Observer>
                {() => (
                  <ul className="mt-1 list-inside list-disc space-y-1">
                    {store.appointment?.items.map((item) => (
                      <li key={item.serviceId}>{item.name}</li>
                    ))}
                  </ul>
                )}
              </Observer>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="font-medium">Total</span>
              <Observer>{() => <span className="font-heading text-xl font-semibold text-primary">{formatBRL(store.appointment?.total ?? 0)}</span>}</Observer>
            </div>

            <Observer>
              {() => (
                <RenderComponent condition={store.statusNotice}>
                  <p role="status" className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                    {store.statusNotice}
                  </p>
                </RenderComponent>
              )}
            </Observer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Planeje sua visita</CardTitle>
            <CardDescription>Adicione o horário ao calendário ou consulte como chegar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Observer>
              {() => (
                <Button type="button" variant="outline" className="min-h-11 w-full justify-start" onClick={() => store.downloadCalendar()}>
                  <CalendarDays className="size-4" aria-hidden="true" />
                  Baixar arquivo .ics
                </Button>
              )}
            </Observer>

            <Observer>
              {() => (
                <Button asChild variant="outline" className="min-h-11 w-full justify-start">
                  <a href={store.googleCalendarUrl} target="_blank" rel="noreferrer">
                    <CalendarDays className="size-4" aria-hidden="true" />
                    Adicionar ao Google Calendar
                    <ArrowUpRight className="ml-auto size-4" aria-hidden="true" />
                  </a>
                </Button>
              )}
            </Observer>

            <Observer>
              {() => (
                <Button asChild variant="outline" className="min-h-11 w-full justify-start">
                  <a href={store.whatsappUrl} target="_blank" rel="noreferrer">
                    <MessageCircle className="size-4" aria-hidden="true" />
                    Enviar por WhatsApp
                    <ArrowUpRight className="ml-auto size-4" aria-hidden="true" />
                  </a>
                </Button>
              )}
            </Observer>

            <Observer>
              {() => (
                <RenderComponent condition={store.unitIsPending}>
                  <Skeleton className="h-11 w-full" aria-label="Carregando endereço" />
                </RenderComponent>
              )}
            </Observer>

            <Observer>
              {() => (
                <RenderComponent condition={store.unitIsError}>
                  <div className="space-y-2">
                    <p role="alert" className="text-sm text-destructive">
                      Não foi possível carregar o endereço da barbearia.
                    </p>
                    <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => store.refetchUnit()}>
                      Tentar carregar o endereço novamente
                    </Button>
                  </div>
                </RenderComponent>
              )}
            </Observer>

            <Observer>
              {() => (
                <RenderComponent condition={store.unitIsSuccess}>
                  <RenderComponent condition={store.directionsUrl}>
                    <Button asChild variant="outline" className="min-h-11 w-full justify-start">
                      <a href={store.directionsUrl} target="_blank" rel="noreferrer">
                        <MapPin className="size-4" aria-hidden="true" />
                        Como chegar
                        <ArrowUpRight className="ml-auto size-4" aria-hidden="true" />
                      </a>
                    </Button>
                  </RenderComponent>

                  <RenderComponent condition={!store.directionsUrl}>
                    <p className="text-sm text-muted-foreground">O endereço da barbearia não está disponível no momento.</p>
                  </RenderComponent>
                </RenderComponent>
              )}
            </Observer>

            <Observer>
              {() => (
                <RenderComponent condition={store.address}>
                  <p className="text-sm text-muted-foreground">{store.address}</p>
                </RenderComponent>
              )}
            </Observer>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Acompanhe seus próximos agendamentos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Crie uma conta usando o telefone informado para acessar seus horários.</p>
        </div>
        <Button asChild className="min-h-11 shrink-0">
          <Link href="/cadastrar">Criar conta para acompanhar seus agendamentos</Link>
        </Button>
      </div>

      <Observer>
        {() => (
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="min-h-11">
              <Link href={store.rescheduleUrl}>Reagendar</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link href={store.cancelUrl}>Cancelar</Link>
            </Button>
            <Button asChild variant="ghost" className="min-h-11">
              <Link href="/">Voltar ao início</Link>
            </Button>
          </div>
        )}
      </Observer>
    </div>
  );
}
