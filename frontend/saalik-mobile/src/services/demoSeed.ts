// ─────────────────────────────────────────────────────────────────────────────
// Saalik — Demo Mode seed data
//
// Two pre-baked personas (one Traveler, one Guide) who share a real catalog
// of tours so the app feels like a closed loop:
//
//   • The Guide ("Bishnu") owns 3 of the catalog tours
//   • The Traveler ("Aanya") has Bishnu among her past/upcoming bookings
//   • Bishnu's dashboard sees Aanya's booking incoming
//
// Persona content (bios, review voice, tour titles, earnings) was authored by
// the brand & growth strategist on May 4, 2026 — kept as-is so the demo voice
// stays consistent with brand. Numbers (party size, tips, ratings) match the
// finance memo's per-booking economics.
//
// This file is *pure data*. demoSession.ts owns the runtime state machine.
// ─────────────────────────────────────────────────────────────────────────────

import type { AuthUser } from '@app-types/auth';
import type {
  Booking,
  BookingStatus,
  Guide,
  Review,
  Tour,
  TourSchedule,
} from '@app-types/api';

// ─── Personas ────────────────────────────────────────────────────────────────

export type DemoPersona = 'traveler-aanya' | 'guide-bishnu';

/**
 * Aanya — 26, product designer in Bangalore. Booked 9 days in Nepal after a
 * brutal product launch. Reads three Substacks before booking a hotel and
 * skips temples that show up at the top of Google Image search. Wants
 * neighbourhoods over monuments, conversations over photo ops.
 */
export const TRAVELER_USER: AuthUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'suman.dangal@demo.saalik.app',
  name: 'Suman Dangal',
  avatar:
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=face',
  role: 'TRAVELER',
};

/**
 * Bishnu — 38, Newar, lives in Patan (Lalitpur). Day job: archivist at a
 * heritage trust. Guides on weekends and two weekday mornings. Trained as
 * an architect, lived in Osaka for a year, runs small walks through the
 * Newar quarters his grandmother still lives in.
 */
export const GUIDE_USER: AuthUser = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'bishnu.maharjan@demo.saalik.app',
  name: 'Bishnu Maharjan',
  avatar:
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
  role: 'GUIDE',
};

// ─── Date helpers ────────────────────────────────────────────────────────────

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};
export const isoDaysFromNow = (n: number) => daysFromNow(n).toISOString();

// ─── Bishnu's profile (Guide model) ──────────────────────────────────────────

export const GUIDE_PROFILE: Guide = {
  id: 'guide-bishnu',
  userId: GUIDE_USER.id,
  bio:
    "I grew up three lanes from Patan Durbar Square — my grandmother still lives in the same house, " +
    "and the brick under our courtyard is older than most countries. I trained as an architect, but I " +
    "kept finding myself explaining doorframes to my friends instead of designing new ones, so here we " +
    "are. I run small walks through the Newar quarters of Patan and Kathmandu — courtyards most tourists " +
    "walk past, the metalsmiths in Oku Bahal, my aunt's kitchen if you're up for it. I speak slow " +
    "English, faster Nepali, and a little Japanese from a year in Osaka.",
  languages: ['Nepali', 'Newari', 'English', 'Hindi', 'Conversational Japanese'],
  specialties: [
    'Newari heritage & courtyards',
    'Hidden food stops',
    'Slow walks for older travelers',
    'Architecture & metalcraft',
  ],
  certifications: [
    'Nepal Tourism Board — Licensed Cultural Tour Guide (No. NTB-CG-4421, renewed 2025)',
  ],
  yearsExperience: 6,
  isVerified: true,
  rating: 4.92,
  totalTours: 312,
  totalReviews: 267,
  user: { id: GUIDE_USER.id, name: GUIDE_USER.name, avatar: GUIDE_USER.avatar ?? undefined },
};

// ─── Additional local guides (Tokha + valley) ────────────────────────────────
// These guides only exist as embedded Guide objects on their tours — they are
// not login personas. Tour cards & detail screens read `tour.guide` directly,
// so no extra auth plumbing is needed.

/**
 * Sita — 44, Tokha. Her family has boiled chaku (sugarcane molasses) in the
 * same courtyard for four generations. Started guiding when travelers kept
 * knocking to watch the winter boil. Knows every lane, temple and pati in the
 * old town north of Kathmandu.
 */
export const GUIDE_SITA: Guide = {
  id: 'guide-sita',
  userId: 'user-sita',
  bio:
    "I'm from Tokha — the Newar town north of Kathmandu where chaku comes from. My family has made " +
    "it in the same courtyard for four generations; in winter the whole lane smells of boiling " +
    "sugarcane. I started guiding when travelers kept stopping to watch us work. I'll show you the " +
    "old salt-route town most people drive straight past on their way to Shivapuri.",
  languages: ['Nepali', 'Newari', 'English', 'Hindi'],
  specialties: ['Chaku & winter food traditions', 'Tokha Newar heritage', 'Temple rituals & festivals'],
  certifications: ['Nepal Tourism Board — Licensed Local Guide (No. NTB-CG-5108, 2024)'],
  yearsExperience: 5,
  isVerified: true,
  rating: 4.93,
  totalTours: 84,
  totalReviews: 71,
  user: {
    id: 'user-sita',
    name: 'Sita Tamrakar',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
  },
};

/**
 * Rajan — 36, Bhaktapur. Prajapati (potter caste). Throws pots at Pottery
 * Square most mornings before the tour groups arrive, then walks travelers
 * through the medieval city he grew up in.
 */
export const GUIDE_RAJAN: Guide = {
  id: 'guide-rajan',
  userId: 'user-rajan',
  bio:
    "I'm a Prajapati — potter caste — born three minutes from Pottery Square in Bhaktapur. I still " +
    "throw clay most mornings; my hands know this city. I'll take you past the postcard temples into " +
    "the workshops, the juju dhau kitchens, and the courtyards where Bhaktapur actually lives.",
  languages: ['Nepali', 'Newari', 'English'],
  specialties: ['Pottery & traditional crafts', 'Newar architecture', 'Juju dhau & sweets'],
  certifications: ['Nepal Tourism Board — Licensed Cultural Guide (No. NTB-CG-4870, 2023)'],
  yearsExperience: 8,
  isVerified: true,
  rating: 4.9,
  totalTours: 196,
  totalReviews: 158,
  user: {
    id: 'user-rajan',
    name: 'Rajan Prajapati',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face',
  },
};

/**
 * Laxmi — 41, Patan (Lalitpur). Shakya — the silver/metal craft lineage of
 * Patan. Runs a small lost-wax workshop in Oku Bahal and guides craft-focused
 * walks through the Buddhist courtyards of the city.
 */
export const GUIDE_LAXMI: Guide = {
  id: 'guide-laxmi',
  userId: 'user-laxmi',
  bio:
    "Shakya, born in Patan, raised around molten metal. My family casts statues by the lost-wax " +
    "method in Oku Bahal — the same way it's been done here for a thousand years. I guide travelers " +
    "who want to understand how a city of artisans actually works, not just photograph it.",
  languages: ['Nepali', 'Newari', 'English'],
  specialties: ['Metalcraft & lost-wax casting', 'Buddhist courtyards (bahals)', 'Stone & wood carving'],
  certifications: ['Nepal Tourism Board — Licensed Cultural Guide (No. NTB-CG-4699, 2022)'],
  yearsExperience: 9,
  isVerified: true,
  rating: 4.95,
  totalTours: 241,
  totalReviews: 203,
  user: {
    id: 'user-laxmi',
    name: 'Laxmi Shakya',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face',
  },
};

/** Registry of every guide in the demo catalog, resolvable by id. */
export const DEMO_GUIDES: Guide[] = [GUIDE_PROFILE, GUIDE_SITA, GUIDE_RAJAN, GUIDE_LAXMI];

// ─── Bishnu's tours (catalog) ────────────────────────────────────────────────

const mkSchedule = (
  id: string,
  tourId: string,
  dayOfWeek: number,
  startTime: string,
): TourSchedule => ({ id, tourId, dayOfWeek, startTime, isActive: true });

export const BISHNU_TOURS: Tour[] = [
  {
    id: 'tour-bishnu-1',
    guideId: GUIDE_PROFILE.id,
    title: 'Hidden Patan: Courtyards, Metalsmiths & a Newari Lunch',
    description:
      "Six bahals most guidebooks miss, ending at a thali in a 200-year-old kitchen. We slip behind the " +
      "postcard side of Patan Durbar Square into the courtyards locals still live in. You'll see " +
      "metalsmiths working bronze the way they have for 600 years, drink masala chai in a bahal that " +
      "almost no tourist finds, and end at my aunt's place for a real Newari thali (not the hotel version).",
    duration: 240,
    distance: 3.5,
    maxGroupSize: 8,
    meetingPoint: 'Patan Durbar Square — Krishna Mandir steps',
    meetingLat: 27.6731,
    meetingLng: 85.3253,
    hub: 'Patan',
    category: 'CULTURAL',
    highlights: [
      'Six hidden Newar courtyards (bahals) most tourists never see',
      'Live metalsmithing demo at a 4th-generation workshop in Oku Bahal',
      'Masala chai stop at a 70-year-old neighbourhood shop',
      'Newari thali lunch at a 200-year-old family kitchen',
    ],
    included: ['Local guide', 'Newari thali lunch', 'Chai stop', 'Workshop entry'],
    notIncluded: ['Transport to/from Patan', 'Personal purchases'],
    photos: [
      'https://images.unsplash.com/photo-1585016495481-91613a3ab1bc?w=800&h=600&fit=crop',
      'https://commons.wikimedia.org/wiki/Special:FilePath/Nepal_Patan_Durbar_Square_10_%28full_res%29.jpg?width=800',
    ],
    isActive: true,
    rating: 4.94,
    totalReviews: 142,
    guide: GUIDE_PROFILE,
    schedules: [
      mkSchedule('sched-bishnu-1a', 'tour-bishnu-1', 2, '09:30'),
      mkSchedule('sched-bishnu-1b', 'tour-bishnu-1', 6, '09:30'),
    ],
  },
  {
    id: 'tour-bishnu-2',
    guideId: GUIDE_PROFILE.id,
    title: 'Kathmandu Spice Market & Newari Home Kitchen',
    description:
      "Asan is where Kathmandu eats. We walk the spice quarter with a vendor who knows me, then head " +
      "to my aunt's place for yomari and chatamari — homemade, the way she makes them on festival days.",
    duration: 210,
    distance: 2.5,
    maxGroupSize: 6,
    meetingPoint: 'Asan Tole — Annapurna temple corner',
    meetingLat: 27.7079,
    meetingLng: 85.3128,
    hub: 'Kathmandu',
    category: 'FOOD',
    highlights: [
      '8+ stalls in the spice quarter with tasting',
      'Saffron and timur (Sichuan pepper) sourcing tour',
      "Yomari and chatamari at my aunt's house",
      'Traditional lassi at a 70-year-old shop',
    ],
    included: ['Lunch', 'All food tastings', 'Lassi', 'Recipe card to take home'],
    notIncluded: ['Personal spice purchases'],
    photos: [
      'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop',
    ],
    isActive: true,
    rating: 4.95,
    totalReviews: 89,
    guide: GUIDE_PROFILE,
    schedules: [
      mkSchedule('sched-bishnu-2a', 'tour-bishnu-2', 3, '10:00'),
      mkSchedule('sched-bishnu-2b', 'tour-bishnu-2', 0, '10:00'),
    ],
  },
  {
    id: 'tour-bishnu-3',
    guideId: GUIDE_PROFILE.id,
    title: 'Slow Walk Patan: Built for Curious Grandparents',
    description:
      "Same square, half the steps, twice the stories — designed for travelers who want to linger. " +
      "Cobblestones are easier on this route, plenty of places to sit, and the pacing is set for " +
      "people who'd rather hear one story properly than rush through ten.",
    duration: 150,
    distance: 1.8,
    maxGroupSize: 6,
    meetingPoint: 'Patan Museum entrance (with seated wait area)',
    meetingLat: 27.6731,
    meetingLng: 85.3253,
    hub: 'Patan',
    category: 'CULTURAL',
    highlights: [
      'Designed for travelers 65+ or with mobility considerations',
      'Three rest stops with seated tea',
      'Slower pacing — fewer landmarks, deeper stories',
      'Optional rickshaw return to your hotel',
    ],
    included: ['Local guide', 'Two tea stops', 'Patan Museum entry'],
    notIncluded: ['Rickshaw return (optional, ~NPR 400)'],
    photos: [
      'https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=800&h=600&fit=crop',
    ],
    isActive: true,
    rating: 4.91,
    totalReviews: 36,
    guide: GUIDE_PROFILE,
    schedules: [
      mkSchedule('sched-bishnu-3a', 'tour-bishnu-3', 4, '15:00'),
      mkSchedule('sched-bishnu-3b', 'tour-bishnu-3', 6, '15:00'),
    ],
  },
];

// ─── Image helper ────────────────────────────────────────────────────────────
// CC-licensed imagery via Wikimedia Commons. Special:FilePath auto-generates a
// thumbnail at the requested width and follows the redirect — stable for RN
// <Image>. Full attribution (author + licence) lives in the git-ignored
// IMAGE_CREDITS_PRIVATE.md. NOTE: parentheses must be percent-encoded too.
const cc = (file: string, width = 900): string =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/` +
  encodeURIComponent(file).replace(/\(/g, '%28').replace(/\)/g, '%29') +
  `?width=${width}`;

// ─── Tokha tours (Sita) ──────────────────────────────────────────────────────
// Tokha = historic Newar town ~8 km north of Kathmandu; home of chaku, on the
// old Kathmandu–Tibet salt route, gateway to Shivapuri–Nagarjun NP.
// TODO(owner): meeting coordinates are approximate — replace with exact GPS pins.

export const TOKHA_TOURS: Tour[] = [
  {
    id: 'tour-tokha-1',
    guideId: GUIDE_SITA.id,
    title: "Tokha Chaku Trail: Nepal's Sweetest Winter Tradition",
    description:
      "Chaku — dark, chewy sugarcane molasses — comes from Tokha, and in winter the whole town smells " +
      "of it. We visit a family courtyard mid-boil, watch the cane juice reduce and get pulled by hand " +
      "into glossy ropes, and taste it warm with sesame. You'll learn why every Nepali eats chaku on " +
      "Maghe Sankranti, and leave with a paper bag of the real thing.",
    duration: 180,
    distance: 2.5,
    maxGroupSize: 8,
    meetingPoint: 'Tokha Chowk (old town square), Tokha',
    meetingLat: 27.7466,
    meetingLng: 85.33,
    hub: 'Tokha',
    category: 'FOOD',
    highlights: [
      'Watch chaku boiled and hand-pulled in a working family courtyard',
      'Taste fresh warm chaku with til (sesame) and ghee',
      'The story of chaku and Maghe Sankranti, told by a fourth-generation maker',
      'Take home a bag of Tokha chaku',
    ],
    included: ['Local guide', 'All chaku tastings', 'A bag of chaku to take home'],
    notIncluded: ['Transport from Kathmandu', 'Tips'],
    photos: [cc('Chaku.jpg'), cc('Maghe Sankranti Food.jpg')],
    isActive: true,
    rating: 4.97,
    totalReviews: 58,
    guide: GUIDE_SITA,
    schedules: [
      mkSchedule('sched-tokha-1a', 'tour-tokha-1', 6, '10:00'),
      mkSchedule('sched-tokha-1b', 'tour-tokha-1', 0, '10:00'),
    ],
  },
  {
    id: 'tour-tokha-2',
    guideId: GUIDE_SITA.id,
    title: 'Tokha Old Town: The Newar Village North of Kathmandu',
    description:
      "Most people blow through Tokha on the way to Shivapuri. We slow down and walk the brick lanes " +
      "of one of the valley's best-kept Newar towns — carved windows, hidden courtyards, the " +
      "Chandeshwori and old Shiva temples, and the dabali platforms where the town still gathers. " +
      "Quiet, real, and almost entirely untouristed.",
    duration: 150,
    distance: 2.0,
    maxGroupSize: 10,
    meetingPoint: 'Chandeshwori Temple, Tokha',
    meetingLat: 27.748,
    meetingLng: 85.3296,
    hub: 'Tokha',
    category: 'CULTURAL',
    highlights: [
      'Chandeshwori and Bhootkhel Shiva temples',
      'Newar courtyards (chowks) and carved 17th–18th century windows',
      'The dabali platforms where festivals and masked dances happen',
      'How an old trade town lives today',
    ],
    included: ['Local guide', 'Temple entries', 'Tea stop'],
    notIncluded: ['Transport from Kathmandu', 'Tips'],
    photos: [
      cc('Chandeshwori Temple Tokha Tokha Municipility Kathmandu Nepal Rajesh Dhungana (15).jpg'),
      cc('Shiva Temple Bhootkhel Tokha Kathmandu Nepal Rajesh Dhungana (1).jpg'),
    ],
    isActive: true,
    rating: 4.9,
    totalReviews: 31,
    guide: GUIDE_SITA,
    schedules: [
      mkSchedule('sched-tokha-2a', 'tour-tokha-2', 2, '09:30'),
      mkSchedule('sched-tokha-2b', 'tour-tokha-2', 5, '09:30'),
    ],
  },
  {
    id: 'tour-tokha-3',
    guideId: GUIDE_SITA.id,
    title: 'Shivapuri Sunrise: Forest Trail from Tokha to Nagi Gompa',
    description:
      "A pre-dawn climb from Tokha into Shivapuri–Nagarjun National Park. We walk up through oak and " +
      "rhododendron forest as the valley wakes, reach the Tibetan Buddhist nunnery at Nagi Gompa for " +
      "morning chanting, and look back over the whole Kathmandu Valley. A proper hike with a spiritual " +
      "payoff — and far fewer people than Nagarkot.",
    duration: 330,
    distance: 9.0,
    maxGroupSize: 8,
    meetingPoint: 'Shivapuri NP gate (Pani Muhan), above Tokha',
    meetingLat: 27.76,
    meetingLng: 85.338,
    hub: 'Tokha',
    category: 'NATURE',
    highlights: [
      'Sunrise over the Kathmandu Valley from the Shivapuri ridge',
      'Morning chanting at Nagi Gompa nunnery',
      'Oak & rhododendron cloud-forest, birds and langurs',
      'A national-park hike that starts 8 km from the city',
    ],
    included: ['Local guide', 'National park entry', 'Trail snacks & tea'],
    notIncluded: ['Transport to the trailhead', 'Tips'],
    photos: [
      cc('Near BaagDwar @ Shivapuri National Park.jpg'),
      cc('Shivapuri Nagarjun National Park inside.jpg'),
    ],
    isActive: true,
    rating: 4.94,
    totalReviews: 23,
    guide: GUIDE_SITA,
    schedules: [
      mkSchedule('sched-tokha-3a', 'tour-tokha-3', 6, '05:00'),
      mkSchedule('sched-tokha-3b', 'tour-tokha-3', 3, '05:00'),
    ],
  },
  {
    id: 'tour-tokha-4',
    guideId: GUIDE_SITA.id,
    title: "The Forgotten Salt Route: Tokha's Trade-Trail History",
    description:
      "Before the highways, salt and wool came down from Tibet and grain went up — and much of it " +
      "passed through Tokha. We trace the old route on foot: the stone-paved stretches, the pati and " +
      "sattal rest houses built for traders, the Rana-era Tokha Durbar, and the water spouts that kept " +
      "caravans going. A history walk for people who like the story under the stones.",
    duration: 165,
    distance: 3.0,
    maxGroupSize: 10,
    meetingPoint: 'Tokha Durbar (old palace), Tokha',
    meetingLat: 27.7459,
    meetingLng: 85.3309,
    hub: 'Tokha',
    category: 'HISTORICAL',
    highlights: [
      'Surviving stretches of the old Kathmandu–Tibet trade trail',
      'Pati & sattal rest houses and stone water spouts (hiti)',
      'The Rana-era Tokha Durbar',
      'How the salt trade built a Newar town',
    ],
    included: ['Local guide', 'Tea stop'],
    notIncluded: ['Transport from Kathmandu', 'Tips'],
    photos: [
      cc('Shiva Temple Bhootkhel Tokha Kathmandu Nepal Rajesh Dhungana (3).jpg'),
      cc('Sankhu Village.JPG'),
    ],
    isActive: true,
    rating: 4.88,
    totalReviews: 17,
    guide: GUIDE_SITA,
    schedules: [
      mkSchedule('sched-tokha-4a', 'tour-tokha-4', 1, '11:00'),
      mkSchedule('sched-tokha-4b', 'tour-tokha-4', 4, '11:00'),
    ],
  },
  {
    id: 'tour-tokha-5',
    guideId: GUIDE_SITA.id,
    title: 'Tokha After Dark: Temple Aarti & a Newar Home Kitchen',
    description:
      "An evening in Tokha: oil lamps at the Chandeshwori temple for the dusk aarti, then dinner at my " +
      "family's house — a proper Newar spread of bara, chatamari, aloo tama and, of course, chaku for " +
      "dessert. Small group, slow pace, real conversation around a real table.",
    duration: 180,
    distance: 1.5,
    maxGroupSize: 6,
    meetingPoint: 'Chandeshwori Temple, Tokha',
    meetingLat: 27.748,
    meetingLng: 85.3296,
    hub: 'Tokha',
    category: 'FOOD',
    highlights: [
      'Dusk aarti (lamp ritual) at the Chandeshwori temple',
      "Home-cooked Newar dinner at the guide's family house",
      'Bara, chatamari, aloo tama — and chaku for dessert',
      'Tiny group, no rush',
    ],
    included: ['Local guide', 'Full Newar dinner', 'Temple offering'],
    notIncluded: ['Transport from Kathmandu', 'Tips'],
    photos: [
      cc('Chaku NP.jpg'),
      cc('Chandeshwori Temple Tokha Tokha Municipility Kathmandu Nepal Rajesh Dhungana (15).jpg'),
    ],
    isActive: true,
    rating: 4.96,
    totalReviews: 26,
    guide: GUIDE_SITA,
    schedules: [
      mkSchedule('sched-tokha-5a', 'tour-tokha-5', 5, '17:00'),
      mkSchedule('sched-tokha-5b', 'tour-tokha-5', 6, '17:00'),
    ],
  },
];

// ─── Kathmandu Valley tours (Bhaktapur · Patan · Kathmandu) ──────────────────
// TODO(owner): meeting coordinates are approximate — replace with exact GPS pins.

export const VALLEY_TOURS: Tour[] = [
  // — Bhaktapur (Rajan) —
  {
    id: 'tour-bkt-1',
    guideId: GUIDE_RAJAN.id,
    title: "Bhaktapur Pottery Square & the Potter's Wheel",
    description:
      "I'm a potter — this is the city I throw clay in. We start at Pottery Square where the wheels " +
      "still spin, you'll try centring a pot yourself, then we walk the medieval lanes to the Golden " +
      "Gate and the 55-Window Palace. Clay, brick and 600 years of muscle memory.",
    duration: 210,
    distance: 3.0,
    maxGroupSize: 8,
    meetingPoint: 'Pottery Square, Bhaktapur',
    meetingLat: 27.671,
    meetingLng: 85.427,
    hub: 'Bhaktapur',
    category: 'CULTURAL',
    highlights: [
      'Try the potter\'s wheel with a working Prajapati potter',
      'Pottery Square, the Golden Gate and the 55-Window Palace',
      'Sun-drying yards and the clay supply chain',
      'Why Bhaktapur survived the earthquakes better than most',
    ],
    included: ['Local guide', 'Pottery demo & hands-on try', 'Bhaktapur entry fee'],
    notIncluded: ['Pottery purchases', 'Tips'],
    photos: [
      cc('In and around Bhaktapur Pottery Square 07.jpg'),
      cc('View of Bhaktapur Durbar Square.jpg'),
    ],
    isActive: true,
    rating: 4.91,
    totalReviews: 84,
    guide: GUIDE_RAJAN,
    schedules: [
      mkSchedule('sched-bkt-1a', 'tour-bkt-1', 2, '09:00'),
      mkSchedule('sched-bkt-1b', 'tour-bkt-1', 6, '09:00'),
    ],
  },
  {
    id: 'tour-bkt-2',
    guideId: GUIDE_RAJAN.id,
    title: 'Nyatapola at Dawn: Bhaktapur Before the Crowds',
    description:
      "Bhaktapur is a different city at 6am — mist on the brick, locals doing morning puja, the " +
      "five-tiered Nyatapola glowing in first light and not a tour bus in sight. A photographer's " +
      "walk timed for the best light and the emptiest squares.",
    duration: 150,
    distance: 2.5,
    maxGroupSize: 6,
    meetingPoint: 'Taumadhi Square (Nyatapola Temple), Bhaktapur',
    meetingLat: 27.6715,
    meetingLng: 85.4287,
    hub: 'Bhaktapur',
    category: 'PHOTOGRAPHY',
    highlights: [
      'Sunrise light on the five-tiered Nyatapola Temple',
      'Empty Durbar Square before the day-trippers arrive',
      'Morning rituals, flower sellers and the first chiya shops',
      'Best photo spots from a local who shoots them daily',
    ],
    included: ['Local guide', 'Bhaktapur entry fee', 'Morning chiya (tea)'],
    notIncluded: ['Camera gear', 'Tips'],
    photos: [
      cc('Nyatpola & Bhairav Temple.jpg'),
      cc('View of Bhaktapur Durbar Square.jpg'),
    ],
    isActive: true,
    rating: 4.95,
    totalReviews: 47,
    guide: GUIDE_RAJAN,
    schedules: [
      mkSchedule('sched-bkt-2a', 'tour-bkt-2', 0, '06:00'),
      mkSchedule('sched-bkt-2b', 'tour-bkt-2', 4, '06:00'),
    ],
  },
  {
    id: 'tour-bkt-3',
    guideId: GUIDE_RAJAN.id,
    title: 'Juju Dhau & the Sweet Side of Bhaktapur',
    description:
      "Bhaktapur's other claim to fame: juju dhau, the 'king of yogurts', set in clay pots that I help " +
      "make. We taste it where it's made, then graze through the city's sweets — lakhamari, sel roti, " +
      "and the curd-and-chiura combos locals actually eat. Come hungry.",
    duration: 165,
    distance: 2.5,
    maxGroupSize: 8,
    meetingPoint: 'Dattatreya Square, Bhaktapur',
    meetingLat: 27.6725,
    meetingLng: 85.4318,
    hub: 'Bhaktapur',
    category: 'FOOD',
    highlights: [
      "Juju dhau (the 'king curd') tasted where it's set",
      'Lakhamari, sel roti and seasonal Newar sweets',
      'The clay-pot connection between potters and yogurt makers',
      'Dattatreya Square and the peacock window',
    ],
    included: ['Local guide', 'All food tastings', 'Bhaktapur entry fee'],
    notIncluded: ['Extra purchases', 'Tips'],
    photos: [
      cc('View of Bhaktapur Durbar Square.jpg'),
      cc('In and around Bhaktapur Pottery Square 07.jpg'),
    ],
    isActive: true,
    rating: 4.89,
    totalReviews: 39,
    guide: GUIDE_RAJAN,
    schedules: [
      mkSchedule('sched-bkt-3a', 'tour-bkt-3', 3, '11:00'),
      mkSchedule('sched-bkt-3b', 'tour-bkt-3', 6, '13:00'),
    ],
  },
  // — Patan / Lalitpur (Laxmi) —
  {
    id: 'tour-ptn-1',
    guideId: GUIDE_LAXMI.id,
    title: 'Patan Metal Artisans: Lost-Wax Casting in Oku Bahal',
    description:
      "Patan is a city of metalworkers, and I'm one of them. We go inside a lost-wax workshop in Oku " +
      "Bahal to see how a lump of beeswax becomes a bronze deity, then walk the Buddhist courtyards " +
      "(bahals) where this craft has lived for a thousand years. Hands-on, smoky, and real.",
    duration: 195,
    distance: 2.5,
    maxGroupSize: 6,
    meetingPoint: 'Patan Museum entrance, Patan Durbar Square',
    meetingLat: 27.6731,
    meetingLng: 85.3253,
    hub: 'Patan',
    category: 'CULTURAL',
    highlights: [
      'Inside a working lost-wax (cire perdue) casting workshop',
      'Oku Bahal and the hidden Buddhist courtyards of Patan',
      'How a wax model becomes a bronze statue',
      'Meet a multi-generation Shakya artisan family',
    ],
    included: ['Local guide', 'Workshop visit', 'Patan Museum entry'],
    notIncluded: ['Statue purchases', 'Tips'],
    photos: [
      cc('2023 - Patan Museum - Keshav Narayan Chowk & Bidya Mandira - img 0.jpg'),
      cc('Nepal Patan Durbar Square 10 (full res).jpg'),
    ],
    isActive: true,
    rating: 4.96,
    totalReviews: 63,
    guide: GUIDE_LAXMI,
    schedules: [
      mkSchedule('sched-ptn-1a', 'tour-ptn-1', 1, '10:00'),
      mkSchedule('sched-ptn-1b', 'tour-ptn-1', 5, '10:00'),
    ],
  },
  {
    id: 'tour-ptn-2',
    guideId: GUIDE_LAXMI.id,
    title: 'Krishna Mandir & the Stone Carvers of Patan',
    description:
      "The Krishna Mandir is carved entirely from stone — 21 gilded spires, the whole Mahabharata cut " +
      "into its friezes. We read it together, then explore the Patan Museum (the finest in the country) " +
      "and the Durbar Square that surrounds it. Architecture and devotion, slowly.",
    duration: 165,
    distance: 1.8,
    maxGroupSize: 10,
    meetingPoint: 'Krishna Mandir, Patan Durbar Square',
    meetingLat: 27.6727,
    meetingLng: 85.3255,
    hub: 'Patan',
    category: 'HISTORICAL',
    highlights: [
      'The all-stone Krishna Mandir and its Mahabharata friezes',
      'Patan Museum — the best-curated museum in Nepal',
      'Mangal Bazaar and the surrounding Durbar Square',
      'Malla-era stone, wood and metal in one square',
    ],
    included: ['Local guide', 'Patan Museum entry', 'Durbar Square fee'],
    notIncluded: ['Tips'],
    photos: [
      cc('Krishna Mandir, Patan, Lalitpur.jpg'),
      cc('Nepal Patan Durbar Square 10 (full res).jpg'),
    ],
    isActive: true,
    rating: 4.92,
    totalReviews: 51,
    guide: GUIDE_LAXMI,
    schedules: [
      mkSchedule('sched-ptn-2a', 'tour-ptn-2', 2, '14:00'),
      mkSchedule('sched-ptn-2b', 'tour-ptn-2', 0, '11:00'),
    ],
  },
  // — Kathmandu (Bishnu) —
  {
    id: 'tour-ktm-1',
    guideId: GUIDE_PROFILE.id,
    title: 'Kathmandu Durbar Square & the Living Goddess Kumari',
    description:
      "The old royal heart of Kathmandu: Hanuman Dhoka, the Kasthamandap, the pagoda temples — and the " +
      "Kumari Ghar, home of Nepal's living child goddess, who sometimes appears at her window. We read " +
      "the square's layers, from Malla kings to the 2015 quake and the restoration since.",
    duration: 150,
    distance: 2.0,
    maxGroupSize: 10,
    meetingPoint: 'Maju Deval steps, Kathmandu Durbar Square',
    meetingLat: 27.7045,
    meetingLng: 85.307,
    hub: 'Kathmandu',
    category: 'HISTORICAL',
    highlights: [
      'The Kumari Ghar — home of the living goddess',
      'Hanuman Dhoka palace and the Kasthamandap',
      'Earthquake damage and the ongoing restoration',
      'Asan bazaar tea stop to finish',
    ],
    included: ['Local guide', 'Durbar Square entry', 'Tea stop'],
    notIncluded: ['Tips'],
    photos: [
      cc('Basantapurpalace.JPG'),
      cc('Asan Square, Kathmandu (2).jpg'),
    ],
    isActive: true,
    rating: 4.87,
    totalReviews: 72,
    guide: GUIDE_PROFILE,
    schedules: [
      mkSchedule('sched-ktm-1a', 'tour-ktm-1', 1, '09:30'),
      mkSchedule('sched-ktm-1b', 'tour-ktm-1', 4, '09:30'),
    ],
  },
  {
    id: 'tour-ktm-2',
    guideId: GUIDE_PROFILE.id,
    title: 'Swayambhu Sunrise & the Prayer-Wheel Kora',
    description:
      "Climb the 365 steps to Swayambhunath as the valley wakes, spin the prayer wheels on a morning " +
      "kora, and watch the city appear below the all-seeing eyes. We talk about how one hill can be " +
      "sacred to both Buddhists and Hindus, and end with Tibetan tea.",
    duration: 150,
    distance: 2.5,
    maxGroupSize: 8,
    meetingPoint: 'Swayambhunath east stairway base, Kathmandu',
    meetingLat: 27.7149,
    meetingLng: 85.2904,
    hub: 'Kathmandu',
    category: 'RELIGIOUS',
    highlights: [
      'Sunrise over the valley from the Swayambhu hill',
      'A morning kora spinning the prayer wheels',
      'Why the hill is holy to Buddhists and Hindus alike',
      'Tibetan butter tea to finish',
    ],
    included: ['Local guide', 'Swayambhu entry', 'Tibetan tea'],
    notIncluded: ['Tips'],
    photos: [
      cc('Swayambhunath 2018.jpg'),
      cc('Boudhanath stupa , Kathmandu, Nepal.jpg'),
    ],
    isActive: true,
    rating: 4.93,
    totalReviews: 68,
    guide: GUIDE_PROFILE,
    schedules: [
      mkSchedule('sched-ktm-2a', 'tour-ktm-2', 0, '05:30'),
      mkSchedule('sched-ktm-2b', 'tour-ktm-2', 3, '05:30'),
    ],
  },
];

// ─── Full catalog + curated featured set ─────────────────────────────────────

/** Everything bookable in the demo, across all guides. */
export const CATALOG_TOURS: Tour[] = [...BISHNU_TOURS, ...TOKHA_TOURS, ...VALLEY_TOURS];

/** A curated, varied set for the Home "Featured" rail. */
const FEATURED_IDS = ['tour-tokha-1', 'tour-bkt-2', 'tour-ptn-1', 'tour-bishnu-1', 'tour-tokha-3'];
export const FEATURED_TOURS: Tour[] = FEATURED_IDS.map(
  (id) => CATALOG_TOURS.find((t) => t.id === id)!,
).filter(Boolean);

// ─── Reviews on Bishnu's tours (visible across both personas) ────────────────

export const BISHNU_REVIEWS: Review[] = [
  {
    id: 'review-bishnu-1',
    tourId: 'tour-bishnu-1',
    userId: 'demo-reviewer-1',
    rating: 5,
    title: 'A tiny lassi shop running 70 years — that sentence alone',
    comment:
      "Bishnu took us to a tiny shop in Asan that's been making lassi the same way for 70 years — " +
      "the owner's grandfather started it. That sentence alone was worth the trip, but he kept doing " +
      "this for four hours. Knew every shopkeeper. Bought my daughter a sweet from the woman who used " +
      'to babysit him.',
    createdAt: isoDaysFromNow(-8),
    user: {
      name: 'Mara Lindqvist',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    },
  },
  {
    id: 'review-bishnu-2',
    tourId: 'tour-bishnu-2',
    userId: 'demo-reviewer-2',
    rating: 5,
    title: 'The way he handled my missing wallet was the tell',
    comment:
      "I had a panic moment when my wallet went missing halfway through. Bishnu didn't make a thing " +
      "of it — covered the rickshaw, walked me back to the last stall, and we found it under a sack " +
      'of cardamom. Saved the day without a hint of fuss. The tour itself was brilliant; the way he ' +
      'handled that was the tell.',
    createdAt: isoDaysFromNow(-5),
    user: {
      name: 'Daniel Okafor',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    },
  },
  {
    id: 'review-bishnu-3',
    tourId: 'tour-bishnu-1',
    userId: 'demo-reviewer-3',
    rating: 5,
    title: 'You feel like you\'re inside the language',
    comment:
      'What got me was the way he code-switches mid-story — explains the Malla dynasty in clean ' +
      'English, then drops into Nepali to joke with the metalsmith, then back. You feel like ' +
      "you're inside the language, not standing outside it. The thali at the end had eight things " +
      "on it I'd never eaten.",
    createdAt: isoDaysFromNow(-14),
    user: { name: 'Ishita Bhattacharya' },
  },
  {
    id: 'review-bishnu-4',
    tourId: 'tour-bishnu-3',
    userId: 'demo-reviewer-4',
    rating: 4,
    title: 'Magic, but the meeting-point pin was off',
    comment:
      'Lovely man, genuinely. Took my parents (78 and 81) and pacing was perfect. Only nit: the ' +
      'meeting point WhatsApp pin was off by a block and we wandered in the rain for ten minutes. ' +
      'Once we found him, magic. Five stars on everything except the pin drop.',
    createdAt: isoDaysFromNow(-21),
    user: { name: 'Sam & Greg Holloway' },
  },
  {
    id: 'review-bishnu-5',
    tourId: 'tour-bishnu-2',
    userId: 'demo-reviewer-5',
    rating: 5,
    title: 'Still thinking about the chatamari three weeks later',
    comment:
      "We talked about Osaka the whole walk because he lived there one year. The food stop at his " +
      'aunt\'s house — chatamari, aloo tama, homemade tomato achar — I\'m still thinking about it ' +
      'three weeks later. Tipped more than I planned. Worth it.',
    createdAt: isoDaysFromNow(-2),
    user: {
      name: 'Yuki Tanaka',
      avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop&crop=face',
    },
  },
];

// ─── Reviews on the wider catalog (Tokha + Valley tours) ─────────────────────

export const CATALOG_REVIEWS: Review[] = [
  {
    id: 'review-tokha-1',
    tourId: 'tour-tokha-1',
    userId: 'demo-reviewer-6',
    rating: 5,
    title: 'Watched chaku being pulled like taffy on a wooden peg',
    comment:
      "I had no idea Tokha was THE place for chaku before this trip. Sita took us into her family " +
      "workshop where they boil the sugarcane molasses down and then pull it on a wooden peg until " +
      "it turns pale gold. Got to try pulling it myself — harder than it looks. Came home with a bag " +
      'and a story for every piece.',
    createdAt: isoDaysFromNow(-4),
    user: {
      name: 'Hannah Weiss',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
    },
  },
  {
    id: 'review-tokha-3',
    tourId: 'tour-tokha-3',
    userId: 'demo-reviewer-7',
    rating: 5,
    title: 'Sunrise over the valley from Nagi Gompa — no crowds',
    comment:
      "We started in the dark from Tokha and were at Nagi Gompa for first light. A nun was sweeping " +
      "the courtyard and the whole valley was under cloud below us. Zero tourists. Sita knew exactly " +
      'when to leave so we hit the ridge at the right moment. Bring a warm layer — it bites up there.',
    createdAt: isoDaysFromNow(-9),
    user: { name: 'Theo Marchetti' },
  },
  {
    id: 'review-bkt-2',
    tourId: 'tour-bkt-2',
    userId: 'demo-reviewer-8',
    rating: 5,
    title: 'Nyatapola at dawn, empty, golden — a photographer\'s dream',
    comment:
      "Rajan met us at 5:30am and we had the five-tiered Nyatapola entirely to ourselves as the " +
      "light came up. He knows every angle — put me on the temple steps for the shot I'd been " +
      'chasing the whole trip. Then milk tea and juju dhau as the square woke up. Unreal.',
    createdAt: isoDaysFromNow(-6),
    user: {
      name: 'Priya Raman',
      avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&h=100&fit=crop&crop=face',
    },
  },
  {
    id: 'review-ptn-1',
    tourId: 'tour-ptn-1',
    userId: 'demo-reviewer-9',
    rating: 5,
    title: 'Lost-wax casting in Oku Bahal — three generations at one bench',
    comment:
      "Laxmi's family has cast bronze in Patan for generations and it shows. We watched a statue go " +
      "from beeswax model to clay mould to molten metal. The detail on the finishing — chasing every " +
      'curl of a deity\'s hair by hand — made me understand why these pieces cost what they cost.',
    createdAt: isoDaysFromNow(-11),
    user: { name: 'Marcus Bähr' },
  },
  {
    id: 'review-bkt-1',
    tourId: 'tour-bkt-1',
    userId: 'demo-reviewer-10',
    rating: 4,
    title: 'Threw my own (wonky) pot in Pottery Square',
    comment:
      "Genuinely fun — the potter spun up a bowl in 30 seconds and then let me try. Mine came out " +
      "lopsided but it's drying on my shelf now. Half a star off only because the square gets busy " +
      'by mid-morning; go early like Rajan suggests.',
    createdAt: isoDaysFromNow(-17),
    user: {
      name: 'Elena Costa',
      avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=100&h=100&fit=crop&crop=face',
    },
  },
];

/** Every review across the catalog — used by tour detail + guide review reads. */
export const ALL_REVIEWS: Review[] = [...BISHNU_REVIEWS, ...CATALOG_REVIEWS];

// ─── Aanya's pre-baked bookings (linked to Bishnu's tours + others) ──────────

const tourById = (id: string): Tour => {
  const t = BISHNU_TOURS.find((x) => x.id === id);
  if (!t) throw new Error(`tour ${id} not found in BISHNU_TOURS`);
  return t;
};
const scheduleById = (tourId: string, scheduleId: string): TourSchedule => {
  const sched = tourById(tourId).schedules?.find((s) => s.id === scheduleId);
  if (!sched) throw new Error(`schedule ${scheduleId} not found`);
  return sched;
};

export const TRAVELER_BOOKINGS: Booking[] = [
  // Upcoming — Saturday, 4 days from now (party of 2: Aanya + her mom).
  {
    id: 'booking-aanya-upcoming',
    tourId: 'tour-bishnu-1',
    scheduleId: 'sched-bishnu-1b',
    userId: TRAVELER_USER.id,
    bookingDate: isoDaysFromNow(4),
    partySize: 2,
    status: 'CONFIRMED' satisfies BookingStatus,
    notes:
      "Bringing my mom — she walks slow on cobblestones and is vegetarian (no onion/garlic if " +
      'possible). She loves textiles, would love anywhere we can watch someone make something by hand.',
    createdAt: isoDaysFromNow(-2),
    tour: tourById('tour-bishnu-1'),
    schedule: scheduleById('tour-bishnu-1', 'sched-bishnu-1b'),
  },
  // Past completed — Spice market with $25 tip, single party
  {
    id: 'booking-aanya-past-1',
    tourId: 'tour-bishnu-2',
    scheduleId: 'sched-bishnu-2a',
    userId: TRAVELER_USER.id,
    bookingDate: isoDaysFromNow(-7),
    partySize: 1,
    status: 'COMPLETED' satisfies BookingStatus,
    tipAmount: 25,
    tipCurrency: 'USD',
    createdAt: isoDaysFromNow(-12),
    tour: tourById('tour-bishnu-2'),
    schedule: scheduleById('tour-bishnu-2', 'sched-bishnu-2a'),
  },
  // Past completed — Slow Walk Patan with $15 tip
  {
    id: 'booking-aanya-past-2',
    tourId: 'tour-bishnu-3',
    scheduleId: 'sched-bishnu-3a',
    userId: TRAVELER_USER.id,
    bookingDate: isoDaysFromNow(-15),
    partySize: 1,
    status: 'COMPLETED' satisfies BookingStatus,
    tipAmount: 15,
    tipCurrency: 'USD',
    createdAt: isoDaysFromNow(-20),
    tour: tourById('tour-bishnu-3'),
    schedule: scheduleById('tour-bishnu-3', 'sched-bishnu-3a'),
  },
  // Cancelled — Nagarkot booking, food poisoning
  {
    id: 'booking-aanya-cancelled',
    tourId: 'tour-bishnu-1',
    scheduleId: 'sched-bishnu-1a',
    userId: TRAVELER_USER.id,
    bookingDate: isoDaysFromNow(-22),
    partySize: 2,
    status: 'CANCELLED' satisfies BookingStatus,
    notes:
      "Stomach bug from day 2 — didn't want to risk it. Will rebook for next trip.",
    createdAt: isoDaysFromNow(-25),
    tour: tourById('tour-bishnu-1'),
    schedule: scheduleById('tour-bishnu-1', 'sched-bishnu-1a'),
  },
];

// ─── Aanya's reviews (her past tour reviews) ─────────────────────────────────

export const TRAVELER_REVIEWS: Review[] = [
  {
    id: 'review-aanya-1',
    tourId: 'tour-bishnu-2',
    userId: TRAVELER_USER.id,
    rating: 5,
    title: 'Tipped 50% extra and still felt like I underpaid',
    comment:
      "Bishnu's aunt cooks the chatamari. I asked for the recipe and got a handwritten card. The " +
      'spice market section was a masterclass — I\'ve been cooking Indian food my whole life and ' +
      "learned new things. Booked his Patan walk for next week with my mom.",
    createdAt: isoDaysFromNow(-6),
    user: { name: TRAVELER_USER.name, avatar: TRAVELER_USER.avatar ?? undefined },
  },
  {
    id: 'review-aanya-2',
    tourId: 'tour-bishnu-3',
    userId: TRAVELER_USER.id,
    rating: 5,
    title: 'Slow, quiet, exactly what I needed',
    comment:
      "Did this on my third afternoon in Patan. Came back to the hotel with my notebook full of " +
      "stories. Bishnu doesn't perform — he just tells you about the city he grew up in.",
    createdAt: isoDaysFromNow(-14),
    user: { name: TRAVELER_USER.name, avatar: TRAVELER_USER.avatar ?? undefined },
  },
];

// ─── Aanya's wishlist (saved tour IDs from the wider catalog) ────────────────

export const TRAVELER_WISHLIST: string[] = ['tour-bishnu-1', 'tour-tokha-1', 'tour-bkt-2'];

// ─── Bishnu's incoming bookings (his side of the marketplace) ────────────────
// He sees Aanya's upcoming + several other travelers' upcoming + recent past tours.

export const GUIDE_INCOMING_BOOKINGS: Booking[] = [
  // Aanya's upcoming — same booking ID so the system has one source of truth
  TRAVELER_BOOKINGS[0]!,
  {
    id: 'booking-incoming-1',
    tourId: 'tour-bishnu-2',
    scheduleId: 'sched-bishnu-2b',
    userId: 'demo-other-1',
    bookingDate: isoDaysFromNow(2),
    partySize: 4,
    status: 'CONFIRMED',
    notes: 'Family of 4, two kids (8 and 11). Any nut allergies considered?',
    createdAt: isoDaysFromNow(-5),
    tour: tourById('tour-bishnu-2'),
    schedule: scheduleById('tour-bishnu-2', 'sched-bishnu-2b'),
  },
  {
    id: 'booking-incoming-2',
    tourId: 'tour-bishnu-1',
    scheduleId: 'sched-bishnu-1a',
    userId: 'demo-other-2',
    bookingDate: isoDaysFromNow(6),
    partySize: 1,
    status: 'CONFIRMED',
    createdAt: isoDaysFromNow(-1),
    tour: tourById('tour-bishnu-1'),
    schedule: scheduleById('tour-bishnu-1', 'sched-bishnu-1a'),
  },
  {
    id: 'booking-incoming-3',
    tourId: 'tour-bishnu-3',
    scheduleId: 'sched-bishnu-3a',
    userId: 'demo-other-3',
    bookingDate: isoDaysFromNow(9),
    partySize: 3,
    status: 'PENDING',
    notes: "My parents are 78 and 81 — pacing matters. They love textiles.",
    createdAt: isoDaysFromNow(0),
    tour: tourById('tour-bishnu-3'),
    schedule: scheduleById('tour-bishnu-3', 'sched-bishnu-3a'),
  },
];

// ─── Bishnu's earnings dashboard data ────────────────────────────────────────

export interface GuideEarnings {
  last7DaysUsd: number;
  last30DaysUsd: number;
  allTimeUsd: number;
  bookingsLast7Days: number;
  bookingsLast30Days: number;
  payoutPendingUsd: number;
  /** Daily breakdown for the last 7 days — used in the dashboard sparkline. */
  daily: { date: string; tipUsd: number }[];
}

const dailyTips = (): { date: string; tipUsd: number }[] => {
  // Believable daily fluctuation — most tours are weekend-heavy.
  // Numbers chosen to sum to last7DaysUsd = 112 (matches finance memo).
  const sequence = [0, 22, 35, 0, 30, 0, 25];
  const tips: { date: string; tipUsd: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = daysFromNow(-i);
    tips.push({ date: d.toISOString(), tipUsd: sequence[6 - i] ?? 0 });
  }
  return tips;
};

export const GUIDE_EARNINGS: GuideEarnings = {
  last7DaysUsd: 112,
  last30DaysUsd: 418,
  allTimeUsd: 11_840,
  bookingsLast7Days: 3,
  bookingsLast30Days: 11,
  payoutPendingUsd: 142,
  daily: dailyTips(),
};
