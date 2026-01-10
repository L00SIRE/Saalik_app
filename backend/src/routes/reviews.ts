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
// CREATE REVIEW
// ============================================

const createReviewSchema = z.object({
    tourId: z.string(),
    rating: z.number().int().min(1).max(5),
    title: z.string().max(100).optional(),
    comment: z.string().min(10).max(1000),
});

router.post('/', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const data = createReviewSchema.parse(req.body);

        // Check if user has a completed booking for this tour
        const booking = await prisma.booking.findFirst({
            where: {
                userId,
                tourId: data.tourId,
                status: { in: ['COMPLETED', 'CONFIRMED'] },
                bookingDate: { lt: new Date() }, // Past date
            },
        });

        // For demo purposes, allow reviews without booking
        // In production, uncomment this check:
        // if (!booking) {
        //   return res.status(400).json({ 
        //     error: 'You can only review tours you have completed' 
        //   });
        // }

        // Check if already reviewed
        const existingReview = await prisma.review.findFirst({
            where: {
                userId,
                tourId: data.tourId,
            },
        });

        if (existingReview) {
            return res.status(400).json({ error: 'You have already reviewed this tour' });
        }

        const review = await prisma.review.create({
            data: {
                tourId: data.tourId,
                userId,
                rating: data.rating,
                title: data.title,
                comment: data.comment,
            },
            include: {
                user: {
                    select: {
                        name: true,
                        avatar: true,
                    },
                },
            },
        });

        // Update tour rating
        const tourReviews = await prisma.review.findMany({
            where: { tourId: data.tourId },
            select: { rating: true },
        });

        const avgRating = tourReviews.reduce((sum, r) => sum + r.rating, 0) / tourReviews.length;

        await prisma.tour.update({
            where: { id: data.tourId },
            data: {
                rating: Math.round(avgRating * 10) / 10,
                totalReviews: tourReviews.length,
            },
        });

        // Also update guide rating
        const tour = await prisma.tour.findUnique({
            where: { id: data.tourId },
            select: { guideId: true },
        });

        if (tour) {
            const guideReviews = await prisma.review.findMany({
                where: {
                    tour: { guideId: tour.guideId },
                },
                select: { rating: true },
            });

            const guideAvgRating = guideReviews.reduce((sum, r) => sum + r.rating, 0) / guideReviews.length;

            await prisma.guide.update({
                where: { id: tour.guideId },
                data: {
                    rating: Math.round(guideAvgRating * 10) / 10,
                    totalReviews: guideReviews.length,
                },
            });
        }

        res.status(201).json({
            message: 'Review submitted. Thank you for your feedback!',
            review,
        });
    } catch (error) {
        console.error('Review creation failed:', error);
        res.status(500).json({ error: 'Failed to create review' });
    }
});

// ============================================
// GET REVIEWS FOR A TOUR
// ============================================

router.get('/tour/:tourId', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const reviews = await prisma.review.findMany({
            where: { tourId: req.params.tourId },
            include: {
                user: {
                    select: {
                        name: true,
                        avatar: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });

        const total = await prisma.review.count({
            where: { tourId: req.params.tourId },
        });

        res.json({
            reviews,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Reviews fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// ============================================
// GET MY REVIEWS
// ============================================

router.get('/my', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const reviews = await prisma.review.findMany({
            where: { userId },
            include: {
                tour: {
                    select: {
                        id: true,
                        title: true,
                        photos: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const formattedReviews = reviews.map((review) => ({
            ...review,
            tour: {
                ...review.tour,
                photos: JSON.parse(review.tour.photos),
            },
        }));

        res.json(formattedReviews);
    } catch (error) {
        console.error('My reviews fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch your reviews' });
    }
});

export default router;
