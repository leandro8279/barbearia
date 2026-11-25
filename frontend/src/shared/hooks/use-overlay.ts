import { useCallback } from 'react';

import { useLocation, useSearch } from 'wouter';

export interface OverlayController {
  isOpen: boolean;
  open: (value?: string) => void;
  close: () => void;
  setOpen: (open: boolean, value?: string) => void;
}

export function useOverlay(queryKey: string, activeValue = '1'): OverlayController {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const isOpen = params.has(queryKey) && (activeValue === '' || params.get(queryKey) === activeValue);

  const setOpen = useCallback(
    (open: boolean, value = activeValue) => {
      const nextParams = new URLSearchParams(search);
      if (open) nextParams.set(queryKey, value);
      else nextParams.delete(queryKey);
      const path = location.split(/[?#]/, 1)[0] || '/';
      const suffix = nextParams.toString();
      navigate(`${path}${suffix ? `?${suffix}` : ''}`, { replace: true });
    },
    [activeValue, location, navigate, queryKey, search],
  );

  return { isOpen, open: (value) => setOpen(true, value), close: () => setOpen(false), setOpen };
}
