import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { userIdFromHeader } from '../middleware/requireAuth';

const router = Router();

const getUserFromToken = (authHeader: string | undefined): string | null => userIdFromHeader(authHeader);

// ============================================
// GUIDE APPLICATION FLOW
// ============================================

const applicationSchema = z.object({
    phone: z.string().min(10),
    languages: z.array(z.string()).min(1),
    yearsExperience: z.number().int().min(0),
    specialties: z.array(z.string()).min(1),
    certifications: z.array(z.string()).optional(),
    motivation: z.string().min(50).max(1000),
    uniqueValue: z.string().min(20).max(500),
});

// POST /api/guides/apply - Submit guide application
router.post('/apply', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Check existing application
        const existingApp = await prisma.guideApplication.findUnique({
            where: { userId },
        });
        if (existingApp) {
            return res.status(400).json({
                error: 'You already have an application',
                status: existingApp.status
            });
        }

        // Check if already a guide
        const existingGuide = await prisma.guide.findUnique({
            where: { userId },
        });
        if (existingGuide) {
            return res.status(400).json({ error: 'You are already a guide' });
        }

        const data = applicationSchema.parse(req.body);

        const application = await prisma.guideApplication.create({
            data: {
                userId,
                phone: data.phone,
                languages: JSON.stringify(data.languages),
                yearsExperience: data.yearsExperience,
                specialties: JSON.stringify(data.specialties),
                certifications: data.certifications ? JSON.stringify(data.certifications) : null,
                motivation: data.motivation,
                uniqueValue: data.uniqueValue,
                status: 'PENDING',
            },
        });

        // Update user role to PENDING_GUIDE
        await prisma.user.update({
            where: { id: userId },
            data: { role: 'PENDING_GUIDE' },
        });

        res.status(201).json({
            message: 'Application submitted! We will review within 48 hours.',
            application: {
                ...application,
                languages: JSON.parse(application.languages),
                specialties: JSON.parse(application.specialties),
            },
        });
    } catch (error) {
        console.error('Application failed:', error);
        res.status(500).json({ error: 'Failed to submit application' });
    }
});

// GET /api/guides/application - Get my application status
router.get('/application', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const application = await prisma.guideApplication.findUnique({
            where: { userId },
        });

        if (!application) {
            return res.status(404).json({ error: 'No application found' });
        }

        res.json({
            ...application,
            languages: JSON.parse(application.languages),
            specialties: JSON.parse(application.specialties),
            certifications: application.certifications ? JSON.parse(application.certifications) : [],
        });
    } catch (error) {
        console.error('Application fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch application' });
    }
});

// PUT /api/guides/application - Update application (if pending)
router.put('/application', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const existing = await prisma.guideApplication.findUnique({
            where: { userId },
        });

        if (!existing) {
            return res.status(404).json({ error: 'No application found' });
        }

        if (existing.status !== 'PENDING') {
            return res.status(400).json({ error: 'Cannot update application after review started' });
        }

        const data = applicationSchema.partial().parse(req.body);
        const updateData: any = {};

        if (data.phone) updateData.phone = data.phone;
        if (data.languages) updateData.languages = JSON.stringify(data.languages);
        if (data.yearsExperience !== undefined) updateData.yearsExperience = data.yearsExperience;
        if (data.specialties) updateData.specialties = JSON.stringify(data.specialties);
        if (data.certifications) updateData.certifications = JSON.stringify(data.certifications);
        if (data.motivation) updateData.motivation = data.motivation;
        if (data.uniqueValue) updateData.uniqueValue = data.uniqueValue;

        const updated = await prisma.guideApplication.update({
            where: { userId },
            data: updateData,
        });

        res.json({
            message: 'Application updated',
            application: {
                ...updated,
                languages: JSON.parse(updated.languages),
                specialties: JSON.parse(updated.specialties),
            },
        });
    } catch (error) {
        console.error('Application update failed:', error);
        res.status(500).json({ error: 'Failed to update application' });
    }
});

// ============================================
// GUIDE PROFILE (for approved guides)
// ============================================

// GET /api/guides/me - Get my guide profile
router.get('/me', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const guide = await prisma.guide.findUnique({
            where: { userId },
            include: {
                user: {
                    select: { name: true, avatar: true, email: true },
                },
                availability: true,
                blackoutDates: {
                    where: { date: { gte: new Date() } },
                    orderBy: { date: 'asc' },
                },
                tours: {
                    where: { isActive: true },
                },
            },
        });

        if (!guide) {
            return res.status(404).json({ error: 'Guide profile not found' });
        }

        res.json({
            ...guide,
            languages: JSON.parse(guide.languages),
            specialties: JSON.parse(guide.specialties),
            certifications: guide.certifications ? JSON.parse(guide.certifications) : [],
            tours: guide.tours.map(t => ({
                ...t,
                highlights: JSON.parse(t.highlights),
                photos: JSON.parse(t.photos),
            })),
        });
    } catch (error) {
        console.error('Guide profile fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch guide profile' });
    }
});

// PUT /api/guides/me - Update my guide profile
router.put('/me', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const updateSchema = z.object({
        bio: z.string().min(50).max(1000).optional(),
        languages: z.array(z.string()).optional(),
        specialties: z.array(z.string()).optional(),
        autoAccept: z.boolean().optional(),
        maxDailyTours: z.number().int().min(1).max(10).optional(),
    });

    try {
        const guide = await prisma.guide.findUnique({ where: { userId } });
        if (!guide) {
            return res.status(404).json({ error: 'Guide profile not found' });
        }

        const data = updateSchema.parse(req.body);
        const updateData: any = {};

        if (data.bio) updateData.bio = data.bio;
        if (data.languages) updateData.languages = JSON.stringify(data.languages);
        if (data.specialties) updateData.specialties = JSON.stringify(data.specialties);
        if (data.autoAccept !== undefined) updateData.autoAccept = data.autoAccept;
        if (data.maxDailyTours) updateData.maxDailyTours = data.maxDailyTours;

        const updated = await prisma.guide.update({
            where: { userId },
            data: updateData,
        });

        res.json({
            message: 'Profile updated',
            guide: {
                ...updated,
                languages: JSON.parse(updated.languages),
                specialties: JSON.parse(updated.specialties),
            },
        });
    } catch (error) {
        console.error('Guide update failed:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ============================================
// GUIDE BOOKINGS
// ============================================

// GET /api/guides/me/bookings - Get my bookings
router.get('/me/bookings', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const guide = await prisma.guide.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!guide) {
            return res.status(404).json({ error: 'Guide profile not found' });
        }

        const { status, from, to } = req.query;

        const whereClause: any = {
            tour: { guideId: guide.id },
        };

        if (status) {
            whereClause.status = status;
        }

        if (from || to) {
            whereClause.bookingDate = {};
            if (from) whereClause.bookingDate.gte = new Date(from as string);
            if (to) whereClause.bookingDate.lte = new Date(to as string);
        }

        const bookings = await prisma.booking.findMany({
            where: whereClause,
            include: {
                tour: {
                    select: { id: true, title: true, meetingPoint: true, duration: true },
                },
                schedule: {
                    select: { startTime: true },
                },
                user: {
                    select: { id: true, name: true, email: true, phone: true },
                },
            },
            orderBy: { bookingDate: 'asc' },
        });

        res.json(bookings);
    } catch (error) {
        console.error('Bookings fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// PUT /api/guides/bookings/:id/accept - Accept a booking
router.put('/bookings/:id/accept', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const guide = await prisma.guide.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!guide) {
            return res.status(404).json({ error: 'Guide not found' });
        }

        const booking = await prisma.booking.findFirst({
            where: {
                id: req.params.id,
                tour: { guideId: guide.id },
                status: 'PENDING',
            },
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found or already processed' });
        }

        const updated = await prisma.booking.update({
            where: { id: req.params.id },
            data: { status: 'CONFIRMED' },
        });

        res.json({ message: 'Booking accepted', booking: updated });
    } catch (error) {
        console.error('Accept booking failed:', error);
        res.status(500).json({ error: 'Failed to accept booking' });
    }
});

// PUT /api/guides/bookings/:id/decline - Decline a booking
router.put('/bookings/:id/decline', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const guide = await prisma.guide.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!guide) {
            return res.status(404).json({ error: 'Guide not found' });
        }

        const booking = await prisma.booking.findFirst({
            where: {
                id: req.params.id,
                tour: { guideId: guide.id },
                status: 'PENDING',
            },
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found or already processed' });
        }

        const { reason } = req.body;

        const updated = await prisma.booking.update({
            where: { id: req.params.id },
            data: {
                status: 'CANCELLED',
                notes: reason ? `Declined by guide: ${reason}` : 'Declined by guide',
            },
        });

        res.json({ message: 'Booking declined', booking: updated });
    } catch (error) {
        console.error('Decline booking failed:', error);
        res.status(500).json({ error: 'Failed to decline booking' });
    }
});

// ============================================
// GUIDE AVAILABILITY
// ============================================

// GET /api/guides/me/availability - Get my availability
router.get('/me/availability', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const guide = await prisma.guide.findUnique({
            where: { userId },
            include: {
                availability: true,
                blackoutDates: {
                    where: { date: { gte: new Date() } },
                    orderBy: { date: 'asc' },
                },
            },
        });

        if (!guide) {
            return res.status(404).json({ error: 'Guide not found' });
        }

        res.json({
            availability: guide.availability || {
                monday: null,
                tuesday: null,
                wednesday: null,
                thursday: null,
                friday: null,
                saturday: null,
                sunday: null,
            },
            blackoutDates: guide.blackoutDates,
            settings: {
                autoAccept: guide.autoAccept,
                maxDailyTours: guide.maxDailyTours,
            },
        });
    } catch (error) {
        console.error('Availability fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
});

// PUT /api/guides/me/availability - Update weekly schedule
router.put('/me/availability', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const availabilitySchema = z.object({
        monday: z.string().nullable().optional(),
        tuesday: z.string().nullable().optional(),
        wednesday: z.string().nullable().optional(),
        thursday: z.string().nullable().optional(),
        friday: z.string().nullable().optional(),
        saturday: z.string().nullable().optional(),
        sunday: z.string().nullable().optional(),
    });

    try {
        const guide = await prisma.guide.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!guide) {
            return res.status(404).json({ error: 'Guide not found' });
        }

        const data = availabilitySchema.parse(req.body);

        const availability = await prisma.guideAvailability.upsert({
            where: { guideId: guide.id },
            update: data,
            create: {
                guideId: guide.id,
                ...data,
            },
        });

        res.json({ message: 'Availability updated', availability });
    } catch (error) {
        console.error('Availability update failed:', error);
        res.status(500).json({ error: 'Failed to update availability' });
    }
});

// POST /api/guides/me/blackout - Add blackout date
router.post('/me/blackout', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const blackoutSchema = z.object({
        date: z.string().transform(s => new Date(s)),
        reason: z.string().optional(),
    });

    try {
        const guide = await prisma.guide.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!guide) {
            return res.status(404).json({ error: 'Guide not found' });
        }

        const data = blackoutSchema.parse(req.body);

        const blackout = await prisma.blackoutDate.create({
            data: {
                guideId: guide.id,
                date: data.date,
                reason: data.reason,
            },
        });

        res.status(201).json({ message: 'Blackout date added', blackout });
    } catch (error) {
        console.error('Blackout add failed:', error);
        res.status(500).json({ error: 'Failed to add blackout date' });
    }
});

// DELETE /api/guides/me/blackout/:id - Remove blackout date
router.delete('/me/blackout/:id', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const guide = await prisma.guide.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!guide) {
            return res.status(404).json({ error: 'Guide not found' });
        }

        await prisma.blackoutDate.deleteMany({
            where: {
                id: req.params.id,
                guideId: guide.id,
            },
        });

        res.json({ message: 'Blackout date removed' });
    } catch (error) {
        console.error('Blackout remove failed:', error);
        res.status(500).json({ error: 'Failed to remove blackout date' });
    }
});

// ============================================
// GUIDE EARNINGS
// ============================================

// GET /api/guides/me/earnings - Get earnings summary
router.get('/me/earnings', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const guide = await prisma.guide.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!guide) {
            return res.status(404).json({ error: 'Guide not found' });
        }

        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get all completed bookings with tips
        const [allTime, thisMonth, thisWeek] = await Promise.all([
            prisma.booking.aggregate({
                where: {
                    tour: { guideId: guide.id },
                    status: 'COMPLETED',
                    tipAmount: { not: null },
                },
                _sum: { tipAmount: true },
                _count: true,
            }),
            prisma.booking.aggregate({
                where: {
                    tour: { guideId: guide.id },
                    status: 'COMPLETED',
                    tipAmount: { not: null },
                    bookingDate: { gte: monthStart },
                },
                _sum: { tipAmount: true },
                _count: true,
            }),
            prisma.booking.aggregate({
                where: {
                    tour: { guideId: guide.id },
                    status: 'COMPLETED',
                    tipAmount: { not: null },
                    bookingDate: { gte: weekStart },
                },
                _sum: { tipAmount: true },
                _count: true,
            }),
        ]);

        res.json({
            allTime: {
                total: allTime._sum.tipAmount || 0,
                tours: allTime._count,
            },
            thisMonth: {
                total: thisMonth._sum.tipAmount || 0,
                tours: thisMonth._count,
            },
            thisWeek: {
                total: thisWeek._sum.tipAmount || 0,
                tours: thisWeek._count,
            },
        });
    } catch (error) {
        console.error('Earnings fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch earnings' });
    }
});

// ============================================
// GUIDE TOUR MANAGEMENT
// ============================================

const tourCreateSchema = z.object({
    title: z.string().min(10).max(100),
    description: z.string().min(50).max(1000),
    category: z.enum(['HISTORICAL', 'CULTURAL', 'FOOD', 'RELIGIOUS', 'ADVENTURE', 'PHOTOGRAPHY', 'NATURE', 'NIGHTLIFE']),
    duration: z.number().int().min(30).max(480),
    hub: z.string().min(1),
    meetingPoint: z.string().min(10).max(500),
    meetingLat: z.number().optional(),
    meetingLng: z.number().optional(),
    maxGroupSize: z.number().int().min(1).max(20).default(10),
    highlights: z.array(z.string().min(1)).min(2).max(10),
    included: z.array(z.string()).optional(),
    notIncluded: z.array(z.string()).optional(),
    photos: z.array(z.string().url()).optional(),
    submitForReview: z.boolean().optional(),
});

// GET /api/guides/me/tours - List my tours
router.get('/me/tours', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const guide = await prisma.guide.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!guide) {
            return res.status(404).json({ error: 'Guide profile not found' });
        }

        const { status } = req.query;

        const whereClause: any = { guideId: guide.id };
        if (status && typeof status === 'string') {
            whereClause.status = status;
        }

        const tours = await prisma.tour.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { bookings: true, reviews: true },
                },
            },
        });

        res.json(tours.map(t => ({
            ...t,
            highlights: JSON.parse(t.highlights),
            included: JSON.parse(t.included),
            notIncluded: JSON.parse(t.notIncluded),
            photos: JSON.parse(t.photos),
        })));
    } catch (error) {
        console.error('Tours fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch tours' });
    }
});

// POST /api/guides/me/tours - Create a new tour
router.post('/me/tours', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const guide = await prisma.guide.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!guide) {
            return res.status(404).json({ error: 'Guide profile not found. Please complete your guide registration first.' });
        }

        const data = tourCreateSchema.parse(req.body);

        const tour = await prisma.tour.create({
            data: {
                guideId: guide.id,
                title: data.title,
                description: data.description,
                category: data.category,
                duration: data.duration,
                hub: data.hub,
                meetingPoint: data.meetingPoint,
                meetingLat: data.meetingLat,
                meetingLng: data.meetingLng,
                maxGroupSize: data.maxGroupSize,
                highlights: JSON.stringify(data.highlights),
                included: JSON.stringify(data.included || []),
                notIncluded: JSON.stringify(data.notIncluded || []),
                photos: JSON.stringify(data.photos || []),
                status: data.submitForReview ? 'PENDING_APPROVAL' : 'DRAFT',
                isActive: false, // Tours start inactive until approved
            },
        });

        res.status(201).json({
            message: data.submitForReview
                ? 'Tour submitted for review! We\'ll notify you once it\'s approved.'
                : 'Tour saved as draft.',
            tour: {
                ...tour,
                highlights: JSON.parse(tour.highlights),
                included: JSON.parse(tour.included),
                notIncluded: JSON.parse(tour.notIncluded),
                photos: JSON.parse(tour.photos),
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        console.error('Tour creation failed:', error);
        res.status(500).json({ error: 'Failed to create tour' });
    }
});

// PUT /api/guides/me/tours/:id - Update a tour
router.put('/me/tours/:id', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const guide = await prisma.guide.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!guide) {
            return res.status(404).json({ error: 'Guide profile not found' });
        }

        // Verify tour belongs to this guide
        const existingTour = await prisma.tour.findFirst({
            where: {
                id: req.params.id,
                guideId: guide.id,
            },
        });

        if (!existingTour) {
            return res.status(404).json({ error: 'Tour not found' });
        }

        const updateSchema = tourCreateSchema.partial().extend({
            submitForReview: z.boolean().optional(),
            isActive: z.boolean().optional(),
        });

        const data = updateSchema.parse(req.body);

        const updateData: any = {};

        if (data.title) updateData.title = data.title;
        if (data.description) updateData.description = data.description;
        if (data.category) updateData.category = data.category;
        if (data.duration) updateData.duration = data.duration;
        if (data.hub) updateData.hub = data.hub;
        if (data.meetingPoint) updateData.meetingPoint = data.meetingPoint;
        if (data.meetingLat !== undefined) updateData.meetingLat = data.meetingLat;
        if (data.meetingLng !== undefined) updateData.meetingLng = data.meetingLng;
        if (data.maxGroupSize) updateData.maxGroupSize = data.maxGroupSize;
        if (data.highlights) updateData.highlights = JSON.stringify(data.highlights);
        if (data.included) updateData.included = JSON.stringify(data.included);
        if (data.notIncluded) updateData.notIncluded = JSON.stringify(data.notIncluded);
        if (data.photos) updateData.photos = JSON.stringify(data.photos);
        if (data.isActive !== undefined) updateData.isActive = data.isActive;

        // Handle status changes
        if (data.submitForReview && existingTour.status === 'DRAFT') {
            updateData.status = 'PENDING_APPROVAL';
        }
        if (data.submitForReview && existingTour.status === 'REJECTED') {
            updateData.status = 'PENDING_APPROVAL';
            updateData.rejectionReason = null;
        }

        const updated = await prisma.tour.update({
            where: { id: req.params.id },
            data: updateData,
        });

        res.json({
            message: data.submitForReview ? 'Tour resubmitted for review' : 'Tour updated',
            tour: {
                ...updated,
                highlights: JSON.parse(updated.highlights),
                included: JSON.parse(updated.included),
                notIncluded: JSON.parse(updated.notIncluded),
                photos: JSON.parse(updated.photos),
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        console.error('Tour update failed:', error);
        res.status(500).json({ error: 'Failed to update tour' });
    }
});

// DELETE /api/guides/me/tours/:id - Delete a tour (only drafts)
router.delete('/me/tours/:id', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const guide = await prisma.guide.findUnique({
            where: { userId },
            select: { id: true },
        });

        if (!guide) {
            return res.status(404).json({ error: 'Guide profile not found' });
        }

        const tour = await prisma.tour.findFirst({
            where: {
                id: req.params.id,
                guideId: guide.id,
            },
        });

        if (!tour) {
            return res.status(404).json({ error: 'Tour not found' });
        }

        if (tour.status !== 'DRAFT') {
            return res.status(400).json({ error: 'Only draft tours can be deleted. Please contact support to remove approved tours.' });
        }

        await prisma.tour.delete({
            where: { id: req.params.id },
        });

        res.json({ message: 'Tour deleted' });
    } catch (error) {
        console.error('Tour deletion failed:', error);
        res.status(500).json({ error: 'Failed to delete tour' });
    }
});

// ============================================
// PUBLIC GUIDE PROFILES
// ============================================

// GET /api/guides/:id - Get public guide profile
router.get('/:id', async (req, res) => {
    try {
        const guide = await prisma.guide.findUnique({
            where: { id: req.params.id },
            include: {
                user: {
                    select: { name: true, avatar: true },
                },
                tours: {
                    where: { isActive: true },
                },
            },
        });

        if (!guide) {
            return res.status(404).json({ error: 'Guide not found' });
        }

        res.json({
            ...guide,
            languages: JSON.parse(guide.languages),
            specialties: JSON.parse(guide.specialties),
            certifications: guide.certifications ? JSON.parse(guide.certifications) : [],
            tours: guide.tours.map(t => ({
                ...t,
                highlights: JSON.parse(t.highlights),
                photos: JSON.parse(t.photos),
            })),
        });
    } catch (error) {
        console.error('Guide fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch guide' });
    }
});

// GET /api/guides - Get all verified guides
router.get('/', async (req, res) => {
    try {
        const guides = await prisma.guide.findMany({
            where: { isVerified: true },
            include: {
                user: {
                    select: { name: true, avatar: true },
                },
                _count: { select: { tours: true } },
            },
            orderBy: { rating: 'desc' },
        });

        res.json(guides.map(g => ({
            ...g,
            languages: JSON.parse(g.languages),
            specialties: JSON.parse(g.specialties),
        })));
    } catch (error) {
        console.error('Guides fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch guides' });
    }
});

export default router;
