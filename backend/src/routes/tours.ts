import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';

const router = Router();

// ============================================
// SEARCH & FILTER TOURS
// ============================================

const searchSchema = z.object({
    hub: z.string().optional(),
    category: z.string().optional(),
    date: z.string().optional(), // ISO date string
    language: z.string().optional(),
    minRating: z.number().optional(),
    maxDuration: z.number().optional(),
    page: z.number().optional().default(1),
    limit: z.number().optional().default(20),
});

router.get('/', async (req, res) => {
    try {
        const query = searchSchema.parse({
            hub: req.query.hub as string,
            category: req.query.category as string,
            date: req.query.date as string,
            language: req.query.language as string,
            minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
            maxDuration: req.query.maxDuration ? parseInt(req.query.maxDuration as string) : undefined,
            page: req.query.page ? parseInt(req.query.page as string) : 1,
            limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        });

        const where: any = { isActive: true };

        if (query.hub) {
            where.hub = { contains: query.hub };
        }
        if (query.category) {
            where.category = query.category.toUpperCase();
        }
        if (query.minRating) {
            where.rating = { gte: query.minRating };
        }
        if (query.maxDuration) {
            where.duration = { lte: query.maxDuration };
        }

        const tours = await prisma.tour.findMany({
            where,
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
                schedules: {
                    where: { isActive: true },
                },
                _count: {
                    select: { reviews: true },
                },
            },
            orderBy: { rating: 'desc' },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        });

        // Parse JSON fields for response
        const formattedTours = tours.map((tour) => ({
            ...tour,
            highlights: JSON.parse(tour.highlights),
            included: JSON.parse(tour.included),
            notIncluded: JSON.parse(tour.notIncluded),
            photos: JSON.parse(tour.photos),
            guide: {
                ...tour.guide,
                languages: JSON.parse(tour.guide.languages),
                specialties: JSON.parse(tour.guide.specialties),
                certifications: tour.guide.certifications ? JSON.parse(tour.guide.certifications) : [],
            },
        }));

        res.json(formattedTours);
    } catch (error) {
        console.error('Tour search failed:', error);
        res.status(500).json({ error: 'Failed to search tours' });
    }
});

// ============================================
// GET FEATURED TOURS
// ============================================

router.get('/featured', async (_req, res) => {
    try {
        const tours = await prisma.tour.findMany({
            where: {
                isActive: true,
                rating: { gte: 4.5 },
            },
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
            orderBy: { totalReviews: 'desc' },
            take: 6,
        });

        const formattedTours = tours.map((tour) => ({
            ...tour,
            highlights: JSON.parse(tour.highlights),
            included: JSON.parse(tour.included),
            notIncluded: JSON.parse(tour.notIncluded),
            photos: JSON.parse(tour.photos),
            guide: {
                ...tour.guide,
                languages: JSON.parse(tour.guide.languages),
                specialties: JSON.parse(tour.guide.specialties),
            },
        }));

        res.json(formattedTours);
    } catch (error) {
        console.error('Featured tours fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch featured tours' });
    }
});

// ============================================
// GET TOUR BY ID
// ============================================

router.get('/:id', async (req, res) => {
    try {
        const tour = await prisma.tour.findUnique({
            where: { id: req.params.id },
            include: {
                guide: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true,
                            },
                        },
                    },
                },
                schedules: {
                    where: { isActive: true },
                },
                reviews: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                avatar: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!tour) {
            return res.status(404).json({ error: 'Tour not found' });
        }

        const formattedTour = {
            ...tour,
            highlights: JSON.parse(tour.highlights),
            included: JSON.parse(tour.included),
            notIncluded: JSON.parse(tour.notIncluded),
            photos: JSON.parse(tour.photos),
            guide: {
                ...tour.guide,
                languages: JSON.parse(tour.guide.languages),
                specialties: JSON.parse(tour.guide.specialties),
                certifications: tour.guide.certifications ? JSON.parse(tour.guide.certifications) : [],
            },
        };

        res.json(formattedTour);
    } catch (error) {
        console.error('Tour fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch tour' });
    }
});

// ============================================
// GET HUBS (CITIES)
// ============================================

router.get('/meta/hubs', async (_req, res) => {
    try {
        const hubs = await prisma.tour.findMany({
            where: { isActive: true },
            select: { hub: true },
            distinct: ['hub'],
        });

        const hubList = hubs.map((h) => h.hub);
        res.json(hubList);
    } catch (error) {
        console.error('Hubs fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch hubs' });
    }
});

// ============================================
// GET CATEGORIES
// ============================================

router.get('/meta/categories', async (_req, res) => {
    const categories = [
        { key: 'HISTORICAL', label: 'Historical', icon: 'landmark' },
        { key: 'CULTURAL', label: 'Cultural', icon: 'palette' },
        { key: 'FOOD', label: 'Food & Drink', icon: 'utensils' },
        { key: 'RELIGIOUS', label: 'Religious', icon: 'temple' },
        { key: 'ADVENTURE', label: 'Adventure', icon: 'hiking' },
        { key: 'PHOTOGRAPHY', label: 'Photography', icon: 'camera' },
        { key: 'NATURE', label: 'Nature', icon: 'leaf' },
        { key: 'NIGHTLIFE', label: 'Nightlife', icon: 'moon' },
    ];
    res.json(categories);
});

export default router;
