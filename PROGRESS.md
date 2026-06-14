# Saalik — Implementation Progress

Last updated: 2026-05-05

This is the working stage doc. When tokens run out and you come back, **start here**.
The README is for sharing; this file is for you.

---

## TL;DR

- **Auth + RBAC + offline-first query layer** — done, working in iOS sim.
- **Design system + UI polish** — full token layer (spacing/radii/shadows/typography), Button/Card/Tag/Chip/EmptyState/ScreenHeader/SectionHeader/IconButton primitives, every traveler screen refactored. Series A look.
- **Demo mode** — full two-persona experience (Aanya the traveler + Bishnu the guide) with persistent state, demo banner, persona picker on login, real guide dashboard with earnings sparkline. App Store reviewer-ready.
- **Growth & monetization strategy** — full memo in [GROWTH_STRATEGY.md](./GROWTH_STRATEGY.md). Five revenue lines, unit econs, 3-nudge demo→signup funnel, KPI dashboard.
- **Live API** — not verified end-to-end yet (needs `USE_MOCK` flag wired to env, plus the legacy-route auth migration below).
- **Inconsistencies** — 5 documented, none blocking the demo, all blocking public launch.

---

## ✅ Completed

### Demo mode (May 2026)

**Design philosophy:** demo mode is a thin layer over the existing auth machinery, not a parallel codebase. Synthetic tokens (`demo-access-{persona}`) discriminate demo from real; AsyncStorage persists state across kill+relaunch (Apple reviewers will do this); persona-isolated stores prevent cross-contamination.

- [x] `src/services/demoSeed.ts` — pure data: `TRAVELER_USER` (Aanya), `GUIDE_USER` (Bishnu), `GUIDE_PROFILE` (4.92★, 312 tours, 267 reviews), `BISHNU_TOURS` (3 listings), `BISHNU_REVIEWS` (5 voiced reviews), `TRAVELER_BOOKINGS` (1 upcoming + 2 past + 1 cancelled), `TRAVELER_REVIEWS` (Aanya's 2 reviews), `TRAVELER_WISHLIST`, `GUIDE_INCOMING_BOOKINGS`, `GUIDE_EARNINGS` (last 7d: $112 / 30d: $418 / all-time: $11,840 + daily sparkline).
- [x] `src/services/demoSession.ts` — singleton state machine with AsyncStorage persistence (`saalik_demo_session_v1`). Read APIs: `listTours`, `getTour`, `listFeatured`, `getGuide`, `listReviewsForTour`, `listTravelerBookings`, `getGuideEarnings`, `listGuideOwnTours`, `getGuideOwnReviews`, `listGuideIncoming`, `getWishlist`. Mutate: `start`, `reset`, `stop`, `createTravelerBooking`, `cancelTravelerBooking`, `tipTravelerBooking`, `addReview`, `toggleWishlist`, `recordNudgeImpression`.
- [x] `src/types/auth.ts` — added `DemoPersona = 'traveler-aanya' | 'guide-bishnu'`, `AuthState.demoPersona`, `RESTORE`/`SIGN_IN` actions accept demoPersona.
- [x] `src/context/AuthContext.tsx` — added `loginAsDemo`, `resetDemo`, `exitDemo` actions. Bootstrap order: demo session → real session. `useAuth()` exposes `isDemo` boolean.
- [x] `src/services/api.ts` — every fetch function checks `demo.isActive()` and short-circuits to `demoSession` reads/mutations. `searchTours`, `getFeaturedTours`, `getTourById`, `getGuideById`, `getMyBookings`, `createBooking`, `cancelBooking`, `addTip`, `createReview`, `getTourReviews`, `getMe` all routed.
- [x] `src/components/DemoBanner.tsx` — sticky accent strip at top of app when `isDemo`. Persona label + one-tap exit.
- [x] `src/screens/LoginScreen.tsx` — added prominent "Look around first" demo card above email form. Two persona pickers using brand strategist's exact copy.
- [x] `src/screens/GuideDashboardScreen.tsx` — Bishnu's home screen. Greeting + earnings card with 7-day sparkline + quick actions (new tour / schedule / payouts / messages) + incoming bookings list (with PENDING accept/decline) + recent reviews.
- [x] `src/screens/GuideMyToursScreen.tsx` — listings management. Live/Paused tags, stats strip, edit/view actions.
- [x] `src/navigation/GuideNavigator.tsx` — wired the new screens, removed stub placeholders.
- [x] `src/navigation/AppNavigator.tsx` — DemoBanner mounted at root, sits above the navigator.
- [x] `src/screens/ProfileScreen.tsx` — when `isDemo`, prepends a "Demo session" group with Reset + Exit rows. Hides the regular log-out button.

**Demo flow that works end-to-end today:**
1. Open app → "Look around first" card on login
2. Tap "Aanya — Traveler" or "Bishnu — Guide"
3. Lands inside the right navigator with demo banner showing
4. As Aanya: see her upcoming Patan booking, past tours, can book new ones, leave reviews, all persists across reload
5. As Bishnu: see earnings dashboard ($112 last 7d), incoming bookings (one is Aanya's), accept PENDING bookings, browse own tour listings
6. Profile screen shows Reset (re-seed) + Exit (back to login) options

### Frontend (mobile) — earlier rounds

**Auth & state**
- [x] `src/types/auth.ts` — Zod schemas (`UserRoleSchema`, `AuthUserSchema`, `AuthResponseSchema`, `LoginSchema`, `RegisterSchema`) + types (`AuthUser`, `AuthState`, `AuthAction`, `AuthStatus`).
- [x] `src/services/tokenManager.ts` — `expo-secure-store` wrapper with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` keychain, keys `saalik_at` / `saalik_rt`.
- [x] `src/context/AuthContext.tsx` — `useReducer` + split contexts (`AuthStateContext` + `AuthActionsContext`), bootstrap on mount, `registerAuthFailureHandler` wiring. Exports `useAuthState`, `useAuthActions`, `useAuth` (back-compat), `useRequireAuth`.
- [x] `src/services/api.ts` — axios client + request/response interceptors, single-flight refresh queue (`isRefreshing` / `refreshQueue` / `drainQueue`), `registerAuthFailureHandler` callback. Mock layer returns `{ accessToken, refreshToken, user }`.
- [x] **Mock UUID fix** — `MOCK_USER.id = '00000000-0000-4000-8000-000000000001'` (Zod v4's strict UUID regex requires version `[1-8]` + variant `[89abAB]`).

**Navigation (RBAC)**
- [x] `src/types/navigation.ts` — typed param lists for AuthStack, ExploreStack, TripsStack, TravelerTabs, GuideTabs.
- [x] `src/navigation/TravelerNavigator.tsx` — 3 tabs (Explore / Trips / Profile).
- [x] `src/navigation/GuideNavigator.tsx` — 3 tabs (Dashboard / MyTours / GuideProfile) with stub screens.
- [x] `src/navigation/AppNavigator.tsx` — switch on `(status, user.role)`: `loading` → LoadingScreen; unauthenticated → Login; `GUIDE`/`ADMIN` → GuideNavigator; else TravelerNavigator.

**Data layer**
- [x] `src/services/queryClient.ts` — TanStack Query with `staleTime: 5min`, `gcTime: 24h`, `networkMode: 'offlineFirst'`, retry skips 401/403/404. AsyncStorage persister with key `saalik_rq_v1`.
- [x] `src/hooks/useBookings.ts` — `useUpcomingBookings`, `usePastBookings`, `useCancelBooking` with optimistic update via `qc.setQueryData` + rollback on error.
- [x] `App.tsx` — root wrapped with `PersistQueryClientProvider`.

**Tooling**
- [x] `tsconfig.json` + `babel.config.js` — `@context` path alias added (matched both files).
- [x] `LoginScreen.tsx` — error catch surfaces real messages (`e.response?.data?.error ?? e?.message`).

### Backend

- [x] `prisma/schema.prisma` — `RefreshToken` model with `@@index([userId])` + cascade delete; `User.refreshTokens RefreshToken[]` relation.
- [x] `src/routes/auth.ts` — full rewrite:
  - bcrypt cost 12
  - `signAccessToken` (15m) / `issueRefreshToken` (30d, UUID stored in DB)
  - `/refresh` with rotation + replay detection (deletes ALL user tokens on reuse)
  - `/logout` — best-effort token revocation
  - `/me` — Bearer token check
  - constant-time bcrypt comparison even on missing user (prevents enumeration)
- [x] `prisma migrate dev` + `prisma generate` ran successfully.

### Docs / config (this session)

- [x] `backend/.env.example` — every var documented + free-tier links.
- [x] `backend/.env` — working dev defaults (gitignored).
- [x] `frontend/saalik-mobile/.env.example` — same treatment.
- [x] `frontend/saalik-mobile/.env` — gitignored.
- [x] `README.md` — rewritten as full project doc (architecture, setup, free-tier stack, scaling roadmap, brand).
- [x] `PROGRESS.md` — this file.
- [x] `.gitignore` audit — root, `backend/`, and `frontend/saalik-mobile/` all already exclude `.env` variants. No changes needed.

---

## ⚠️ Pending — code inconsistencies (not blocking demo, blocking launch)

### 1. Legacy JWT pattern in old routes
**Files:** `backend/src/routes/{bookings,guides,reviews,experience}.ts`

These still inline:
```ts
jwt.verify(token, process.env.JWT_SECRET || 'secret')
```

The new `auth.ts` uses `process.env.JWT_SECRET ?? 'dev_access_secret_CHANGE_IN_PROD'`. **Tokens issued by `auth.ts` won't validate in these routes** because the dev fallbacks differ. In prod (with `JWT_SECRET` set) it works, but the inconsistency is fragile.

**Fix:**
1. Create `backend/src/middleware/requireAuth.ts` — exports `requireAuth(req, res, next)` that reads the same `ACCESS_SECRET` constant, attaches `req.user`.
2. Replace inline `jwt.verify` calls in the four legacy routes with `router.use(requireAuth)` or per-route `requireAuth`.
3. Move `ACCESS_SECRET` / `REFRESH_SECRET` constants into a shared `backend/src/config/auth.ts`.

Estimated effort: ~30 minutes. **Do this before flipping mock mode off.**

### 2. `ai.ts` bare PrismaClient
**File:** `backend/src/routes/ai.ts`

Constructs `new PrismaClient()` directly. The project uses better-sqlite3 with a driver adapter, so the client must be built with the adapter (which `src/db.ts` already does).

**Fix:** Replace `new PrismaClient()` with `import prisma from '../db'`. One-line change.

### 3. `USE_MOCK` not reading env
**File:** `frontend/saalik-mobile/src/services/api.ts`

`USE_MOCK` is currently a hardcoded constant. The `.env.example` documents `EXPO_PUBLIC_USE_MOCK` but nothing reads it.

**Fix:**
```ts
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';
```
(remember Expo only inlines `EXPO_PUBLIC_*` at build time — restart Metro).

### 4. No rate limiting on auth
**File:** `backend/src/index.ts` (or wherever the Express app is composed)

`/auth/login` has no rate limit. Brute-force is trivial.

**Fix:** `npm i express-rate-limit`, add a strict limiter on `/auth/*` (e.g., 10 req / 15 min per IP for login, 30 / 15 min for refresh).

### 5. No CSRF / origin check
We're stateless JWT, so CSRF risk is low. But adding an `Origin` header allowlist in prod is cheap insurance against XHR exploits if someone embeds the API.

**Fix:** `cors({ origin: ALLOWED_ORIGINS })` in prod config.

---

## 🐛 Known runtime issues (lower priority)

- **Mobile native build cache** — if you change a native dep, `npx expo start` is not enough. Re-run `npx expo run:ios`. (Documented in README quick start.)
- **CocoaPods on macOS sometimes throws Unicode errors** — workaround in shell: `LANG=en_US.UTF-8 npx expo run:ios`.

---

## 🎯 Next session — recommended order

When you have tokens again, this is the path:

1. **Fix inconsistency #2** (`ai.ts` PrismaClient) — 1 minute, removes a guaranteed crash.
2. **Fix inconsistency #1** (auth middleware extraction) — half an hour, unblocks live mode.
3. **Fix inconsistency #3** (`USE_MOCK` from env) — 5 minutes.
4. **Verify live mode**: backend `npm run dev`, mobile with `EXPO_PUBLIC_USE_MOCK=false`, register a new user, kill the app, reopen, confirm refresh-token bootstrap works without re-login.
5. **Add rate limiting** (#4).
6. **Wire real Google/Apple sign-in** — placeholders in `LoginScreen.tsx` already exist; swap mock handlers for `expo-auth-session` (Google) and `expo-apple-authentication`. Backend needs an `/auth/oauth/{provider}` endpoint that verifies the ID token, upserts the user, returns the same `{ user, accessToken, refreshToken }` shape.
7. **Image upload via Cloudflare R2** — schema already has `tour.images String[]` etc., just need a presigned-URL endpoint + an `<ImagePicker>` flow.

---

## 📝 Architectural decisions worth not forgetting

- **Why split AuthStateContext / AuthActionsContext?** Components that only dispatch (e.g. a logout button) won't re-render when `user` changes. Standard perf pattern for context.
- **Why `networkMode: 'offlineFirst'`?** TanStack's default `'online'` mode pauses queries when offline. `'offlineFirst'` returns cache and tries to revalidate — much better for a travel app where users will be in spotty coverage.
- **Why store refresh tokens in the DB?** Lets us revoke them. Pure-JWT refresh tokens can't be revoked without a denylist, which defeats the point.
- **Why is `MOCK_USER.id` a UUID v4?** Zod v4 tightened UUID regex. The id flows through `AuthUserSchema.parse()` on bootstrap and would fail validation if it weren't well-formed.
- **Why not hardcode the API URL?** Different in iOS sim (`localhost`), Android emulator (`10.0.2.2`), physical device (LAN IP), and prod. Env var is the only sane way.

---

## 🤝 If someone else picks this up

Read `README.md` first, then this file, then `src/services/api.ts` and `src/context/AuthContext.tsx`. Those two files contain ~80% of the architecturally interesting decisions. Everything else is screens and CRUD.
