import axios from 'axios';
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { tokenManager } from './tokenManager';
import * as demo from './demoSession';
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

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const client = axios.create({ baseURL: BASE_URL, timeout: 15_000 });

// ─── Request: attach access token ────────────────────────────────────────────
client.interceptors.request.use(async (config) => {
  const token = await tokenManager.getAccessToken().catch(() => null);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response: transparent refresh-token rotation ────────────────────────────
// When the server returns 401, this interceptor:
//   1. Calls /auth/refresh once (subsequent concurrent requests queue up)
//   2. Retries the original request with the new access token
//   3. On refresh failure, signals the AuthProvider to force a logout

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

let isRefreshing = false;
type RefreshCb = (newToken: string) => void;
let refreshQueue: RefreshCb[] = [];

function drainQueue(token: string) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

let _onAuthFailure: (() => void) | null = null;

/** Called by AuthProvider on mount to hook logout into the interceptor. */
export function registerAuthFailureHandler(fn: () => void): void {
  _onAuthFailure = fn;
}

client.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error) => {
    const original = error.config as RetryableRequest;

    // Only intercept 401s that haven't already been retried, and skip in mock mode
    if (error.response?.status !== 401 || original._retry || USE_MOCK) {
      return Promise.reject(error);
    }

    // If a refresh is already in-flight, queue this request until it resolves
    if (isRefreshing) {
      return new Promise<AxiosResponse>((resolve, reject) => {
        refreshQueue.push((newToken) => {
          original.headers.set('Authorization', `Bearer ${newToken}`);
          resolve(client(original));
        });
        // Timeout guard: reject if refresh takes > 10 s
        setTimeout(() => reject(error), 10_000);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await tokenManager.getRefreshToken();
      if (!refreshToken) throw new Error('no_refresh_token');

      const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${BASE_URL}/auth/refresh`,
        { refreshToken },
      );

      await tokenManager.setTokenPair(data.accessToken, data.refreshToken);
      drainQueue(data.accessToken);

      original.headers.set('Authorization', `Bearer ${data.accessToken}`);
      return client(original);
    } catch {
      refreshQueue = [];
      _onAuthFailure?.();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

// ============================================
// MOCK DATA FOR DEMO
// ============================================

const MOCK_USER: User = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'demo@saalik.com',
  name: 'Demo Traveler',
  role: 'TRAVELER',
};

const MOCK_AUTH_RESPONSE: AuthResponse = {
  accessToken: 'mock-access-token-demo',
  refreshToken: 'mock-refresh-token-demo',
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
    languages: ['English', 'Nepali', 'French'],
    specialties: ['Adventure', 'Nature', 'Trekking'],
    certifications: ['TAAN Certified Trekking Guide'],
    yearsExperience: 20,
    isVerified: true,
    rating: 4.95,
    totalTours: 412,
    totalReviews: 380,
    user: { id: 'user-4', name: 'Bikram Gurung', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face' },
  },
  {
    id: 'guide-5',
    userId: 'user-5',
    bio: 'Bhaktapur\'s living heritage is my passion. Third-generation potter from Pottery Square sharing the ancient craft traditions of the Newar people.',
    languages: ['English', 'Nepali', 'German'],
    specialties: ['Cultural', 'Art', 'Historical'],
    yearsExperience: 10,
    isVerified: true,
    rating: 4.85,
    totalTours: 203,
    totalReviews: 178,
    user: { id: 'user-5', name: 'Sarita Joshi', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face' },
  },
];

// Demo tours
const DEMO_TOURS: Tour[] = [
  {
    id: 'tour-1',
    guideId: 'guide-1',
    title: 'Hidden Temples of Kathmandu',
    description: 'Explore the ancient alleyways and secret courtyards of Kathmandu\'s medieval city center, discovering temples and shrines that most tourists never find.',
    duration: 180,
    distance: 4.5,
    maxGroupSize: 8,
    meetingPoint: 'Durbar Square Main Gate, Kathmandu',
    meetingLat: 27.7044,
    meetingLng: 85.3067,
    hub: 'Kathmandu',
    category: 'HISTORICAL',
    highlights: ['Secret Kumari courtyard', 'Ancient Indra Chowk bazaar', 'Hidden Kel Tol temple', 'Traditional Newari architecture'],
    included: ['Expert local guide', 'Temple entry fees', 'Traditional snack'],
    notIncluded: ['Transport to/from meeting point', 'Personal purchases'],
    photos: [
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=800&h=600&fit=crop',
    ],
    isActive: true,
    rating: 4.9,
    totalReviews: 127,
    guide: DEMO_GUIDES[0],
    schedules: [
      { id: 'sched-1a', tourId: 'tour-1', dayOfWeek: 2, startTime: '08:00', isActive: true },
      { id: 'sched-1b', tourId: 'tour-1', dayOfWeek: 5, startTime: '14:00', isActive: true },
    ],
  },
  {
    id: 'tour-2',
    guideId: 'guide-2',
    title: 'Morning Momo & Street Food Safari',
    description: 'Wake up your taste buds with Nepal\'s ultimate street food experience. From steaming momos to sel roti, discover where locals actually eat.',
    duration: 150,
    distance: 3.0,
    maxGroupSize: 6,
    meetingPoint: 'New Road Gate, Kathmandu',
    meetingLat: 27.7063,
    meetingLng: 85.3133,
    hub: 'Kathmandu',
    category: 'FOOD',
    highlights: ['5 authentic food stops', 'Traditional momo making demo', 'Local chai experience', 'Hidden market spice tour'],
    included: ['All food tastings', 'Guide', 'Recipe card'],
    notIncluded: ['Additional purchases'],
    photos: [
      'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop',
    ],
    isActive: true,
    rating: 4.8,
    totalReviews: 89,
    guide: DEMO_GUIDES[1],
    schedules: [
      { id: 'sched-2a', tourId: 'tour-2', dayOfWeek: 1, startTime: '07:30', isActive: true },
      { id: 'sched-2b', tourId: 'tour-2', dayOfWeek: 4, startTime: '07:30', isActive: true },
      { id: 'sched-2c', tourId: 'tour-2', dayOfWeek: 6, startTime: '08:00', isActive: true },
    ],
  },
  {
    id: 'tour-3',
    guideId: 'guide-3',
    title: 'Buddhist Meditation & Boudhanath Pilgrimage',
    description: 'Experience the profound spiritual atmosphere of Boudhanath Stupa with a former Buddhist monk. Learn meditation, spinning prayer wheels, and the meaning behind the rituals.',
    duration: 240,
    distance: 2.0,
    maxGroupSize: 10,
    meetingPoint: 'Boudhanath Stupa Entrance, Kathmandu',
    meetingLat: 27.7215,
    meetingLng: 85.3620,
    hub: 'Kathmandu',
    category: 'RELIGIOUS',
    highlights: ['Guided kora (circumambulation)', 'Meditation session in monastery', 'Meeting with monks', 'Butter lamp offering ritual'],
    included: ['Entry fee', 'Meditation instruction', 'Tibetan tea ceremony'],
    notIncluded: ['Donations to monastery (optional)'],
    photos: [
      'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=800&h=600&fit=crop',
      'https://commons.wikimedia.org/wiki/Special:FilePath/Boudhanath_Stupa_with_prayer_wheels_in_foreground.jpg?width=800',
    ],
    isActive: true,
    rating: 5.0,
    totalReviews: 64,
    guide: DEMO_GUIDES[2],
    schedules: [
      { id: 'sched-3a', tourId: 'tour-3', dayOfWeek: 0, startTime: '06:00', isActive: true },
      { id: 'sched-3b', tourId: 'tour-3', dayOfWeek: 3, startTime: '06:00', isActive: true },
    ],
  },
  {
    id: 'tour-4',
    guideId: 'guide-4',
    title: 'Pokhara Lakeside & Annapurna Viewpoint',
    description: 'Discover Pokhara\'s magical lakeside and witness the breathtaking Annapurna range at sunrise from the best viewpoints locals know.',
    duration: 300,
    distance: 8.0,
    maxGroupSize: 8,
    meetingPoint: 'Lakeside Promenade, Pokhara',
    meetingLat: 28.2096,
    meetingLng: 83.9556,
    hub: 'Pokhara',
    category: 'NATURE',
    highlights: ['Sunrise at Sarangkot', 'Phewa Lake boat ride', 'Devi\'s Fall viewpoint', 'Local fishing village visit'],
    included: ['Boat ride', 'Guide', 'Sunrise breakfast'],
    notIncluded: ['Transport to Sarangkot'],
    photos: [
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1502786129293-79981df4e689?w=800&h=600&fit=crop',
    ],
    isActive: true,
    rating: 4.95,
    totalReviews: 203,
    guide: DEMO_GUIDES[3],
    schedules: [
      { id: 'sched-4a', tourId: 'tour-4', dayOfWeek: 1, startTime: '05:30', isActive: true },
      { id: 'sched-4b', tourId: 'tour-4', dayOfWeek: 3, startTime: '05:30', isActive: true },
      { id: 'sched-4c', tourId: 'tour-4', dayOfWeek: 5, startTime: '05:30', isActive: true },
    ],
  },
  {
    id: 'tour-5',
    guideId: 'guide-5',
    title: 'Bhaktapur Living Heritage Walk',
    description: 'Wander through the perfectly preserved medieval city of Bhaktapur with a Newari local. Watch potters at work, taste traditional Juju Dhau, and discover the 55-window palace.',
    duration: 210,
    distance: 3.5,
    maxGroupSize: 8,
    meetingPoint: 'Bhaktapur Durbar Square East Gate',
    meetingLat: 27.6711,
    meetingLng: 85.4298,
    hub: 'Bhaktapur',
    category: 'CULTURAL',
    highlights: ['Pottery Square demonstration', '55-Window Palace', 'Dattatreya Temple', 'Traditional Juju Dhau tasting'],
    included: ['Entry fee', 'Pottery demo', 'Juju Dhau tasting', 'Guide'],
    notIncluded: ['Pottery purchases'],
    photos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/In_and_around_Bhaktapur_Pottery_Square_07.jpg?width=800',
      'https://images.unsplash.com/photo-1598091383021-15ddea10925d?w=800&h=600&fit=crop',
    ],
    isActive: true,
    rating: 4.85,
    totalReviews: 112,
    guide: DEMO_GUIDES[4],
    schedules: [
      { id: 'sched-5a', tourId: 'tour-5', dayOfWeek: 2, startTime: '09:00', isActive: true },
      { id: 'sched-5b', tourId: 'tour-5', dayOfWeek: 6, startTime: '09:00', isActive: true },
    ],
  },
  {
    id: 'tour-6',
    guideId: 'guide-1',
    title: 'Pashupatinath Temple & Cremation Ceremony',
    description: 'A deeply moving and respectful exploration of Nepal\'s most sacred Hindu temple complex, including witnessing the ancient cremation ceremonies on the Bagmati River ghats.',
    duration: 180,
    distance: 2.5,
    maxGroupSize: 6,
    meetingPoint: 'Pashupatinath East Gate, Kathmandu',
    meetingLat: 27.7105,
    meetingLng: 85.3487,
    hub: 'Kathmandu',
    category: 'RELIGIOUS',
    highlights: ['Sacred Bagmati River ghats', 'Sadhus meeting', 'Temple architecture', 'Evening aarti ceremony'],
    included: ['Entry fee', 'Guide', 'Cultural briefing'],
    notIncluded: ['Photography donations'],
    photos: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/The_Pashupatinath_Temple_27.jpg?width=800',
    ],
    isActive: true,
    rating: 4.7,
    totalReviews: 78,
    guide: DEMO_GUIDES[0],
    schedules: [
      { id: 'sched-6a', tourId: 'tour-6', dayOfWeek: 1, startTime: '16:00', isActive: true },
      { id: 'sched-6b', tourId: 'tour-6', dayOfWeek: 4, startTime: '16:00', isActive: true },
    ],
  },
];

// Demo reviews
const DEMO_REVIEWS: Review[] = [
  {
    id: 'review-1',
    tourId: 'tour-1',
    userId: 'demo-user-2',
    rating: 5,
    title: 'Absolutely magical experience',
    comment: 'Raj took us to places we never would have found on our own. The secret Kumari courtyard alone was worth every rupee. Highly recommend!',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    user: { name: 'Sarah M.', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face' },
  },
  {
    id: 'review-2',
    tourId: 'tour-1',
    userId: 'demo-user-3',
    rating: 5,
    title: 'Best tour in Nepal',
    comment: 'We\'ve done many tours in Asia and this was top 3. Raj\'s knowledge of the history is incredible and his English is perfect.',
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    user: { name: 'James T.' },
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

// Demo sessions never reach login/register/getMe — AuthContext routes those
// through demoSession.start() directly. The functions below are real-mode only,
// but they fall back to MOCK_USER when USE_MOCK is on (legacy stub).

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
  // Demo session: AuthContext bootstrap reads the persona from the stored
  // session directly; this network getMe should never be hit for demo users.
  if (demo.isActive()) {
    const u = demo.getCurrentUser();
    if (u) return { id: u.id, email: u.email, name: u.name, avatar: u.avatar ?? undefined, role: u.role };
  }
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
  if (demo.isActive()) {
    await delay(200);
    let results = demo.listTours();
    if (filters?.hub) {
      results = results.filter((t) => t.hub.toLowerCase().includes(filters.hub!.toLowerCase()));
    }
    if (filters?.category) {
      results = results.filter((t) => t.category === filters.category);
    }
    if (filters?.minRating) {
      results = results.filter((t) => t.rating >= filters.minRating!);
    }
    return results;
  }
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
  if (demo.isActive()) {
    await delay(150);
    return demo.listFeatured();
  }
  if (USE_MOCK) {
    await delay(400);
    return DEMO_TOURS.slice(0, 4);
  }
  const { data } = await client.get<Tour[]>('/tours/featured');
  return data;
};

export const getTourById = async (id: string): Promise<Tour> => {
  if (demo.isActive()) {
    await delay(150);
    return demo.getTour(id);
  }
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

const DEMO_GUIDE_IDS = ['guide-bishnu', 'guide-sita', 'guide-rajan', 'guide-laxmi'];

export const getGuideById = async (id: string): Promise<Guide> => {
  if (demo.isActive() && DEMO_GUIDE_IDS.includes(id)) {
    await delay(150);
    return demo.getGuide(id);
  }
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
  if (demo.isActive()) {
    await delay(400);
    return demo.createTravelerBooking(payload);
  }
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
  if (demo.isActive()) {
    await delay(200);
    return demo.listTravelerBookings(status);
  }
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
  if (demo.isActive()) {
    await delay(200);
    await demo.cancelTravelerBooking(id);
    return { message: 'Booking cancelled' };
  }
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
  if (demo.isActive()) {
    await delay(200);
    await demo.tipTravelerBooking(bookingId, amount, currency);
    return;
  }
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
  if (demo.isActive()) {
    await delay(300);
    return demo.addReview(payload);
  }
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
  if (demo.isActive()) {
    await delay(150);
    return demo.listReviewsForTour(tourId);
  }
  if (USE_MOCK) {
    await delay(300);
    return DEMO_REVIEWS.filter(r => r.tourId === tourId);
  }
  const { data } = await client.get<{ reviews: Review[] }>(`/reviews/tour/${tourId}`);
  return data.reviews;
};

export const getMyReviews = async (): Promise<Review[]> => {
  if (demo.isActive()) {
    await delay(150);
    return demo.listMyReviews();
  }
  if (USE_MOCK) {
    await delay(300);
    return DEMO_REVIEWS.filter(r => r.userId === MOCK_USER.id);
  }
  const { data } = await client.get<{ reviews: Review[] }>('/reviews/me');
  return data.reviews;
};

// ============================================
// SAVED TOURS (WISHLIST)
// ============================================

export const getSavedTourIds = async (): Promise<string[]> => {
  if (demo.isActive()) {
    await delay(80);
    return demo.getWishlist();
  }
  return [];
};

export const getSavedTours = async (): Promise<Tour[]> => {
  if (demo.isActive()) {
    await delay(150);
    return demo.getWishlistTours();
  }
  return [];
};

/** Toggle a tour in the wishlist. Returns the new saved state (true = saved). */
export const toggleSavedTour = async (tourId: string): Promise<boolean> => {
  if (demo.isActive()) {
    await delay(80);
    return demo.toggleWishlist(tourId);
  }
  return false;
};

export const isTourSaved = async (tourId: string): Promise<boolean> => {
  if (demo.isActive()) {
    return demo.getWishlist().includes(tourId);
  }
  return false;
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
  return days[dayOfWeek] ?? 'Unknown';
};
