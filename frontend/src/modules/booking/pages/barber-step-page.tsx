import React, { useEffect } from 'react';

import { BookingSummaryFooter } from '@/modules/booking/components/booking-summary-footer';

import { BarberCard } from '@/shared/components/barber-card';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { RenderComponent } from '@/shared/components/render-component';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

import { ArrowLeft, CalendarClock, Star } from 'lucide-react';
import { Observer } from 'mobx-react-lite';

import { useBarberStepPage } from '../hooks/use-barber-step-page';

export default function BarberStepPage() {
  const store = useBarberStepPage();

  useEffect(() => {
    document.title = 'Escolher profissional | Barbearia';
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.append(description);
    }
    description.content = 'Escolha um profissional que atende seus serviços ou deixe a escolha em aberto.';
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

      <div className="space-y-7">
        <PageHeader eyebrow="Etapa 2 de 4" title="Escolha seu profissional" description="Todos os profissionais abaixo atendem os serviços selecionados. Você pode deixar a escolha em aberto." />

        <Observer>
          {() => (
            <RenderComponent condition={store.isPending}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Carregando profissionais">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-56 rounded-xl" />
                ))}
              </div>
            </RenderComponent>
          )}
        </Observer>

        <Observer>
          {() => (
            <RenderComponent condition={store.isError}>
              <ErrorState description="Não foi possível consultar os profissionais e horários." onRetry={() => void store.refetch()} />
            </RenderComponent>
          )}
        </Observer>

        <Observer>
          {() => (
            <RenderComponent condition={store.isSuccess}>
              <RenderComponent condition={store.isEmpty}>
                <EmptyState title="Nenhum profissional atende esses serviços" description="Volte e ajuste os serviços selecionados para ver outras opções." />
              </RenderComponent>

              <RenderComponent condition={!store.isEmpty}>
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <button
                      type="button"
                      aria-pressed={store.isAnySelected}
                      className="min-h-11 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => store.chooseAny()}
                      disabled={store.availableBarbers.length === 0}
                    >
                      <Card className={`h-full transition-colors ${store.isAnySelected ? 'border-primary ring-2 ring-primary/30' : ''}`}>
                        <CardContent className="flex min-h-48 flex-col items-start justify-between gap-5">
                          <div>
                            <Badge variant="secondary">Qualquer profissional</Badge>
                            <h2 className="mt-3 font-heading text-xl font-semibold">Sem preferência</h2>
                            <p className="mt-2 text-sm text-muted-foreground">No próximo passo, mostraremos um horário disponível com um profissional que atende seus serviços.</p>
                          </div>
                          <p className="flex items-center gap-2 text-sm font-medium text-primary">
                            <CalendarClock className="size-4" aria-hidden="true" />
                            {store.anyAvailabilityText}
                          </p>
                        </CardContent>
                      </Card>
                    </button>

                    {store.options.map((option) => {
                      return (
                        <BarberCard
                          key={option.id}
                          name={option.name}
                          photoUrl={option.photoUrl}
                          specialties={option.specialties}
                          availabilityText={option.availabilityText}
                          selected={option.selected}
                          disabled={option.unavailable}
                          onSelect={() => store.chooseBarber(option.id)}
                          footer={
                            <div className="grid w-full gap-2 text-sm">
                              <p className="flex items-center gap-2 font-medium">
                                <Star className="size-4 text-primary" aria-hidden="true" />
                                {option.ratingText}
                              </p>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">{option.durationLabel}</span>
                                <span className="font-semibold">{option.priceLabel}</span>
                              </div>
                              {option.unavailable && <p className="text-xs text-muted-foreground">Indisponível para seleção no momento.</p>}
                            </div>
                          }
                        />
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap justify-between gap-3 pb-2">
                    <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => store.goToServices()}>
                      <ArrowLeft className="size-4" aria-hidden="true" /> Voltar aos serviços
                    </Button>
                  </div>
                </>
              </RenderComponent>
            </RenderComponent>
          )}
        </Observer>

        <Observer>{() => <BookingSummaryFooter actionLabel="Continuar" disabled={!store.canContinue} onContinue={() => store.continueBooking()} />}</Observer>
      </div>
    </React.Fragment>
  );
}
