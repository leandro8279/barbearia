import React from 'react';

import { usePublicServiceCatalog } from '@/modules/site/hooks/use-public-service-catalog';

import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { RenderComponent } from '@/shared/components/render-component';
import { ServiceCard } from '@/shared/components/service-card';
import { formatDuration } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';

import { ArrowRight, Search } from 'lucide-react';
import { Observer } from 'mobx-react-lite';

import { useServicesPage } from './useServicesPage';

const categories = ['Cabelo', 'Barba', 'Corte + Barba', 'Estética', 'Infantil'] as const;

export default function ServicesPage() {
  const catalogQuery = usePublicServiceCatalog();
  const { store, startBooking } = useServicesPage();

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Nosso menu"
        title="Serviços"
        description="Escolha o cuidado ideal para você. As durações e os valores ajudam a planejar sua visita."
      />

      <div className="relative max-w-xl">
        <label htmlFor="service-search" className="sr-only">
          Buscar serviço
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Observer>
          {() => (
            <Input
              id="service-search"
              type="search"
              value={store.search}
              onChange={(event) => store.setSearch(event.target.value)}
              placeholder="Buscar por serviço"
              className="min-h-11 pl-10"
            />
          )}
        </Observer>
      </div>

      <Observer>
        {() => (
          <RenderComponent condition={catalogQuery.isPending}>
            <div className="space-y-5">
              <div className="flex gap-2 overflow-hidden">
                {categories.map((category) => (
                  <Skeleton key={category} className="h-11 w-28 shrink-0" />
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="space-y-3">
                    <Skeleton className="h-36 rounded-xl" />
                    <Skeleton className="h-11 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={catalogQuery.isError}>
            <ErrorState description="Não foi possível carregar os serviços agora." onRetry={() => catalogQuery.result.refetch()} />
          </RenderComponent>
        )}
      </Observer>

      <Observer>
        {() => (
          <RenderComponent condition={catalogQuery.isSuccess}>
            <RenderComponent condition={catalogQuery.services.length === 0}>
              <EmptyState title="Nenhum serviço disponível" description="Volte em outro momento para conferir nosso menu." />
            </RenderComponent>

            <RenderComponent condition={catalogQuery.services.length > 0}>
              <React.Fragment>
                <Tabs value={store.activeCategory} onValueChange={(value) => store.setActiveCategory(value as any)}>
                  <TabsList
                    aria-label="Categorias de serviços"
                    className="grid h-auto w-full grid-cols-2 justify-start gap-2 bg-transparent p-0 sm:grid-cols-3 lg:grid-cols-5"
                  >
                    {categories.map((category) => (
                      <TabsTrigger
                        key={category}
                        value={category}
                        className="h-11 min-h-11 rounded-full border border-border px-4 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-foreground"
                      >
                        {category}
                        <span className="ml-1 text-xs text-muted-foreground">{store.counts.get(category) ?? 0}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground" aria-live="polite">
                    {store.displayServices.length} {store.displayServices.length === 1 ? 'serviço' : 'serviços'}
                    {store.search.trim() && ` encontrados para “${store.search.trim()}”`}
                  </p>
                  <p className="hidden text-xs text-muted-foreground sm:block">Valores a partir do menor preço entre os profissionais.</p>
                </div>

                <RenderComponent condition={store.displayServices.length === 0}>
                  <EmptyState
                    title="Nenhum serviço encontrado"
                    description={
                      store.search.trim() ? 'Tente outro termo ou escolha uma categoria diferente.' : 'Ainda não há serviços nesta categoria.'
                    }
                  />
                </RenderComponent>

                <RenderComponent condition={store.displayServices.length > 0}>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {store.displayServices.map((service) => {
                      const price = catalogQuery.prices.get(service.id);
                      return (
                        <article key={service.id} className="h-full">
                          <ServiceCard
                            name={service.name}
                            description={service.description}
                            durationMinutes={service.durationMin}
                            priceCents={price?.price ?? service.price}
                            priceCaption={price?.variesByBarber ? 'A partir de' : undefined}
                            footer={
                              <>
                                <span className="text-sm text-muted-foreground">{formatDuration(service.durationMin)}</span>
                                <Button className="min-h-11 gap-2" onClick={() => startBooking(service.id)}>
                                  Agendar <ArrowRight className="size-4" aria-hidden="true" />
                                </Button>
                              </>
                            }
                          />
                        </article>
                      );
                    })}
                  </div>
                </RenderComponent>
              </React.Fragment>
            </RenderComponent>
          </RenderComponent>
        )}
      </Observer>
    </div>
  );
}
