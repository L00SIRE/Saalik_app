import React from 'react';
import { View, StyleSheet, ScrollView, ImageBackground, Pressable } from 'react-native';
import { AppText } from '@components/AppText';
import { colors } from '@theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const background = require('../../assets/bgsaalik.jpg'); // Reusing existing bg for now

export function FeaturedPlanScreen() {
    const navigation = useNavigation<any>();

    const handleRequestGuide = () => {
        navigation.navigate('GuideRequest');
    };

    return (
        <ImageBackground source={background} style={styles.background} resizeMode="cover">
            <LinearGradient colors={["rgba(0,0,0,0.85)", "rgba(0,0,0,0.5)"]} style={styles.overlay}>
                <ScrollView contentContainerStyle={styles.scroll}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </Pressable>

                    <AppText style={styles.headerTitle}>Featured Journey</AppText>
                    <AppText style={styles.headerSubtitle}>Spiritual & Culinary Loop</AppText>

                    <View style={styles.timeline}>
                        <TimelineItem
                            time="10:00 AM"
                            title="Touchdown & Snacks"
                            desc="Meet at TIA. Quick local bite at 'Airport Thakali' to settle in."
                            icon="airplane"
                        />
                        <TimelineLine />
                        <TimelineItem
                            time="11:30 AM"
                            title="Pashupati Immersion"
                            desc="Guided entry to the sacred complex. Private darshan and history walk."
                            icon="flame"
                        />
                        <TimelineLine />
                        <TimelineItem
                            time="02:00 PM"
                            title="Boudha Stupa Circle"
                            desc="Kora rituals with locals. Rooftop lunch overlooking the stupa."
                            icon="stop" // closest to square/stupa
                        />
                        <TimelineLine />
                        <TimelineItem
                            time="04:30 PM"
                            title="Sunset Tea"
                            desc="Wrap up with herbal tea at a hidden garden cafe."
                            icon="cafe"
                        />
                    </View>

                    <View style={styles.actionContainer}>
                        <AppText style={styles.priceTag}>Est. $45 / person</AppText>
                        <Pressable style={styles.primaryButton} onPress={handleRequestGuide}>
                            <AppText style={styles.primaryButtonText}>Find a Local Guide</AppText>
                        </Pressable>
                    </View>

                </ScrollView>
            </LinearGradient>
        </ImageBackground>
    );
}

function TimelineItem({ time, title, desc, icon }: { time: string, title: string, desc: string, icon: any }) {
    return (
        <View style={styles.timelineItem}>
            <View style={styles.iconContainer}>
                <Ionicons name={icon} size={20} color={colors.background} />
            </View>
            <View style={styles.contentContainer}>
                <AppText style={styles.time}>{time}</AppText>
                <AppText style={styles.title}>{title}</AppText>
                <AppText style={styles.desc}>{desc}</AppText>
            </View>
        </View>
    );
}

function TimelineLine() {
    return <View style={styles.line} />;
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    overlay: { flex: 1, paddingHorizontal: 20, paddingTop: 60 },
    scroll: { paddingBottom: 100 },
    backButton: { marginBottom: 20 },
    headerTitle: { fontSize: 28, color: colors.accent, fontWeight: 'bold' },
    headerSubtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 30 },
    timeline: { gap: 0 },
    timelineItem: { flexDirection: 'row', gap: 15, alignItems: 'flex-start' },
    iconContainer: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
        zIndex: 1
    },
    contentContainer: { flex: 1, paddingBottom: 20 },
    time: { fontSize: 12, color: colors.accentMuted, marginBottom: 4 },
    title: { fontSize: 18, color: colors.textPrimary, marginBottom: 6, fontWeight: '600' },
    desc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
    line: {
        width: 2, height: 30, backgroundColor: colors.border,
        marginLeft: 17, marginTop: -10, marginBottom: -10, opacity: 0.5
    },
    actionContainer: { marginTop: 20, padding: 20, backgroundColor: colors.card, borderRadius: 16, borderTopWidth: 1, borderColor: colors.border },
    priceTag: { fontSize: 18, color: colors.textPrimary, textAlign: 'center', marginBottom: 15, fontWeight: '700' },
    primaryButton: { backgroundColor: colors.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    primaryButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' }
});
