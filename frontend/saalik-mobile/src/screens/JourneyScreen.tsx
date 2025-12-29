import React, { useState } from 'react';
import { View, StyleSheet, ImageBackground, TextInput, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { AppText } from '@components/AppText';
import { colors } from '@theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const background = require('../../assets/bgsaalik.jpg');

export function JourneyScreen() {
    const navigation = useNavigation<any>();
    const [price, setPrice] = useState('1200');
    const [status, setStatus] = useState('Arriving in 4 mins');
    const [negotiated, setNegotiated] = useState(false);

    const handleNegotiate = () => {
        setNegotiated(true);
        setStatus('Guide accepted your offer!');
    };

    const handleComplete = () => {
        Alert.alert(
            'Emergency Request',
            'Sending your location and trip details to emergency contacts...',
            [{ text: 'Cancel', style: 'cancel' }, { text: 'Send Signal', style: 'destructive' }]
        );
        // navigation.navigate('Home'); 
    };

    return (
        <ImageBackground source={background} style={styles.background} resizeMode="cover">
            {/* Simulated Map View Background (using a gradient to mimic map overlay for now) */}
            <LinearGradient colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]} style={styles.mapOverlay}>

                {/* Top Status Bar */}
                <View style={styles.topBar}>
                    <Pressable onPress={() => navigation.navigate('Home')} style={styles.miniButton}>
                        <Ionicons name="home" size={20} color={colors.textPrimary} />
                    </Pressable>
                    <View style={styles.statusPill}>
                        <AppText style={styles.statusText}>{status}</AppText>
                    </View>
                </View>

                {/* Simulated Guide Marker */}
                <View style={styles.mapCenter}>
                    <View style={styles.marker}>
                        <Ionicons name="car" size={24} color="#000" />
                    </View>
                    <View style={styles.pathLine} />
                    <View style={[styles.marker, { backgroundColor: colors.textPrimary }]}>
                        <Ionicons name="person" size={24} color="#000" />
                    </View>
                </View>

                {/* Bottom Sheet */}
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.bottomSheet}>
                    <View style={styles.driverInfo}>
                        <View style={styles.avatar}>
                            <AppText style={styles.avatarText}>R</AppText>
                        </View>
                        <View>
                            <AppText style={styles.driverName}>Ramesh G.</AppText>
                            <AppText style={styles.vehicleInfo}>Toyota Hiace • BA 2 PA 9999</AppText>
                        </View>
                        <View style={styles.rating}>
                            <Ionicons name="star" size={14} color="#FFD700" />
                            <AppText style={styles.ratingText}>4.9</AppText>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <AppText style={styles.negotiateLabel}>Running Total / Offer</AppText>
                    <View style={styles.priceRow}>
                        <AppText style={styles.currency}>NRs</AppText>
                        <TextInput
                            value={price}
                            onChangeText={setPrice}
                            keyboardType="numeric"
                            style={styles.priceInput}
                            editable={!negotiated}
                        />
                        {!negotiated ? (
                            <Pressable style={styles.offerButton} onPress={handleNegotiate}>
                                <AppText style={styles.offerButtonText}>Update Offer</AppText>
                            </Pressable>
                        ) : (
                            <View style={styles.acceptedTag}>
                                <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                                <AppText style={styles.acceptedText}>Fixed</AppText>
                            </View>
                        )}
                    </View>

                    <Pressable style={styles.actionButton} onPress={handleComplete}>
                        <AppText style={styles.actionButtonText}>Emergency / Share Status</AppText>
                    </Pressable>

                </KeyboardAvoidingView>

            </LinearGradient>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    mapOverlay: { flex: 1, justifyContent: 'space-between' },
    topBar: { paddingTop: 60, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    miniButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    statusPill: { backgroundColor: colors.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    statusText: { color: '#000', fontWeight: 'bold' },

    mapCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    marker: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    pathLine: { width: 2, height: 100, backgroundColor: colors.accent, borderStyle: 'dotted' },

    bottomSheet: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderColor: colors.border
    },
    driverInfo: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    avatarText: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold' },
    driverName: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
    vehicleInfo: { color: colors.textSecondary, fontSize: 13 },
    rating: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', backgroundColor: 'rgba(255, 215, 0, 0.1)', padding: 6, borderRadius: 8, gap: 4 },
    ratingText: { color: '#FFD700', fontWeight: 'bold' },

    divider: { height: 1, backgroundColor: colors.border, marginVertical: 20, opacity: 0.3 },

    negotiateLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 8 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    currency: { color: colors.accent, fontSize: 24, fontWeight: 'bold' },
    priceInput: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 32,
        fontWeight: 'bold',
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingBottom: 4
    },
    offerButton: { backgroundColor: colors.inputBg, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
    offerButtonText: { color: colors.textPrimary, fontWeight: '600' },
    acceptedTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    acceptedText: { color: colors.accent, fontWeight: 'bold' },

    actionButton: { backgroundColor: 'rgba(255, 107, 107, 0.2)', padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 107, 107, 0.5)' },
    actionButtonText: { color: '#ff6b6b', fontWeight: 'bold' }

});
