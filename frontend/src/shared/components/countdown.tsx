import { useCountdown } from '@/shared/hooks/use-countdown';

export interface CountdownProps {
  expiresAt: string | number | Date;
  onExpire?: () => void;
  className?: string;
}

export function Countdown({ expiresAt, onExpire, className }: CountdownProps) {
  const { minutes, seconds, expired } = useCountdown(expiresAt, onExpire);
  return (
    <span className={className} role="timer" aria-live="polite" aria-atomic="true">
      {expired ? 'Reserva expirada' : `Horário reservado por ${minutes}:${String(seconds).padStart(2, '0')}`}
    </span>
  );
}
