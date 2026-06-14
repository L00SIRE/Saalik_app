// ─────────────────────────────────────────────────────────────────────────────
// Layer 4 · Integration / Controls — AI service MOCK implementation
//
// Fulfils the `AiService` contract with hardcoded, pitch-ready content. This is
// the ONLY place the canned demo copy lives (previously inlined in the screen).
// Swapping to `aiService.live.ts` via the registry changes nothing for callers.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AiService,
  AiMessageInput,
  AiReply,
  AiSuggestion,
  AiIntent,
  RetrievedDoc,
  ImageRef,
  AiAction,
} from '../contracts/ai';

const GREETING =
  "Namaste! 🙏 I'm Saalik AI, your personal guide to Nepal.\n\n" +
  'I can help you:\n' +
  '• Plan your perfect Nepal trip\n' +
  '• Recommend walking tours\n' +
  '• Find amazing food spots\n' +
  '• Share cultural insights\n' +
  '• Teach you Nepali phrases\n\n' +
  'What would you like to explore?';

const RESPONSES: Record<AiIntent, string> = {
  default:
    "Namaste! 🙏 I'm Saalik AI, your personal guide to Nepal. I can help you plan trips, recommend tours, find food spots, and share cultural insights. What would you like to explore today?",

  trip:
    "For a 5-day Nepal trip, here's my recommendation:\n\n**Day 1-2: Kathmandu Valley**\n🏛️ Durbar Square & Kumari Temple\n📿 Boudhanath Stupa (sunset)\n🍜 Street Food Safari tour\n\n**Day 3: Bhaktapur**\n🏺 Potter's Square\n🏛️ The Living Museum tour\n🧈 Famous Juju Dhau (King Curd)\n\n**Day 4-5: Pokhara**\n🌅 Lakeside Sunrise walk\n🏔️ World Peace Pagoda trek\n🚣 Phewa Lake boating\n\nWould you like me to suggest specific tours for any of these days?",

  food:
    "Great choice! Here are the best food experiences:\n\n**Kathmandu:**\n🍜 Momos at Bhat-Bhateni area\n🥘 Dal Bhat at Thakali Kitchen\n🌯 Our 'Street Food Safari' tour covers 6+ spots!\n\n**Bhaktapur:**\n🧈 Juju Dhau (King Curd) - must try!\n🥟 Yomari (sweet dumplings)\n\nI recommend booking our **Bhaktapur Food Trail** - it includes 6+ tastings including the famous King Curd. Interested?",

  temple:
    "Great question! Here's what to know for temple visits:\n\n**Dress Code:**\n👔 Cover shoulders and knees\n👟 Remove shoes at entrance\n🎒 No leather items in Hindu temples\n\n**Etiquette:**\n🙏 Walk clockwise around stupas\n📵 Ask before photographing rituals\n💰 Small donations welcome\n\n**Top Temples:**\n• Pashupatinath - Hindu, most sacred\n• Boudhanath - Buddhist, great sunset\n• Swayambhunath - Both, city views\n\nOur 'Boudhanath Mindful Walk' includes all etiquette guidance. Would you like to book?",

  tours:
    "Here are today's available Saalik tours:\n\n**Kathmandu:**\n🏛️ Durbar Square Secrets (9AM) - 3hrs\n📿 Boudhanath Mindful Walk (4PM) - 2hrs\n🍜 Thamel After Dark (6PM) - 2hrs\n\n**Bhaktapur:**\n🏺 Potter's Square (10AM) - 3hrs\n🍜 Food Trail (11AM) - 2.5hrs\n\n**Pokhara:**\n🌅 Lakeside Sunrise (5:30AM) - 2.5hrs\n🏔️ Peace Pagoda Trek (7AM) - 4hrs\n\nAll tours are FREE - you just tip your guide! Which interests you?",

  nepali:
    "Let me teach you some Nepali! 🇳🇵\n\n**Essential Greetings:**\n• नमस्ते (Namaste) - Hello/Goodbye\n• धन्यवाद (Dhanyabad) - Thank you\n• माफ गर्नुहोस् (Maaf garnuhos) - Sorry/Excuse me\n\n**Useful Phrases:**\n• कति हो? (Kati ho?) - How much?\n• मिठो छ (Mitho chha) - It's delicious!\n• राम्रो छ (Ramro chha) - It's beautiful!\n\n**Numbers:**\n• एक (ek) - 1\n• दुई (dui) - 2\n• तीन (tin) - 3\n\nPractice 'Dhanyabad' - locals love when visitors try! 😊",

  // New for the image-detection roadmap hook: when the traveler asks us to
  // identify a place/photo, point them at the Scan & Discover surface.
  landmark:
    "I can help you place that! 📸\n\nIf you're standing in front of a temple, stupa or square and aren't sure what it is, open the **Discover** tab and scan it — I'll pull up its history, key facts and a 'did you know'.\n\nMeanwhile, the heavy hitters worth identifying: Pashupatinath, Boudhanath, Swayambhunath, and the durbar squares of Kathmandu, Patan and Bhaktapur.",
};

const SUGGESTIONS: AiSuggestion[] = [
  { text: 'Plan my trip', icon: 'map-outline', message: 'Help me plan a 5-day trip to Nepal' },
  { text: "Today's tours", icon: 'calendar-outline', message: 'What tours are available today?' },
  { text: 'Food spots', icon: 'restaurant-outline', message: 'Best local food recommendations?' },
  { text: 'Temple tips', icon: 'home-outline', message: 'What should I know before visiting temples?' },
  { text: 'Learn Nepali', icon: 'language-outline', message: 'Teach me basic Nepali greetings' },
];

/** Preserve the original ~800ms "thinking" feel so the demo looks the same. */
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const mockAiService: AiService = {
  getGreeting: () => GREETING,

  async getSuggestions(): Promise<AiSuggestion[]> {
    await wait(50);
    return SUGGESTIONS;
  },

  async sendMessage(input: AiMessageInput): Promise<AiReply> {
    await wait(800);
    const intent: AiIntent = input.context?.intentHint ?? 'default';
    return { text: RESPONSES[intent] ?? RESPONSES.default, action: { type: 'none' } };
  },

  // ── Roadmap hooks — present so Logic can already depend on them ────────────
  async retrieveContext(_query: string): Promise<RetrievedDoc[]> {
    // No vector store in the demo. Live impl will embed + query here.
    return [];
  },

  async detectImage(_image: ImageRef): Promise<AiAction> {
    // No on-device model in the demo. Live impl returns a real redirect action.
    return { type: 'none' };
  },
};
