import { useEffect, useMemo, useRef, useState } from 'react';

export interface CountdownState {
  remainingSeconds: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

export function useCountdown(expiresAt: string | number | Date, onExpire?: () => void): CountdownState {
  const targetTime = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [now, setNow] = useState(() => Date.now());
  const onExpireRef = useRef(onExpire);
  const didExpireRef = useRef(false);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setNow(Date.now());
    didExpireRef.current = false;
    if (!Number.isFinite(targetTime) || targetTime <= Date.now()) {
      if (Number.isFinite(targetTime) && !didExpireRef.current) {
        didExpireRef.current = true;
        onExpireRef.current?.();
      }
      return;
    }
    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= targetTime) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [targetTime]);

  const remainingSeconds = Number.isFinite(targetTime) ? Math.max(0, Math.ceil((targetTime - now) / 1000)) : 0;
  const expired = !Number.isFinite(targetTime) || remainingSeconds === 0;

  useEffect(() => {
    if (expired && Number.isFinite(targetTime) && !didExpireRef.current) {
      didExpireRef.current = true;
      onExpireRef.current?.();
    }
  }, [expired, targetTime]);

  return { remainingSeconds, minutes: Math.floor(remainingSeconds / 60), seconds: remainingSeconds % 60, expired };
}
