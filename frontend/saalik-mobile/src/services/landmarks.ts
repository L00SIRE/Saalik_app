// ─────────────────────────────────────────────────────────────────────────────
// Saalik — Landmark knowledge base (demo "Scan & Discover" feature)
//
// Powers the fake on-device "scanner": the traveler types or "uploads" a photo
// named after a place, we run a fuzzy name match, and surface a rich info card.
// Everything here is hardcoded demo content — no network, no model — so it is
// 100% reliable on stage during a pitch.
//
// Matching is keyword-substring based and case-insensitive. The single most
// important rule (per product): if the query contains "pashupati", we return
// Pashupatinath. See matchLandmark() below.
//
// For the list of exact words that trigger each result during a demo, see the
// gitignored cheat-sheet: SCAN_KEYWORDS_PRIVATE.md
//
// NOTE: This file is the Layer-4 mock DATASET for the Discovery feature. The
// `Landmark` type now lives in the Integration contract
// (`integration/contracts/discovery.ts`) so the data conforms to the same shape
// the live backend will return. To add a landmark: append to `LANDMARKS`.
// ─────────────────────────────────────────────────────────────────────────────

import type { Landmark } from '@integration/contracts/discovery';

export type { Landmark };

export const LANDMARKS: Landmark[] = [
  {
    id: 'pashupatinath',
    name: 'Pashupatinath Temple',
    kicker: 'Sacred Hindu temple · Kathmandu',
    location: 'Banks of the Bagmati River, Kathmandu',
    built: 'Current structure c. 1692 CE; site revered for ~1,500+ years',
    image:
      'https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=900&h=650&fit=crop',
    summary:
      "Pashupatinath is the holiest Hindu temple in Nepal, dedicated to Lord Shiva in his form as " +
      "Pashupati, 'Lord of the Animals'. Its gilded two-tiered pagoda roof and silver-plated doors sit " +
      "on the sacred Bagmati River, where open-air cremations have been performed for centuries. Only " +
      "practising Hindus may enter the inner sanctum, but the riverbank ghats are open to all.",
    facts: [
      'Dedicated to Shiva as Pashupati, the guardian deity of Nepal',
      "The main idol is a metre-tall stone Mukhalinga with four faces (chaturmukha)",
      'Cremation ghats line the Bagmati; ash returns to the holy river',
      'Sadhus (holy men) in ochre robes and ash gather here, especially at Maha Shivaratri',
    ],
    funFact:
      "On Maha Shivaratri, over a million pilgrims and thousands of wandering sadhus descend on the " +
      "temple in a single night.",
    unesco: true,
    keywords: ['pashupati', 'pashupatinath', 'pasupati', 'shiva temple', 'bagmati'],
  },
  {
    id: 'boudhanath',
    name: 'Boudhanath Stupa',
    kicker: 'Buddhist stupa · Kathmandu',
    location: 'Boudha, north-east Kathmandu',
    built: 'c. 14th century CE (after Mughal-era reconstruction)',
    image:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Boudhanath_stupa_%2C_Kathmandu%2C_Nepal.jpg?width=900',
    summary:
      "Boudhanath is one of the largest spherical stupas in the world and the spiritual heart of " +
      "Nepal's Tibetan Buddhist community. The all-seeing eyes of the Buddha gaze out from the gilded " +
      "tower in four directions. Pilgrims circle the dome clockwise, spinning prayer wheels and " +
      "murmuring mantras beneath fluttering prayer flags.",
    facts: [
      'One of the largest stupas in the world — the dome is ~36 m across',
      "The painted eyes represent the Buddha's omniscient gaze in all four directions",
      'A major pilgrimage site for Tibetan Buddhists since the 1959 exodus',
      'The mandala design symbolises the path from earth to enlightenment',
    ],
    funFact:
      "Legend says the stupa enshrines a bone relic of the Buddha Kashyapa, a predecessor of " +
      "Gautama Buddha.",
    unesco: true,
    keywords: ['boudha', 'bouddha', 'boudhanath', 'bodhnath', 'stupa', 'buddhist stupa'],
  },
  {
    id: 'swayambhunath',
    name: 'Swayambhunath (Monkey Temple)',
    kicker: 'Hilltop stupa · Kathmandu',
    location: 'Hilltop west of central Kathmandu',
    built: 'Founded ~5th century CE',
    image:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Swayambhunath_2018.jpg?width=900',
    summary:
      "Perched on a forested hill overlooking the valley, Swayambhunath is among the oldest religious " +
      "sites in Nepal. Reached by a steep flight of 365 stone steps, the white dome and golden spire " +
      "are crowned by the watchful eyes of the Buddha. Troops of resident rhesus monkeys give it its " +
      "nickname, the 'Monkey Temple'.",
    facts: [
      '365 steps climb to the summit — one for each day of the year',
      "Its name means 'self-existent one'; the valley was once a lake, the legend goes",
      'A rare site sacred to both Buddhists and Hindus',
      'Holy monkeys roam freely — said to be born from the head-lice of a bodhisattva',
    ],
    funFact:
      "The hill is believed to have risen from a lotus that bloomed when the valley's primordial " +
      "lake was drained by the bodhisattva Manjushri's sword.",
    unesco: true,
    keywords: ['swayambhu', 'swyambhu', 'swayambhunath', 'monkey temple', 'monkey'],
  },
  {
    id: 'kathmandu-durbar',
    name: 'Kathmandu Durbar Square',
    kicker: 'Royal palace square · Kathmandu',
    location: 'Hanuman Dhoka, old Kathmandu',
    built: 'Mainly 15th–18th century, Malla & Shah dynasties',
    image:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Basantapurpalace.JPG?width=900',
    summary:
      "The old royal heart of Kathmandu, this UNESCO square is a dense cluster of palaces, courtyards " +
      "and pagoda temples built by the Malla kings. It is home to the Kumari Ghar, residence of the " +
      "living goddess, and Hanuman Dhoka, the former royal palace. Much was damaged in the 2015 " +
      "earthquake and is being painstakingly restored.",
    facts: [
      'Home to the Kumari — Nepal\'s living child goddess',
      'Hanuman Dhoka palace served Nepali royalty for centuries',
      'Kasthamandap, the pavilion said to give Kathmandu its name, stood here',
      'A working square: temples, markets and daily worship continue around the monuments',
    ],
    funFact:
      "The city's name may come from Kasthamandap, a pavilion legend says was built from the timber " +
      "of a single sal tree.",
    unesco: true,
    keywords: ['kathmandu durbar', 'durbar square', 'hanuman dhoka', 'kumari', 'kasthamandap', 'basantapur'],
  },
  {
    id: 'bhaktapur',
    name: 'Bhaktapur Durbar Square',
    kicker: 'Medieval royal city · Bhaktapur',
    location: 'Bhaktapur, eastern Kathmandu Valley',
    built: '12th–18th century, Malla dynasty',
    image:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Nyatpola_%26_Bhairav_Temple.jpg?width=900',
    summary:
      "Bhaktapur, the 'City of Devotees', is the best-preserved medieval city in the Kathmandu Valley. " +
      "Its squares are an open-air museum of Newar architecture: the 55-Window Palace, the Golden Gate, " +
      "and the soaring five-tiered Nyatapola Temple, the tallest in Nepal. Cars are largely kept out, " +
      "so the brick lanes still feel centuries old.",
    facts: [
      'The five-storey Nyatapola is the tallest temple in Nepal (~30 m)',
      'Famous for the 55-Window Palace and the gilded Golden Gate (Lu Dhowka)',
      'Renowned for traditional pottery, wood-carving and juju dhau ("king curd")',
      'A living Newar town, largely free of motor traffic in the core',
    ],
    funFact:
      "The Nyatapola survived the catastrophic 1934 and 2015 earthquakes almost untouched, thanks to " +
      "its stepped, self-bracing base.",
    unesco: true,
    keywords: ['bhaktapur', 'bhadgaon', 'nyatapola', '55 window', 'golden gate', 'juju dhau'],
  },
  {
    id: 'patan',
    name: 'Patan Durbar Square',
    kicker: 'City of artisans · Lalitpur',
    location: 'Patan (Lalitpur), Kathmandu Valley',
    built: '16th–18th century, Malla dynasty',
    image:
      'https://images.unsplash.com/photo-1585016495481-91613a3ab1bc?w=900&h=650&fit=crop',
    summary:
      "Patan, also called Lalitpur ('City of Beauty'), is the valley's centre of fine craft and Newar " +
      "Buddhism. Its durbar square is a masterpiece of Newar urbanism, anchored by the stone Krishna " +
      "Mandir and a museum widely rated the finest in Nepal. The back lanes hide hundreds of bahals — " +
      "courtyards where metalsmiths still beat bronze by hand.",
    facts: [
      'The Krishna Mandir is carved entirely from stone in the Indian shikhara style',
      'The Patan Museum is considered one of the best in South Asia',
      'Famed for lost-wax bronze casting and repoussé metalwork',
      'Dotted with hidden bahals (courtyards) and the Golden Temple (Hiranya Varna Mahavihar)',
    ],
    funFact:
      "Patan's metalsmiths have cast Buddhist statues exported across the Himalaya for over a " +
      "thousand years — a craft still practised in Oku Bahal today.",
    unesco: true,
    keywords: ['patan', 'lalitpur', 'krishna mandir', 'golden temple', 'oku bahal', 'bahal'],
  },
  {
    id: 'lumbini',
    name: 'Lumbini — Birthplace of the Buddha',
    kicker: 'Sacred pilgrimage site · Rupandehi',
    location: 'Lumbini, Rupandehi (Terai plains)',
    built: 'Marker pillar erected 249 BCE by Emperor Ashoka',
    image:
      'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=900&h=650&fit=crop',
    summary:
      "Lumbini is where Queen Maya Devi gave birth to Siddhartha Gautama — the Buddha — around 563 BCE. " +
      "The Maya Devi Temple shelters the exact 'marker stone' and the ancient nativity sculpture, beside " +
      "the sacred pond and a pillar erected by Emperor Ashoka. Today it is a vast monastic zone where " +
      "nations from across the Buddhist world have each built a monastery.",
    facts: [
      'One of the four holiest sites in Buddhism (with Bodh Gaya, Sarnath, Kushinagar)',
      "Ashoka's stone pillar (249 BCE) bears the earliest inscription naming Lumbini",
      'The Maya Devi Temple marks the precise spot of the birth',
      'Monastic zone hosts temples built by Thailand, Germany, Japan, China and more',
    ],
    funFact:
      "The Ashoka Pillar's inscription records that the emperor exempted Lumbini's villagers from " +
      "most taxes in honour of the Buddha's birth — an ancient tax break, carved in stone.",
    unesco: true,
    keywords: ['lumbini', 'buddha birthplace', 'maya devi', 'siddhartha', 'ashoka pillar'],
  },
  {
    id: 'everest',
    name: 'Mount Everest (Sagarmatha)',
    kicker: "World's highest peak · Solukhumbu",
    location: 'Khumbu, Nepal–Tibet border',
    built: 'Uplifted ~50–60 million years ago',
    image:
      'https://images.unsplash.com/photo-1486911278844-a81c5267e227?w=900&h=650&fit=crop',
    summary:
      "At 8,848.86 m, Everest is the highest mountain on Earth, called Sagarmatha in Nepali and " +
      "Chomolungma in Tibetan. Its southern approach runs through the Khumbu, the homeland of the " +
      "Sherpa people, inside Sagarmatha National Park. It was first summited on 29 May 1953 by Tenzing " +
      "Norgay and Edmund Hillary.",
    facts: [
      'Height officially 8,848.86 m — re-measured jointly by Nepal & China in 2020',
      'First summited 29 May 1953 by Tenzing Norgay Sherpa and Edmund Hillary',
      'The peak still rises a few millimetres a year as India pushes into Asia',
      "Sits within Sagarmatha National Park, a UNESCO World Heritage Site",
    ],
    funFact:
      "The summit's limestone holds marine fossils — the rock at the top of the world was once the " +
      "floor of an ancient sea.",
    unesco: true,
    keywords: ['everest', 'sagarmatha', 'chomolungma', 'khumbu', 'mount everest', 'mt everest'],
  },
  {
    id: 'phewa',
    name: 'Phewa Lake & Pokhara',
    kicker: 'Lakeside & Himalayas · Pokhara',
    location: 'Pokhara, Gandaki Province',
    built: 'Natural freshwater lake',
    image:
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=900&h=650&fit=crop',
    summary:
      "Phewa is Nepal's second-largest lake and the centre of laid-back Pokhara, gateway to the " +
      "Annapurnas. On still mornings the Annapurna range and the fishtail peak Machhapuchhre mirror " +
      "perfectly on its surface. The island Tal Barahi Temple sits mid-lake, reached by brightly " +
      "painted wooden boats.",
    facts: [
      'Second-largest lake in Nepal, fringed by the lively Lakeside district',
      'The Tal Barahi Temple sits on a small island in the middle of the lake',
      'Reflects the Annapurna massif and Machhapuchhre (Fishtail) on calm days',
      'Base camp for the Annapurna and Mardi Himal treks, and for paragliding',
    ],
    funFact:
      "Machhapuchhre, the fishtail peak above the lake, has never been officially climbed — it is " +
      "sacred to Shiva and closed to mountaineers.",
    unesco: false,
    keywords: ['phewa', 'fewa', 'pokhara', 'lakeside', 'machhapuchhre', 'fishtail'],
  },
  {
    id: 'annapurna',
    name: 'Annapurna Massif',
    kicker: 'Himalayan range · Gandaki',
    location: 'North-central Nepal',
    built: 'Himalayan uplift, ~50 million years ago',
    image:
      'https://images.unsplash.com/photo-1551632811-561732d1e306?w=900&h=650&fit=crop',
    summary:
      "Annapurna is a Himalayan massif whose highest summit, Annapurna I (8,091 m), was the first " +
      "8,000-metre peak ever climbed, in 1950. The Annapurna Conservation Area surrounding it is " +
      "Nepal's largest protected region and home to the iconic Annapurna Circuit and Base Camp treks.",
    facts: [
      'Annapurna I (8,091 m) was the first 8,000 m peak ever summited (1950)',
      'The Annapurna Circuit is one of the world\'s classic long-distance treks',
      'Crosses the Thorong La pass at 5,416 m',
      'Protected within the Annapurna Conservation Area, Nepal\'s largest',
    ],
    funFact:
      "Despite being 'only' the 10th-highest mountain, Annapurna I has one of the highest fatality " +
      "rates of any 8,000er — a notoriously dangerous climb.",
    unesco: false,
    keywords: ['annapurna', 'thorong', 'abc', 'annapurna base camp'],
  },
  {
    id: 'changu-narayan',
    name: 'Changu Narayan Temple',
    kicker: 'Oldest temple in the valley · Bhaktapur',
    location: 'Hilltop near Bhaktapur',
    built: 'Foundations 4th century CE',
    image:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Nepal_-_Changu_Narayan_%283566057331%29.jpg?width=900',
    summary:
      "Changu Narayan is widely regarded as the oldest standing temple in the Kathmandu Valley, " +
      "dedicated to Vishnu (Narayan). Its richly carved two-tiered pagoda is surrounded by some of the " +
      "finest stone sculpture in Nepal, including a 5th-century pillar bearing the valley's oldest " +
      "known inscription.",
    facts: [
      'Considered the oldest temple in the Kathmandu Valley',
      'Dedicated to Vishnu in his Narayan form',
      "A 5th-century stone pillar holds the valley's earliest dated inscription",
      'Surrounded by exquisite Licchavi-era stone and metal sculpture',
    ],
    funFact:
      "The temple's Garuda statue — Vishnu's man-bird mount — kneels with such lifelike detail that " +
      "it once featured on the Nepali ten-rupee note.",
    unesco: true,
    keywords: ['changu', 'changu narayan', 'narayan', 'vishnu temple'],
  },
];

// ─── Matcher ─────────────────────────────────────────────────────────────────

/**
 * Fuzzy-match a free-text query (e.g. a typed name or an "uploaded" photo
 * filename) to a landmark. Strategy, in order:
 *   1. keyword appears anywhere in the query  (handles "photo of pashupati.jpg")
 *   2. query appears inside a keyword         (handles short queries like "boudha")
 *   3. token overlap on the landmark name
 * Returns null if nothing is confident enough — the UI shows a graceful miss.
 */
export function matchLandmark(rawQuery: string): Landmark | null {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return null;

  // Pass 1 — keyword substring (most reliable; covers the "pashupati" rule).
  for (const lm of LANDMARKS) {
    if (lm.keywords.some((k) => q.includes(k))) return lm;
  }

  // Pass 2 — query is a fragment of a keyword (short inputs).
  for (const lm of LANDMARKS) {
    if (lm.keywords.some((k) => k.includes(q) && q.length >= 3)) return lm;
  }

  // Pass 3 — token overlap with the display name.
  const tokens = q.split(/[^a-z0-9]+/).filter((t) => t.length >= 4);
  for (const lm of LANDMARKS) {
    const name = lm.name.toLowerCase();
    if (tokens.some((t) => name.includes(t))) return lm;
  }

  return null;
}

/** A few suggestions shown as tappable chips on the scan screen. */
export const SCAN_SUGGESTIONS = [
  'Pashupatinath',
  'Boudhanath',
  'Swayambhunath',
  'Bhaktapur',
  'Lumbini',
  'Everest',
  'Phewa Lake',
];
