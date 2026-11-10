/**
 * Guide booking state transitions for WalkingTour / TourBooking.
 */

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface BookingRecord {
  id: string;
  walkingTourId: string;
  userId: string;
  status: BookingStatus;
  statusHistory: Array<{ from: BookingStatus | null; to: BookingStatus; at: string; reason?: string }>;
  tipAmount: number | null;
  partySize: number;
}

const ALLOWED: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};

export class BookingStateMachine {
  transition(booking: BookingRecord, to: BookingStatus, reason?: string): BookingRecord {
    const allowed = ALLOWED[booking.status];
    if (!allowed.includes(to)) {
      throw new Error(`Illegal booking transition: ${booking.status} → ${to}`);
    }
    const at = new Date().toISOString();
    return {
      ...booking,
      status: to,
      statusHistory: [...booking.statusHistory, { from: booking.status, to, at, reason }],
    };
  }

  addTip(booking: BookingRecord, amount: number): BookingRecord {
    if (booking.status !== 'COMPLETED' && booking.status !== 'CONFIRMED') {
      throw new Error(`Tips allowed only on CONFIRMED/COMPLETED bookings (got ${booking.status})`);
    }
    if (amount <= 0) {
      throw new Error('Tip amount must be positive');
    }
    return { ...booking, tipAmount: (booking.tipAmount ?? 0) + amount };
  }
}

export function createPendingBooking(input: {
  id: string;
  walkingTourId: string;
  userId: string;
  partySize: number;
}): BookingRecord {
  return {
    id: input.id,
    walkingTourId: input.walkingTourId,
    userId: input.userId,
    status: 'PENDING',
    statusHistory: [{ from: null, to: 'PENDING', at: new Date().toISOString(), reason: 'created' }],
    tipAmount: null,
    partySize: input.partySize,
  };
}
