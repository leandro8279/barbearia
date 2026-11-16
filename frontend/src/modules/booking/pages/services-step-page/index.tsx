import { BookingSummaryFooter } from '@/modules/booking/components/booking-summary-footer';
import { ServiceOption } from '@/modules/booking/components/service-option';
import { usePublicServiceCatalog } from '@/modules/site/hooks/use-public-service-catalog';

import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { RenderComponent } from '@/shared/components/render-component';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';
import { Skeleton } from '@/shared/ui/skeleton';

import { Observer } from 'mobx-react-lite';

import { useBookingServicesPage } from './useBookingServicesPage';

export default function BookingServicesPage() {
  const catalogQuery = usePublicServiceCatalog();
  const bookingDraftStore = useBookingDraftStore();
  const { store, toggleService, continueBooking } = useBookingServicesPage();

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Etapa 1 de 4"
        title="Escolha seus serviços"
        description="Selecione até quatro serviços. O valor e o tempo finais podem variar conforme o profissional."
      />

      <Observer>
        {() => (
          <RenderComponent condition={catalogQuery.isPending}>
            <div className="space-y-6" aria-label="Carregando serviços">
              {[0, 1].map((group) => (
                <section key={group} className="space-y-3">
                  <Skeleton className="h-7 w-40" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[0, 1].map((item) => (
                      <Skeleton key={item} className="h-32 rounded-xl" />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={catalogQuery.isError}>
            <ErrorState description="Não foi possível carregar os serviços agora." onRetry={() => void catalogQuery.result.refetch()} />
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={catalogQuery.isSuccess}>
            <RenderComponent condition={catalogQuery.services.length === 0}>
              <EmptyState title="Nenhum serviço disponível" description="Volte em outro momento para conferir as opções de agendamento." />
            </RenderComponent>

            <RenderComponent condition={catalogQuery.services.length > 0}>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {bookingDraftStore.serviceIds.length} de 4 serviços selecionados
              </p>

              <div className="space-y-8">
                {catalogQuery.categoryGroups.map((category) => (
                  <section key={category.id} aria-labelledby={`service-category-${category.id}`} className="space-y-3">
                    <h2 id={`service-category-${category.id}`} className="font-heading text-xl font-semibold">
                      {category.name}
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {category.services.map((service) => {
                        const price = catalogQuery.prices.get(service.id);
                        const isSelected = store.selectedIds.has(String(service.id));
                        return (
                          <ServiceOption
                            key={service.id}
                            service={service}
                            selected={isSelected}
                            inputId={`service-${service.id}`}
                            price={price?.price ?? service.price}
                            onToggle={() => toggleService(service.id)}
                            priceCaption={price?.variesByBarber ? 'A partir de' : undefined}
                            disabled={!isSelected && bookingDraftStore.serviceIds.length >= 4}
                          />
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              <RenderComponent condition={store.suggestedServices.length > 0}>
                <section aria-labelledby="suggested-services-title" className="space-y-3 rounded-xl border border-border bg-card/60 p-4 sm:p-5">
                  <div>
                    <h2 id="suggested-services-title" className="font-heading text-xl font-semibold">
                      Adicionais sugeridos
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">Você pode incluir um cuidado extra na mesma reserva.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {store.suggestedServices.map((service) => {
                      const price = catalogQuery.prices.get(service.id);
                      const isSelected = store.selectedIds.has(String(service.id));
                      return (
                        <ServiceOption
                          key={service.id}
                          service={service}
                          selected={isSelected}
                          price={price?.price ?? service.price}
                          onToggle={() => toggleService(service.id)}
                          inputId={`suggested-service-${service.id}`}
                          priceCaption={price?.variesByBarber ? 'A partir de' : undefined}
                          disabled={!isSelected && bookingDraftStore.serviceIds.length >= 4}
                        />
                      );
                    })}
                  </div>
                </section>
              </RenderComponent>

              <RenderComponent condition={!store.canContinue}>
                <p className="text-sm text-muted-foreground">Selecione ao menos um serviço para continuar.</p>
              </RenderComponent>
            </RenderComponent>
          </RenderComponent>
        )}
      </Observer>

      <Observer>{() => <BookingSummaryFooter actionLabel="Continuar" disabled={!store.canContinue} onContinue={continueBooking} />}</Observer>
    </div>
  );
}
