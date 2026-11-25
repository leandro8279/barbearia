import {useEffect, useMemo, useState} from 'react'
import type {KeyboardEvent} from 'react'
import {useMutation, useQueryClient} from '@tanstack/react-query'
import {CalendarClock, ChevronLeft, ChevronRight, Clock3} from 'lucide-react'
import {useLocation} from 'wouter'
import {BookingSummaryFooter} from '@/modules/booking/components/booking-summary-footer'
import {useAvailabilityDays, useAvailabilitySlots, useAvailableBarbers} from '@/modules/booking/hooks/use-booking-data'
import {createSlotHold, deleteSlotHold, type AvailabilitySlot} from '@/modules/booking/api/booking'
import {Countdown} from '@/shared/components/countdown'
import {EmptyState} from '@/shared/components/empty-state'
import {ErrorState} from '@/shared/components/error-state'
import {PageHeader} from '@/shared/components/page-header'
import {SlotGrid} from '@/shared/components/slot-grid'
import {HttpError} from '@/shared/lib/http'
import {formatDate, formatDateTime} from '@/shared/lib/format'
import {BUSINESS_TIME_ZONE} from '@/shared/lib/time'
import {useBookingDraftStore} from '@/shared/stores/booking-draft-store'
import {Button} from '@/shared/ui/button'
import {Card, CardContent} from '@/shared/ui/card'
import {Skeleton} from '@/shared/ui/skeleton'

const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

interface HoldVariables {
  slot: AvailabilitySlot
  date: string
  previousHoldKey: string | null
}

function currentBusinessMonth(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit'}).formatToParts(new Date())
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}`
}

function shiftMonth(value: string, amount: number): string {
  const [year, month] = value.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1 + amount, 1))
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`
}

function weekdayOffset(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7
}

function businessTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {timeZone: BUSINESS_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(value))
}

function getClientExpiry(expiresAt: string, serverTime: string): string {
  const expiration = new Date(expiresAt).getTime()
  const serverNow = new Date(serverTime).getTime()
  if (!Number.isFinite(expiration) || !Number.isFinite(serverNow)) return expiresAt
  return new Date(Date.now() + Math.max(0, expiration - serverNow)).toISOString()
}

async function releaseHold(key: string): Promise<void> {
  try {
    await deleteSlotHold(key)
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return
    throw error
  }
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export default function SlotStepPage() {
  const [, navigate] = useLocation()
  const queryClient = useQueryClient()
  const serviceIds = useBookingDraftStore(state => state.serviceIds)
  const barberId = useBookingDraftStore(state => state.barberId)
  const selectedDate = useBookingDraftStore(state => state.date)
  const selectedTime = useBookingDraftStore(state => state.time)
  const holdKey = useBookingDraftStore(state => state.holdKey)
  const holdExpiresAt = useBookingDraftStore(state => state.holdExpiresAt)
  const setBarberId = useBookingDraftStore(state => state.setBarberId)
  const setSlot = useBookingDraftStore(state => state.setSlot)
  const setStep = useBookingDraftStore(state => state.setStep)
  const [month, setMonth] = useState(() => selectedDate?.slice(0, 7) ?? currentBusinessMonth())
  const [focusedDate, setFocusedDate] = useState<string | null>(selectedDate)
  const [holdError, setHoldError] = useState<string | null>(null)
  const [holdNotice, setHoldNotice] = useState<string | null>(null)
  const [isChangingDate, setIsChangingDate] = useState(false)
  const daysQuery = useAvailabilityDays(serviceIds, month, barberId)
  const slotsQuery = useAvailabilitySlots(serviceIds, selectedDate, barberId)
  const barbersQuery = useAvailableBarbers(serviceIds)
  const createHoldMutation = useMutation({
    mutationFn: async ({slot, previousHoldKey}: HoldVariables) => {
      if (previousHoldKey) await releaseHold(previousHoldKey)
      return createSlotHold({barberId: slot.barberId, serviceIds, start: slot.start})
    },
    onSuccess: (hold, variables) => {
      setBarberId(String(hold.barberId))
      setSlot(variables.date, businessTime(hold.start), {key: hold.key, expiresAt: getClientExpiry(hold.expiresAt, hold.serverTime)})
      setHoldError(null)
      setHoldNotice(`Horário reservado às ${businessTime(hold.start)}. Ele ficará guardado por cinco minutos.`)
      void queryClient.invalidateQueries({queryKey: ['availability-days']})
      void queryClient.invalidateQueries({queryKey: ['availability-slots']})
    },
    onError: (error, variables) => {
      if (variables.previousHoldKey) setSlot(variables.date, null, null)
      setHoldError(
        error instanceof HttpError && error.status === 409 ?
          'Esse horário acabou de ser reservado. Atualizamos as opções; escolha outro horário.'
        : errorMessage(error, 'Não foi possível reservar esse horário. Tente novamente.')
      )
      void queryClient.invalidateQueries({queryKey: ['availability-days']})
      void queryClient.invalidateQueries({queryKey: ['availability-slots']})
    }
  })
  const releaseMutation = useMutation({
    mutationFn: releaseHold,
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: ['availability-days']})
      void queryClient.invalidateQueries({queryKey: ['availability-slots']})
    }
  })

  useEffect(() => {
    document.title = 'Escolher data e horário | Barbearia'
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!description) {
      description = document.createElement('meta')
      description.name = 'description'
      document.head.append(description)
    }
    description.content = 'Escolha um dia e reserve temporariamente um horário para seu agendamento.'
  }, [])

  useEffect(() => {
    if (!serviceIds.length) navigate('/agendar')
  }, [navigate, serviceIds.length])

  const slotOptions = useMemo(() => {
    const byTime = new Map<string, AvailabilitySlot>()
    for (const slot of slotsQuery.data ?? []) {
      const time = businessTime(slot.start)
      if (!byTime.has(time)) byTime.set(time, slot)
    }
    return {byTime, slots: [...byTime.keys()].map(time => ({time, available: true}))}
  }, [slotsQuery.data])

  const leadingDays = daysQuery.data?.length ? weekdayOffset(daysQuery.data[0].date) : 0
  const focusDate =
    daysQuery.data?.some(day => day.date === focusedDate && day.available) ? focusedDate
    : daysQuery.data?.find(day => day.date === selectedDate && day.available)?.date ?? daysQuery.data?.find(day => day.available)?.date
  const isBusy = isChangingDate || createHoldMutation.isPending || releaseMutation.isPending
  const hasStoredHold = Boolean(holdKey && holdExpiresAt && selectedDate && selectedTime)
  const activeHold = Boolean(hasStoredHold && holdExpiresAt && new Date(holdExpiresAt).getTime() > Date.now())
  const heldBarber = barbersQuery.data?.find(barber => String(barber.id) === barberId)?.name
  const headingMonth = formatDate(`${month}-01`, 'MMMM yyyy')

  async function chooseDate(date: string) {
    if (date === selectedDate || isBusy) return
    setHoldError(null)
    setHoldNotice(null)
    setIsChangingDate(true)
    try {
      if (holdKey) await releaseMutation.mutateAsync(holdKey)
      setSlot(date, null, null)
      if (holdKey) setHoldNotice('Reserva liberada. Escolha um horário para esta data.')
    } catch (error) {
      setHoldError(errorMessage(error, 'Não foi possível liberar a reserva anterior.'))
    } finally {
      setIsChangingDate(false)
    }
  }

  function handleCalendarDayKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const {key} = event
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key) || isBusy) return

    const days = daysQuery.data ?? []
    const calendar = event.currentTarget.closest('[data-booking-calendar]')
    const currentIndex = Number(event.currentTarget.dataset.calendarIndex)
    const firstIndex = leadingDays
    const lastIndex = leadingDays + days.length - 1
    let targetIndex: number
    let step: number
    let boundary = firstIndex

    if (key === 'Home' || key === 'End') {
      const rowStart = Math.floor(currentIndex / 7) * 7
      const rowEnd = rowStart + 6
      const rowFirst = Math.max(firstIndex, rowStart)
      const rowLast = Math.min(lastIndex, rowEnd)
      targetIndex = key === 'Home' ? rowFirst : rowLast
      step = key === 'Home' ? 1 : -1
      boundary = key === 'Home' ? rowLast : rowFirst
    } else {
      step = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : key === 'ArrowDown' ? 7 : -7
      targetIndex = currentIndex + step
      boundary = step > 0 ? lastIndex : firstIndex
    }

    const scanStep = Math.sign(step)
    while (targetIndex >= firstIndex && targetIndex <= lastIndex && (scanStep > 0 ? targetIndex <= boundary : targetIndex >= boundary)) {
      const day = days[targetIndex - firstIndex]
      const target = calendar?.querySelector<HTMLButtonElement>(`button[data-calendar-index="${targetIndex}"]`)
      if (day?.available && target && !target.disabled) {
        event.preventDefault()
        setFocusedDate(day.date)
        target.focus()
        return
      }
      targetIndex += scanStep
    }
  }

  function chooseTime(time: string) {
    if (!selectedDate || isBusy) return
    const slot = slotOptions.byTime.get(time)
    if (!slot) return
    setHoldError(null)
    setHoldNotice(null)
    createHoldMutation.mutate({slot, date: selectedDate, previousHoldKey: holdKey})
  }

  function handleHoldExpired() {
    const expiredKey = holdKey
    setSlot(selectedDate, null, null)
    setHoldNotice('Sua reserva expirou. Escolha outro horário para continuar.')
    if (expiredKey) releaseMutation.mutate(expiredKey, {onError: () => undefined})
  }

  async function releaseCurrentHold() {
    if (!holdKey || isBusy) return
    setHoldError(null)
    setHoldNotice(null)
    try {
      await releaseMutation.mutateAsync(holdKey)
      setSlot(selectedDate, null, null)
      setHoldNotice('Reserva liberada. Você pode escolher outro horário.')
    } catch (error) {
      setHoldError(errorMessage(error, 'Não foi possível liberar o horário reservado.'))
    }
  }

  function continueBooking() {
    if (!activeHold || !holdKey) return
    setStep('details')
    navigate('/agendar/dados')
  }

  if (!serviceIds.length) return <div className="min-h-48" aria-label="Voltando à escolha de serviços" />

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Etapa 3 de 4"
        title="Escolha data e horário"
        description={barberId ? `Veja os horários disponíveis para ${heldBarber ?? 'o profissional escolhido'}.` : 'Veja os horários de todos os profissionais que atendem seus serviços.'}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section aria-labelledby="available-days-title" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="available-days-title" className="font-heading text-xl font-semibold">
              Dias disponíveis
            </h2>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="min-h-11 min-w-11"
                aria-label="Mês anterior"
                disabled={month <= currentBusinessMonth() || isBusy}
                onClick={() => setMonth(current => shiftMonth(current, -1))}>
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
              <Button type="button" variant="outline" size="icon" className="min-h-11 min-w-11" aria-label="Próximo mês" disabled={isBusy} onClick={() => setMonth(current => shiftMonth(current, 1))}>
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <p className="mb-4 text-center font-medium capitalize" aria-live="polite">
                {headingMonth}
              </p>
              {daysQuery.isPending ?
                <div className="grid grid-cols-7 gap-1" aria-label="Carregando dias disponíveis">
                  {Array.from({length: 35}, (_, index) => (
                    <Skeleton key={index} className="h-11 rounded-md" />
                  ))}
                </div>
              : daysQuery.isError ?
                <ErrorState description="Não foi possível carregar as datas disponíveis." onRetry={() => void daysQuery.refetch()} />
              : <>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                    {weekdays.map(day => (
                      <span key={day} className="py-2">
                        {day}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1" role="group" aria-label="Dias disponíveis" data-booking-calendar>
                    {Array.from({length: leadingDays}, (_, index) => (
                      <span key={`blank-${index}`} aria-hidden="true" />
                    ))}
                    {daysQuery.data.map((day, index) => {
                      const isSelected = selectedDate === day.date
                      return (
                        <Button
                          key={day.date}
                          type="button"
                          variant={isSelected ? 'default' : 'outline'}
                          className={`h-12 min-h-11 flex-col gap-0 p-1 ${!day.available ? 'text-muted-foreground' : ''}`}
                          aria-pressed={isSelected}
                          aria-label={`${formatDate(day.date, 'EEEE, dd MMMM')}${day.available ? `, ${day.slotsCount} horários disponíveis` : ', sem horários'}`}
                          tabIndex={day.date === focusDate ? 0 : -1}
                          data-calendar-index={leadingDays + index}
                          disabled={!day.available || isBusy}
                          onFocus={() => setFocusedDate(day.date)}
                          onKeyDown={handleCalendarDayKeyDown}
                          onClick={() => {
                            setFocusedDate(day.date)
                            void chooseDate(day.date)
                          }}>
                          <span>{Number(day.date.slice(-2))}</span>
                          {day.available && <span className="text-[10px] opacity-80">{day.slotsCount}</span>}
                        </Button>
                      )
                    })}
                  </div>
                  {daysQuery.data.every(day => !day.available) && <p className="mt-4 text-center text-sm text-muted-foreground">Não há horários neste mês. Tente outra data.</p>}
                </>
              }
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">O número abaixo de cada dia indica quantos horários ainda estão disponíveis.</p>
        </section>

        <section aria-labelledby="available-times-title" className="space-y-4">
          <div>
            <h2 id="available-times-title" className="font-heading text-xl font-semibold">
              Horários
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{selectedDate ? formatDate(selectedDate, 'EEEE, dd de MMMM') : 'Selecione um dia para consultar os horários.'}</p>
          </div>

          {holdNotice && (
            <p role="status" aria-live="polite" className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              {holdNotice}
            </p>
          )}
          {holdError && (
            <p role="alert" aria-live="assertive" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {holdError}
            </p>
          )}

          {hasStoredHold && (
            <Card className="border-primary/50">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">Horário reservado</p>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedDate ? formatDateTime(`${selectedDate}T${selectedTime}:00-03:00`) : selectedTime}</p>
                    {heldBarber && <p className="mt-1 text-sm text-muted-foreground">Profissional: {heldBarber}</p>}
                  </div>
                  <Clock3 className="size-5 shrink-0 text-primary" aria-hidden="true" />
                </div>
                {holdExpiresAt && <Countdown expiresAt={holdExpiresAt} onExpire={handleHoldExpired} className="block text-sm font-medium text-primary" />}
                <Button type="button" variant="outline" className="min-h-11" disabled={isBusy} onClick={() => void releaseCurrentHold()}>
                  Liberar horário
                </Button>
              </CardContent>
            </Card>
          )}

          {!selectedDate ?
            <EmptyState title="Escolha um dia" description="As opções de horário aparecerão aqui depois que você selecionar uma data disponível." />
          : slotsQuery.isPending ?
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Carregando horários">
              {Array.from({length: 8}, (_, index) => (
                <Skeleton key={index} className="h-11 rounded-md" />
              ))}
            </div>
          : slotsQuery.isError ?
            <ErrorState description="Não foi possível consultar os horários deste dia." onRetry={() => void slotsQuery.refetch()} />
          : <SlotGrid
              slots={slotOptions.slots}
              selectedTime={activeHold ? null : selectedTime}
              onSelect={chooseTime}
              emptyMessage={activeHold ? 'Escolha outro horário ou continue com a reserva atual.' : 'Não há horários para esta data. Escolha outro dia.'}
            />
          }

          {createHoldMutation.isPending && (
            <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
              Reservando o horário por cinco minutos…
            </p>
          )}
        </section>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarClock className="size-4" aria-hidden="true" />
        {barberId ? 'A reserva temporária mantém seu horário por cinco minutos.' : 'Ao escolher um horário, o profissional correspondente será definido automaticamente.'}
      </div>

      <BookingSummaryFooter actionLabel="Continuar" disabled={!activeHold} onContinue={continueBooking} />
    </div>
  )
}
