import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

// Auth/not-found errors should never be retried; transient network errors get 2 tries
function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,           // 5 min — guide/tour data rarely changes
      gcTime: 24 * 60 * 60 * 1000,        // 24 h — survive a full offline day
      retry: shouldRetry,
      retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 30_000),
      networkMode: 'offlineFirst',         // serve cache immediately; refetch in bg
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

// Persists the React Query cache to AsyncStorage so data survives app restarts
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'saalik_rq_v1',
  throttleTime: 1_000,                    // debounce writes to avoid thrashing
});
