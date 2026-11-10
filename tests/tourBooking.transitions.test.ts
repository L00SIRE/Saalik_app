import {
  TourBookingService,
  assertTransition,
  canTransition,
} from '../src/server/services/tourBooking.service';

describe('guide booking state transitions', () => {
  let service: TourBookingService;

  beforeEach(() => {
    service = new TourBookingService();
  });

  test('canTransition encodes the legal state machine', () => {
    expect(canTransition('PENDING', 'CONFIRMED')).toBe(true);
    expect(canTransition('PENDING', 'CANCELLED')).toBe(true);
    expect(canTransition('PENDING', 'COMPLETED')).toBe(false);
    expect(canTransition('CONFIRMED', 'COMPLETED')).toBe(true);
    expect(canTransition('CONFIRMED', 'NO_SHOW')).toBe(true);
    expect(canTransition('CONFIRMED', 'CANCELLED')).toBe(true);
    expect(canTransition('CONFIRMED', 'PENDING')).toBe(false);
    expect(canTransition('COMPLETED', 'CANCELLED')).toBe(false);
    expect(canTransition('CANCELLED', 'CONFIRMED')).toBe(false);
    expect(canTransition('NO_SHOW', 'COMPLETED')).toBe(false);
  });

  test('assertTransition throws on illegal moves', () => {
    expect(() => assertTransition('COMPLETED', 'PENDING')).toThrow(/Illegal booking transition/);
  });

  test('create without autoAccept starts PENDING', () => {
    const booking = service.create({
      walkingTourId: 'tour_ktm_durbar_royal_loop',
      userId: 'user_traveler_1',
      bookingDate: '2026-11-12T09:00:00.000Z',
      partySize: 2,
    });
    expect(booking.status).toBe('PENDING');
    expect(booking.statusHistory[0]!.to).toBe('PENDING');
  });

  test('create with autoAccept starts CONFIRMED', () => {
    const booking = service.create({
      walkingTourId: 'tour_ktm_durbar_royal_loop',
      userId: 'user_traveler_2',
      bookingDate: '2026-11-12T09:00:00.000Z',
      autoAccept: true,
    });
    expect(booking.status).toBe('CONFIRMED');
    expect(booking.statusHistory[0]!.reason).toBe('guide_auto_accept');
  });

  test('PENDING → CONFIRMED → COMPLETED with tip', () => {
    const booking = service.create({
      walkingTourId: 'tour_patan_golden',
      userId: 'user_traveler_3',
      bookingDate: '2026-11-13T10:00:00.000Z',
    });

    const confirmed = service.confirm(booking.id, 'guide_42');
    expect(confirmed.status).toBe('CONFIRMED');
    expect(confirmed.statusHistory).toHaveLength(2);

    const completed = service.complete(booking.id, { amount: 500, currency: 'NPR' }, 'guide_42');
    expect(completed.status).toBe('COMPLETED');
    expect(completed.tipAmount).toBe(500);
    expect(completed.tipCurrency).toBe('NPR');
    expect(completed.statusHistory.map((h) => h.to)).toEqual(['PENDING', 'CONFIRMED', 'COMPLETED']);
  });

  test('PENDING → CANCELLED is allowed; further transitions are rejected', () => {
    const booking = service.create({
      walkingTourId: 'tour_bhaktapur_loop',
      userId: 'user_traveler_4',
      bookingDate: '2026-11-14T08:00:00.000Z',
    });
    const cancelled = service.cancel(booking.id, 'user_traveler_4', 'changed_plans');
    expect(cancelled.status).toBe('CANCELLED');
    expect(() => service.confirm(booking.id)).toThrow(/Illegal booking transition/);
  });

  test('CONFIRMED → NO_SHOW records guest_no_show', () => {
    const booking = service.create({
      walkingTourId: 'tour_swayambhu_circuit',
      userId: 'user_traveler_5',
      bookingDate: '2026-11-15T07:30:00.000Z',
      autoAccept: true,
    });
    const noShow = service.markNoShow(booking.id, 'guide_7');
    expect(noShow.status).toBe('NO_SHOW');
    expect(noShow.statusHistory.at(-1)!.reason).toBe('guest_no_show');
  });

  test('CONFIRMED → CANCELLED by guide', () => {
    const booking = service.create({
      walkingTourId: 'tour_boudha_kora',
      userId: 'user_traveler_6',
      bookingDate: '2026-11-16T11:00:00.000Z',
      autoAccept: true,
    });
    const cancelled = service.cancel(booking.id, 'guide_9', 'weather_advisory');
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.statusHistory.at(-1)!.actorId).toBe('guide_9');
  });

  test('listByUser and listByTour filter correctly', () => {
    service.create({
      walkingTourId: 'tour_a',
      userId: 'u1',
      bookingDate: '2026-11-20T09:00:00.000Z',
    });
    service.create({
      walkingTourId: 'tour_a',
      userId: 'u2',
      bookingDate: '2026-11-20T10:00:00.000Z',
    });
    service.create({
      walkingTourId: 'tour_b',
      userId: 'u1',
      bookingDate: '2026-11-21T09:00:00.000Z',
    });
    expect(service.listByUser('u1')).toHaveLength(2);
    expect(service.listByTour('tour_a')).toHaveLength(2);
  });
});
