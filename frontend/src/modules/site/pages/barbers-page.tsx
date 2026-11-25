import { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { BarberCard } from '@/shared/components/barber-card';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { BUSINESS_TIME_ZONE } from '@/shared/lib/time';
import { useBookingDraftStore } from '@/shared/stores/booking-draft-store';
import { usePublicBarbers } from '@/modules/site/hooks/use-public-barbers';

function getAvailabilityText(start: string | null | undefined): string {
  if (!start) return 'Sem horários nos próximos dias';

  const date = new Date(start);
  if (Number.isNaN(date.getTime())) return 'Horários indisponíveis no momento';

  const localDate = (value: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
  const today = localDate(new Date());
  if (localDate(date) === today) {
    const time = new Intl.DateTimeFormat('pt-BR', { timeZone: BUSINESS_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
    return `Próximo horário hoje às ${time}`;
  }

  const dateTime = new Intl.DateTimeFormat('pt-BR', { timeZone: BUSINESS_TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    date,
  );
  return `Próximo horário ${dateTime}`;
}

export default function BarbersPage() {
  const [, navigate] = useLocation();
  const setBarberId = useBookingDraftStore((state) => state.setBarberId);
  const setStep = useBookingDraftStore((state) => state.setStep);
  const { barbersQuery, availabilityQueries } = usePublicBarbers();
  const [selectedSpecialty, setSelectedSpecialty] = useState('Todas');

  useEffect(() => {
    document.title = 'Profissionais | Barbearia';
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.append(description);
    }
    description.content = 'Conheça os profissionais da Barbearia e confira seus próximos horários.';
  }, []);

  const specialties = useMemo(() => [...new Set((barbersQuery.data ?? []).flatMap((barber) => barber.specialties ?? []))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [barbersQuery.data]);
  const filteredBarbers = useMemo(
    () => (barbersQuery.data ?? []).filter((barber) => selectedSpecialty === 'Todas' || barber.specialties?.includes(selectedSpecialty)),
    [barbersQuery.data, selectedSpecialty],
  );

  function startBooking(barberId: number) {
    setBarberId(String(barberId));
    setStep('services');
    navigate(`/agendar?barberId=${barberId}`);
  }

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Quem cuida do seu estilo" title="Nossa equipe" description="Conheça nossos profissionais e encontre um horário para sua próxima visita." />

      {barbersQuery.isPending ?
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Carregando profissionais">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-48 rounded-xl" />
          ))}
        </div>
      : barbersQuery.isError ?
        <ErrorState description="Não foi possível carregar a equipe agora." onRetry={() => void barbersQuery.refetch()} />
      : barbersQuery.data.length === 0 ?
        <EmptyState title="Nenhum profissional disponível" description="Volte em outro momento para conhecer nossa equipe." />
      : <>
          <section aria-label="Filtrar por especialidade">
            <h2 className="mb-3 text-sm font-semibold">Filtrar por especialidade</h2>
            <div className="flex flex-wrap gap-2">
              {['Todas', ...specialties].map((specialty) => (
                <Button
                  key={specialty}
                  type="button"
                  variant={selectedSpecialty === specialty ? 'default' : 'outline'}
                  aria-pressed={selectedSpecialty === specialty}
                  className="min-h-11 rounded-full px-4"
                  onClick={() => setSelectedSpecialty(specialty)}
                >
                  {specialty}
                </Button>
              ))}
            </div>
          </section>

          {filteredBarbers.length === 0 ?
            <EmptyState title="Nenhum profissional nesta especialidade" description="Escolha outra especialidade para ver mais profissionais." />
          : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredBarbers.map((barber) => {
                const availabilityQuery = availabilityQueries[(barbersQuery.data ?? []).findIndex((item) => item.id === barber.id)];
                const availabilityText =
                  availabilityQuery?.isPending ? 'Consultando próximo horário…'
                  : availabilityQuery?.isError ? 'Não foi possível consultar horários.'
                  : getAvailabilityText(availabilityQuery?.data?.slot?.start);

                return (
                  <BarberCard
                    key={barber.id}
                    name={barber.name}
                    photoUrl={barber.photo ?? undefined}
                    specialties={barber.specialties}
                    availabilityText={availabilityText}
                    footer={
                      <div className="flex w-full items-center justify-between gap-3">
                        {availabilityQuery?.isError ?
                          <Button type="button" variant="ghost" className="min-h-11 px-2" onClick={() => void availabilityQuery.refetch()}>
                            Tentar novamente
                          </Button>
                        : <span aria-hidden="true" />}
                        <Button type="button" className="min-h-11 gap-2" onClick={() => startBooking(barber.id)}>
                          Agendar <ArrowRight className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    }
                  />
                );
              })}
            </div>
          }
        </>
      }
    </div>
  );
}
