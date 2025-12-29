import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ImageBackground, Pressable, Animated, Easing } from 'react-native';
import { AppText } from '@components/AppText';
import { colors } from '@theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const background = require('../../assets/bgsaalik.jpg');

export function GuideRequestScreen() {
    const navigation = useNavigation<any>();
    const [scanning, setScanning] = useState(true);
    const [guidesFound, setGuidesFound] = useState(0);
    const [pulseAnim] = useState(new Animated.Value(1));

    useEffect(() => {
        // Pulse animation for scanning
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Simulate scanning delay
        setTimeout(() => {
            setScanning(false);
            setGuidesFound(3);
        }, 3000);
    }, []);

    const handleConfirm = () => {
        navigation.navigate('Journey');
    };

    return (
        <ImageBackground source={background} style={styles.background} resizeMode="cover">
            <LinearGradient colors={["rgba(0,0,0,0.85)", "rgba(0,0,0,0.9)"]} style={styles.overlay}>

                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="close" size={28} color={colors.textPrimary} />
                </Pressable>

                <View style={styles.content}>
                    <View style={styles.scannerContainer}>
                        <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
                            <Ionicons name="navigate-circle" size={80} color={colors.accent} />
                        </Animated.View>
                        <AppText style={styles.statusText}>
                            {scanning ? 'Scanning for nearby Saalik guides...' : `${guidesFound} guides found nearby`}
                        </AppText>
                    </View>

                    {!scanning && (
                        <View style={styles.selectionContainer}>
                            <AppText style={styles.chooseText}>Choose your ride</AppText>

                            <Pressable style={styles.optionRow}>
                                <Ionicons name="bicycle" size={32} color={colors.accent} />
                                <View style={{ flex: 1 }}>
                                    <AppText style={styles.optionTitle}>Solo (Scooter)</AppText>
                                    <AppText style={styles.optionDesc}>Quickest way through traffic</AppText>
                                </View>
                                <AppText style={styles.price}>NRs 500</AppText>
                            </Pressable>

                            <Pressable style={[styles.optionRow, styles.optionSelected]}>
                                <Ionicons name="car-sport" size={32} color="#000" />
                                <View style={{ flex: 1 }}>
                                    <AppText style={[styles.optionTitle, styles.textDark]}>Group (Van)</AppText>
                                    <AppText style={[styles.optionDesc, styles.textDark]}>Comfortable for up to 6</AppText>
                                </View>
                                <AppText style={[styles.price, styles.textDark]}>NRs 1200</AppText>
                            </Pressable>

                            <Pressable style={styles.confirmButton} onPress={handleConfirm}>
                                <AppText style={styles.confirmButtonText}>Confirm Van</AppText>
                            </Pressable>
                        </View>
                    )}
                </View>

            </LinearGradient>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    overlay: { flex: 1, padding: 20, paddingTop: 60 },
    backButton: { position: 'absolute', top: 60, left: 20, zIndex: 10 },
    content: { flex: 1, justifyContent: 'center' },
    scannerContainer: { alignItems: 'center', marginBottom: 50 },
    pulseCircle: { marginBottom: 30 },
    statusText: { fontSize: 18, color: colors.textSecondary, textAlign: 'center' },
    selectionContainer: { width: '100%', gap: 15 },
    chooseText: { fontSize: 20, color: colors.textPrimary, marginBottom: 10, fontWeight: 'bold' },
    optionRow: {
        flexDirection: 'row', alignItems: 'center', gap: 15,
        padding: 20, borderRadius: 16, backgroundColor: colors.inputBg,
        borderWidth: 1, borderColor: colors.border
    },
    optionSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
    optionTitle: { fontSize: 16, color: colors.textPrimary, fontWeight: '700' },
    optionDesc: { fontSize: 12, color: colors.textSecondary },
    price: { fontSize: 16, color: colors.textPrimary, fontWeight: 'bold' },
    textDark: { color: '#000' },
    confirmButton: {
        backgroundColor: colors.accent, padding: 18, borderRadius: 14,
        alignItems: 'center', marginTop: 10
    },
    confirmButtonText: { color: '#000', fontSize: 18, fontWeight: 'bold' }
});
