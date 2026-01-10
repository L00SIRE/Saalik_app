import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================
// DEMO DATA FOR NEPAL TOUR PLATFORM
// ============================================

async function main() {
    console.log('🌄 Seeding Nepal Tour Platform demo data...');

    // Clear existing data
    await prisma.review.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.tourSchedule.deleteMany();
    await prisma.tour.deleteMany();
    await prisma.guide.deleteMany();
    await prisma.user.deleteMany();

    // ============================================
    // CREATE USERS (GUIDES + TRAVELERS)
    // ============================================

    const passwordHash = await bcrypt.hash('demo123', 10);

    // Guide Users
    const guideUsers = await Promise.all([
        prisma.user.create({
            data: {
                email: 'raj.sharma@saalik.com',
                passwordHash,
                name: 'Raj Sharma',
                phone: '+977-9841234567',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
                role: 'GUIDE',
            },
        }),
        prisma.user.create({
            data: {
                email: 'anita.tamang@saalik.com',
                passwordHash,
                name: 'Anita Tamang',
                phone: '+977-9851234567',
                avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
                role: 'GUIDE',
            },
        }),
        prisma.user.create({
            data: {
                email: 'tenzin.lama@saalik.com',
                passwordHash,
                name: 'Tenzin Lama',
                phone: '+977-9861234567',
                avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
                role: 'GUIDE',
            },
        }),
        prisma.user.create({
            data: {
                email: 'maya.gurung@saalik.com',
                passwordHash,
                name: 'Maya Gurung',
                phone: '+977-9871234567',
                avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
                role: 'GUIDE',
            },
        }),
        prisma.user.create({
            data: {
                email: 'krishna.shrestha@saalik.com',
                passwordHash,
                name: 'Krishna Shrestha',
                phone: '+977-9881234567',
                avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
                role: 'GUIDE',
            },
        }),
    ]);

    // Demo Traveler
    const traveler = await prisma.user.create({
        data: {
            email: 'demo@saalik.com',
            passwordHash,
            name: 'Demo Traveler',
            role: 'TRAVELER',
        },
    });

    // ============================================
    // CREATE GUIDE PROFILES
    // ============================================

    const guides = await Promise.all([
        prisma.guide.create({
            data: {
                userId: guideUsers[0].id,
                bio: 'Born and raised in the shadow of ancient temples, I have spent 15 years sharing the secrets of Kathmandu with travelers from around the world. My family has lived in the Durbar Square area for five generations.',
                languages: JSON.stringify(['English', 'Nepali', 'Hindi', 'Japanese']),
                certifications: JSON.stringify(['Nepal Tourism Board Certified', 'Heritage Walk Specialist']),
                specialties: JSON.stringify(['Historical', 'Architecture', 'Religious']),
                yearsExperience: 15,
                isVerified: true,
                rating: 4.9,
                totalTours: 342,
                totalReviews: 287,
            },
        }),
        prisma.guide.create({
            data: {
                userId: guideUsers[1].id,
                bio: 'Food is my language of love! As a third-generation street food vendor turned tour guide, I know every hidden momo stall, every secret chutney recipe, and the stories behind Kathmandu\'s vibrant food scene.',
                languages: JSON.stringify(['English', 'Nepali', 'Mandarin']),
                certifications: JSON.stringify(['Food Safety Certified', 'Nepal Tourism Board']),
                specialties: JSON.stringify(['Food', 'Cultural', 'Local Markets']),
                yearsExperience: 8,
                isVerified: true,
                rating: 4.8,
                totalTours: 156,
                totalReviews: 134,
            },
        }),
        prisma.guide.create({
            data: {
                userId: guideUsers[2].id,
                bio: 'As a Buddhist monk for 10 years before becoming a guide, I offer unique insights into Nepal\'s spiritual heritage. Join me for a journey of mindfulness through the sacred stupas and monasteries.',
                languages: JSON.stringify(['English', 'Nepali', 'Tibetan', 'Hindi']),
                certifications: JSON.stringify(['Buddhist Studies Certificate', 'Meditation Teacher']),
                specialties: JSON.stringify(['Religious', 'Meditation', 'Buddhist Heritage']),
                yearsExperience: 12,
                isVerified: true,
                rating: 5.0,
                totalTours: 98,
                totalReviews: 89,
            },
        }),
        prisma.guide.create({
            data: {
                userId: guideUsers[3].id,
                bio: 'The mountains chose me, and I chose to share them with the world. From Pokhara\'s tranquil lakeside to the majestic Annapurna views, let me show you the Nepal that takes your breath away.',
                languages: JSON.stringify(['English', 'Nepali', 'French', 'German']),
                certifications: JSON.stringify(['Trekking Guide License', 'First Aid Certified']),
                specialties: JSON.stringify(['Nature', 'Photography', 'Adventure']),
                yearsExperience: 10,
                isVerified: true,
                rating: 4.7,
                totalTours: 203,
                totalReviews: 178,
            },
        }),
        prisma.guide.create({
            data: {
                userId: guideUsers[4].id,
                bio: 'Bhaktapur is not just my home—it\'s my passion. As a pottery master and heritage guide, I\'ll introduce you to the artisans keeping ancient crafts alive in Nepal\'s best-preserved medieval city.',
                languages: JSON.stringify(['English', 'Nepali', 'Newari']),
                certifications: JSON.stringify(['UNESCO Heritage Guide', 'Master Potter Certificate']),
                specialties: JSON.stringify(['Cultural', 'Artisan Crafts', 'Photography']),
                yearsExperience: 20,
                isVerified: true,
                rating: 4.9,
                totalTours: 445,
                totalReviews: 398,
            },
        }),
    ]);

    // ============================================
    // CREATE TOURS
    // ============================================

    const tours = await Promise.all([
        // Raj Sharma's Tours (Historical)
        prisma.tour.create({
            data: {
                guideId: guides[0].id,
                title: 'Kathmandu Durbar Square Secrets',
                description: 'Discover the hidden stories of Kathmandu\'s royal square—from the living goddess Kumari to the architectural marvels that have witnessed centuries of history. This tour goes beyond the guidebooks to reveal the secrets that only locals know.',
                duration: 180,
                distance: 2.5,
                maxGroupSize: 12,
                meetingPoint: 'In front of Hanuman Dhoka entrance, Kathmandu Durbar Square',
                meetingLat: 27.7044,
                meetingLng: 85.3073,
                hub: 'Kathmandu',
                category: 'HISTORICAL',
                highlights: JSON.stringify([
                    'Meet at the Hanuman statue and learn its secrets',
                    'Private audience area of the Kumari (Living Goddess)',
                    'Hidden courtyards not on tourist maps',
                    'Stories of kings, queens, and palace intrigue',
                    'Traditional Newari architecture explained',
                ]),
                included: JSON.stringify(['Expert local guide', 'Historical insights', 'Photo opportunities']),
                notIncluded: JSON.stringify(['Entrance fees (~$10)', 'Food & drinks', 'Transportation']),
                photos: JSON.stringify([
                    'https://images.unsplash.com/photo-1582654454409-778d91d845a0?w=800',
                    'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800',
                    'https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=800',
                ]),
                isActive: true,
                rating: 4.9,
                totalReviews: 156,
            },
        }),

        // Anita Tamang's Tours (Food)
        prisma.tour.create({
            data: {
                guideId: guides[1].id,
                title: 'Street Food Safari: Taste Authentic Kathmandu',
                description: 'Hungry for adventure? Join me on a culinary journey through Kathmandu\'s bustling streets. From steaming momos to crispy sel roti, we\'ll explore 6-8 local food stalls that tourists never find. Come hungry, leave happy!',
                duration: 150,
                distance: 3.0,
                maxGroupSize: 10,
                meetingPoint: 'Garden of Dreams entrance, Thamel',
                meetingLat: 27.7148,
                meetingLng: 85.3128,
                hub: 'Kathmandu',
                category: 'FOOD',
                highlights: JSON.stringify([
                    '6-8 different food tastings included',
                    'Secret momo spot known only to locals',
                    'Traditional Newari snacks',
                    'Learn about spices at local market',
                    'Recipe tips to take home',
                ]),
                included: JSON.stringify(['All food tastings', 'Bottled water', 'Local guide', 'Recipe cards']),
                notIncluded: JSON.stringify(['Additional food purchases', 'Alcoholic beverages']),
                photos: JSON.stringify([
                    'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=800',
                    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
                    'https://images.unsplash.com/photo-1593252719532-53f183016149?w=800',
                ]),
                isActive: true,
                rating: 4.8,
                totalReviews: 89,
            },
        }),

        // Tenzin Lama's Tours (Religious/Buddhist)
        prisma.tour.create({
            data: {
                guideId: guides[2].id,
                title: 'Boudhanath Mindful Walk',
                description: 'Experience the spiritual heart of Tibetan Buddhism in Nepal. As a former monk, I\'ll guide you through the rituals, symbols, and meditative practices at one of the world\'s largest stupas. End with optional meditation.',
                duration: 120,
                distance: 1.5,
                maxGroupSize: 8,
                meetingPoint: 'Main gate of Boudhanath Stupa, near the police checkpoint',
                meetingLat: 27.7215,
                meetingLng: 85.3620,
                hub: 'Kathmandu',
                category: 'RELIGIOUS',
                highlights: JSON.stringify([
                    'Learn the meaning behind the stupa\'s architecture',
                    'Witness monks\' daily rituals',
                    'Spin prayer wheels mindfully',
                    'Visit a hidden monastery',
                    'Optional 15-min guided meditation',
                ]),
                included: JSON.stringify(['Spiritual guide', 'Prayer flag', 'Meditation cushion (if joining meditation)']),
                notIncluded: JSON.stringify(['Stupa entrance fee (~$4)', 'Monastery donations']),
                photos: JSON.stringify([
                    'https://images.unsplash.com/photo-1565073624497-7144969d0a07?w=800',
                    'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800',
                    'https://images.unsplash.com/photo-1585016495481-91613a3ab1bc?w=800',
                ]),
                isActive: true,
                rating: 5.0,
                totalReviews: 67,
            },
        }),

        // Maya Gurung's Tours (Nature/Pokhara)
        prisma.tour.create({
            data: {
                guideId: guides[3].id,
                title: 'Pokhara Lakeside Sunrise Walk',
                description: 'Wake up with the Himalayas! This early morning walk along Phewa Lake offers the best views of Machapuchare (Fishtail Mountain) as the sun paints the peaks in gold. Perfect for photographers and nature lovers.',
                duration: 150,
                distance: 4.0,
                maxGroupSize: 10,
                meetingPoint: 'Barahi Chowk, Lakeside Pokhara (near the boat dock)',
                meetingLat: 28.2096,
                meetingLng: 83.9586,
                hub: 'Pokhara',
                category: 'NATURE',
                highlights: JSON.stringify([
                    'Sunrise over Machapuchare (Fishtail)',
                    'Annapurna range panorama',
                    'Local fishermen at work',
                    'Bird watching opportunities',
                    'Chai break at lakeside cafe',
                ]),
                included: JSON.stringify(['Local guide', 'Hot chai/coffee', 'Photography tips']),
                notIncluded: JSON.stringify(['Breakfast', 'Boat ride (optional)']),
                photos: JSON.stringify([
                    'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800',
                    'https://images.unsplash.com/photo-1585016495481-91613a3ab1bc?w=800',
                    'https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=800',
                ]),
                isActive: true,
                rating: 4.7,
                totalReviews: 134,
            },
        }),

        // Krishna Shrestha's Tours (Cultural/Bhaktapur)
        prisma.tour.create({
            data: {
                guideId: guides[4].id,
                title: 'Bhaktapur Pottery Trail',
                description: 'Step back in time to Nepal\'s best-preserved medieval city. As a potter myself, I\'ll take you to meet master artisans, try your hand at the wheel, and discover why Bhaktapur is called the City of Devotees.',
                duration: 210,
                distance: 3.0,
                maxGroupSize: 8,
                meetingPoint: 'Bhaktapur Durbar Square, near the Golden Gate',
                meetingLat: 27.6722,
                meetingLng: 85.4280,
                hub: 'Bhaktapur',
                category: 'CULTURAL',
                highlights: JSON.stringify([
                    'Watch master potters at work',
                    'Try pottery yourself (keep your creation!)',
                    'Traditional Newari architecture',
                    'Taste famous Juju Dhau (King Curd)',
                    'Sunset at Nyatapola Temple',
                ]),
                included: JSON.stringify(['Expert guide', 'Pottery experience', 'Your clay creation', 'Juju Dhau tasting']),
                notIncluded: JSON.stringify(['Bhaktapur entry fee (~$15)', 'Additional shopping']),
                photos: JSON.stringify([
                    'https://images.unsplash.com/photo-1609766857326-18a204797d22?w=800',
                    'https://images.unsplash.com/photo-1582654454409-778d91d845a0?w=800',
                    'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800',
                ]),
                isActive: true,
                rating: 4.9,
                totalReviews: 212,
            },
        }),

        // Additional tours
        prisma.tour.create({
            data: {
                guideId: guides[0].id,
                title: 'Patan: The City of Artists',
                description: 'Explore the ancient city of Lalitpur, known for its metal craftsmen, wood carvers, and living heritage. From the stunning Patan Durbar Square to hidden bahals (courtyards), discover why Patan is an artist\'s paradise.',
                duration: 180,
                distance: 3.5,
                maxGroupSize: 10,
                meetingPoint: 'Patan Durbar Square, near the Krishna Temple',
                meetingLat: 27.6727,
                meetingLng: 85.3250,
                hub: 'Kathmandu',
                category: 'CULTURAL',
                highlights: JSON.stringify([
                    'UNESCO World Heritage Durbar Square',
                    'Visit working metalsmith workshops',
                    'Hidden Buddhist bahals',
                    'Traditional Newari lunch option',
                    'Patan Museum architecture',
                ]),
                included: JSON.stringify(['Expert guide', 'Historical insights', 'Artisan workshop visits']),
                notIncluded: JSON.stringify(['Entry fees (~$8)', 'Food & drinks', 'Purchases']),
                photos: JSON.stringify([
                    'https://images.unsplash.com/photo-1582654454409-778d91d845a0?w=800',
                    'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800',
                ]),
                isActive: true,
                rating: 4.8,
                totalReviews: 78,
            },
        }),

        prisma.tour.create({
            data: {
                guideId: guides[1].id,
                title: 'Thamel After Dark: Night Food Walk',
                description: 'When the sun sets, Thamel transforms. Join me for an evening food adventure through Kathmandu\'s tourist hub, discovering the best late-night eats from sekuwa grills to rooftop momos.',
                duration: 120,
                distance: 2.0,
                maxGroupSize: 8,
                meetingPoint: 'Thamel Chowk, near the main intersection',
                meetingLat: 27.7154,
                meetingLng: 85.3105,
                hub: 'Kathmandu',
                category: 'FOOD',
                highlights: JSON.stringify([
                    '5 different food stops',
                    'Grilled sekuwa (BBQ) experience',
                    'Rooftop momo spot',
                    'Local beer tasting (optional)',
                    'Night market exploration',
                ]),
                included: JSON.stringify(['All food tastings', 'Local guide', 'Water']),
                notIncluded: JSON.stringify(['Alcoholic drinks', 'Additional purchases']),
                photos: JSON.stringify([
                    'https://images.unsplash.com/photo-1593252719532-53f183016149?w=800',
                    'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=800',
                ]),
                isActive: true,
                rating: 4.6,
                totalReviews: 45,
            },
        }),

        prisma.tour.create({
            data: {
                guideId: guides[2].id,
                title: 'Pashupatinath: Circle of Life',
                description: 'Witness sacred Hindu rituals at Nepal\'s holiest temple. This respectful tour explains cremation ceremonies, the role of sadhus (holy men), and the deep spiritual significance of this UNESCO site.',
                duration: 150,
                distance: 2.0,
                maxGroupSize: 10,
                meetingPoint: 'Main entrance of Pashupatinath Temple',
                meetingLat: 27.7107,
                meetingLng: 85.3489,
                hub: 'Kathmandu',
                category: 'RELIGIOUS',
                highlights: JSON.stringify([
                    'Understanding Hindu cremation rituals',
                    'Meet sadhus (with permission)',
                    'Sacred Shiva lingams',
                    'Monkey temple exploration',
                    'Aarti ceremony at sunset',
                ]),
                included: JSON.stringify(['Spiritual guide', 'Cultural context', 'Photography etiquette guidance']),
                notIncluded: JSON.stringify(['Entry fee (~$10)', 'Sadhu photo donations']),
                photos: JSON.stringify([
                    'https://images.unsplash.com/photo-1565073624497-7144969d0a07?w=800',
                    'https://images.unsplash.com/photo-1585016495481-91613a3ab1bc?w=800',
                ]),
                isActive: true,
                rating: 4.9,
                totalReviews: 56,
            },
        }),
    ]);

    // ============================================
    // CREATE TOUR SCHEDULES
    // ============================================

    for (const tour of tours) {
        // Create recurring schedules (every day for demo)
        await prisma.tourSchedule.create({
            data: {
                tourId: tour.id,
                dayOfWeek: 0, // Sunday
                startTime: tour.category === 'NATURE' ? '05:30' : '09:00',
                isActive: true,
            },
        });
        await prisma.tourSchedule.create({
            data: {
                tourId: tour.id,
                dayOfWeek: 2, // Tuesday
                startTime: tour.category === 'NATURE' ? '05:30' : '09:00',
                isActive: true,
            },
        });
        await prisma.tourSchedule.create({
            data: {
                tourId: tour.id,
                dayOfWeek: 4, // Thursday
                startTime: tour.category === 'NATURE' ? '05:30' : '09:00',
                isActive: true,
            },
        });
        await prisma.tourSchedule.create({
            data: {
                tourId: tour.id,
                dayOfWeek: 6, // Saturday
                startTime: tour.category === 'NATURE' ? '05:30' : '14:00',
                isActive: true,
            },
        });
    }

    // ============================================
    // CREATE SAMPLE REVIEWS
    // ============================================

    const reviewComments = [
        { rating: 5, title: 'Absolutely incredible!', comment: 'Raj was an amazing guide! His knowledge of the history and hidden gems made this tour unforgettable. Highly recommend!' },
        { rating: 5, title: 'Best tour in Kathmandu', comment: 'I\'ve taken many tours around the world, but this one stands out. The personal stories and local insights were priceless.' },
        { rating: 4, title: 'Great experience', comment: 'Really enjoyed the tour. Learned so much about Nepali culture. Would have loved a bit more time at each stop.' },
        { rating: 5, title: 'A must-do!', comment: 'Perfect way to experience authentic Nepal. Our guide was passionate, knowledgeable, and so friendly!' },
        { rating: 5, title: 'Life-changing', comment: 'The spiritual depth of this tour moved me deeply. Tenzin is not just a guide, he\'s a teacher.' },
        { rating: 4, title: 'Delicious adventure', comment: 'So many amazing foods I never would have found on my own! Came hungry, left extremely happy.' },
        { rating: 5, title: 'Photography heaven', comment: 'Maya knows all the best spots for photos. Caught the most incredible sunrise over the mountains.' },
        { rating: 5, title: 'Authentic craftsmanship', comment: 'Making my own pottery was the highlight of my trip! Krishna is a true master of his craft.' },
    ];

    for (const tour of tours) {
        // Add 2-3 reviews per tour
        const numReviews = Math.floor(Math.random() * 2) + 2;
        for (let i = 0; i < numReviews; i++) {
            const reviewData = reviewComments[Math.floor(Math.random() * reviewComments.length)];
            await prisma.review.create({
                data: {
                    tourId: tour.id,
                    userId: traveler.id,
                    rating: reviewData.rating,
                    title: reviewData.title,
                    comment: reviewData.comment,
                },
            });
        }
    }

    console.log('✅ Demo data seeded successfully!');
    console.log(`   Created ${guideUsers.length} guides`);
    console.log(`   Created ${tours.length} tours`);
    console.log('   Created tour schedules and sample reviews');
    console.log('\n📱 Demo login: demo@saalik.com / demo123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
