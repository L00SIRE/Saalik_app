import { useState } from 'react';
import {
    ImageBackground,
    StyleSheet,
    View,
    Pressable,
    ScrollView,
} from 'react-native';
import { AppText } from '@components/AppText';
import { AppTextInput } from '@components/AppTextInput';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@theme/colors';
import type { ExperiencePlan } from '../types/api';
import { requestExperiencePlan } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

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

export function HomeScreen() {
    const { user } = useAuth();
    const navigation = useNavigation<any>();
    const [selectedIntent, setSelectedIntent] = useState(intents[0]);
    const [customPrompt, setCustomPrompt] = useState('');
    const [planLoading, setPlanLoading] = useState(false);
    const [error, setError] = useState('');

    const handlePlan = async () => {
        setError('');
        setPlanLoading(true);
        try {
            const payload = {
                intent: selectedIntent.intent + ' ' + customPrompt,
                mood: [selectedIntent.key],
                name: user?.name || 'Explorer'
            };
            const experience = await requestExperiencePlan(payload);
            navigation.navigate('Plan', { plan: experience });
        } catch (e) {
            setError('Unable to reach Saalik AI. Please check connection.');
        } finally {
            setPlanLoading(false);
        }
    };

    return (
        <ImageBackground source={background} style={styles.background} resizeMode="cover">
            <LinearGradient colors={["rgba(0,0,0,0.75)", "rgba(0,0,0,0.2)"]} style={styles.overlay}>
                <ScrollView contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <AppText style={styles.logo}>SAALIK</AppText>
                        <AppText style={styles.tagline}>Curated journeys for soul-first tourism</AppText>
                    </View>

                    {/* Featured Plan Card */}
                    <Pressable style={styles.featuredCard} onPress={() => navigation.navigate('FeaturedPlan')}>
                        <LinearGradient colors={[colors.accent, colors.accentMuted]} style={styles.featuredGradient}>
                            <View style={styles.featuredContent}>
                                <View style={styles.featuredBadge}>
                                    <AppText style={styles.featuredBadgeText}>FEATURED DROP</AppText>
                                </View>
                                <AppText style={styles.featuredTitle}>The Sacred Loop: Pashupati & Boudha</AppText>
                                <AppText style={styles.featuredSubtitle}>Airport pickup • Local food • Private Guide</AppText>
                                <View style={styles.featuredFooter}>
                                    <AppText style={styles.featuredPrice}>from $45</AppText>
                                    <View style={styles.featuredButton}>
                                        <AppText style={styles.featuredButtonText}>View Itinerary</AppText>
                                    </View>
                                </View>
                            </View>
                        </LinearGradient>
                    </Pressable>

                    <View style={styles.intentCard}>
                        <View style={styles.intentHeader}>
                            <AppText style={styles.intentTitle}>Shape my journey</AppText>
                            <AppText style={styles.intentSubtitle}>Religious / Scenic / Cultural / Adventure / Wellness</AppText>
                        </View>
                        <View style={styles.intentPills}>
                            {intents.map((intent) => (
                                <Pressable
                                    key={intent.key}
                                    style={[styles.pill, selectedIntent.key === intent.key && styles.pillActive]}
                                    onPress={() => setSelectedIntent(intent)}
                                >
                                    <AppText style={[styles.pillText, selectedIntent.key === intent.key && styles.pillTextActive]}>
                                        {intent.label}
                                    </AppText>
                                </Pressable>
                            ))}
                        </View>

                        <AppText style={styles.label}>What experience are you visualizing?</AppText>
                        <AppTextInput
                            value={customPrompt}
                            onChangeText={setCustomPrompt}
                            placeholder="Describe the energy, places, people, or rituals you want."
                            placeholderTextColor={colors.textSecondary}
                            style={[styles.input, styles.multiline]}
                            multiline
                        />

                        {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

                        <Pressable style={[styles.primaryButton, planLoading && styles.disabledButton]} onPress={handlePlan} disabled={planLoading}>
                            <AppText style={styles.primaryButtonText}>{planLoading ? 'Gathering Intent…' : 'Ask Saalik AI'}</AppText>
                        </Pressable>
                    </View>
                </ScrollView>
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
    disabledButton: {
        opacity: 0.7,
    },
    errorText: {
        color: colors.error,
        textAlign: 'center',
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
    featuredCard: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.accent,
    },
    featuredGradient: {
        padding: 20,
    },
    featuredContent: {
        gap: 8,
    },
    featuredBadge: {
        backgroundColor: '#000',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 4,
    },
    featuredBadgeText: {
        color: colors.accent,
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    featuredTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#021007',
        lineHeight: 26,
    },
    featuredSubtitle: {
        fontSize: 14,
        color: '#021d0f',
        opacity: 0.8,
        fontWeight: '500',
    },
    featuredFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
    },
    featuredPrice: {
        fontSize: 18,
        fontWeight: '800',
        color: '#021007',
    },
    featuredButton: {
        backgroundColor: '#021007',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    featuredButtonText: {
        color: colors.accent,
        fontWeight: 'bold',
        fontSize: 12,
    },
});
