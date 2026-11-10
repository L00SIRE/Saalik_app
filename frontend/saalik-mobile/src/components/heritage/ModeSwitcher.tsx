import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../AppText';
import { colors } from '@theme/colors';
import { useAppMode } from '../../context/AppModeContext';
import { APP_MODES, APP_MODE_LABELS, type AppMode } from '../../types/heritage';

const MODE_ICONS: Record<AppMode, keyof typeof Ionicons.glyphMap> = {
  LIVE_CLOUD: 'cloud-done-outline',
  OFFLINE_FIELD_SYNC: 'cloud-offline-outline',
  NTB_VIP_DEMO_MODE: 'airplane-outline',
};

export function ModeSwitcher() {
  const { mode, setMode, connectivity } = useAppMode();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText style={styles.title}>App Mode</AppText>
        <View style={styles.connectivity}>
          <View style={[styles.dot, { backgroundColor: connectivity.isConnected ? colors.success : colors.warning }]} />
          <AppText style={styles.connectivityText}>
            {mode === 'NTB_VIP_DEMO_MODE'
              ? 'Network disabled (demo)'
              : connectivity.isConnected
                ? connectivity.isWifi
                  ? 'Online - Wi-Fi'
                  : `Online - ${connectivity.type.toLowerCase()}`
                : 'Offline'}
          </AppText>
        </View>
      </View>
      {APP_MODES.map((option) => {
        const selected = option === mode;
        return (
          <Pressable
            key={option}
            onPress={() => void setMode(option)}
            style={[styles.option, selected && styles.optionSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <Ionicons name={MODE_ICONS[option]} size={22} color={selected ? colors.accent : colors.textSecondary} />
            <View style={styles.optionText}>
              <AppText style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{APP_MODE_LABELS[option].title}</AppText>
              <AppText style={styles.optionDescription}>{APP_MODE_LABELS[option].description}</AppText>
            </View>
            {selected && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.textPrimary, fontSize: 16 },
  connectivity: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  connectivityText: { color: colors.textSecondary, fontSize: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.inputBg,
  },
  optionSelected: { borderColor: colors.accent, backgroundColor: 'rgba(21, 255, 117, 0.08)' },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { color: colors.textPrimary, fontSize: 15 },
  optionTitleSelected: { color: colors.accent },
  optionDescription: { color: colors.textSecondary, fontSize: 12, lineHeight: 16 },
});
