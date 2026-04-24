import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { DashboardShell } from './features/dashboard/DashboardShell';

export function App() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <DashboardShell />
    </QueryClientProvider>
  );
}
