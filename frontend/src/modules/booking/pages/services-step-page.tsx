import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { BookingSummaryFooter } from '@/modules/booking/components/booking-summary-footer';
import { ServiceOption } from '@/modules/booking/components/service-option';
import { usePublicServiceCatalog } from '@/modules/site/hooks/use-public-service-catalog';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';
import { Skeleton } from '@/shared/ui/skeleton';

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function ServicesStepPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const preselectionHandled = useRef('');
  const catalog = usePublicServiceCatalog();
  const selectedServiceIds = useBookingDraftStore((state) => state.serviceIds);
  const setServiceIds = useBookingDraftStore((state) => state.setServiceIds);
  const setStep = useBookingDraftStore((state) => state.setStep);
  const selectedIds = useMemo(() => new Set(selectedServiceIds), [selectedServiceIds]);
  const pricesByService = useMemo(() => new Map(catalog.data?.prices.map((item) => [item.serviceId, item]) ?? []), [catalog.data?.prices]);
  const categoryGroups = useMemo(
    () =>
      (catalog.data?.categories ?? [])
        .map((category) => ({ ...category, services: (catalog.data?.services ?? []).filter((service) => service.categoryId === category.id) }))
        .filter((category) => category.services.length > 0),
    [catalog.data?.categories, catalog.data?.services],
  );
  const suggestedServices = useMemo(() => (catalog.data?.services ?? []).filter((service) => normalize(service.name).includes('sobrancelha')).slice(0, 3), [catalog.data?.services]);

  useEffect(() => {
    document.title = 'Escolher serviços | Barbearia';
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.append(description);
    }
    description.content = 'Escolha os serviços para seu agendamento e confira o valor estimado.';
  }, []);

  useEffect(() => {
    if (!catalog.data) return;
    const params = new URLSearchParams(search);
    const slug = params.get('servico');
    const serviceId = params.get('serviceId');
    const signature =
      slug ? `slug:${slug}`
      : serviceId ? `id:${serviceId}`
      : '';
    if (!signature) {
      preselectionHandled.current = '';
      return;
    }
    if (preselectionHandled.current === signature) return;
    preselectionHandled.current = signature;

    const service =
      slug ? catalog.data.services.find((item) => item.slug === slug)
      : serviceId ? catalog.data.services.find((item) => item.id === Number(serviceId))
      : undefined;
    if (service) setServiceIds([String(service.id)]);
  }, [catalog.data, search, setServiceIds]);

  function toggleService(serviceId: number) {
    const key = String(serviceId);
    if (selectedServiceIds.includes(key)) {
      setServiceIds(selectedServiceIds.filter((id) => id !== key));
      return;
    }
    if (selectedServiceIds.length >= 4) return;
    setServiceIds([...selectedServiceIds, key]);
  }

  function continueBooking() {
    if (selectedServiceIds.length < 1 || selectedServiceIds.length > 4) return;
    setStep('barber');
    navigate('/agendar/profissional');
  }

  const canContinue = selectedServiceIds.length > 0 && selectedServiceIds.length <= 4;

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Etapa 1 de 4" title="Escolha seus serviços" description="Selecione até quatro serviços. O valor e o tempo finais podem variar conforme o profissional." />

      {catalog.isPending ?
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
      : catalog.isError ?
        <ErrorState description="Não foi possível carregar os serviços agora." onRetry={() => void catalog.refetch()} />
      : catalog.data.services.length === 0 ?
        <EmptyState title="Nenhum serviço disponível" description="Volte em outro momento para conferir as opções de agendamento." />
      : <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {selectedServiceIds.length} de 4 serviços selecionados
          </p>

          <div className="space-y-8">
            {categoryGroups.map((category) => (
              <section key={category.id} aria-labelledby={`service-category-${category.id}`} className="space-y-3">
                <h2 id={`service-category-${category.id}`} className="font-heading text-xl font-semibold">
                  {category.name}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {category.services.map((service) => {
                    const price = pricesByService.get(service.id);
                    const isSelected = selectedIds.has(String(service.id));
                    return (
                      <ServiceOption
                        key={service.id}
                        service={service}
                        inputId={`service-${service.id}`}
                        selected={isSelected}
                        disabled={!isSelected && selectedServiceIds.length >= 4}
                        price={price?.price ?? service.price}
                        priceCaption={price?.variesByBarber ? 'A partir de' : undefined}
                        onToggle={() => toggleService(service.id)}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {suggestedServices.length > 0 && (
            <section aria-labelledby="suggested-services-title" className="space-y-3 rounded-xl border border-border bg-card/60 p-4 sm:p-5">
              <div>
                <h2 id="suggested-services-title" className="font-heading text-xl font-semibold">
                  Adicionais sugeridos
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Você pode incluir um cuidado extra na mesma reserva.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {suggestedServices.map((service) => {
                  const price = pricesByService.get(service.id);
                  const isSelected = selectedIds.has(String(service.id));
                  return (
                    <ServiceOption
                      key={service.id}
                      service={service}
                      inputId={`suggested-service-${service.id}`}
                      selected={isSelected}
                      disabled={!isSelected && selectedServiceIds.length >= 4}
                      price={price?.price ?? service.price}
                      priceCaption={price?.variesByBarber ? 'A partir de' : undefined}
                      onToggle={() => toggleService(service.id)}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {!canContinue && <p className="text-sm text-muted-foreground">Selecione ao menos um serviço para continuar.</p>}
        </>
      }

      <BookingSummaryFooter actionLabel="Continuar" disabled={!canContinue} onContinue={continueBooking} />
    </div>
  );
}
