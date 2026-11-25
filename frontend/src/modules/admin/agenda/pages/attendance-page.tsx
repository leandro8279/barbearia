import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, ArrowUpRight, Check, Clock3, UserRound } from 'lucide-react';
import { useAgendaAppointmentDetail, useFinishAgendaService, useStartAgendaService } from '@/modules/admin/agenda/hooks/use-agenda';
import { ErrorState } from '@/shared/components/error-state';
import { formatDateTime, formatDuration } from '@/shared/lib/format';
import { useSessionStore } from '@/shared/stores/session-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { Skeleton } from '@/shared/ui/skeleton';

interface ScreenWakeLock {
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}

type WakeLockNavigator = Omit<Navigator, 'wakeLock'> & { wakeLock?: { request(type: 'screen'): Promise<ScreenWakeLock> } };

function durationClock(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((value) => String(value).padStart(2, '0')).join(':');
}

export default function AttendancePage() {
  const [location, setLocation] = useLocation();
  const appointmentId = location.split('/').filter(Boolean).at(-1) ?? '';
  const validId = /^\d+$/.test(appointmentId) ? Number(appointmentId) : null;
  const user = useSessionStore((state) => state.user);
  const barberMode = user?.role === 'barber';
  const canOpenCash = Boolean(user && (['admin', 'manager', 'reception'].includes(user.role) || user.permissions.includes('cash.write')));
  const detailQuery = useAgendaAppointmentDetail(validId, barberMode);
  const startMutation = useStartAgendaService();
  const finishMutation = useFinishAgendaService();
  const detail = detailQuery.data;
  const appointment = detail?.appointment;
  const openTab = detail?.tabs.find((tab) => tab.status === 'open');
  const [now, setNow] = useState(Date.now());
  const [checkedServices, setCheckedServices] = useState<Record<string, boolean>>({});

  useEffect(() => {
    document.title = 'Atendimento | Painel administrativo';
  }, []);

  useEffect(() => {
    setCheckedServices({});
  }, [appointment?.id]);

  useEffect(() => {
    if (appointment?.status !== 'in_service' || !appointment.startedAt || appointment.finishedAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [appointment?.finishedAt, appointment?.startedAt, appointment?.status]);

  useEffect(() => {
    if (appointment?.status !== 'in_service') return;
    const manager = (navigator as WakeLockNavigator).wakeLock;
    if (!manager) return;

    let lock: ScreenWakeLock | null = null;
    const acquire = async () => {
      if (document.visibilityState !== 'visible' || lock) return;
      try {
        lock = await manager.request('screen');
        const acquiredLock = lock;
        acquiredLock.addEventListener('release', () => {
          if (lock === acquiredLock) lock = null;
        });
      } catch {
        // O navegador pode negar o bloqueio de tela; o cronômetro segue funcionando.
      }
    };
    const onVisibilityChange = () => void acquire();

    void acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (lock) void lock.release();
    };
  }, [appointment?.status]);

  const timerSeconds = useMemo(() => {
    if (!appointment?.startedAt) return 0;
    const end = appointment.finishedAt ? new Date(appointment.finishedAt).getTime() : now;
    return Math.max(0, Math.floor((end - new Date(appointment.startedAt).getTime()) / 1000));
  }, [appointment?.finishedAt, appointment?.startedAt, now]);

  function startService() {
    if (!appointment) return;
    startMutation.mutate({ id: appointment.id, status: appointment.status }, { onSuccess: () => void detailQuery.refetch() });
  }

  async function finishService() {
    if (!appointment) return;
    try {
      await finishMutation.mutateAsync({ id: appointment.id });
      await detailQuery.refetch();
      if (canOpenCash && openTab) setLocation(`/admin/caixa?tabId=${openTab.id}`);
    } catch {
      // A mutation já apresenta a mensagem de erro ao usuário.
    }
  }

  function goToCash(query: string) {
    if (!openTab) return;
    const params = new URLSearchParams(query);
    params.set('tabId', String(openTab.id));
    setLocation(`/admin/caixa?${params.toString()}`);
  }

  const initials = detail?.customer.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100dvh-4rem)] bg-muted/20 sm:-mx-6 sm:-my-9">
      <div className="mx-auto w-full max-w-4xl px-4 pb-28 pt-5 sm:px-6 sm:pt-8">
        <Button asChild variant="ghost" className="mb-4 min-h-11 px-2">
          <Link href="/admin/agenda">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para agenda
          </Link>
        </Button>
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary">Painel administrativo</p>
            <h1 className="mt-1 text-3xl font-semibold">Atendimento</h1>
            {appointment && (
              <p className="mt-2 text-sm text-muted-foreground">
                Agendamento {appointment.code} · {formatDateTime(appointment.start)}
              </p>
            )}
          </div>
          {appointment && (
            <Badge variant={appointment.status === 'in_service' ? 'default' : 'secondary'}>
              {appointment.status === 'in_service' ?
                'Em atendimento'
              : appointment.status === 'done' ?
                'Concluído'
              : 'Aguardando'}
            </Badge>
          )}
        </header>

        {!validId ?
          <ErrorState title="Agendamento inválido" description="Abra o atendimento a partir de um agendamento válido." />
        : detailQuery.isError ?
          <ErrorState title="Não foi possível carregar o atendimento" onRetry={() => void detailQuery.refetch()} />
        : detailQuery.isPending ?
          <div className="space-y-4" aria-label="Carregando atendimento">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-52 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        : !detail || !appointment ?
          <ErrorState title="Atendimento não encontrado" description="Confira o agendamento e tente novamente." />
        : <>
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-4 p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    <Avatar size="lg" className="size-14">
                      {detail.customer.avatar && <AvatarImage src={detail.customer.avatar} alt="" />}
                      <AvatarFallback>{initials || <UserRound className="size-5" />}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</p>
                      <h2 className="mt-1 text-xl font-semibold">{detail.customer.name}</h2>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {detail.customer.phone && <span>{detail.customer.phone}</span>}
                        {detail.customer.email && <span className="break-all">{detail.customer.email}</span>}
                        {detail.customer.birthDate && <span>Nascimento: {formatDateTime(`${detail.customer.birthDate}T12:00:00-03:00`).split(' às ')[0]}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-muted/60 p-4">
                    <p className="text-sm font-medium">Observações e ficha</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{appointment.notes.trim() || 'Sem observações registradas para este atendimento.'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex flex-col items-center gap-2 p-6 text-center sm:p-8">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Clock3 className="size-6" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {appointment.finishedAt ?
                      'Duração real'
                    : appointment.startedAt ?
                      'Tempo de atendimento'
                    : 'Tempo previsto'}
                  </p>
                  <p className="font-mono text-4xl font-semibold tabular-nums sm:text-5xl" role="timer" aria-live="off">
                    {appointment.startedAt ? durationClock(timerSeconds) : formatDuration(appointment.items.reduce((sum, item) => sum + item.durationMin, 0))}
                  </p>
                  {appointment.startedAt && <p className="text-xs text-muted-foreground">Iniciado às {formatDateTime(appointment.startedAt).split(' às ')[1]}</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-lg">Serviços do atendimento</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {Object.values(checkedServices).filter(Boolean).length} de {appointment.items.length} concluídos
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {appointment.items.map((item, index) => {
                    const key = `${item.serviceId}-${index}`;
                    const checked = Boolean(checkedServices[key]);
                    return (
                      <label key={key} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => setCheckedServices((current) => ({ ...current, [key]: value === true }))}
                          aria-label={`Marcar ${item.name} como concluído`}
                        />
                        <span className={`min-w-0 flex-1 font-medium ${checked ? 'text-muted-foreground line-through' : ''}`}>{item.name}</span>
                        <span className="text-sm text-muted-foreground">{formatDuration(item.durationMin)}</span>
                        {checked && <Check className="size-4 text-primary" aria-hidden="true" />}
                      </label>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div>
                    <p className="font-medium">Itens adicionais</p>
                    <p className="text-sm text-muted-foreground">Inclua um produto ou serviço extra na comanda.</p>
                  </div>
                  <Button variant="outline" className="min-h-11 w-full sm:w-auto" disabled={!openTab || !canOpenCash} onClick={() => goToCash('item=1')}>
                    Adicionar produto/serviço
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Button>
                  {!canOpenCash && <span className="text-xs text-muted-foreground">A inclusão de itens deve ser feita por alguém com acesso ao caixa.</span>}
                </CardContent>
              </Card>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mt-5 sm:border-0 sm:bg-transparent sm:p-0 sm:pb-0">
              <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:justify-end">
                {['pending', 'confirmed', 'checked_in'].includes(appointment.status) ?
                  <Button className="min-h-12 w-full text-base sm:w-auto sm:min-w-64" disabled={startMutation.isPending} onClick={startService}>
                    {startMutation.isPending ?
                      'Iniciando atendimento…'
                    : appointment.status === 'checked_in' ?
                      'Iniciar atendimento'
                    : 'Registrar chegada e iniciar'}
                  </Button>
                : appointment.status === 'in_service' && !appointment.finishedAt ?
                  <Button className="min-h-12 w-full text-base sm:w-auto sm:min-w-64" disabled={finishMutation.isPending} onClick={() => void finishService()}>
                    {finishMutation.isPending ? 'Salvando duração…' : 'Finalizar e ir ao caixa'}
                  </Button>
                : appointment.status === 'in_service' && appointment.finishedAt && canOpenCash && openTab ?
                  <Button className="min-h-12 w-full text-base sm:w-auto sm:min-w-64" onClick={() => goToCash('')}>
                    Ir ao caixa
                  </Button>
                : appointment.status === 'done' ?
                  <p className="rounded-xl bg-muted px-4 py-3 text-center text-sm font-medium sm:ml-auto">Atendimento concluído e comanda fechada.</p>
                : <p className="rounded-xl bg-muted px-4 py-3 text-center text-sm text-muted-foreground sm:ml-auto">A recepção pode continuar o fechamento no caixa.</p>}
                {startMutation.isError && (
                  <p role="alert" className="text-sm text-destructive sm:self-center">
                    {startMutation.error.message}
                  </p>
                )}
                {finishMutation.isError && (
                  <p role="alert" className="text-sm text-destructive sm:self-center">
                    {finishMutation.error.message}
                  </p>
                )}
              </div>
            </div>
          </>
        }
      </div>
    </div>
  );
}
