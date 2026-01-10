import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import prisma from '../db';

const router = Router();
const JWT_SECRET = (process.env.JWT_SECRET || 'secret') as string;

// Helper to get user from token
const getUserFromToken = (authHeader: string | undefined): string | null => {
    if (!authHeader) return null;
    try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        return decoded.userId;
    } catch {
        return null;
    }
};

// ============================================
// CREATE BOOKING
// ============================================

const createBookingSchema = z.object({
    tourId: z.string(),
    scheduleId: z.string(),
    bookingDate: z.string(), // ISO date string
    partySize: z.number().int().positive().max(15),
    notes: z.string().optional(),
});

router.post('/', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const data = createBookingSchema.parse(req.body);

        // Check tour exists and get max group size
        const tour = await prisma.tour.findUnique({
            where: { id: data.tourId },
            select: { maxGroupSize: true, title: true },
        });

        if (!tour) {
            return res.status(404).json({ error: 'Tour not found' });
        }

        // Check existing bookings for that date/schedule
        const existingBookings = await prisma.booking.aggregate({
            where: {
                tourId: data.tourId,
                scheduleId: data.scheduleId,
                bookingDate: new Date(data.bookingDate),
                status: { in: ['PENDING', 'CONFIRMED'] },
            },
            _sum: {
                partySize: true,
            },
        });

        const currentPartyCount = existingBookings._sum.partySize || 0;
        if (currentPartyCount + data.partySize > tour.maxGroupSize) {
            return res.status(400).json({
                error: 'Not enough spots available',
                availableSpots: tour.maxGroupSize - currentPartyCount,
            });
        }

        const booking = await prisma.booking.create({
            data: {
                tourId: data.tourId,
                scheduleId: data.scheduleId,
                userId,
                bookingDate: new Date(data.bookingDate),
                partySize: data.partySize,
                notes: data.notes,
                status: 'CONFIRMED',
            },
            include: {
                tour: {
                    select: {
                        title: true,
                        meetingPoint: true,
                        duration: true,
                    },
                },
                schedule: {
                    select: {
                        startTime: true,
                    },
                },
            },
        });

        res.status(201).json({
            message: 'Booking confirmed!',
            booking,
        });
    } catch (error) {
        console.error('Booking creation failed:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// ============================================
// GET MY BOOKINGS
// ============================================

router.get('/', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const status = req.query.status as string;
        const where: any = { userId };

        if (status === 'upcoming') {
            where.bookingDate = { gte: new Date() };
            where.status = { in: ['PENDING', 'CONFIRMED'] };
        } else if (status === 'past') {
            where.OR = [
                { bookingDate: { lt: new Date() } },
                { status: 'COMPLETED' },
            ];
        } else if (status === 'cancelled') {
            where.status = 'CANCELLED';
        }

        const bookings = await prisma.booking.findMany({
            where,
            include: {
                tour: {
                    include: {
                        guide: {
                            include: {
                                user: {
                                    select: {
                                        name: true,
                                        avatar: true,
                                    },
                                },
                            },
                        },
                    },
                },
                schedule: true,
            },
            orderBy: { bookingDate: 'desc' },
        });

        const formattedBookings = bookings.map((booking) => ({
            ...booking,
            tour: {
                ...booking.tour,
                photos: JSON.parse(booking.tour.photos),
                guide: {
                    ...booking.tour.guide,
                    languages: JSON.parse(booking.tour.guide.languages),
                },
            },
        }));

        res.json(formattedBookings);
    } catch (error) {
        console.error('Bookings fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// ============================================
// CANCEL BOOKING
// ============================================

router.delete('/:id', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: req.params.id },
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.userId !== userId) {
            return res.status(403).json({ error: 'Not authorized to cancel this booking' });
        }

        if (booking.status === 'CANCELLED') {
            return res.status(400).json({ error: 'Booking already cancelled' });
        }

        // Check if less than 24 hours before tour
        const hoursUntilTour = (booking.bookingDate.getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntilTour < 24) {
            return res.status(400).json({
                error: 'Cannot cancel less than 24 hours before the tour',
            });
        }

        await prisma.booking.update({
            where: { id: req.params.id },
            data: { status: 'CANCELLED' },
        });

        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        console.error('Booking cancellation failed:', error);
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
});

// ============================================
// ADD TIP TO BOOKING
// ============================================

const tipSchema = z.object({
    amount: z.number().positive(),
    currency: z.enum(['NPR', 'USD', 'EUR']),
});

router.put('/:id/tip', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const data = tipSchema.parse(req.body);

        const booking = await prisma.booking.findUnique({
            where: { id: req.params.id },
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.userId !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const updated = await prisma.booking.update({
            where: { id: req.params.id },
            data: {
                tipAmount: data.amount,
                tipCurrency: data.currency,
                status: 'COMPLETED',
            },
        });

        res.json({ message: 'Tip recorded. Thank you!', booking: updated });
    } catch (error) {
        console.error('Tip recording failed:', error);
        res.status(500).json({ error: 'Failed to record tip' });
    }
});

export default router;
