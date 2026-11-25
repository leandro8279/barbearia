import {useEffect, useMemo, useState} from 'react'
import {Link, useRoute} from 'wouter'
import {ArrowLeft, CalendarClock, Copy, LoaderCircle} from 'lucide-react'
import {useSaveTeamSchedule, useTeamSchedule} from '@/modules/admin/team/hooks/use-team-management'
import type {TeamScheduleDay, TeamScheduleInput, TeamScheduleRange, TeamScheduleImpact} from '@/modules/admin/team/api/team-management'
import {teamScheduleSchema} from '@/modules/admin/team/schemas/team-schedule.schema'
import {ScheduleRangeEditor} from '@/modules/admin/team/components/schedule-range-editor'
import {ErrorState} from '@/shared/components/error-state'
import {PageHeader} from '@/shared/components/page-header'
import {formatDateTime, formatDuration} from '@/shared/lib/format'
import {HttpError} from '@/shared/lib/http'
import {Button} from '@/shared/ui/button'
import {Card, CardContent, CardHeader, CardTitle} from '@/shared/ui/card'
import {Checkbox} from '@/shared/ui/checkbox'
import {Skeleton} from '@/shared/ui/skeleton'

const weekdayLabels = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

function clockMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function toClock(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

function durationForDay(day: TeamScheduleDay) {
  const work = day.ranges.reduce((total, range) => total + clockMinutes(range.end) - clockMinutes(range.start), 0)
  const pauses = day.breaks.reduce((total, range) => total + clockMinutes(range.end) - clockMinutes(range.start), 0)
  return Math.max(0, work - pauses)
}

function timelineForDay(day: TeamScheduleDay) {
  const all = [...day.businessHours, ...day.ranges, ...day.breaks]
  if (!all.length) return {start: 8 * 60, end: 20 * 60}
  return {start: Math.min(...all.map(range => clockMinutes(range.start))), end: Math.max(...all.map(range => clockMinutes(range.end)))}
}

function defaultBreak(ranges: TeamScheduleRange[], currentBreaks: TeamScheduleRange[]) {
  for (const range of ranges) {
    const start = clockMinutes(range.start)
    const end = clockMinutes(range.end)
    for (let minute = Math.max(start, 11 * 60); minute + 60 <= end; minute += 15) {
      if (!currentBreaks.some(item => clockMinutes(item.start) < minute + 60 && clockMinutes(item.end) > minute)) {
        return {start: toClock(minute), end: toClock(minute + 60)}
      }
    }
    if (end - start >= 60) {
      const minute = start + Math.floor((end - start - 60) / 2 / 15) * 15
      if (!currentBreaks.some(item => clockMinutes(item.start) < minute + 60 && clockMinutes(item.end) > minute)) {
        return {start: toClock(minute), end: toClock(minute + 60)}
      }
    }
  }
  return null
}

function affectedAppointments(error: unknown): TeamScheduleImpact[] {
  if (!(error instanceof HttpError) || error.status !== 409 || typeof error.details !== 'object' || error.details === null) return []
  const payload = error.details as {details?: {impactedAppointments?: TeamScheduleImpact[]; details?: {impactedAppointments?: TeamScheduleImpact[]}}}
  return payload.details?.impactedAppointments ?? payload.details?.details?.impactedAppointments ?? []
}

export default function TeamSchedulePage() {
  const [, params] = useRoute('/admin/equipe/:id/escala')
  const barberId = params?.id ?? ''
  const scheduleQuery = useTeamSchedule(barberId)
  const saveMutation = useSaveTeamSchedule()
  const [days, setDays] = useState<TeamScheduleDay[]>([])
  const [copySource, setCopySource] = useState<number>(1)
  const [copyTargets, setCopyTargets] = useState<number[]>([])
  const [impactedAppointments, setImpactedAppointments] = useState<TeamScheduleImpact[] | null>(null)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (scheduleQuery.data) {
      setDays(scheduleQuery.data.days)
      setCopySource(scheduleQuery.data.days[0]?.weekday ?? 1)
      setImpactedAppointments(null)
    }
  }, [scheduleQuery.data])

  useEffect(() => {
    document.title = 'Escala semanal | Painel administrativo'
  }, [])

  const totalMinutes = useMemo(() => days.reduce((sum, day) => sum + durationForDay(day), 0), [days])
  const saveInput: TeamScheduleInput = {days: days.map(({weekday, ranges, breaks}) => ({weekday, ranges, breaks}))}

  function updateDay(index: number, change: (day: TeamScheduleDay) => TeamScheduleDay) {
    setDays(current => current.map(day => (day.weekday === index ? change(day) : day)))
    setImpactedAppointments(null)
    setFormError('')
  }

  function toggleCopyTarget(day: number, checked: boolean) {
    setCopyTargets(current => (checked ? [...new Set([...current, day])] : current.filter(value => value !== day)))
  }

  function copyDay() {
    const source = days.find(day => day.weekday === copySource)
    if (!source || !copyTargets.length) return
    setDays(current => current.map(day => (copyTargets.includes(day.weekday) ? {...day, ranges: source.ranges.map(range => ({...range})), breaks: source.breaks.map(range => ({...range}))} : day)))
    setCopyTargets([])
    setImpactedAppointments(null)
    setFormError('')
  }

  async function save(confirmAffected = false) {
    setFormError('')
    const parsed = teamScheduleSchema.safeParse(saveInput)
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || 'Confira as faixas da escala.')
      return
    }
    try {
      const result = await saveMutation.mutateAsync({id: barberId, input: parsed.data, confirmAffected})
      setDays(result.days.map(day => ({...day, businessHours: days.find(current => current.weekday === day.weekday)?.businessHours ?? []})))
      setImpactedAppointments(null)
    } catch (error) {
      const conflicts = affectedAppointments(error)
      if (conflicts.length) setImpactedAppointments(conflicts)
      else setFormError(error instanceof Error ? error.message : 'Não foi possível salvar a escala.')
    }
  }

  const schedule = scheduleQuery.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Equipe"
        title="Escala semanal"
        description={schedule?.barber.name ? `Horários de trabalho e pausas de ${schedule.barber.name}.` : 'Configure os horários de trabalho e pausas do profissional.'}
        actions={
          <Button asChild variant="outline" className="min-h-11">
            <Link href={`/admin/equipe/${barberId}`}>
              <ArrowLeft className="size-4" aria-hidden="true" /> Voltar ao perfil
            </Link>
          </Button>
        }
      />

      {scheduleQuery.isPending ?
        <div className="grid gap-4 lg:grid-cols-2" aria-label="Carregando escala semanal">
          {[1, 2, 3, 4].map(index => (
            <Skeleton key={index} className="h-60 rounded-xl" />
          ))}
        </div>
      : scheduleQuery.isError || !schedule ?
        <ErrorState title="Não foi possível carregar a escala" description="Confira a conexão e tente novamente." onRetry={() => void scheduleQuery.refetch()} />
      : <>
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="size-5 text-primary" aria-hidden="true" /> Horas semanais previstas
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">As pausas são descontadas do total de atendimento.</p>
              </div>
              <p className="text-2xl font-semibold tabular-nums">{formatDuration(totalMinutes)}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Arraste uma faixa para mover; use as alças nas extremidades para ajustar. Os horários avançam em intervalos de 15 minutos.</p>
              <div className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-end">
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Copiar horários de</span>
                  <select className="min-h-11 w-full rounded-md border border-input bg-background px-3" value={copySource} onChange={event => setCopySource(Number(event.target.value))}>
                    {weekdayLabels.map((day, index) => (
                      <option key={day} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Para quais dias?</legend>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {weekdayLabels.map((day, index) =>
                      index === copySource ? null : (
                        <label key={day} className="flex min-h-11 items-center gap-2 text-sm">
                          <Checkbox checked={copyTargets.includes(index)} onCheckedChange={checked => toggleCopyTarget(index, checked === true)} />
                          {day.slice(0, 3)}
                        </label>
                      )
                    )}
                  </div>
                </fieldset>
                <Button type="button" variant="outline" className="min-h-11" disabled={!copyTargets.length} onClick={copyDay}>
                  <Copy className="size-4" aria-hidden="true" /> Copiar faixas
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            {days.map(day => {
              const timeline = timelineForDay(day)
              const openRanges = day.businessHours
              const addWork = openRanges.find(range => !day.ranges.some(existing => clockMinutes(existing.start) < clockMinutes(range.end) && clockMinutes(existing.end) > clockMinutes(range.start)))
              const workAddition = addWork ? {start: addWork.start, end: addWork.end} : undefined
              const pauseAddition = defaultBreak(day.ranges, day.breaks) ?? undefined
              return (
                <Card key={day.weekday}>
                  <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <div>
                      <CardTitle>{weekdayLabels[day.weekday]}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {openRanges.length ? `Funcionamento: ${openRanges.map(range => `${range.start}–${range.end}`).join(', ')}` : 'Unidade fechada neste dia'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{formatDuration(durationForDay(day))}</p>
                      <p className="text-xs text-muted-foreground">de atendimento</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <ScheduleRangeEditor
                      label="Faixas de trabalho"
                      kind="work"
                      ranges={day.ranges}
                      onChange={ranges =>
                        updateDay(day.weekday, current => ({
                          ...current,
                          ranges,
                          breaks: current.breaks.filter(pause => ranges.some(range => clockMinutes(pause.start) >= clockMinutes(range.start) && clockMinutes(pause.end) <= clockMinutes(range.end)))
                        }))
                      }
                      timelineStart={timeline.start}
                      timelineEnd={timeline.end}
                      addRange={workAddition}
                    />
                    <ScheduleRangeEditor
                      label="Pausas"
                      kind="break"
                      ranges={day.breaks}
                      onChange={breaks => updateDay(day.weekday, current => ({...current, breaks}))}
                      timelineStart={timeline.start}
                      timelineEnd={timeline.end}
                      addRange={pauseAddition}
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {formError && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}

          {impactedAppointments && (
            <Card className="border-amber-500/40">
              <CardHeader>
                <CardTitle>Agendamentos fora da nova escala</CardTitle>
                <p className="text-sm text-muted-foreground">Revise estes compromissos. Você pode voltar e ajustar os horários, ou confirmar a nova escala mantendo os atendimentos existentes.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="max-h-72 space-y-2 overflow-y-auto">
                  {impactedAppointments.map(appointment => (
                    <li key={appointment.id} className="rounded-lg border border-border p-3 text-sm">
                      <p className="font-medium">
                        {appointment.customerName} · {formatDateTime(appointment.start)}
                      </p>
                      <p className="text-muted-foreground">
                        Agendamento #{appointment.id} · {appointment.status}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => setImpactedAppointments(null)}>
                    Voltar e ajustar a escala
                  </Button>
                  <Button type="button" className="min-h-11" disabled={saveMutation.isPending} onClick={() => void save(true)}>
                    {saveMutation.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                    Confirmar escala mantendo agendamentos
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button type="button" className="min-h-11 w-full sm:w-auto" disabled={saveMutation.isPending} onClick={() => void save(false)}>
              {saveMutation.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
              Salvar escala
            </Button>
          </div>
        </>
      }
    </div>
  )
}
