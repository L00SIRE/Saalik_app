import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getMyBookings, cancelBooking } from '@services/api';
import type { Booking } from '@app-types/api';
import { useAuthState } from '@context/AuthContext';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const bookingKeys = {
  all: (userId: string) => ['bookings', userId] as const,
  upcoming: (userId: string) => ['bookings', userId, 'upcoming'] as const,
  past: (userId: string) => ['bookings', userId, 'past'] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetches upcoming bookings with offline-first caching.
 *
 * networkMode: 'offlineFirst' means React Query returns cached data immediately
 * and refetches in the background when connectivity is restored — critical for
 * guides operating in low-connectivity remote trekking areas.
 */
export function useUpcomingBookings() {
  const { user } = useAuthState();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: bookingKeys.upcoming(userId),
    queryFn: () => getMyBookings('upcoming'),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,           // 2 min — catch newly confirmed bookings
    gcTime: 24 * 60 * 60 * 1000,        // 24 h — survives a full offline day
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });
}

export function usePastBookings() {
  const { user } = useAuthState();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: bookingKeys.past(userId),
    queryFn: () => getMyBookings('past'),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,          // past bookings change rarely
    gcTime: 24 * 60 * 60 * 1000,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCancelBooking() {
  const qc = useQueryClient();
  const { user } = useAuthState();

  return useMutation({
    mutationFn: (bookingId: string) => cancelBooking(bookingId),

    // Optimistic update so the UI reflects cancellation before the server responds
    onMutate: async (bookingId) => {
      const key = bookingKeys.upcoming(user?.id ?? '');
      await qc.cancelQueries({ queryKey: key });

      const snapshot = qc.getQueryData<Booking[]>(key);
      qc.setQueryData<Booking[]>(key, (prev) =>
        prev?.map((b) => (b.id === bookingId ? { ...b, status: 'CANCELLED' } : b)) ?? [],
      );

      return { snapshot };
    },

    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot && user) {
        qc.setQueryData(bookingKeys.upcoming(user.id), ctx.snapshot);
      }
    },

    onSettled: () => {
      if (!user) return;
      qc.invalidateQueries({ queryKey: bookingKeys.upcoming(user.id) });
      qc.invalidateQueries({ queryKey: bookingKeys.past(user.id) });
    },
  });
}
