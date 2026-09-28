import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import MidatorgApp from './MidatorgApp';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster position="top-center" closeButton />
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <MidatorgApp />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
