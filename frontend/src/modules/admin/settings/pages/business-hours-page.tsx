import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { CalendarClock, Copy, Plus, Save, Trash2 } from 'lucide-react';
import { useBusinessHours, useSaveBusinessHours } from '@/modules/admin/settings/hooks/use-settings';
import type { BusinessHourDay, BusinessHoliday, ClockRange } from '@/modules/admin/settings/api/settings';
import { SettingsNavigation } from '@/modules/admin/settings/components/settings-navigation';
import { businessHoursSchema } from '@/modules/admin/settings/schemas/hours.schema';
import { ScheduleRangeEditor } from '@/modules/admin/team/components/schedule-range-editor';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { HttpError } from '@/shared/lib/http';
import { useCan } from '@/shared/hooks/use-can';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';

const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const defaultRange = { start: '09:00', end: '17:00' };
type AppointmentImpact = { id: number; start: string; end: string; status: string; customerName: string; barberName: string };

function normalizeDays(days: BusinessHourDay[]) {
  return weekdays.map((_, weekday) => ({
    weekday,
    ranges: (days.find((day) => Number(day.weekday) === weekday)?.ranges || []).map((range) => (Array.isArray(range) ? { start: range[0], end: range[1] } : range)),
  }));
}

function minutes(value: string) {
  const [hours, mins] = value.split(':').map(Number);
  return hours * 60 + mins;
}

function timeline(ranges: ClockRange[]) {
  if (!ranges.length) return { start: 8 * 60, end: 20 * 60 };
  return { start: Math.min(...ranges.map((range) => minutes(range.start))), end: Math.max(...ranges.map((range) => minutes(range.end))) };
}

function dateLabel(value: string) {
  const date = new Date(`${value}T12:00:00-03:00`);
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'long' }).format(date);
}

function dateTimeLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function getImpacts(error: unknown): AppointmentImpact[] {
  if (!(error instanceof HttpError) || error.status !== 409 || typeof error.details !== 'object' || error.details === null) return [];
  const payload = error.details as { details?: { impactedAppointments?: AppointmentImpact[] } };
  return payload.details?.impactedAppointments || [];
}

export default function BusinessHoursPage() {
  const query = useBusinessHours();
  const saveMutation = useSaveBusinessHours();
  const canWrite = useCan('settings.write');
  const [businessHours, setBusinessHours] = useState<BusinessHourDay[]>([]);
  const [holidays, setHolidays] = useState<BusinessHoliday[]>([]);
  const [copySource, setCopySource] = useState(1);
  const [copyTargets, setCopyTargets] = useState<number[]>([]);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [impact, setImpact] = useState<AppointmentImpact[] | null>(null);
  const [confirmReschedule, setConfirmReschedule] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    document.title = 'Horários e feriados | Configurações';
  }, []);

  useEffect(() => {
    if (!query.data) return;
    setBusinessHours(normalizeDays(query.data.businessHours));
    setHolidays(query.data.holidays.map((item) => ({ ...item, ranges: item.ranges || [] })));
    setImpact(null);
    setConfirmReschedule(false);
  }, [query.data]);

  const holidayList = useMemo(() => [...holidays].sort((left, right) => left.date.localeCompare(right.date)), [holidays]);

  function updateDay(weekday: number, ranges: ClockRange[]) {
    setBusinessHours((current) => current.map((day) => (day.weekday === weekday ? { ...day, ranges } : day)));
    setImpact(null);
    setFormError('');
  }

  function toggleCopyTarget(day: number, checked: boolean) {
    setCopyTargets((current) => (checked ? [...new Set([...current, day])] : current.filter((value) => value !== day)));
  }

  function copyHours() {
    const source = businessHours.find((day) => day.weekday === copySource);
    if (!source || !copyTargets.length) return;
    setBusinessHours((current) => current.map((day) => (copyTargets.includes(day.weekday) ? { ...day, ranges: source.ranges.map((range) => ({ ...range })) } : day)));
    setCopyTargets([]);
    setImpact(null);
  }

  function addHoliday() {
    if (!holidayDate || !holidayName.trim()) {
      setFormError('Informe a data e o nome da exceção.');
      return;
    }
    if (holidays.some((item) => item.date === holidayDate)) {
      setFormError('Já existe um feriado ou exceção nesta data.');
      return;
    }
    setHolidays((current) => [...current, { date: holidayDate, name: holidayName.trim(), closed: true, ranges: [] }].sort((left, right) => left.date.localeCompare(right.date)));
    setHolidayDate('');
    setHolidayName('');
    setFormError('');
    setImpact(null);
  }

  function updateHoliday(date: string, change: (holiday: BusinessHoliday) => BusinessHoliday) {
    setHolidays((current) => current.map((holiday) => (holiday.date === date ? change(holiday) : holiday)));
    setImpact(null);
    setConfirmReschedule(false);
  }

  async function save(confirmAffected = false) {
    setFormError('');
    const parsed = businessHoursSchema.safeParse({ businessHours, holidays });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || 'Confira os horários e feriados.');
      return;
    }
    try {
      await saveMutation.mutateAsync({ ...parsed.data, confirmAffected });
      setImpact(null);
      setConfirmReschedule(false);
    } catch (error) {
      const impacts = getImpacts(error);
      if (impacts.length) {
        setImpact(impacts);
        setConfirmReschedule(false);
      } else setFormError(error instanceof Error ? error.message : 'Não foi possível salvar os horários.');
    }
  }

  if (query.isPending)
    return (
      <div className="space-y-5">
        <Skeleton className="h-14" />
        <Skeleton className="h-96" />
        <Skeleton className="h-72" />
      </div>
    );
  if (query.isError || !query.data) return <ErrorState title="Não foi possível carregar os horários" description="Confira a conexão e tente novamente." onRetry={() => void query.refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Configurações" title="Horários e feriados" description="Configure o funcionamento da unidade e as exceções do calendário." />
      <SettingsNavigation active="/admin/config/horarios" />
      <p className="text-sm text-muted-foreground">Os horários são interpretados no fuso fixo America/Sao_Paulo.</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-5 text-primary" /> Funcionamento semanal
          </CardTitle>
          <p className="text-sm text-muted-foreground">Arraste uma faixa ou use as alças para ajustar os horários. Um dia sem faixas fica fechado.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 rounded-lg border border-border p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] lg:items-end">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Copiar horários de</span>
              <select className="min-h-11 w-full rounded-md border border-input bg-background px-3" value={copySource} onChange={(event) => setCopySource(Number(event.target.value))}>
                {weekdays.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Aplicar também em</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {weekdays.map((day, index) =>
                  index === copySource ? null : (
                    <label key={day} className="flex min-h-11 items-center gap-2 text-sm">
                      <Checkbox checked={copyTargets.includes(index)} onCheckedChange={(checked) => toggleCopyTarget(index, checked === true)} />
                      {day.slice(0, 3)}
                    </label>
                  ),
                )}
              </div>
            </fieldset>
            <Button type="button" variant="outline" className="min-h-11" disabled={!copyTargets.length || !canWrite} onClick={copyHours}>
              <Copy className="size-4" /> Copiar horários
            </Button>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {businessHours.map((day) => {
              const range = timeline(day.ranges);
              return (
                <Card key={day.weekday} className="bg-background">
                  <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <CardTitle className="text-base">{weekdays[day.weekday]}</CardTitle>
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <Checkbox checked={!day.ranges.length} disabled={!canWrite} onCheckedChange={(checked) => updateDay(day.weekday, checked === true ? [] : [{ ...defaultRange }])} />
                      Fechado
                    </label>
                  </CardHeader>
                  <CardContent>
                    {!!day.ranges.length && (
                      <ScheduleRangeEditor
                        label={`Funcionamento de ${weekdays[day.weekday]}`}
                        kind="work"
                        ranges={day.ranges}
                        onChange={(ranges) => updateDay(day.weekday, ranges)}
                        timelineStart={range.start}
                        timelineEnd={range.end}
                        addRange={defaultRange}
                      />
                    )}
                    {!day.ranges.length && <p className="text-sm text-muted-foreground">Unidade fechada neste dia.</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feriados e exceções</CardTitle>
          <p className="text-sm text-muted-foreground">A lista inclui feriados nacionais e datas locais; você também pode cadastrar exceções.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-[minmax(10rem,0.7fr)_minmax(12rem,1.3fr)_auto] sm:items-end">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Data</span>
              <Input type="date" value={holidayDate} onChange={(event) => setHolidayDate(event.target.value)} disabled={!canWrite} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Nome</span>
              <Input value={holidayName} onChange={(event) => setHolidayName(event.target.value)} placeholder="Ex.: Recesso da unidade" disabled={!canWrite} />
            </label>
            <Button type="button" variant="outline" className="min-h-11" disabled={!canWrite} onClick={addHoliday}>
              <Plus className="size-4" /> Adicionar data
            </Button>
          </div>

          <div className="space-y-3">
            {holidayList.map((holiday) => {
              const range = timeline(holiday.ranges);
              return (
                <div key={holiday.date} className="rounded-xl border border-border p-4">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                    <div className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)]">
                      <Input
                        type="date"
                        aria-label={`Data de ${holiday.name}`}
                        value={holiday.date}
                        disabled={!canWrite || holiday.isDefault}
                        onChange={(event) => {
                          const nextDate = event.target.value;
                          if (holidays.some((item) => item.date === nextDate && item.date !== holiday.date)) {
                            setFormError('Já existe uma data cadastrada para esse dia.');
                            return;
                          }
                          setHolidays((current) => current.map((item) => (item.date === holiday.date ? { ...item, date: nextDate } : item)).sort((left, right) => left.date.localeCompare(right.date)));
                        }}
                      />
                      <Input
                        aria-label={`Nome do feriado ${dateLabel(holiday.date)}`}
                        value={holiday.name}
                        disabled={!canWrite}
                        onChange={(event) => updateHoliday(holiday.date, (current) => ({ ...current, name: event.target.value }))}
                      />
                    </div>
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <Checkbox
                        checked={holiday.closed}
                        disabled={!canWrite}
                        onCheckedChange={(checked) =>
                          updateHoliday(holiday.date, (current) => ({
                            ...current,
                            closed: checked === true,
                            ranges:
                              checked === true ? []
                              : current.ranges.length ? current.ranges
                              : [{ ...defaultRange }],
                          }))
                        }
                      />
                      Fechado
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11"
                      aria-label={`Remover ${holiday.name}`}
                      disabled={!canWrite || holiday.isDefault}
                      onClick={() => setHolidays((current) => current.filter((item) => item.date !== holiday.date))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  {!holiday.closed && (
                    <div className="mt-4">
                      <ScheduleRangeEditor
                        label={`Horário especial: ${holiday.name}`}
                        kind="work"
                        ranges={holiday.ranges}
                        onChange={(ranges) => updateHoliday(holiday.date, (current) => ({ ...current, ranges }))}
                        timelineStart={range.start}
                        timelineEnd={range.end}
                        addRange={defaultRange}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {!holidayList.length && <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">Nenhum feriado ou exceção cadastrado.</p>}
          </div>
        </CardContent>
      </Card>

      {formError && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {formError}
        </p>
      )}

      {impact && (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle>Agendamentos que precisam de revisão</CardTitle>
            <p className="text-sm text-muted-foreground">Esta mudança deixa estes horários fora do novo funcionamento. Revise e combine uma remarcação antes de confirmar.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {impact.map((appointment) => (
                <li key={appointment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                  <span>
                    <strong>{appointment.customerName}</strong> · {dateTimeLabel(appointment.start)} · {appointment.barberName}
                  </span>
                  <Link href={`/admin/agenda?ag=${appointment.id}`} className="min-h-11 content-center text-primary underline underline-offset-4">
                    Abrir na agenda
                  </Link>
                </li>
              ))}
            </ul>
            <label className="flex items-start gap-3 rounded-lg bg-muted/40 p-3 text-sm">
              <Checkbox checked={confirmReschedule} onCheckedChange={(checked) => setConfirmReschedule(checked === true)} />
              <span>Confirmo que vou entrar em contato com estes clientes para remarcar os horários afetados.</span>
            </label>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  setImpact(null);
                  setConfirmReschedule(false);
                }}
              >
                Voltar e ajustar horários
              </Button>
              <Button type="button" className="min-h-11" disabled={!confirmReschedule || saveMutation.isPending} onClick={() => void save(true)}>
                <Save className="size-4" /> Confirmar alteração
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!impact && (
        <div className="flex justify-end">
          <Button type="button" className="min-h-11 w-full sm:w-auto" disabled={!canWrite || saveMutation.isPending} onClick={() => void save(false)}>
            <Save className="size-4" /> Salvar horários
          </Button>
        </div>
      )}
    </div>
  );
}
