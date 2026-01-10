import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import type {
  Tour,
  Guide,
  Booking,
  Review,
  User,
  AuthResponse,
  TourSearchFilters,
  CreateBookingPayload,
  CreateReviewPayload,
  GuideApplicationPayload,
  CategoryMeta,
} from '@app-types/api';

// ============================================
// API CLIENT SETUP
// ============================================

const client = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  timeout: 15000,
});

// Add auth token to requests
client.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // SecureStore not available (web)
  }
  return config;
});

// ============================================
// MOCK DATA FOR DEMO
// ============================================

const MOCK_USER: User = {
  id: 'demo-user-id',
  email: 'demo@saalik.com',
  name: 'Demo Traveler',
  role: 'TRAVELER',
};

const MOCK_AUTH_RESPONSE: AuthResponse = {
  token: 'mock-jwt-token-demo',
  user: MOCK_USER,
};

// Demo guides - expanded for Pokhara and Bhaktapur
const DEMO_GUIDES: Guide[] = [
  {
    id: 'guide-1',
    userId: 'user-1',
    bio: 'Born and raised in the shadow of ancient temples, I have spent 15 years sharing the secrets of Kathmandu with travelers from around the world.',
    languages: ['English', 'Nepali', 'Hindi', 'Japanese'],
    specialties: ['Historical', 'Architecture', 'Religious'],
    certifications: ['Nepal Tourism Board Certified'],
    yearsExperience: 15,
    isVerified: true,
    rating: 4.9,
    totalTours: 342,
    totalReviews: 287,
    user: { id: 'user-1', name: 'Raj Sharma', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face' },
  },
  {
    id: 'guide-2',
    userId: 'user-2',
    bio: 'Food is my language of love! As a third-generation street food vendor turned tour guide, I know every hidden momo stall.',
    languages: ['English', 'Nepali', 'Mandarin'],
    specialties: ['Food', 'Cultural', 'Local Markets'],
    yearsExperience: 8,
    isVerified: true,
    rating: 4.8,
    totalTours: 156,
    totalReviews: 134,
    user: { id: 'user-2', name: 'Anita Tamang', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face' },
  },
  {
    id: 'guide-3',
    userId: 'user-3',
    bio: 'As a Buddhist monk for 10 years before becoming a guide, I offer unique insights into Nepal\'s spiritual heritage.',
    languages: ['English', 'Nepali', 'Tibetan'],
    specialties: ['Religious', 'Meditation', 'Buddhist Heritage'],
    yearsExperience: 12,
    isVerified: true,
    rating: 5.0,
    totalTours: 98,
    totalReviews: 89,
    user: { id: 'user-3', name: 'Tenzin Lama', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face' },
  },
  {
    id: 'guide-4',
    userId: 'user-4',
    bio: 'Pokhara is my paradise! Former trekking guide with 20 years in the Annapurna region. I bring the mountains to life with stories of exploration and adventure.',
    languages: ['English', 'Nepali', 'German', 'French'],
    specialties: ['Adventure', 'Nature', 'Photography', 'Trekking'],
    certifications: ['Trekking Guide License', 'Wilderness First Aid'],
    yearsExperience: 20,
    isVerified: true,
    rating: 4.9,
    totalTours: 478,
    totalReviews: 412,
    user: { id: 'user-4', name: 'Pemba Sherpa', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=face' },
  },
  {
    id: 'guide-5',
    userId: 'user-5',
    bio: 'I grew up in Bhaktapur\'s pottery square, watching my grandparents shape clay into art. Now I share our 1,000-year crafting traditions with the world.',
    languages: ['English', 'Nepali', 'Newari'],
    specialties: ['Artisan Crafts', 'Historical', 'Cultural', 'Photography'],
    certifications: ['Heritage Guide Certified'],
    yearsExperience: 10,
    isVerified: true,
    rating: 4.9,
    totalTours: 234,
    totalReviews: 198,
    user: { id: 'user-5', name: 'Sujata Shrestha', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face' },
  },
];

// Demo tours
const DEMO_TOURS: Tour[] = [
  {
    id: 'tour-1',
    guideId: 'guide-1',
    title: 'Kathmandu Durbar Square Secrets',
    description: 'Discover the hidden stories of Kathmandu\'s royal square—from the living goddess Kumari to the architectural marvels that have witnessed centuries of history.',
    duration: 180,
    distance: 2.5,
    maxGroupSize: 12,
    meetingPoint: 'In front of Hanuman Dhoka entrance',
    meetingLat: 27.7044,
    meetingLng: 85.3073,
    hub: 'Kathmandu',
    category: 'HISTORICAL',
    highlights: [
      'Meet at the Hanuman statue and learn its secrets',
      'Private audience area of the Kumari (Living Goddess)',
      'Hidden courtyards not on tourist maps',
      'Stories of kings, queens, and palace intrigue',
    ],
    included: ['Expert local guide', 'Historical insights', 'Photo opportunities'],
    notIncluded: ['Entrance fees (~$10)', 'Food & drinks'],
    photos: [
      'https://images.unsplash.com/photo-1582654454409-778d91d845a0?w=800',
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800',
    ],
    isActive: true,
    rating: 4.9,
    totalReviews: 156,
    guide: DEMO_GUIDES[0],
    schedules: [
      { id: 'sch-1', tourId: 'tour-1', dayOfWeek: 0, startTime: '09:00', isActive: true },
      { id: 'sch-2', tourId: 'tour-1', dayOfWeek: 2, startTime: '09:00', isActive: true },
      { id: 'sch-3', tourId: 'tour-1', dayOfWeek: 4, startTime: '09:00', isActive: true },
    ],
  },
  {
    id: 'tour-2',
    guideId: 'guide-2',
    title: 'Street Food Safari: Taste Authentic Kathmandu',
    description: 'Hungry for adventure? Join me on a culinary journey through Kathmandu\'s bustling streets. From steaming momos to crispy sel roti.',
    duration: 150,
    distance: 3.0,
    maxGroupSize: 10,
    meetingPoint: 'Garden of Dreams entrance, Thamel',
    meetingLat: 27.7148,
    meetingLng: 85.3128,
    hub: 'Kathmandu',
    category: 'FOOD',
    highlights: [
      '6-8 different food tastings included',
      'Secret momo spot known only to locals',
      'Traditional Newari snacks',
      'Learn about spices at local market',
    ],
    included: ['All food tastings', 'Bottled water', 'Local guide', 'Recipe cards'],
    notIncluded: ['Additional food purchases', 'Alcoholic beverages'],
    photos: [
      'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=800',
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    ],
    isActive: true,
    rating: 4.8,
    totalReviews: 89,
    guide: DEMO_GUIDES[1],
    schedules: [
      { id: 'sch-4', tourId: 'tour-2', dayOfWeek: 1, startTime: '11:00', isActive: true },
      { id: 'sch-5', tourId: 'tour-2', dayOfWeek: 3, startTime: '11:00', isActive: true },
      { id: 'sch-6', tourId: 'tour-2', dayOfWeek: 5, startTime: '11:00', isActive: true },
    ],
  },
  {
    id: 'tour-3',
    guideId: 'guide-3',
    title: 'Boudhanath Mindful Walk',
    description: 'Experience the spiritual heart of Tibetan Buddhism in Nepal. A journey of mindfulness through the sacred stupas and monasteries.',
    duration: 120,
    distance: 1.5,
    maxGroupSize: 8,
    meetingPoint: 'Main gate of Boudhanath Stupa',
    meetingLat: 27.7215,
    meetingLng: 85.3620,
    hub: 'Kathmandu',
    category: 'RELIGIOUS',
    highlights: [
      'Learn the meaning behind the stupa\'s architecture',
      'Witness monks\' daily rituals',
      'Spin prayer wheels mindfully',
      'Optional 15-min guided meditation',
    ],
    included: ['Spiritual guide', 'Prayer flag', 'Meditation cushion'],
    notIncluded: ['Stupa entrance fee (~$4)', 'Monastery donations'],
    photos: [
      'https://images.unsplash.com/photo-1565073624497-7144969d0a07?w=800',
      'https://images.unsplash.com/photo-1585016495481-91613a3ab1bc?w=800',
    ],
    isActive: true,
    rating: 5.0,
    totalReviews: 67,
    guide: DEMO_GUIDES[2],
    schedules: [
      { id: 'sch-7', tourId: 'tour-3', dayOfWeek: 0, startTime: '07:00', isActive: true },
      { id: 'sch-8', tourId: 'tour-3', dayOfWeek: 3, startTime: '07:00', isActive: true },
      { id: 'sch-9', tourId: 'tour-3', dayOfWeek: 6, startTime: '16:00', isActive: true },
    ],
  },
  {
    id: 'tour-4',
    guideId: 'guide-1',
    title: 'Patan: The City of Artists',
    description: 'Explore the ancient city of Lalitpur, known for its metal craftsmen, wood carvers, and living heritage.',
    duration: 180,
    distance: 3.5,
    maxGroupSize: 10,
    meetingPoint: 'Patan Durbar Square, near Krishna Temple',
    hub: 'Kathmandu',
    category: 'CULTURAL',
    highlights: [
      'UNESCO World Heritage Durbar Square',
      'Visit working metalsmith workshops',
      'Hidden Buddhist bahals',
      'Traditional Newari architecture',
    ],
    included: ['Expert guide', 'Historical insights'],
    notIncluded: ['Entry fees (~$8)', 'Food & drinks'],
    photos: [
      'https://images.unsplash.com/photo-1609766857326-18a204797d22?w=800',
    ],
    isActive: true,
    rating: 4.8,
    totalReviews: 78,
    guide: DEMO_GUIDES[0],
    schedules: [
      { id: 'sch-10', tourId: 'tour-4', dayOfWeek: 2, startTime: '10:00', isActive: true },
    ],
  },
  {
    id: 'tour-5',
    guideId: 'guide-2',
    title: 'Thamel After Dark: Night Food Walk',
    description: 'When the sun sets, Thamel transforms. Join me for an evening food adventure through Kathmandu\'s tourist hub.',
    duration: 120,
    distance: 2.0,
    maxGroupSize: 8,
    meetingPoint: 'Thamel Chowk, near the main intersection',
    hub: 'Kathmandu',
    category: 'NIGHTLIFE',
    highlights: [
      '5 different food stops',
      'Grilled sekuwa (BBQ) experience',
      'Rooftop momo spot',
      'Night market exploration',
    ],
    included: ['All food tastings', 'Local guide', 'Water'],
    notIncluded: ['Alcoholic drinks', 'Additional purchases'],
    photos: [
      'https://images.unsplash.com/photo-1593252719532-53f183016149?w=800',
    ],
    isActive: true,
    rating: 4.6,
    totalReviews: 45,
    guide: DEMO_GUIDES[1],
    schedules: [
      { id: 'sch-11', tourId: 'tour-5', dayOfWeek: 4, startTime: '18:00', isActive: true },
      { id: 'sch-12', tourId: 'tour-5', dayOfWeek: 6, startTime: '18:00', isActive: true },
    ],
  },
  {
    id: 'tour-6',
    guideId: 'guide-3',
    title: 'Pashupatinath: Circle of Life',
    description: 'Witness sacred Hindu rituals at Nepal\'s holiest temple. This respectful tour explains cremation ceremonies and the role of sadhus.',
    duration: 150,
    distance: 2.0,
    maxGroupSize: 10,
    meetingPoint: 'Main entrance of Pashupatinath Temple',
    hub: 'Kathmandu',
    category: 'RELIGIOUS',
    highlights: [
      'Understanding Hindu cremation rituals',
      'Meet sadhus (with permission)',
      'Sacred Shiva lingams',
      'Aarti ceremony at sunset',
    ],
    included: ['Spiritual guide', 'Cultural context'],
    notIncluded: ['Entry fee (~$10)', 'Sadhu photo donations'],
    photos: [
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800',
    ],
    isActive: true,
    rating: 4.9,
    totalReviews: 56,
    guide: DEMO_GUIDES[2],
    schedules: [
      { id: 'sch-13', tourId: 'tour-6', dayOfWeek: 1, startTime: '16:00', isActive: true },
      { id: 'sch-14', tourId: 'tour-6', dayOfWeek: 5, startTime: '16:00', isActive: true },
    ],
  },
  // ============================================
  // POKHARA TOURS
  // ============================================
  {
    id: 'tour-7',
    guideId: 'guide-4',
    title: 'Lakeside Sunrise: Phewa Lake Walk',
    description: 'Experience the magic of dawn at Phewa Lake with the Annapurna range reflected in still waters. A peaceful morning walk through Pokhara\'s most scenic landscapes.',
    duration: 150,
    distance: 4.0,
    maxGroupSize: 10,
    meetingPoint: 'Barahi Ghat (Boat Temple)',
    meetingLat: 28.2096,
    meetingLng: 83.9567,
    hub: 'Pokhara',
    category: 'NATURE',
    highlights: [
      'Sunrise over Machhapuchhre (Fishtail Mountain)',
      'Traditional fishing boats on Phewa Lake',
      'Barahi Temple island visit (optional)',
      'Local breakfast at lakeside café',
      'Photography spots with mountain reflections',
    ],
    included: ['Expert nature guide', 'Sunrise photo tips', 'Hot chai'],
    notIncluded: ['Boat ride (~$3)', 'Breakfast', 'Temple donation'],
    photos: [
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800',
      'https://images.unsplash.com/photo-1585016495481-91613a3ab1bc?w=800',
    ],
    isActive: true,
    rating: 4.9,
    totalReviews: 234,
    guide: DEMO_GUIDES[3],
    schedules: [
      { id: 'sch-15', tourId: 'tour-7', dayOfWeek: 0, startTime: '05:30', isActive: true },
      { id: 'sch-16', tourId: 'tour-7', dayOfWeek: 2, startTime: '05:30', isActive: true },
      { id: 'sch-17', tourId: 'tour-7', dayOfWeek: 4, startTime: '05:30', isActive: true },
    ],
  },
  {
    id: 'tour-8',
    guideId: 'guide-4',
    title: 'World Peace Pagoda Trek',
    description: 'Hike to the iconic Shanti Stupa for panoramic Himalayan views. This moderate trek rewards with stunning vistas of Annapurna, Dhaulagiri, and Machhapuchhre.',
    duration: 240,
    distance: 6.0,
    maxGroupSize: 8,
    meetingPoint: 'Lakeside Taxi Stand',
    meetingLat: 28.2100,
    meetingLng: 83.9580,
    hub: 'Pokhara',
    category: 'ADVENTURE',
    highlights: [
      '360-degree Himalayan panorama',
      'Japanese-style Peace Pagoda',
      'Forest trail through rhododendrons',
      'Meditation moment at the stupa',
      'Scenic boat return across Phewa Lake',
    ],
    included: ['Trekking guide', 'Water', 'Snacks', 'Return boat ticket'],
    notIncluded: ['Lunch', 'Tips'],
    photos: [
      'https://images.unsplash.com/photo-1565073624497-7144969d0a07?w=800',
    ],
    isActive: true,
    rating: 4.8,
    totalReviews: 189,
    guide: DEMO_GUIDES[3],
    schedules: [
      { id: 'sch-18', tourId: 'tour-8', dayOfWeek: 1, startTime: '07:00', isActive: true },
      { id: 'sch-19', tourId: 'tour-8', dayOfWeek: 3, startTime: '07:00', isActive: true },
      { id: 'sch-20', tourId: 'tour-8', dayOfWeek: 6, startTime: '07:00', isActive: true },
    ],
  },
  {
    id: 'tour-9',
    guideId: 'guide-4',
    title: 'Old Pokhara Bazaar Walk',
    description: 'Discover Pokhara beyond Lakeside. Explore the authentic Old Bazaar with its Newari architecture, local markets, and the historic Bindhyabasini Temple.',
    duration: 180,
    distance: 3.5,
    maxGroupSize: 10,
    meetingPoint: 'Bindhyabasini Temple entrance',
    hub: 'Pokhara',
    category: 'CULTURAL',
    highlights: [
      '17th-century Bindhyabasini Temple',
      'Traditional Newari shophouses',
      'Local spice and vegetable markets',
      'Hidden courtyards and temples',
      'Authentic Thakali lunch (optional)',
    ],
    included: ['Cultural guide', 'Historical insights', 'Temple offerings'],
    notIncluded: ['Lunch', 'Shopping'],
    photos: [
      'https://images.unsplash.com/photo-1609766857326-18a204797d22?w=800',
    ],
    isActive: true,
    rating: 4.7,
    totalReviews: 98,
    guide: DEMO_GUIDES[3],
    schedules: [
      { id: 'sch-21', tourId: 'tour-9', dayOfWeek: 2, startTime: '09:00', isActive: true },
      { id: 'sch-22', tourId: 'tour-9', dayOfWeek: 5, startTime: '09:00', isActive: true },
    ],
  },
  // ============================================
  // BHAKTAPUR TOURS
  // ============================================
  {
    id: 'tour-10',
    guideId: 'guide-5',
    title: 'Bhaktapur: The Living Museum',
    description: 'Step back in time in Nepal\'s best-preserved medieval city. Explore UNESCO World Heritage squares, ancient temples, and living traditions unchanged for centuries.',
    duration: 240,
    distance: 4.0,
    maxGroupSize: 12,
    meetingPoint: 'Bhaktapur Durbar Square main gate',
    meetingLat: 27.6711,
    meetingLng: 85.4298,
    hub: 'Bhaktapur',
    category: 'HISTORICAL',
    highlights: [
      '55-Window Palace and Golden Gate',
      'Nyatapola Temple (5-storey pagoda)',
      'Dattatreya Square hidden gems',
      'Traditional wood carving workshops',
      'Ancient water spouts (hiti)',
    ],
    included: ['Expert heritage guide', 'Historical insights', 'Map'],
    notIncluded: ['Entry fee (~$15)', 'Food & drinks'],
    photos: [
      'https://images.unsplash.com/photo-1609766857326-18a204797d22?w=800',
      'https://images.unsplash.com/photo-1582654454409-778d91d845a0?w=800',
    ],
    isActive: true,
    rating: 4.9,
    totalReviews: 312,
    guide: DEMO_GUIDES[4],
    schedules: [
      { id: 'sch-23', tourId: 'tour-10', dayOfWeek: 0, startTime: '09:00', isActive: true },
      { id: 'sch-24', tourId: 'tour-10', dayOfWeek: 2, startTime: '09:00', isActive: true },
      { id: 'sch-25', tourId: 'tour-10', dayOfWeek: 4, startTime: '09:00', isActive: true },
    ],
  },
  {
    id: 'tour-11',
    guideId: 'guide-5',
    title: 'Potter\'s Square Experience',
    description: 'Watch master potters shape clay using techniques passed down for 1,000 years. Get hands-on with a pottery lesson in Nepal\'s traditional ceramics capital.',
    duration: 180,
    distance: 2.0,
    maxGroupSize: 8,
    meetingPoint: 'Pottery Square (Dattatreya area)',
    hub: 'Bhaktapur',
    category: 'CULTURAL',
    highlights: [
      'Watch master potters at work',
      'Hands-on pottery making lesson',
      'Learn about Juju Dhau (King Curd)',
      'Traditional clay production process',
      'Take home your pottery creation',
    ],
    included: ['Expert artisan guide', 'Pottery materials', 'Your creation to keep'],
    notIncluded: ['City entry fee (~$15)', 'Additional pottery purchases'],
    photos: [
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    ],
    isActive: true,
    rating: 5.0,
    totalReviews: 167,
    guide: DEMO_GUIDES[4],
    schedules: [
      { id: 'sch-26', tourId: 'tour-11', dayOfWeek: 1, startTime: '10:00', isActive: true },
      { id: 'sch-27', tourId: 'tour-11', dayOfWeek: 3, startTime: '10:00', isActive: true },
      { id: 'sch-28', tourId: 'tour-11', dayOfWeek: 5, startTime: '14:00', isActive: true },
    ],
  },
  {
    id: 'tour-12',
    guideId: 'guide-5',
    title: 'Bhaktapur Food Trail',
    description: 'Taste the unique flavors of Bhaktapur—from the famous Juju Dhau (King Curd) to bara pancakes and local delicacies found nowhere else in Nepal.',
    duration: 150,
    distance: 2.5,
    maxGroupSize: 10,
    meetingPoint: 'Café Nyatapola, Taumadhi Square',
    hub: 'Bhaktapur',
    category: 'FOOD',
    highlights: [
      'World-famous Juju Dhau (King Curd)',
      'Traditional Newari bara pancakes',
      'Yomari (sweet rice dumplings)',
      'Local rice wine tasting',
      '6+ different food stops',
    ],
    included: ['Food guide', 'All tastings (6+ dishes)', 'Water'],
    notIncluded: ['City entry fee (~$15)', 'Additional food purchases'],
    photos: [
      'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=800',
    ],
    isActive: true,
    rating: 4.9,
    totalReviews: 143,
    guide: DEMO_GUIDES[4],
    schedules: [
      { id: 'sch-29', tourId: 'tour-12', dayOfWeek: 0, startTime: '11:00', isActive: true },
      { id: 'sch-30', tourId: 'tour-12', dayOfWeek: 4, startTime: '11:00', isActive: true },
      { id: 'sch-31', tourId: 'tour-12', dayOfWeek: 6, startTime: '11:00', isActive: true },
    ],
  },
];

// Demo reviews
const DEMO_REVIEWS: Review[] = [
  {
    id: 'review-1',
    tourId: 'tour-1',
    userId: 'demo-user',
    rating: 5,
    title: 'Absolutely incredible!',
    comment: 'Raj was an amazing guide! His knowledge of history and hidden gems made this tour unforgettable.',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    user: { name: 'Sarah M.', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100' },
  },
  {
    id: 'review-2',
    tourId: 'tour-1',
    userId: 'demo-user-2',
    rating: 5,
    title: 'Best tour in Kathmandu',
    comment: 'The personal stories and local insights were priceless. Highly recommend!',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    user: { name: 'James K.' },
  },
  {
    id: 'review-3',
    tourId: 'tour-2',
    userId: 'demo-user-3',
    rating: 4,
    title: 'Delicious adventure',
    comment: 'So many amazing foods I never would have found on my own! Came hungry, left extremely happy.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    user: { name: 'Emma L.' },
  },
];

// Demo bookings storage
let DEMO_BOOKINGS: Booking[] = [];

// ============================================
// MOCK API FLAG
// ============================================
const USE_MOCK = true; // Set to false when backend is running

// ============================================
// AUTHENTICATION API
// ============================================

export const login = async (email: string, _password: string): Promise<AuthResponse> => {
  if (USE_MOCK) {
    await delay(500);
    return MOCK_AUTH_RESPONSE;
  }
  const { data } = await client.post<AuthResponse>('/auth/login', { email, password: _password });
  return data;
};

export const register = async (email: string, password: string, name: string): Promise<AuthResponse> => {
  if (USE_MOCK) {
    await delay(500);
    return { ...MOCK_AUTH_RESPONSE, user: { ...MOCK_USER, email, name } };
  }
  const { data } = await client.post<AuthResponse>('/auth/register', { email, password, name });
  return data;
};

export const getMe = async (): Promise<User> => {
  if (USE_MOCK) {
    await delay(300);
    return MOCK_USER;
  }
  const { data } = await client.get<User>('/auth/me');
  return data;
};

// ============================================
// TOURS API
// ============================================

export const searchTours = async (filters?: TourSearchFilters): Promise<Tour[]> => {
  if (USE_MOCK) {
    await delay(600);
    let results = [...DEMO_TOURS];

    if (filters?.hub) {
      results = results.filter(t => t.hub.toLowerCase().includes(filters.hub!.toLowerCase()));
    }
    if (filters?.category) {
      results = results.filter(t => t.category === filters.category);
    }
    if (filters?.minRating) {
      results = results.filter(t => t.rating >= filters.minRating!);
    }

    return results;
  }

  const params = new URLSearchParams();
  if (filters?.hub) params.append('hub', filters.hub);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.date) params.append('date', filters.date);
  if (filters?.minRating) params.append('minRating', String(filters.minRating));

  const { data } = await client.get<Tour[]>(`/tours?${params.toString()}`);
  return data;
};

export const getFeaturedTours = async (): Promise<Tour[]> => {
  if (USE_MOCK) {
    await delay(400);
    return DEMO_TOURS.slice(0, 4);
  }
  const { data } = await client.get<Tour[]>('/tours/featured');
  return data;
};

export const getTourById = async (id: string): Promise<Tour> => {
  if (USE_MOCK) {
    await delay(400);
    const tour = DEMO_TOURS.find(t => t.id === id);
    if (!tour) throw new Error('Tour not found');
    return {
      ...tour,
      reviews: DEMO_REVIEWS.filter(r => r.tourId === id),
    };
  }
  const { data } = await client.get<Tour>(`/tours/${id}`);
  return data;
};

export const getHubs = async (): Promise<string[]> => {
  if (USE_MOCK) {
    return ['Kathmandu', 'Pokhara', 'Bhaktapur', 'Patan'];
  }
  const { data } = await client.get<string[]>('/tours/meta/hubs');
  return data;
};

export const getCategories = async (): Promise<CategoryMeta[]> => {
  if (USE_MOCK) {
    return [
      { key: 'HISTORICAL', label: 'Historical', icon: 'library' },
      { key: 'CULTURAL', label: 'Cultural', icon: 'color-palette' },
      { key: 'FOOD', label: 'Food & Drink', icon: 'restaurant' },
      { key: 'RELIGIOUS', label: 'Religious', icon: 'flame' },
      { key: 'ADVENTURE', label: 'Adventure', icon: 'compass' },
      { key: 'PHOTOGRAPHY', label: 'Photography', icon: 'camera' },
      { key: 'NATURE', label: 'Nature', icon: 'leaf' },
      { key: 'NIGHTLIFE', label: 'Nightlife', icon: 'moon' },
    ];
  }
  const { data } = await client.get<CategoryMeta[]>('/tours/meta/categories');
  return data;
};

// ============================================
// GUIDES API
// ============================================

export const getGuideById = async (id: string): Promise<Guide> => {
  if (USE_MOCK) {
    await delay(400);
    const guide = DEMO_GUIDES.find(g => g.id === id);
    if (!guide) throw new Error('Guide not found');
    return {
      ...guide,
      tours: DEMO_TOURS.filter(t => t.guideId === id),
    };
  }
  const { data } = await client.get<Guide>(`/guides/${id}`);
  return data;
};

export const applyAsGuide = async (payload: GuideApplicationPayload): Promise<{ message: string }> => {
  if (USE_MOCK) {
    await delay(800);
    return { message: 'Application submitted! Our team will review your profile.' };
  }
  const { data } = await client.post('/guides/apply', payload);
  return data;
};

// ============================================
// BOOKINGS API
// ============================================

export const createBooking = async (payload: CreateBookingPayload): Promise<Booking> => {
  if (USE_MOCK) {
    await delay(800);
    const tour = DEMO_TOURS.find(t => t.id === payload.tourId);
    if (!tour) throw new Error('Tour not found');

    const schedule = tour.schedules?.find(s => s.id === payload.scheduleId);
    if (!schedule) throw new Error('Schedule not found');

    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      tourId: payload.tourId,
      scheduleId: payload.scheduleId,
      userId: MOCK_USER.id,
      bookingDate: payload.bookingDate,
      partySize: payload.partySize,
      status: 'CONFIRMED',
      notes: payload.notes,
      createdAt: new Date().toISOString(),
      tour,
      schedule,
    };

    DEMO_BOOKINGS.unshift(newBooking);
    return newBooking;
  }

  const { data } = await client.post<{ booking: Booking }>('/bookings', payload);
  return data.booking;
};

export const getMyBookings = async (status?: 'upcoming' | 'past' | 'cancelled'): Promise<Booking[]> => {
  if (USE_MOCK) {
    await delay(400);
    const now = new Date();

    return DEMO_BOOKINGS.filter(b => {
      const bookingDate = new Date(b.bookingDate);
      if (status === 'upcoming') {
        return bookingDate >= now && b.status !== 'CANCELLED';
      }
      if (status === 'past') {
        return bookingDate < now || b.status === 'COMPLETED';
      }
      if (status === 'cancelled') {
        return b.status === 'CANCELLED';
      }
      return true;
    });
  }

  const params = status ? `?status=${status}` : '';
  const { data } = await client.get<Booking[]>(`/bookings${params}`);
  return data;
};

export const cancelBooking = async (id: string): Promise<{ message: string }> => {
  if (USE_MOCK) {
    await delay(500);
    const booking = DEMO_BOOKINGS.find(b => b.id === id);
    if (booking) {
      booking.status = 'CANCELLED';
    }
    return { message: 'Booking cancelled successfully' };
  }
  const { data } = await client.delete(`/bookings/${id}`);
  return data;
};

export const addTip = async (bookingId: string, amount: number, currency: string): Promise<void> => {
  if (USE_MOCK) {
    await delay(500);
    const booking = DEMO_BOOKINGS.find(b => b.id === bookingId);
    if (booking) {
      booking.tipAmount = amount;
      booking.tipCurrency = currency;
      booking.status = 'COMPLETED';
    }
    return;
  }
  await client.put(`/bookings/${bookingId}/tip`, { amount, currency });
};

// ============================================
// REVIEWS API
// ============================================

export const createReview = async (payload: CreateReviewPayload): Promise<Review> => {
  if (USE_MOCK) {
    await delay(600);
    const newReview: Review = {
      id: `review-${Date.now()}`,
      tourId: payload.tourId,
      userId: MOCK_USER.id,
      rating: payload.rating,
      title: payload.title,
      comment: payload.comment,
      createdAt: new Date().toISOString(),
      user: { name: MOCK_USER.name },
    };
    DEMO_REVIEWS.unshift(newReview);
    return newReview;
  }
  const { data } = await client.post<{ review: Review }>('/reviews', payload);
  return data.review;
};

export const getTourReviews = async (tourId: string): Promise<Review[]> => {
  if (USE_MOCK) {
    await delay(300);
    return DEMO_REVIEWS.filter(r => r.tourId === tourId);
  }
  const { data } = await client.get<{ reviews: Review[] }>(`/reviews/tour/${tourId}`);
  return data.reviews;
};

// ============================================
// HELPERS
// ============================================

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const formatRating = (rating: number): string => {
  return rating.toFixed(1);
};

export const getDayName = (dayOfWeek: number): string => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayOfWeek];
};
