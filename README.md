# Saalik - Nepal Tour Platform

**Nepal's premier free walking tour marketplace** - Connecting travelers with passionate local guides for authentic experiences across Kathmandu, Pokhara, Bhaktapur, and beyond.

> Inspired by GuruWalk, built specifically for Nepal's unique tourism landscape.

## 🏔️ What is Saalik?

Saalik is a two-sided marketplace where:
- **Travelers** discover and book free walking tours
- **Local Guides** ("Saaliks") share their passion and knowledge
- Tours are **free to book**, travelers **tip guides** after the experience

## 📱 Features

### For Travelers
- **Discover Tours** - Browse walking tours by city, category, and date
- **Rich Tour Details** - Photos, highlights, meeting points, schedules
- **Easy Booking** - Select date and party size, confirm instantly
- **Guide Profiles** - See ratings, reviews, and specialties
- **Track Bookings** - View upcoming, past, and cancelled tours
- **Leave Reviews** - Rate and review after your experience

### For Guides (Coming Soon)
- **Apply to Guide** - Submit profile and specialties
- **Manage Tours** - Create and schedule your own tours
- **Receive Bookings** - Get notified of new bookings
- **Earn Tips** - Receive pay-what-you-want contributions

---

## 🔌 External API Integration Requirements

### Required APIs for Production

| API Service | Purpose | Pricing | Notes |
|-------------|---------|---------|-------|
| **Stripe** | Payment processing for tips | 2.9% + $0.30 per transaction | [stripe.com](https://stripe.com/pricing) |
| **Google Maps Platform** | Meeting point maps, directions | $200 free credit/month, then $7/1000 loads | [cloud.google.com/maps-platform](https://cloud.google.com/maps-platform/pricing) |
| **Firebase Cloud Messaging** | Push notifications | Free tier: unlimited | [firebase.google.com](https://firebase.google.com/pricing) |
| **SendGrid** | Booking confirmation emails | Free: 100/day, Essentials: $19.95/mo | [sendgrid.com](https://sendgrid.com/pricing/) |
| **AWS S3 / Cloudinary** | Tour photo storage | S3: ~$0.023/GB, Cloudinary free tier | [aws.amazon.com/s3](https://aws.amazon.com/s3/pricing/) |

### Optional APIs for Enhanced Features

| API Service | Purpose | Pricing | Priority |
|-------------|---------|---------|----------|
| **Twilio** | SMS booking confirmations | $0.0079/SMS | Medium |
| **OpenWeather** | Weather at tour locations | Free: 1000 calls/day | Low |
| **Google Translate** | Multi-language support | $20/million characters | Low |
| **Mixpanel / Amplitude** | Analytics | Free tier available | Medium |

### Authentication APIs (Social Login)

| API Service | Purpose | Pricing | Implementation |
|-------------|---------|---------|----------------|
| **Google OAuth 2.0** | "Continue with Google" login | **Free** | [expo-auth-session](https://docs.expo.dev/guides/google-authentication/) |
| **Apple Sign-In** | "Continue with Apple" login (iOS required) | **Free** | [expo-apple-authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/) |

> **Note**: Apple Sign-In is **required** by App Store if you offer any third-party login. Both APIs are free to use.

**Implementation Steps:**
1. Google OAuth: Create project in [Google Cloud Console](https://console.cloud.google.com), enable OAuth 2.0
2. Apple Sign-In: Configure in [Apple Developer Portal](https://developer.apple.com), add capability to app
3. Install: `npx expo install expo-auth-session expo-apple-authentication expo-crypto`

### API Integration Effort Estimate

| Phase | APIs | Dev Time | Monthly Cost (Est.) |
|-------|------|----------|---------------------|
| **MVP Launch** | Stripe, SendGrid, Firebase FCM | 2-3 weeks | ~$20-50 |
| **Full Launch** | + Google Maps, S3/Cloudinary | +1-2 weeks | ~$50-100 |
| **Scale** | + Twilio, Analytics, CDN | Ongoing | ~$100-300 |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React Native, Expo, TypeScript |
| **Navigation** | React Navigation (Stack + Tabs) |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | Prisma ORM, SQLite (dev) / PostgreSQL (prod) |
| **Validation** | Zod |
| **Auth** | JWT, bcrypt |

## 🎨 Brand Design System

### Color Palette (Original Saalik Brand)
| Color | Hex | Usage |
|-------|-----|-------|
| Background | `#021d0f` | Dark forest green/black |
| Card | `rgba(2, 18, 8, 0.85)` | Translucent dark overlay |
| Accent | `#15ff75` | Vibrant green - buttons, highlights |
| Accent Muted | `#0cc65a` | Secondary accent |
| Text Primary | `#f8fff4` | Light text on dark backgrounds |
| Text Secondary | `#94d5a3` | Muted green text |
| Border | `rgba(21, 255, 117, 0.4)` | Green-tinted borders |
| Error | `#ff6b6b` | Error states |

### Category Colors
| Category | Color | Hex |
|----------|-------|-----|
| Historical | Purple | `#8B5CF6` |
| Cultural | Pink | `#EC4899` |
| Food | Amber | `#F59E0B` |
| Religious | Indigo | `#6366F1` |
| Adventure | Emerald | `#10B981` |
| Photography | Blue | `#3B82F6` |
| Nature | Green | `#22C55E` |
| Nightlife | Violet | `#A855F7` |

---

## 📂 Project Structure

```
Saalik_app/
├── frontend/saalik-mobile/
│   ├── src/
│   │   ├── components/    # TourCard, GuideCard, ReviewCard, BookingCard
│   │   ├── screens/       # Home, TourDetail, Search, Booking, Trips, Profile
│   │   ├── navigation/    # AppNavigator with stack/tab structure
│   │   ├── services/      # API client with mock data
│   │   ├── theme/         # Brand colors (colors.ts)
│   │   ├── types/         # TypeScript interfaces
│   │   └── context/       # AuthContext
│   └── assets/
└── backend/
    ├── src/
    │   ├── routes/        # tours, bookings, guides, reviews, auth
    │   └── services/
    └── prisma/
        ├── schema.prisma  # Database models
        └── seed.ts        # Demo data
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator or Android Emulator

### Backend Setup
```bash
cd backend
npm install
npx prisma generate    # Generate Prisma client
npx prisma migrate dev # Create database tables
npm run db:seed        # Populate with demo data
npm run dev            # Start on http://localhost:4000
```

### Frontend Setup
```bash
cd frontend/saalik-mobile
npm install
npx expo start         # Start Expo dev server
# Press 'i' for iOS or 'a' for Android
```

### Demo Credentials
- **Email**: `demo@saalik.com`
- **Password**: `demo123`

---

## � Internal API Endpoints

### Tours
- `GET /api/tours` - Search/filter tours
- `GET /api/tours/featured` - Featured tours
- `GET /api/tours/:id` - Tour details

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - User's bookings
- `DELETE /api/bookings/:id` - Cancel booking

### Guides
- `GET /api/guides/:id` - Guide profile
- `POST /api/guides/apply` - Apply as guide

### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/tour/:id` - Tour reviews

---

## 📈 Roadmap

### v2.0 (Current) ✅
- [x] Tour discovery & search
- [x] Tour details with photos & reviews
- [x] Booking flow
- [x] My Bookings management
- [x] User profiles

### v2.1 (Next)
- [ ] Guide application flow
- [ ] Review submission
- [ ] Push notifications (Firebase FCM)
- [ ] Email confirmations (SendGrid)

### v3.0 (Production)
- [ ] Stripe payment integration for tips
- [ ] Google Maps for meeting points
- [ ] Photo upload (S3/Cloudinary)
- [ ] Multi-language support

---

## 📄 License

GNU General Public License v3.0 - See [LICENSE](LICENSE) for details.

---

**Built with ❤️ for Nepal** 🇳🇵
