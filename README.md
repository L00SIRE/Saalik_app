# Saalik

> **Free walking tours in Nepal — built like a Series A product on a $0 budget.**

Saalik is a two-sided marketplace connecting travelers with passionate local guides ("Saaliks") across Kathmandu, Pokhara, Bhaktapur, and beyond. Tours are free to book; travelers tip guides after the experience.

This README is the single source of truth for setting up, running, and scaling the project. It is intentionally opinionated about **free-tier services** — every recommendation here is something you can run in production today without a credit card.

---

## Table of Contents

1. [Architecture at a glance](#architecture-at-a-glance)
2. [Quick start](#quick-start)
3. [Environment variables](#environment-variables)
4. [Mock mode vs. live mode](#mock-mode-vs-live-mode)
5. [Project layout](#project-layout)
6. [Auth model (deep dive)](#auth-model-deep-dive)
7. [Free-tier production stack](#free-tier-production-stack)
8. [Scaling roadmap](#scaling-roadmap)
9. [Known inconsistencies](#known-inconsistencies)
10. [Brand & design system](#brand--design-system)
11. [License](#license)

---

## Architecture at a glance

```
┌──────────────────────────────────────────────────────────────────────┐
│                       Saalik Mobile (Expo / RN)                      │
│                                                                      │
│  ┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐   │
│  │  AuthContext    │    │  TanStack Query  │    │   Navigation   │   │
│  │  (split state + │    │  + AsyncStorage  │    │  Auth / Trav.  │   │
│  │  actions)       │    │  persister       │    │  / Guide tabs  │   │
│  └────────┬────────┘    └────────┬─────────┘    └────────────────┘   │
│           │                      │                                   │
│           ▼                      ▼                                   │
│  ┌────────────────────────────────────────────┐                      │
│  │  axios client (interceptors)               │                      │
│  │  ─ attaches access token                   │                      │
│  │  ─ on 401: queue → refresh → retry         │                      │
│  │  ─ on refresh fail: emit auth-failure      │                      │
│  └────────────────┬───────────────────────────┘                      │
└───────────────────┼──────────────────────────────────────────────────┘
                    │ HTTPS
                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Saalik API (Node + Express)                      │
│                                                                      │
│   /auth (login, register, refresh, logout, me)                       │
│   /tours      /bookings      /guides      /reviews                   │
│   /experience  /chatbot  /ai  ──────────────────►  Gemini API        │
│                                                                      │
│              Prisma ORM ──► SQLite (dev) / Postgres (prod)           │
└──────────────────────────────────────────────────────────────────────┘
```

**Highlights:**
- Strict TypeScript end-to-end. Zod validates every cross-boundary payload.
- Refresh-token rotation with replay-attack detection (any reuse invalidates the entire session family).
- Offline-first mobile UX: persisted React Query cache + `networkMode: 'offlineFirst'`.
- RBAC routing: `TRAVELER` and `GUIDE`/`ADMIN` see different navigators.
- Path aliases (`@components`, `@services`, `@context`, …) configured in both Babel and TS.

---

## Quick start

**Prereqs:** Node 18+, npm, Xcode (for iOS sim) or Android Studio, Expo CLI.

```bash
# 1. Clone & install
git clone https://github.com/<your-fork>/Saalik_app.git
cd Saalik_app

# 2. Backend
cd backend
cp .env.example .env                 # then edit secrets
npm install
npx prisma generate
npx prisma migrate dev --name init   # creates dev.db
npm run db:seed                      # loads demo tours/guides
npm run dev                          # http://localhost:4000

# 3. Mobile (in a separate terminal)
cd frontend/saalik-mobile
cp .env.example .env                 # localhost defaults work for iOS sim
npm install
npx expo run:ios                     # first run builds native modules
# subsequent runs: npx expo start
```

> First mobile launch must be `expo run:ios` (or `run:android`) because we use `expo-secure-store`, which requires a custom dev client. After the native build is cached, `expo start` is enough.

**Demo credentials** (seeded by `npm run db:seed`):
- Email: `demo@saalik.com`
- Password: `demo123`

---

## Environment variables

Two `.env` files, both gitignored. Copy from the matching `.env.example` and edit.

### `backend/.env`
| Var | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `development` / `production` |
| `PORT` | yes | API port (default 4000) |
| `DATABASE_URL` | yes | SQLite for dev, Postgres URL for prod |
| `JWT_SECRET` | yes | 64-byte hex — `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `REFRESH_TOKEN_SECRET` | yes | **Different** 64-byte hex from `JWT_SECRET` |
| `GEMINI_API_KEY` | optional | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — free tier |
| `GEMINI_MODEL` | optional | Default `gemini-2.0-flash` |
| `AI_MAX_TOKENS` / `AI_TEMPERATURE` | optional | AI sampling params |

### `frontend/saalik-mobile/.env`
| Var | Required | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | yes | iOS sim → `http://localhost:4000/api`. Android emulator → `http://10.0.2.2:4000/api`. Physical device → your LAN IP. |
| `EXPO_PUBLIC_USE_MOCK` | optional | `true` to short-circuit the API client with in-memory fixtures |

> **Expo gotcha:** only vars prefixed with `EXPO_PUBLIC_` are exposed to the JS bundle. They are NOT secret — assume anything in this file ships to every install. Real secrets stay server-side.

---

## Mock mode vs. live mode

Saalik ships with a flippable mock mode so you can demo the UI without running the backend.

- **Mock mode** (current default): `src/services/api.ts` short-circuits all requests with hardcoded fixtures. `MOCK_USER.id` is a valid UUID v4 (`00000000-0000-4000-8000-000000000001`) so the Zod schema in `src/types/auth.ts` accepts it.
- **Live mode**: set `EXPO_PUBLIC_USE_MOCK=false` (and ensure `USE_MOCK` constant in `api.ts` reads from env, see [Known inconsistencies](#known-inconsistencies)). The mobile app then talks to the real API.

Mock mode is great for: design reviews, App Store screenshots, CI snapshot tests, working offline on a flight.

---

## Project layout

```
Saalik_app/
├── README.md                         ← you are here
├── PROGRESS.md                       ← what's done, what's next
├── LICENSE                           ← GPLv3
│
├── backend/
│   ├── .env / .env.example
│   ├── prisma/
│   │   ├── schema.prisma             ← User, RefreshToken, Tour, Booking, Review, …
│   │   └── seed.ts                   ← demo data
│   └── src/
│       ├── index.ts                  ← Express app entry
│       ├── db.ts                     ← shared Prisma client
│       └── routes/
│           ├── auth.ts               ← ✅ rewritten: rotation + replay detection
│           ├── tours.ts
│           ├── bookings.ts           ← ⚠️ legacy JWT pattern (see PROGRESS)
│           ├── guides.ts             ← ⚠️ legacy
│           ├── reviews.ts            ← ⚠️ legacy
│           ├── experience.ts         ← ⚠️ legacy
│           ├── ai.ts                 ← ⚠️ bare `new PrismaClient()` bug
│           └── chatbot.ts
│
└── frontend/saalik-mobile/
    ├── .env / .env.example
    ├── App.tsx                       ← PersistQueryClientProvider root
    ├── babel.config.js               ← path aliases
    ├── tsconfig.json                 ← matching paths
    └── src/
        ├── components/
        ├── screens/                  ← Login, Home, TourDetail, …
        ├── navigation/
        │   ├── AppNavigator.tsx      ← RBAC switch (loading / auth / role)
        │   ├── TravelerNavigator.tsx
        │   └── GuideNavigator.tsx
        ├── context/
        │   └── AuthContext.tsx       ← split state/actions, useReducer
        ├── services/
        │   ├── api.ts                ← axios + refresh queue + mock layer
        │   ├── tokenManager.ts       ← expo-secure-store wrapper
        │   └── queryClient.ts        ← TanStack Query + AsyncStorage persister
        ├── hooks/
        │   └── useBookings.ts        ← optimistic cancel with rollback
        ├── types/
        │   ├── auth.ts               ← Zod auth schemas
        │   ├── api.ts
        │   └── navigation.ts         ← typed param lists
        └── theme/
            └── colors.ts
```

---

## Auth model (deep dive)

The auth implementation is the load-bearing piece of the app — worth understanding before touching it.

**Tokens.** Two JWTs:
- **Access token** — 15 min lifetime, signed with `JWT_SECRET`. Sent as `Authorization: Bearer <token>`.
- **Refresh token** — 30 day lifetime, signed with `REFRESH_TOKEN_SECRET`. Carries a `tokenId` (UUID) that's also persisted in the `RefreshToken` Prisma table.

**Rotation.** Every `/auth/refresh` call:
1. Verifies the JWT signature.
2. Looks up `tokenId` in the DB. If missing → the token was already rotated, so this is a replay attempt: **delete every refresh token for this user** and return 401. The user's other devices are forcibly logged out — by design, because the session is compromised.
3. Otherwise: delete the old DB row, issue a brand-new access + refresh pair.

**Mobile side.** `src/services/api.ts` runs a single-flight refresh queue: concurrent 401s (e.g. user opens the app and 4 queries fire simultaneously) all wait on the same in-flight refresh promise — no thundering herd. On refresh failure, `registerAuthFailureHandler` is invoked, the AuthContext clears state, and `AppNavigator` swaps to the auth stack.

**Storage.** Tokens live in `expo-secure-store` with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` — Keychain on iOS, EncryptedSharedPreferences on Android. Never `AsyncStorage` for credentials.

---

## Free-tier production stack

Everything below has a usable free tier. Pick from each layer:

| Layer | Recommended (free) | Why | Limits to watch |
|---|---|---|---|
| **API hosting** | [Render](https://render.com/pricing) free web service | Zero-config, auto HTTPS, GitHub deploy | Spins down after 15 min idle (cold start) |
| **API hosting (alt)** | [Fly.io](https://fly.io/docs/about/pricing/) free allowance | No cold starts, 3 shared-cpu VMs | Card required, generous free credit |
| **Postgres** | [Supabase](https://supabase.com/pricing) free | Realtime, auth-as-needed, S3-compatible storage | 500 MB DB, 2 projects max, pauses after 1 week inactive |
| **Postgres (alt)** | [Neon](https://neon.tech/pricing) free | Branching, autoscale-to-zero | 0.5 GB storage |
| **Object storage** | [Cloudflare R2](https://developers.cloudflare.com/r2/pricing/) | **Zero egress fees** — huge for image-heavy apps | 10 GB free, 1M Class A ops/mo |
| **Push notifications** | [Expo Push](https://docs.expo.dev/push-notifications/sending-notifications/) | Wraps APNs+FCM, no key needed | Free, rate-limited per project |
| **Email (transactional)** | [Resend](https://resend.com/pricing) | Cleanest DX of any email API | 3 K emails/mo, 100/day |
| **AI** | [Google AI Studio](https://aistudio.google.com/apikey) (Gemini) | Already wired in `routes/ai.ts` | 15 RPM, 1.5 K req/day on `gemini-2.0-flash` |
| **Maps** | [Google Maps](https://mapsplatform.google.com/pricing/) | Industry standard | $200 free credit/mo (~28 K map loads) |
| **Error tracking** | [Sentry](https://sentry.io/pricing/) | RN SDK is excellent | 5 K errors / 10 K perf units per month |
| **Product analytics** | [PostHog Cloud](https://posthog.com/pricing) | Self-hostable later | 1 M events/mo, 5 K session recordings |
| **CI/builds** | [Expo EAS](https://expo.dev/pricing) free | Cloud iOS+Android builds, OTA updates | 30 builds/mo (paid for priority) |
| **Source/CI** | GitHub Actions free | Standard | 2 K min/mo on public repos, more if you go private+pro |
| **Domain** | Cloudflare Registrar | At-cost pricing, free DNS | ~$10/yr for `.app`, `.com` |

**Total monthly cost to run Saalik in soft-launch with everything above: $0–$10** (just the domain).

The first thing you'll outgrow is Render's cold starts on the API — solve by upgrading to Render Standard ($7/mo) or migrating to Fly. The second is Supabase's 500 MB; Neon scales further on the free tier.

---

## Scaling roadmap

A practical path from "demo runs locally" to "10K MAU."

### Phase 0 — Today
- SQLite, mock mode default on, single dev machine. Ship UI demos.

### Phase 1 — Soft launch (0 → 500 users)
- Move DB to **Supabase free** (run `prisma migrate deploy` against the new URL).
- Deploy backend to **Render free** + custom domain on Cloudflare.
- Build standalone mobile via **EAS** (free tier covers it).
- **Sentry** + **PostHog** wired in mobile from day one — cheaper to debug than to guess.
- Flip `EXPO_PUBLIC_USE_MOCK=false`.

### Phase 2 — Public launch (500 → 5K users)
- Replace Render free → Render Standard or Fly (kill cold starts).
- Add **Cloudflare R2** + signed URLs for tour photos.
- Add **Resend** for booking confirmations.
- Rate-limit auth + booking endpoints (`express-rate-limit` + Redis on Upstash free tier — 10K cmd/day).
- Migrate the legacy routes (see [Known inconsistencies](#known-inconsistencies)) onto the new auth middleware.
- Add **Google Sign-In + Apple Sign-In** (the placeholder buttons in `LoginScreen.tsx` already exist; swap mock handlers for real `expo-auth-session` flows).

### Phase 3 — Growth (5K → 50K users)
- Postgres read replicas (Supabase pro / Neon scale).
- Move Prisma to Prisma Accelerate or PgBouncer for connection pooling.
- Background jobs: BullMQ + Upstash Redis for emails, push, payouts.
- Stripe Connect for guide payouts (tips, premium tours).
- Image pipeline: Cloudflare Images for resize/CDN.

### Phase 4 — Series A territory (50K+)
- Split the API: auth, tours, bookings, search as separate services if a single bottleneck appears (don't pre-split).
- Move search to MeiliSearch (self-host on Fly) or Algolia (free 10K records).
- i18n: Nepali + Hindi + English + Mandarin (target audiences: Indian, Chinese, Western tourists).

---

## Known inconsistencies

Documented in detail in [PROGRESS.md](./PROGRESS.md). Quick summary:

1. **Legacy JWT fallback in old routes** — `bookings.ts`, `guides.ts`, `reviews.ts`, `experience.ts` still use `process.env.JWT_SECRET || 'secret'`. The new `auth.ts` uses `'dev_access_secret_CHANGE_IN_PROD'`. Tokens issued by one won't validate in the other. **Fix:** extract a shared `requireAuth` middleware. Tracked in PROGRESS.
2. **`ai.ts` instantiates its own `PrismaClient`** without the better-sqlite3 driver adapter — crashes on first request. **Fix:** import the shared client from `src/db.ts`.
3. **`USE_MOCK` is a constant in `api.ts`**, not read from `EXPO_PUBLIC_USE_MOCK`. The env var documented above is currently aspirational — wire it up before flipping mock mode in prod.
4. **No rate limiting** on `/auth/login` — easy brute-force vector. Add `express-rate-limit` with a strict policy on auth endpoints before public launch.
5. **No CSRF / origin checks** on the API. We're token-based, so CSRF risk is low, but origin validation is cheap and worth adding.

---

## Brand & design system

### Colors
| Color | Hex | Use |
|---|---|---|
| Background | `#021d0f` | Dark forest green |
| Card | `rgba(2, 18, 8, 0.85)` | Translucent overlay |
| Accent | `#15ff75` | CTAs, highlights |
| Accent muted | `#0cc65a` | Secondary accent |
| Text primary | `#f8fff4` | Foreground on dark |
| Text secondary | `#94d5a3` | Muted green |
| Border | `rgba(21, 255, 117, 0.4)` | Tinted dividers |
| Error | `#ff6b6b` | Failures |

### Category palette
Historical `#8B5CF6` · Cultural `#EC4899` · Food `#F59E0B` · Religious `#6366F1` · Adventure `#10B981` · Photography `#3B82F6` · Nature `#22C55E` · Nightlife `#A855F7`

---

## License

GNU General Public License v3.0 — see [LICENSE](./LICENSE).

---

**Built for Nepal.** If you ship something with this code, drop a note in Issues — would love to see it.
