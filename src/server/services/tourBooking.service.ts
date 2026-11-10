import { createHash } from 'crypto';
import type { BookingStatus } from '../types/heritage';

export interface StatusTransition {
  from: BookingStatus;
  to: BookingStatus;
  at: string;
  reason?: string;
  actorId?: string;
}

export interface TourBookingRecord {
  id: string;
  walkingTourId: string;
  userId: string;
  bookingDate: Date;
  partySize: number;
  status: BookingStatus;
  tipAmount: number | null;
  tipCurrency: string | null;
  notes: string | null;
  statusHistory: StatusTransition[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBookingInput {
  walkingTourId: string;
  userId: string;
  bookingDate: string | Date;
  partySize?: number;
  notes?: string | null;
  /** When the guide profile has autoAccept, start as CONFIRMED. */
  autoAccept?: boolean;
}

const ALLOWED_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal booking transition: ${from} → ${to}`);
  }
}

function newId(): string {
  return `tb_${createHash('sha1').update(`${Date.now()}_${Math.random()}`).digest('hex').slice(0, 16)}`;
}

/**
 * Guide booking state machine (unit-testable, no Postgres required).
 * PENDING → CONFIRMED | CANCELLED
 * CONFIRMED → COMPLETED | CANCELLED | NO_SHOW
 * CANCELLED / COMPLETED / NO_SHOW are terminal.
 */
export class TourBookingService {
  private readonly bookings = new Map<string, TourBookingRecord>();

  create(input: CreateBookingInput): TourBookingRecord {
    const now = new Date();
    const initialStatus: BookingStatus = input.autoAccept ? 'CONFIRMED' : 'PENDING';
    const history: StatusTransition[] = [
      {
        from: 'PENDING',
        to: initialStatus,
        at: now.toISOString(),
        reason: input.autoAccept ? 'guide_auto_accept' : 'booking_created',
        actorId: input.userId,
      },
    ];

    const record: TourBookingRecord = {
      id: newId(),
      walkingTourId: input.walkingTourId,
      userId: input.userId,
      bookingDate: new Date(input.bookingDate),
      partySize: input.partySize ?? 1,
      status: initialStatus,
      tipAmount: null,
      tipCurrency: null,
      notes: input.notes ?? null,
      statusHistory: history,
      createdAt: now,
      updatedAt: now,
    };
    this.bookings.set(record.id, record);
    return record;
  }

  get(id: string): TourBookingRecord | undefined {
    return this.bookings.get(id);
  }

  listByUser(userId: string): TourBookingRecord[] {
    return [...this.bookings.values()].filter((b) => b.userId === userId);
  }

  listByTour(walkingTourId: string): TourBookingRecord[] {
    return [...this.bookings.values()].filter((b) => b.walkingTourId === walkingTourId);
  }

  transition(
    id: string,
    to: BookingStatus,
    meta: { reason?: string; actorId?: string } = {},
  ): TourBookingRecord {
    const existing = this.bookings.get(id);
    if (!existing) {
      throw new Error(`Unknown booking: ${id}`);
    }
    assertTransition(existing.status, to);
    const now = new Date();
    const updated: TourBookingRecord = {
      ...existing,
      status: to,
      statusHistory: [
        ...existing.statusHistory,
        {
          from: existing.status,
          to,
          at: now.toISOString(),
          reason: meta.reason,
          actorId: meta.actorId,
        },
      ],
      updatedAt: now,
    };
    this.bookings.set(id, updated);
    return updated;
  }

  confirm(id: string, actorId?: string): TourBookingRecord {
    return this.transition(id, 'CONFIRMED', { reason: 'guide_confirmed', actorId });
  }

  cancel(id: string, actorId?: string, reason = 'cancelled'): TourBookingRecord {
    return this.transition(id, 'CANCELLED', { reason, actorId });
  }

  complete(id: string, tip?: { amount: number; currency: string }, actorId?: string): TourBookingRecord {
    const completed = this.transition(id, 'COMPLETED', { reason: 'tour_completed', actorId });
    if (!tip) return completed;
    const withTip: TourBookingRecord = {
      ...completed,
      tipAmount: tip.amount,
      tipCurrency: tip.currency,
      updatedAt: new Date(),
    };
    this.bookings.set(id, withTip);
    return withTip;
  }

  markNoShow(id: string, actorId?: string): TourBookingRecord {
    return this.transition(id, 'NO_SHOW', { reason: 'guest_no_show', actorId });
  }

  clear(): void {
    this.bookings.clear();
  }
}
