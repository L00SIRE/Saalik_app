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
// GET GUIDE PUBLIC PROFILE
// ============================================

router.get('/:id', async (req, res) => {
    try {
        const guide = await prisma.guide.findUnique({
            where: { id: req.params.id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    },
                },
                tours: {
                    where: { isActive: true },
                    include: {
                        _count: {
                            select: { reviews: true },
                        },
                    },
                },
            },
        });

        if (!guide) {
            return res.status(404).json({ error: 'Guide not found' });
        }

        const formattedGuide = {
            ...guide,
            languages: JSON.parse(guide.languages),
            specialties: JSON.parse(guide.specialties),
            certifications: guide.certifications ? JSON.parse(guide.certifications) : [],
            tours: guide.tours.map((tour) => ({
                ...tour,
                photos: JSON.parse(tour.photos),
                highlights: JSON.parse(tour.highlights),
            })),
        };

        res.json(formattedGuide);
    } catch (error) {
        console.error('Guide fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch guide profile' });
    }
});

// ============================================
// GET GUIDE BY USER ID
// ============================================

router.get('/user/:userId', async (req, res) => {
    try {
        const guide = await prisma.guide.findUnique({
            where: { userId: req.params.userId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    },
                },
                tours: {
                    where: { isActive: true },
                },
            },
        });

        if (!guide) {
            return res.status(404).json({ error: 'Guide profile not found' });
        }

        const formattedGuide = {
            ...guide,
            languages: JSON.parse(guide.languages),
            specialties: JSON.parse(guide.specialties),
            certifications: guide.certifications ? JSON.parse(guide.certifications) : [],
            tours: guide.tours.map((tour) => ({
                ...tour,
                photos: JSON.parse(tour.photos),
            })),
        };

        res.json(formattedGuide);
    } catch (error) {
        console.error('Guide fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch guide profile' });
    }
});

// ============================================
// APPLY TO BECOME A GUIDE
// ============================================

const applySchema = z.object({
    bio: z.string().min(50).max(1000),
    languages: z.array(z.string()).min(1),
    specialties: z.array(z.string()).min(1),
    yearsExperience: z.number().int().positive(),
    certifications: z.array(z.string()).optional(),
});

router.post('/apply', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Check if already a guide
        const existingGuide = await prisma.guide.findUnique({
            where: { userId },
        });

        if (existingGuide) {
            return res.status(400).json({ error: 'You are already registered as a guide' });
        }

        const data = applySchema.parse(req.body);

        const guide = await prisma.guide.create({
            data: {
                userId,
                bio: data.bio,
                languages: JSON.stringify(data.languages),
                specialties: JSON.stringify(data.specialties),
                yearsExperience: data.yearsExperience,
                certifications: data.certifications ? JSON.stringify(data.certifications) : null,
                isVerified: false, // Pending verification
            },
        });

        // Update user role
        await prisma.user.update({
            where: { id: userId },
            data: { role: 'GUIDE' },
        });

        res.status(201).json({
            message: 'Application submitted! Our team will review and verify your profile.',
            guide,
        });
    } catch (error) {
        console.error('Guide application failed:', error);
        res.status(500).json({ error: 'Failed to submit application' });
    }
});

// ============================================
// UPDATE OWN GUIDE PROFILE
// ============================================

const updateSchema = z.object({
    bio: z.string().min(50).max(1000).optional(),
    languages: z.array(z.string()).optional(),
    specialties: z.array(z.string()).optional(),
    yearsExperience: z.number().int().positive().optional(),
});

router.put('/profile', async (req, res) => {
    const userId = getUserFromToken(req.headers.authorization);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const guide = await prisma.guide.findUnique({
            where: { userId },
        });

        if (!guide) {
            return res.status(404).json({ error: 'Guide profile not found' });
        }

        const data = updateSchema.parse(req.body);

        const updateData: any = {};
        if (data.bio) updateData.bio = data.bio;
        if (data.languages) updateData.languages = JSON.stringify(data.languages);
        if (data.specialties) updateData.specialties = JSON.stringify(data.specialties);
        if (data.yearsExperience) updateData.yearsExperience = data.yearsExperience;

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
        console.error('Profile update failed:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ============================================
// GET ALL VERIFIED GUIDES (for browsing)
// ============================================

router.get('/', async (req, res) => {
    try {
        const guides = await prisma.guide.findMany({
            where: { isVerified: true },
            include: {
                user: {
                    select: {
                        name: true,
                        avatar: true,
                    },
                },
                _count: {
                    select: { tours: true },
                },
            },
            orderBy: { rating: 'desc' },
        });

        const formattedGuides = guides.map((guide) => ({
            ...guide,
            languages: JSON.parse(guide.languages),
            specialties: JSON.parse(guide.specialties),
        }));

        res.json(formattedGuides);
    } catch (error) {
        console.error('Guides fetch failed:', error);
        res.status(500).json({ error: 'Failed to fetch guides' });
    }
});

export default router;
