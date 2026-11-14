import React from 'react';

import { ContactAndHours } from '@/modules/site/components/contact-and-hours';
import { usePublicBarberList } from '@/modules/site/hooks/use-public-barber-list';
import { usePublicServiceCatalog } from '@/modules/site/hooks/use-public-service-catalog';
import { usePublicUnit } from '@/modules/site/hooks/use-public-unit';

import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { RenderComponent } from '@/shared/components/render-component';
import { ServiceCard } from '@/shared/components/service-card';
import { formatDuration } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardFooter } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

import { ArrowRight, Clock3, Scissors } from 'lucide-react';
import { Observer } from 'mobx-react-lite';
import { Link, useLocation } from 'wouter';

export default function HomePage() {
  const unitQuery = usePublicUnit();
  const [, navigate] = useLocation();
  const barbersQuery = usePublicBarberList();
  const catalogQuery = usePublicServiceCatalog(true);

  function startBooking(serviceId?: number) {
    alert(serviceId);
    // if (serviceId !== undefined) setServiceIds([String(serviceId)]);
    // else setServiceIds([]);
    // setStep('services');
    // navigate(serviceId ? `/agendar?serviceId=${serviceId}` : '/agendar');
  }

  return (
    <div className="space-y-16 pb-8 sm:space-y-20">
      <section className="relative isolate overflow-hidden rounded-2xl border border-primary/15 bg-[#11110f] px-6 py-12 shadow-panel sm:px-10 sm:py-16 lg:px-16 lg:py-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_18%,rgba(213,164,75,0.17),transparent_42%),linear-gradient(115deg,transparent_50%,rgba(255,255,255,0.025))]" />
        <div className="absolute -right-8 -top-12 -z-10 hidden size-80 rounded-full border border-primary/10 lg:block" />
        <div className="absolute -right-1 top-3 -z-10 hidden size-64 rounded-full border border-primary/10 lg:block" />
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-hero-accent">
            <Scissors className="size-3.5" aria-hidden="true" />{' '}
            <Observer>{() => <span className="max-w-64 truncate">{unitQuery.unit?.name?.trim() || 'Barbearia'}</span>}</Observer>
          </p>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.06] tracking-wide text-white sm:text-6xl lg:text-7xl">
            Seu estilo começa <span className="text-hero-accent">aqui.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-stone-300 sm:text-lg">
            Bons cortes, bons momentos e atendimento feito para você. Escolha seu serviço e reserve seu horário em poucos passos.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button onClick={() => startBooking()} className="min-h-12 gap-2 px-6 text-base shadow-gold">
              Agendar horário <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <Button asChild variant="outline" className="min-h-12 border-white/20 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white">
              <Link href="/servicos">Conhecer serviços</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-stone-300">
            <span className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              Agendamento online
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              Atendimento com hora marcada
            </span>
          </div>
        </div>
      </section>

      <section aria-labelledby="services-heading">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Escolha o seu próximo visual</p>
            <h2 id="services-heading" className="mt-1 text-3xl font-semibold sm:text-4xl">
              Serviços em destaque
            </h2>
          </div>
          <Button asChild variant="ghost" className="min-h-11 gap-2">
            <Link href="/servicos">
              Ver todos <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <Observer>
          {() => (
            <RenderComponent condition={catalogQuery.result.isPending}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Carregando serviços em destaque">
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-44 rounded-xl" />
                ))}
              </div>
            </RenderComponent>
          )}
        </Observer>

        <Observer>
          {() => (
            <RenderComponent condition={!catalogQuery.result.isPending}>
              <RenderComponent condition={catalogQuery.result.isError}>
                <ErrorState description="Não foi possível carregar os serviços em destaque." onRetry={() => catalogQuery.result.refetch()} />
              </RenderComponent>

              <RenderComponent condition={!catalogQuery.result.isError}>
                <RenderComponent condition={catalogQuery.featuredServices.length === 0}>
                  <EmptyState
                    title="Serviços em destaque em breve"
                    description="Enquanto isso, confira nosso menu completo."
                    actionLabel="Ver serviços"
                    onAction={() => navigate('/servicos')}
                  />
                </RenderComponent>

                <RenderComponent condition={catalogQuery.featuredServices.length > 0}>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {catalogQuery.featuredServices.map((service) => {
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
                              <React.Fragment>
                                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Clock3 className="size-4" aria-hidden="true" /> {formatDuration(service.durationMin)}
                                </span>
                                <Button onClick={() => startBooking(service.id)} className="min-h-11">
                                  Agendar
                                </Button>
                              </React.Fragment>
                            }
                          />
                        </article>
                      );
                    })}
                  </div>
                </RenderComponent>
              </RenderComponent>
            </RenderComponent>
          )}
        </Observer>
      </section>

      <section aria-labelledby="team-heading">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Mãos experientes, atenção aos detalhes</p>
            <h2 id="team-heading" className="mt-1 text-3xl font-semibold sm:text-4xl">
              Quem cuida do seu estilo
            </h2>
          </div>
          <Button asChild variant="ghost" className="min-h-11 gap-2">
            <Link href="/barbeiros">
              Conhecer a equipe <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <Observer>
          {() => (
            <RenderComponent condition={barbersQuery.result.isPending}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Carregando profissionais">
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-40 rounded-xl" />
                ))}
              </div>
            </RenderComponent>
          )}
        </Observer>

        <Observer>
          {() => (
            <RenderComponent condition={barbersQuery.result.isSuccess}>
              <RenderComponent condition={barbersQuery.result.isError}>
                <ErrorState description="Não foi possível carregar a equipe agora." onRetry={() => void barbersQuery.result.refetch()} />
              </RenderComponent>

              <RenderComponent condition={!barbersQuery.result.isError}>
                <RenderComponent condition={barbersQuery.barbers.length === 0}>
                  <EmptyState title="Equipe em atualização" description="Volte em breve para conhecer nossos profissionais." />
                </RenderComponent>

                <RenderComponent condition={barbersQuery.barbers.length > 0}>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {barbersQuery.barbers.map((barber) => (
                      <article key={barber.id} className="h-full">
                        <Card className="h-full overflow-hidden border-border/80 bg-card">
                          <div className="aspect-16/10 overflow-hidden bg-secondary">
                            <RenderComponent condition={barber.photo}>
                              <img
                                src={barber.photo || ''}
                                alt={`Foto de ${barber.name}`}
                                width={480}
                                height={300}
                                loading="lazy"
                                decoding="async"
                                className="size-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                              />
                            </RenderComponent>

                            <RenderComponent condition={!barber.photo}>
                              <div className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.16),transparent_58%)] text-primary">
                                <Scissors className="size-12" aria-hidden="true" />
                              </div>
                            </RenderComponent>
                          </div>

                          <CardContent className="space-y-3 pt-5">
                            <h3 className="text-xl font-semibold">{barber.name}</h3>
                            <RenderComponent condition={barber.specialties.length > 0}>
                              <div className="flex flex-wrap gap-1.5" aria-label={`Especialidades de ${barber.name}`}>
                                {barber.specialties.slice(0, 3).map((specialty) => (
                                  <Badge key={specialty} variant="secondary" className="rounded-full font-normal">
                                    {specialty}
                                  </Badge>
                                ))}
                              </div>
                            </RenderComponent>
                          </CardContent>
                          <CardFooter className="mt-auto justify-end border-t pt-4">
                            <Button asChild variant="outline" className="min-h-11 gap-2">
                              <Link href="/barbeiros">
                                Ver equipe <ArrowRight className="size-4" aria-hidden="true" />
                              </Link>
                            </Button>
                          </CardFooter>
                        </Card>
                      </article>
                    ))}
                  </div>
                </RenderComponent>
              </RenderComponent>
            </RenderComponent>
          )}
        </Observer>
      </section>

      <ContactAndHours />
    </div>
  );
}
