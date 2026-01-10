// ============================================
// SAALIK NEPAL TOUR PLATFORM - API TYPES
// ============================================

// Guide Types
export interface Guide {
  id: string;
  userId: string;
  bio: string;
  languages: string[];
  specialties: string[];
  certifications?: string[];
  yearsExperience: number;
  isVerified: boolean;
  rating: number;
  totalTours: number;
  totalReviews: number;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  tours?: Tour[];
}

// Tour Types
export type TourCategory =
  | 'HISTORICAL'
  | 'CULTURAL'
  | 'FOOD'
  | 'RELIGIOUS'
  | 'ADVENTURE'
  | 'PHOTOGRAPHY'
  | 'NATURE'
  | 'NIGHTLIFE';

export interface TourSchedule {
  id: string;
  tourId: string;
  dayOfWeek?: number; // 0-6, null for one-time
  startTime: string; // "09:00"
  specificDate?: string; // ISO date for one-time
  isActive: boolean;
}

export interface Tour {
  id: string;
  guideId: string;
  title: string;
  description: string;
  duration: number; // minutes
  distance?: number; // km
  maxGroupSize: number;
  meetingPoint: string;
  meetingLat?: number;
  meetingLng?: number;
  hub: string; // City name
  category: TourCategory;
  highlights: string[];
  included: string[];
  notIncluded: string[];
  photos: string[];
  isActive: boolean;
  rating: number;
  totalReviews: number;
  guide: Guide;
  schedules?: TourSchedule[];
  reviews?: Review[];
  _count?: {
    reviews: number;
  };
}

// Booking Types
export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export interface Booking {
  id: string;
  tourId: string;
  scheduleId: string;
  userId: string;
  bookingDate: string; // ISO date
  partySize: number;
  status: BookingStatus;
  tipAmount?: number;
  tipCurrency?: string;
  notes?: string;
  createdAt: string;
  tour: Tour;
  schedule: TourSchedule;
}

// Review Types
export interface Review {
  id: string;
  tourId: string;
  userId: string;
  rating: number; // 1-5
  title?: string;
  comment: string;
  photos?: string[];
  createdAt: string;
  user: {
    name: string;
    avatar?: string;
  };
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: 'TRAVELER' | 'GUIDE' | 'ADMIN';
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Search/Filter Types
export interface TourSearchFilters {
  hub?: string;
  category?: TourCategory;
  date?: string;
  language?: string;
  minRating?: number;
  maxDuration?: number;
}

export interface CategoryMeta {
  key: TourCategory;
  label: string;
  icon: string;
}

// Create Booking Payload
export interface CreateBookingPayload {
  tourId: string;
  scheduleId: string;
  bookingDate: string;
  partySize: number;
  notes?: string;
}

// Create Review Payload
export interface CreateReviewPayload {
  tourId: string;
  rating: number;
  title?: string;
  comment: string;
}

// Guide Application Payload
export interface GuideApplicationPayload {
  bio: string;
  languages: string[];
  specialties: string[];
  yearsExperience: number;
  certifications?: string[];
}
