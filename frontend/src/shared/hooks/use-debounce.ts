import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), Math.max(0, delayMs));
    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);

  return debouncedValue;
}
