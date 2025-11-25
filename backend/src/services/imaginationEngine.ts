import { ChatTurn, ExperienceInput, ExperiencePlan, ExperienceTheme } from '../types/experience';

const archetypes: Record<ExperienceTheme, {
  tone: string;
  soundtrack: string;
  anchors: string[];
  rituals: string[];
}> = {
  religious: {
    tone: 'Sattvic calm with guided rituals and sacred geometry walks',
    soundtrack: 'Morning ragas with temple bells',
    anchors: ['sunrise darshan', 'mantra immersion', 'prasad tasting'],
    rituals: ['guided meditation', 'heritage walk', 'aarti curation'],
  },
  scenic: {
    tone: 'Slow-travel panoramas with misty trail highlights',
    soundtrack: 'Monsoon lo-fi with bamboo flute layers',
    anchors: ['golden-hour ridge picnic', 'canoe drift', 'tea estate brunch'],
    rituals: ['forest bathing', 'stargazing map', 'artisan picnic'],
  },
  culture: {
    tone: 'Studio-to-street storytellers with culinary residencies',
    soundtrack: 'Analog jazz fused with folk percussion',
    anchors: ['atelier residency', 'night bazaar tasting menu', 'spoken-word soiree'],
    rituals: ['craft workshop', 'chef table circuit', 'gallery night'],
  },
  adventure: {
    tone: 'Pulse-forward trek circuits with recovery pods',
    soundtrack: 'Handpan over downtempo bass',
    anchors: ['skybridge ascent', 'hidden waterfall rappel', 'midnight dune ride'],
    rituals: ['mobility lab', 'guided breath-work', 'astro navigation'],
  },
  wellness: {
    tone: 'Ayurvedic micro-retreat with bio-rhythm coaching',
    soundtrack: 'Binaural beats blended with ocean drones',
    anchors: ['dosha consult', 'therapeutic cooking', 'floating meditation'],
    rituals: ['herbal spa circuit', 'sound bath', 'reset journaling'],
  },
};

const keywordMap: Record<ExperienceTheme, string[]> = {
  religious: ['spiritual', 'temple', 'pilgrim', 'devotional', 'heritage'],
  scenic: ['scenic', 'mountain', 'lake', 'view', 'nature', 'landscape'],
  culture: ['culture', 'art', 'food', 'festival', 'museum'],
  adventure: ['adventure', 'trek', 'thrill', 'ride', 'explore'],
  wellness: ['wellness', 'healing', 'retreat', 'detox', 'yoga'],
};

function scoreTheme(intent: string, mood: string[] = []): ExperienceTheme {
  const text = `${intent} ${mood.join(' ')}`.toLowerCase();
  let bestTheme: ExperienceTheme = 'scenic';
  let bestScore = -Infinity;

  (Object.keys(keywordMap) as ExperienceTheme[]).forEach((theme) => {
    const themeKeywords = keywordMap[theme];
    const score = themeKeywords.reduce((acc, keyword) => (
      text.includes(keyword) ? acc + 3 : acc
    ), 0) + (text.includes(theme) ? 2 : 0);

    if (score > bestScore) {
      bestScore = score;
      bestTheme = theme;
    }
  });

  return bestTheme;
}

function buildDayPlan(theme: ExperienceTheme, input: ExperienceInput) {
  const signature = archetypes[theme];
  const baseDays = [
    {
      day: 'Arrival Ritual',
      focus: signature.anchors[0] ?? 'Arrival curation',
      details: [
        'Welcome tea + orientation with your Saalik guide',
        `Personal intention setting focused on ${input.intent}`,
        `Sunset moment curated around ${signature.tone.toLowerCase()}`,
      ],
    },
    {
      day: 'Immersion',
      focus: signature.anchors[1] ?? 'Immersive sequence',
      details: [
        `Hands-on session inspired by ${signature.rituals[0] ?? 'guided ritual'}`,
        'Micro-itinerary for local dining and hidden studios',
        'Personalized audio guide synced to your travel pace',
      ],
    },
    {
      day: 'Departure Glow',
      focus: signature.anchors[2] ?? 'Departure glow',
      details: [
        'Slow morning with journaling prompts',
        `Farewell ritual featuring ${signature.rituals[1] ?? 'sound bath'}`,
        'Digital keepsake drop + concierge follow-up',
      ],
    },
  ];

  if (input.pace === 'fast') {
    baseDays.push({
      day: 'Bonus Pulse',
      focus: 'High-energy addon',
      details: ['Pop-up adventure card', 'Nightscape photography dash'],
    });
  }

  return baseDays;
}

export function craftExperiencePlan(input: ExperienceInput): ExperiencePlan {
  const theme = scoreTheme(input.intent, input.mood);
  const signature = archetypes[theme];

  return {
    theme,
    headline: `${input.name ?? 'Explorer'}, here is your ${theme} flow`,
    summary: `${signature.tone}. Tailored for ${input.partySize ?? 2} traveler(s) in ${input.travelMonth ?? 'the upcoming season'}.`,
    soundtrack: signature.soundtrack,
    highlights: signature.anchors.map((anchor, idx) => ({
      title: anchor,
      description: `Saalik guide curates ${anchor} with ${signature.rituals[idx % signature.rituals.length] ?? 'a bespoke ritual'}.`,
      whyItWorks: 'Matched to your stated mood & boundaries.',
    })),
    dayPlan: buildDayPlan(theme, input),
  };
}

export function respondAsGuide(history: ChatTurn[]): ChatTurn {
  const lastUser = [...history].reverse().find((turn) => turn.role === 'user');
  const prompt = lastUser?.message ?? 'Tell me about Saalik.';
  const theme = scoreTheme(prompt, []);
  const signature = archetypes[theme];
  const response = `I sense you are leaning toward a ${theme} immersion. Imagine ${signature.tone.toLowerCase()} — I can line up ${signature.anchors.join(', ')}. Want me to lock dates or weave in a chatbot concierge?`;

  return {
    role: 'guide',
    message: response,
  };
}
