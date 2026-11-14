import { useEffect } from 'react';

import { Router } from '@/app/router';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { AppErrorBoundary } from '@/shared/components/app-error-boundary';
import { syncOpenGraph } from '@/shared/lib/page-meta';
import { queryClient } from '@/shared/lib/query-client';
import { Toaster } from '@/shared/ui/sonner';
import { TooltipProvider } from '@/shared/ui/tooltip';

export function App() {
  useEffect(() => {
    const observer = new MutationObserver(syncOpenGraph);
    observer.observe(document.head, { attributes: true, attributeFilter: ['content'], childList: true, characterData: true, subtree: true });
    syncOpenGraph();
    return () => observer.disconnect();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppErrorBoundary>
          <Router />
          <Toaster position="top-right" richColors />
        </AppErrorBoundary>
      </TooltipProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
