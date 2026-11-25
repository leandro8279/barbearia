import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { useLocation } from 'wouter';
import { ServiceCard } from '@/shared/components/service-card';
import { PageHeader } from '@/shared/components/page-header';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { formatDuration } from '@/shared/lib/format';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';
import { usePublicServiceCatalog } from '@/modules/site/hooks/use-public-service-catalog';

const categories = ['Cabelo', 'Barba', 'Corte + Barba', 'Estética', 'Infantil'] as const;
type DisplayCategory = (typeof categories)[number];

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getDisplayCategory(serviceName: string, categorySlug: string): DisplayCategory {
  const name = normalize(serviceName);
  const slug = normalize(categorySlug);

  if (slug.includes('infantil') || name.includes('infantil') || name.includes('crianca')) return 'Infantil';
  if (name.includes('corte + barba') || name.includes('corte e barba') || (slug.includes('combo') && name.includes('barba'))) return 'Corte + Barba';
  if (slug.includes('barba') || name.includes('barba')) return 'Barba';
  if (slug.includes('cuidado') || slug.includes('estetica') || name.includes('sobrancelha')) return 'Estética';
  return 'Cabelo';
}

export default function ServicesPage() {
  const [, navigate] = useLocation();
  const setServiceIds = useBookingDraftStore((state) => state.setServiceIds);
  const setStep = useBookingDraftStore((state) => state.setStep);
  const [activeCategory, setActiveCategory] = useState<DisplayCategory>('Cabelo');
  const [search, setSearch] = useState('');
  const catalog = usePublicServiceCatalog();

  useEffect(() => {
    document.title = 'Serviços | Barbearia';
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.append(description);
    }
    description.content = 'Conheça os serviços, durações e valores da Barbearia.';
  }, []);

  const categoryNames = useMemo(() => new Map(catalog.data?.categories.map((category) => [category.id, category.slug || category.name]) ?? []), [catalog.data?.categories]);
  const prices = useMemo(() => new Map(catalog.data?.prices.map((price) => [price.serviceId, price]) ?? []), [catalog.data?.prices]);

  const displayServices = useMemo(() => {
    const query = normalize(search.trim());
    return (catalog.data?.services ?? []).filter((service) => {
      const displayCategory = getDisplayCategory(service.name, categoryNames.get(service.categoryId) ?? '');
      if (displayCategory !== activeCategory) return false;
      return !query || normalize(`${service.name} ${service.description}`).includes(query);
    });
  }, [activeCategory, catalog.data?.services, categoryNames, search]);

  const counts = useMemo(() => {
    const result = new Map<DisplayCategory, number>(categories.map((category) => [category, 0]));
    for (const service of catalog.data?.services ?? []) {
      const displayCategory = getDisplayCategory(service.name, categoryNames.get(service.categoryId) ?? '');
      result.set(displayCategory, (result.get(displayCategory) ?? 0) + 1);
    }
    return result;
  }, [catalog.data?.services, categoryNames]);

  function startBooking(serviceId: number) {
    setServiceIds([String(serviceId)]);
    setStep('services');
    navigate(`/agendar?serviceId=${serviceId}`);
  }

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Nosso menu" title="Serviços" description="Escolha o cuidado ideal para você. As durações e os valores ajudam a planejar sua visita." />

      <div className="relative max-w-xl">
        <label htmlFor="service-search" className="sr-only">
          Buscar serviço
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input id="service-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por serviço" className="min-h-11 pl-10" />
      </div>

      {catalog.isPending ?
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
      : catalog.isError ?
        <ErrorState description="Não foi possível carregar os serviços agora." onRetry={() => void catalog.refetch()} />
      : catalog.data.services.length === 0 ?
        <EmptyState title="Nenhum serviço disponível" description="Volte em outro momento para conferir nosso menu." />
      : <>
          <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as DisplayCategory)}>
            <TabsList aria-label="Categorias de serviços" className="grid h-auto w-full grid-cols-2 justify-start gap-2 bg-transparent p-0 sm:grid-cols-3 lg:grid-cols-5">
              {categories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="h-11 min-h-11 rounded-full border border-border px-4 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-foreground"
                >
                  {category}
                  <span className="ml-1 text-xs text-muted-foreground">{counts.get(category) ?? 0}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {displayServices.length} {displayServices.length === 1 ? 'serviço' : 'serviços'}
              {search.trim() && ` encontrados para “${search.trim()}”`}
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">Valores a partir do menor preço entre os profissionais.</p>
          </div>

          {displayServices.length === 0 ?
            <EmptyState title="Nenhum serviço encontrado" description={search.trim() ? 'Tente outro termo ou escolha uma categoria diferente.' : 'Ainda não há serviços nesta categoria.'} />
          : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {displayServices.map((service) => {
                const price = prices.get(service.id);
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
          }
        </>
      }
    </div>
  );
}
