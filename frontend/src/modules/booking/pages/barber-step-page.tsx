import {useEffect, useState} from 'react'
import {ArrowLeft, CalendarClock, Star} from 'lucide-react'
import {useLocation} from 'wouter'
import {BookingSummaryFooter} from '@/modules/booking/components/booking-summary-footer'
import {useAvailableBarbers} from '@/modules/booking/hooks/use-booking-data'
import {BarberCard} from '@/shared/components/barber-card'
import {EmptyState} from '@/shared/components/empty-state'
import {ErrorState} from '@/shared/components/error-state'
import {PageHeader} from '@/shared/components/page-header'
import {formatBRL, formatDateTime, formatDuration} from '@/shared/lib/format'
import {useBookingDraftStore} from '@/shared/stores/booking-draft-store'
import {Badge} from '@/shared/ui/badge'
import {Button} from '@/shared/ui/button'
import {Card, CardContent} from '@/shared/ui/card'
import {Skeleton} from '@/shared/ui/skeleton'

export default function BarberStepPage() {
  const [, navigate] = useLocation()
  const serviceIds = useBookingDraftStore(state => state.serviceIds)
  const barberId = useBookingDraftStore(state => state.barberId)
  const setBarberId = useBookingDraftStore(state => state.setBarberId)
  const setStep = useBookingDraftStore(state => state.setStep)
  const [selectedChoice, setSelectedChoice] = useState(() => barberId ?? 'any')
  const barbersQuery = useAvailableBarbers(serviceIds)

  useEffect(() => {
    document.title = 'Escolher profissional | Barbearia'
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!description) {
      description = document.createElement('meta')
      description.name = 'description'
      document.head.append(description)
    }
    description.content = 'Escolha um profissional que atende seus serviços ou deixe a escolha em aberto.'
  }, [])

  useEffect(() => {
    if (!serviceIds.length) {
      navigate('/agendar')
      return
    }
    if (barberId && barbersQuery.data) {
      const selected = barbersQuery.data.find(barber => String(barber.id) === barberId)
      if (!selected?.nextSlot) {
        setBarberId(null)
        setSelectedChoice('any')
      }
    }
  }, [barberId, barbersQuery.data, navigate, serviceIds.length, setBarberId])

  const availableBarbers = (barbersQuery.data ?? []).filter(barber => barber.nextSlot !== null)
  const canContinue = selectedChoice === 'any' ? availableBarbers.length > 0 : availableBarbers.some(barber => String(barber.id) === selectedChoice)

  function chooseAny() {
    setSelectedChoice('any')
    setBarberId(null)
  }

  function chooseBarber(id: number) {
    setSelectedChoice(String(id))
    setBarberId(String(id))
  }

  function continueBooking() {
    if (!canContinue) return
    if (selectedChoice === 'any') setBarberId(null)
    setStep('slot')
    navigate('/agendar/horario')
  }

  if (!serviceIds.length) return <div className="min-h-48" aria-label="Voltando à escolha de serviços" />

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Etapa 2 de 4" title="Escolha seu profissional" description="Todos os profissionais abaixo atendem os serviços selecionados. Você pode deixar a escolha em aberto." />

      {barbersQuery.isPending ?
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Carregando profissionais">
          {Array.from({length: 4}, (_, index) => (
            <Skeleton key={index} className="h-56 rounded-xl" />
          ))}
        </div>
      : barbersQuery.isError ?
        <ErrorState description="Não foi possível consultar os profissionais e horários." onRetry={() => void barbersQuery.refetch()} />
      : barbersQuery.data.length === 0 ?
        <EmptyState title="Nenhum profissional atende esses serviços" description="Volte e ajuste os serviços selecionados para ver outras opções." />
      : <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <button
              type="button"
              className="min-h-11 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              aria-pressed={selectedChoice === 'any'}
              disabled={availableBarbers.length === 0}
              onClick={chooseAny}>
              <Card className={`h-full transition-colors ${selectedChoice === 'any' ? 'border-primary ring-2 ring-primary/30' : ''}`}>
                <CardContent className="flex min-h-48 flex-col items-start justify-between gap-5">
                  <div>
                    <Badge variant="secondary">Qualquer profissional</Badge>
                    <h2 className="mt-3 font-heading text-xl font-semibold">Sem preferência</h2>
                    <p className="mt-2 text-sm text-muted-foreground">No próximo passo, mostraremos um horário disponível com um profissional que atende seus serviços.</p>
                  </div>
                  <p className="flex items-center gap-2 text-sm font-medium text-primary">
                    <CalendarClock className="size-4" aria-hidden="true" />
                    {availableBarbers.length > 0 ? 'Há horários disponíveis' : 'Sem horários próximos'}
                  </p>
                </CardContent>
              </Card>
            </button>

            {barbersQuery.data.map(barber => {
              const unavailable = !barber.nextSlot
              const availabilityText = barber.nextSlot ? `Próximo horário: ${formatDateTime(barber.nextSlot.start)}` : 'Sem horários disponíveis nos próximos 30 dias'
              const ratingText = typeof barber.rating === 'number' ? `${barber.rating.toFixed(1)} de 5` : 'Sem avaliações'

              return (
                <BarberCard
                  key={barber.id}
                  name={barber.name}
                  photoUrl={barber.photo ?? undefined}
                  specialties={barber.specialties}
                  availabilityText={availabilityText}
                  selected={selectedChoice === String(barber.id)}
                  disabled={unavailable}
                  onSelect={() => chooseBarber(barber.id)}
                  footer={
                    <div className="grid w-full gap-2 text-sm">
                      <p className="flex items-center gap-2 font-medium">
                        <Star className="size-4 text-primary" aria-hidden="true" />
                        {ratingText}
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{formatDuration(barber.totalDurationMin)}</span>
                        <span className="font-semibold">{formatBRL(barber.subtotal)}</span>
                      </div>
                      {unavailable && <p className="text-xs text-muted-foreground">Indisponível para seleção no momento.</p>}
                    </div>
                  }
                />
              )
            })}
          </div>

          <div className="flex flex-wrap justify-between gap-3 pb-2">
            <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => navigate('/agendar')}>
              <ArrowLeft className="size-4" aria-hidden="true" /> Voltar aos serviços
            </Button>
          </div>
        </>
      }

      <BookingSummaryFooter actionLabel="Continuar" disabled={!canContinue} onContinue={continueBooking} />
    </div>
  )
}
