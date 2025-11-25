import { useState } from 'react';
import {
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Checkbox from 'expo-checkbox';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@theme/colors';
import { ExperiencePlan, ChatTurn } from '@types/api';
// Using demo data for UI testing - bypass API
// import { requestExperiencePlan, sendChat } from '@services/api';

const intents = [
  { key: 'religious', label: 'Religious', intent: 'Seeking sacred circuits & temple energy.' },
  { key: 'scenic', label: 'Scenic', intent: 'Craving ridgeline tea gardens & waterfalls.' },
  { key: 'culture', label: 'Cultural', intent: 'Want ateliers, food labs, and artist time.' },
  { key: 'adventure', label: 'Adventure', intent: 'Planning kinetic treks with recovery pods.' },
  { key: 'wellness', label: 'Wellness', intent: 'Need a detox slow retreat with Ayurveda.' },
];

const background = require('../../assets/bgsaalik.jpg');

// Demo data functions - bypass API for UI testing
const getDemoPlan = (intentKey: string, name: string): ExperiencePlan => {
  const demoPlans: Record<string, ExperiencePlan> = {
    religious: {
      theme: 'religious',
      headline: `${name}, here is your religious flow`,
      summary: 'Sattvic calm with guided rituals and sacred geometry walks. Tailored for 2 traveler(s) in the upcoming season.',
      soundtrack: 'Morning ragas with temple bells',
      highlights: [
        {
          title: 'sunrise darshan',
          description: 'Saalik guide curates sunrise darshan with guided meditation.',
          whyItWorks: 'Matched to your stated mood & boundaries.',
        },
        {
          title: 'mantra immersion',
          description: 'Saalik guide curates mantra immersion with heritage walk.',
          whyItWorks: 'Matched to your stated mood & boundaries.',
        },
        {
          title: 'prasad tasting',
          description: 'Saalik guide curates prasad tasting with aarti curation.',
          whyItWorks: 'Matched to your stated mood & boundaries.',
        },
      ],
      dayPlan: [
        {
          day: 'Arrival Ritual',
          focus: 'sunrise darshan',
          details: [
            'Welcome tea + orientation with your Saalik guide',
            'Personal intention setting focused on your spiritual journey',
            'Sunset moment curated around sattvic calm with guided rituals and sacred geometry walks',
          ],
        },
        {
          day: 'Immersion',
          focus: 'mantra immersion',
          details: [
            'Hands-on session inspired by guided meditation',
            'Micro-itinerary for local dining and hidden studios',
            'Personalized audio guide synced to your travel pace',
          ],
        },
        {
          day: 'Departure Glow',
          focus: 'prasad tasting',
          details: [
            'Slow morning with journaling prompts',
            'Farewell ritual featuring heritage walk',
            'Digital keepsake drop + concierge follow-up',
          ],
        },
      ],
    },
    scenic: {
      theme: 'scenic',
      headline: `${name}, here is your scenic flow`,
      summary: 'Slow-travel panoramas with misty trail highlights. Tailored for 2 traveler(s) in the upcoming season.',
      soundtrack: 'Monsoon lo-fi with bamboo flute layers',
      highlights: [
        {
          title: 'golden-hour ridge picnic',
          description: 'Saalik guide curates golden-hour ridge picnic with forest bathing.',
          whyItWorks: 'Matched to your stated mood & boundaries.',
        },
        {
          title: 'canoe drift',
          description: 'Saalik guide curates canoe drift with stargazing map.',
          whyItWorks: 'Matched to your stated mood & boundaries.',
        },
        {
          title: 'tea estate brunch',
          description: 'Saalik guide curates tea estate brunch with artisan picnic.',
          whyItWorks: 'Matched to your stated mood & boundaries.',
        },
      ],
      dayPlan: [
        {
          day: 'Arrival Ritual',
          focus: 'golden-hour ridge picnic',
          details: [
            'Welcome tea + orientation with your Saalik guide',
            'Personal intention setting focused on scenic exploration',
            'Sunset moment curated around slow-travel panoramas with misty trail highlights',
          ],
        },
        {
          day: 'Immersion',
          focus: 'canoe drift',
          details: [
            'Hands-on session inspired by forest bathing',
            'Micro-itinerary for local dining and hidden studios',
            'Personalized audio guide synced to your travel pace',
          ],
        },
        {
          day: 'Departure Glow',
          focus: 'tea estate brunch',
          details: [
            'Slow morning with journaling prompts',
            'Farewell ritual featuring stargazing map',
            'Digital keepsake drop + concierge follow-up',
          ],
        },
      ],
    },
    culture: {
      theme: 'culture',
      headline: `${name}, here is your culture flow`,
      summary: 'Studio-to-street storytellers with culinary residencies. Tailored for 2 traveler(s) in the upcoming season.',
      soundtrack: 'Analog jazz fused with folk percussion',
      highlights: [
        {
          title: 'atelier residency',
          description: 'Saalik guide curates atelier residency with craft workshop.',
          whyItWorks: 'Matched to your stated mood & boundaries.',
        },
        {
          title: 'night bazaar tasting menu',
          description: 'Saalik guide curates night bazaar tasting menu with chef table circuit.',
          whyItWorks: 'Matched to your stated mood & boundaries.',
        },
        {
          title: 'spoken-word soiree',
          description: 'Saalik guide curates spoken-word soiree with gallery night.',
          whyItWorks: 'Matched to your stated mood & boundaries.',
        },
      ],
      dayPlan: [
        {
          day: 'Arrival Ritual',
          focus: 'atelier residency',
          details: [
            'Welcome tea + orientation with your Saalik guide',
            'Personal intention setting focused on cultural immersion',
            'Sunset moment curated around studio-to-street storytellers with culinary residencies',
          ],
        },
        {
          day: 'Immersion',
          focus: 'night bazaar tasting menu',
          details: [
            'Hands-on session inspired by craft workshop',
            'Micro-itinerary for local dining and hidden studios',
            'Personalized audio guide synced to your travel pace',
          ],
        },
        {
          day: 'Departure Glow',
          focus: 'spoken-word soiree',
          details: [
            'Slow morning with journaling prompts',
            'Farewell ritual featuring chef table circuit',
            'Digital keepsake drop + concierge follow-up',
          ],
        },
      ],
    },
    adventure: {
      theme: 'adventure',
      headline: `${name}, here is your adventure flow`,
      summary: 'Pulse-forward trek circuits with recovery pods. Tailored for 2 traveler(s) in the upcoming season.',
      soundtrack: 'Handpan over downtempo bass',
      highlights: [
        {
          title: 'skybridge ascent',
          description: 'Saalik guide curates skybridge ascent with mobility lab.',
          whyItWorks: 'Matched to your stated mood & boundaries.',
        },
        {
          title: 'hidden waterfall rappel',
          description: 'Saalik guide curates hidden waterfall rappel with guided breath-work.',
          whyItWorks: 'Matched to your stated mood & boundaries.',
        },
        {
          title: 'midnight dune ride',
          description: 'Saalik guide curates midnight dune ride with astro navigation.',
          whyItWorks: 'Matched to your stated mood & boundaries.',
        },
      ],
      dayPlan: [
        {
          day: 'Arrival Ritual',
          focus: 'skybridge ascent',
          details: [
            'Welcome tea + orientation with your Saalik guide',
            'Personal intention setting focused on adventure',
            'Sunset moment curated around pulse-forward trek circuits with recovery pods',
          ],
        },
        {
          day: 'Immersion',
          focus: 'hidden waterfall rappel',
          details: [
            'Hands-on session inspired by mobility lab',
            'Micro-itinerary for local dining and hidden studios',
            'Personalized audio guide synced to your travel pace',
          ],
        },
        {
          day: 'Departure Glow',
          focus: 'midnight dune ride',
          details: [
            'Slow morning with journaling prompts',
            'Farewell ritual featuring guided breath-work',
            'Digital keepsake drop + concierge follow-up',
          ],
        },
      ],
    },
    wellness: {
      theme: 'wellness',
      headline: `${name}, here is your wellness flow`,
      summary: 'Ayurvedic micro-retreat with bio-rhythm coaching. Tailored for 2 traveler(s) in the upcoming season.',
      soundtrack: 'Binaural beats blended with ocean drones',
      highlights: [
        {
          title: 'dosha consult',
          description: 'Saalik guide curates dosha consult with herbal spa circuit.',
          whyItWorks: 'Matched to your stated mood & boundaries.',
        },
        {
          title: 'therapeutic cooking',
          description: 'Saalik guide curates therapeutic cooking with sound bath.',
          whyItWorks: 'Matched to your stated mood & boundaries.',
        },
        {
          title: 'floating meditation',
          description: 'Saalik guide curates floating meditation with reset journaling.',
          whyItWorks: 'Matched to your stated mood & boundaries.',
        },
      ],
      dayPlan: [
        {
          day: 'Arrival Ritual',
          focus: 'dosha consult',
          details: [
            'Welcome tea + orientation with your Saalik guide',
            'Personal intention setting focused on wellness',
            'Sunset moment curated around ayurvedic micro-retreat with bio-rhythm coaching',
          ],
        },
        {
          day: 'Immersion',
          focus: 'therapeutic cooking',
          details: [
            'Hands-on session inspired by herbal spa circuit',
            'Micro-itinerary for local dining and hidden studios',
            'Personalized audio guide synced to your travel pace',
          ],
        },
        {
          day: 'Departure Glow',
          focus: 'floating meditation',
          details: [
            'Slow morning with journaling prompts',
            'Farewell ritual featuring sound bath',
            'Digital keepsake drop + concierge follow-up',
          ],
        },
      ],
    },
  };

  return demoPlans[intentKey] || demoPlans.religious;
};

const getDemoChatResponse = (message: string, history: ChatTurn[]): ChatTurn => {
  const lower = message.toLowerCase();
  let response = '';

  if (lower.includes('religious') || lower.includes('temple') || lower.includes('spiritual')) {
    response = 'I sense you are leaning toward a religious immersion. Imagine sattvic calm with guided rituals and sacred geometry walks — I can line up sunrise darshan, mantra immersion, prasad tasting. Want me to lock dates or weave in a chatbot concierge?';
  } else if (lower.includes('scenic') || lower.includes('mountain') || lower.includes('nature')) {
    response = 'I sense you are leaning toward a scenic immersion. Imagine slow-travel panoramas with misty trail highlights — I can line up golden-hour ridge picnic, canoe drift, tea estate brunch. Want me to lock dates or weave in a chatbot concierge?';
  } else if (lower.includes('culture') || lower.includes('art') || lower.includes('food')) {
    response = 'I sense you are leaning toward a culture immersion. Imagine studio-to-street storytellers with culinary residencies — I can line up atelier residency, night bazaar tasting menu, spoken-word soiree. Want me to lock dates or weave in a chatbot concierge?';
  } else if (lower.includes('adventure') || lower.includes('trek') || lower.includes('thrill')) {
    response = 'I sense you are leaning toward an adventure immersion. Imagine pulse-forward trek circuits with recovery pods — I can line up skybridge ascent, hidden waterfall rappel, midnight dune ride. Want me to lock dates or weave in a chatbot concierge?';
  } else if (lower.includes('wellness') || lower.includes('healing') || lower.includes('retreat')) {
    response = 'I sense you are leaning toward a wellness immersion. Imagine ayurvedic micro-retreat with bio-rhythm coaching — I can line up dosha consult, therapeutic cooking, floating meditation. Want me to lock dates or weave in a chatbot concierge?';
  } else {
    response = 'Welcome to Saalik! I\'m here to help you craft a personalized journey. Tell me what kind of experience you\'re seeking — religious, scenic, cultural, adventure, or wellness?';
  }

  return {
    role: 'guide',
    message: response,
  };
};

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState(intents[0]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [plan, setPlan] = useState<ExperiencePlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatVisible, setChatVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const handlePlan = async () => {
    setError('');
    setPlanLoading(true);
    // Simulate API delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    try {
      const name = email.split('@')[0] || 'Explorer';
      const intentKey = selectedIntent.key;
      const experience = getDemoPlan(intentKey, name);
      setPlan(experience);
    } catch (e) {
      setError('Unable to generate experience plan.');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMessage = chatInput.trim();
    setChatLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    try {
      const newHistory: ChatTurn[] = [...chatHistory, { role: 'user', message: userMessage }];
      const guideReply = getDemoChatResponse(userMessage, newHistory);
      setChatHistory([...newHistory, guideReply]);
      setChatInput('');
    } catch (e) {
      setError('Chatbot is offline right now.');
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <ImageBackground source={background} style={styles.background} resizeMode="cover">
      <LinearGradient colors={["rgba(0,0,0,0.75)", "rgba(0,0,0,0.2)"]} style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.logo}>SAALIK</Text>
            <Text style={styles.tagline}>Curated journeys for soul-first tourism</Text>
          </View>

          <View style={styles.loginCard}>
            <Text style={styles.loginTitle}>LOGIN</Text>
            <Text style={styles.label}>Username / Email Address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="yourname@email.com"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              style={styles.input}
            />

            <View style={styles.rowBetween}>
              <View style={styles.rememberRow}>
                <Checkbox value={rememberMe} onValueChange={setRememberMe} color={rememberMe ? colors.accent : undefined} />
                <Text style={styles.rememberText}>Remember me</Text>
              </View>
              <Pressable>
                <Text style={styles.link}>Forgot password?</Text>
              </Pressable>
            </View>

            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>SIGN IN</Text>
            </Pressable>
            <Text style={styles.footerText}>
              Don’t have an account? <Text style={styles.link}>Sign up</Text>
            </Text>
          </View>

          <View style={styles.intentCard}>
            <View style={styles.intentHeader}>
              <Text style={styles.intentTitle}>Shape my journey</Text>
              <Text style={styles.intentSubtitle}>Religious / Scenic / Cultural / Adventure / Wellness</Text>
            </View>
            <View style={styles.intentPills}>
              {intents.map((intent) => (
                <Pressable
                  key={intent.key}
                  style={[styles.pill, selectedIntent.key === intent.key && styles.pillActive]}
                  onPress={() => setSelectedIntent(intent)}
                >
                  <Text style={[styles.pillText, selectedIntent.key === intent.key && styles.pillTextActive]}>
                    {intent.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>What experience are you visualizing?</Text>
            <TextInput
              value={customPrompt}
              onChangeText={setCustomPrompt}
              placeholder="Describe the energy, places, people, or rituals you want."
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, styles.multiline]}
              multiline
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable style={[styles.primaryButton, planLoading && styles.disabledButton]} onPress={handlePlan} disabled={planLoading}>
              <Text style={styles.primaryButtonText}>{planLoading ? 'Gathering Intent…' : 'Ask Saalik AI'}</Text>
            </Pressable>
          </View>

          {plan && (
            <View style={styles.planCard}>
              <Text style={styles.planTitle}>{plan.headline}</Text>
              <Text style={styles.planSummary}>{plan.summary}</Text>
              <Text style={styles.planSoundtrack}>Soundtrack • {plan.soundtrack}</Text>
              <View style={styles.sectionDivider} />
              <Text style={styles.sectionTitle}>Highlights</Text>
              {plan.highlights.map((highlight) => (
                <View key={highlight.title} style={styles.highlight}>
                  <Text style={styles.highlightTitle}>{highlight.title}</Text>
                  <Text style={styles.highlightText}>{highlight.description}</Text>
                </View>
              ))}
              <Text style={styles.sectionTitle}>Day Flow</Text>
              {plan.dayPlan.map((day) => (
                <View key={day.day} style={styles.dayBlock}>
                  <Text style={styles.dayTitle}>{day.day}</Text>
                  <Text style={styles.dayFocus}>{day.focus}</Text>
                  {day.details.map((detail) => (
                    <Text key={detail} style={styles.dayDetail}>• {detail}</Text>
                  ))}
                </View>
              ))}
            </View>
          )}

          <Pressable style={styles.chatButton} onPress={() => setChatVisible(true)}>
            <Text style={styles.chatButtonText}>Chat with Saalik Guide</Text>
          </Pressable>
        </ScrollView>

        <Modal visible={chatVisible} animationType="slide" transparent>
          <View style={styles.chatModalBackdrop}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.chatModal}
            >
              <View style={styles.chatHeader}>
                <Text style={styles.chatTitle}>Saalik Concierge</Text>
                <Pressable onPress={() => setChatVisible(false)}>
                  <Text style={styles.link}>Close</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.chatHistory} contentContainerStyle={{ gap: 12 }}>
                {chatHistory.length === 0 && (
                  <Text style={styles.chatPlaceholder}>
                    Ask anything — “Can you blend religious rituals with scenic drives?”
                  </Text>
                )}
                {chatHistory.map((turn, index) => (
                  <View key={`${turn.role}-${index}`} style={[styles.chatBubble, turn.role === 'guide' ? styles.chatGuide : styles.chatUser]}>
                    <Text style={styles.chatBubbleText}>{turn.message}</Text>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.chatInputRow}>
                <TextInput
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Type your question"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, styles.chatInput]}
                />
                <Pressable style={[styles.primaryButton, styles.chatSendButton, chatLoading && styles.disabledButton]} onPress={handleSendChat} disabled={chatLoading}>
                  <Text style={styles.primaryButtonText}>{chatLoading ? '...' : 'Send'}</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scroll: {
    paddingBottom: 48,
    paddingHorizontal: 24,
    paddingTop: 80,
    gap: 20,
  },
  header: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 32,
    color: colors.accent,
    letterSpacing: 4,
  },
  tagline: {
    color: colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  loginCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  loginTitle: {
    color: colors.accent,
    fontSize: 26,
    letterSpacing: 2,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.inputBg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 6,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rememberText: {
    color: colors.textPrimary,
  },
  link: {
    color: colors.accent,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#021007',
    fontWeight: '700',
    letterSpacing: 1,
  },
  footerText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  intentCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  intentHeader: {
    gap: 4,
  },
  intentTitle: {
    color: colors.accent,
    fontSize: 22,
  },
  intentSubtitle: {
    color: colors.textSecondary,
  },
  intentPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pillActive: {
    backgroundColor: 'rgba(21, 255, 117, 0.1)',
    borderColor: colors.accent,
  },
  pillText: {
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.accent,
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  planTitle: {
    color: colors.accent,
    fontSize: 20,
  },
  planSummary: {
    color: colors.textPrimary,
  },
  planSoundtrack: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  highlight: {
    marginTop: 8,
    gap: 4,
  },
  highlightTitle: {
    color: colors.accent,
  },
  highlightText: {
    color: colors.textSecondary,
  },
  dayBlock: {
    marginTop: 8,
  },
  dayTitle: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  dayFocus: {
    color: colors.textSecondary,
  },
  dayDetail: {
    color: colors.textSecondary,
    marginLeft: 8,
  },
  chatButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 14,
    alignItems: 'center',
  },
  chatButtonText: {
    color: colors.accent,
  },
  chatModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  chatModal: {
    backgroundColor: colors.card,
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    gap: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatTitle: {
    color: colors.accent,
    fontSize: 18,
  },
  chatHistory: {
    flex: 1,
  },
  chatPlaceholder: {
    color: colors.textSecondary,
  },
  chatBubble: {
    padding: 12,
    borderRadius: 16,
  },
  chatGuide: {
    backgroundColor: 'rgba(21, 255, 117, 0.15)',
    alignSelf: 'flex-start',
  },
  chatUser: {
    backgroundColor: colors.inputBg,
    alignSelf: 'flex-end',
  },
  chatBubbleText: {
    color: colors.textPrimary,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatInput: {
    flex: 1,
    marginTop: 0,
  },
  chatSendButton: {
    paddingHorizontal: 24,
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorText: {
    color: colors.error,
  },
});
