import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { AppText } from '@components/AppText';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { Chip } from '@components/Chip';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { radii, space } from '@theme';
import {
  CURRENCY_OPTIONS,
  DISTANCE_OPTIONS,
  LANGUAGE_OPTIONS,
  usePreferences,
  type AppPreferences,
} from '../services/preferences';

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { prefs, update, reset } = usePreferences();

  const handleReset = () =>
    Alert.alert('Reset settings?', 'Restore every preference to its default value.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => reset() },
    ]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Settings"
        subtitle="Make Saalik yours"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ─── Notifications ─────────────────────────────────────────────── */}
        <Section title="Notifications">
          <ToggleRow
            icon="notifications-outline"
            label="Push notifications"
            helper="Master switch for everything below"
            value={prefs.pushNotifications}
            onChange={(v) => update({ pushNotifications: v })}
          />
          <ToggleRow
            icon="alarm-outline"
            label="Booking reminders"
            helper="A nudge before an upcoming tour"
            value={prefs.bookingReminders}
            disabled={!prefs.pushNotifications}
            onChange={(v) => update({ bookingReminders: v })}
          />
          <ToggleRow
            icon="heart-outline"
            label="Tip reminders"
            helper="Remind me to tip a guide afterwards"
            value={prefs.tipReminders}
            disabled={!prefs.pushNotifications}
            onChange={(v) => update({ tipReminders: v })}
          />
          <ToggleRow
            icon="mail-outline"
            label="Email updates"
            helper="New tours and the occasional newsletter"
            value={prefs.emailUpdates}
            onChange={(v) => update({ emailUpdates: v })}
          />
        </Section>

        {/* ─── Display ───────────────────────────────────────────────────── */}
        <Section title="Display">
          <PickerRow
            icon="cash-outline"
            label="Currency"
            helper="Used for prices and tips"
          >
            {CURRENCY_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={`${opt.symbol} ${opt.value}`}
                selected={prefs.currency === opt.value}
                onPress={() => update({ currency: opt.value })}
              />
            ))}
          </PickerRow>

          <Divider />

          <PickerRow icon="walk-outline" label="Distance unit">
            {DISTANCE_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={prefs.distanceUnit === opt.value}
                onPress={() => update({ distanceUnit: opt.value })}
              />
            ))}
          </PickerRow>

          <Divider />

          <PickerRow icon="language-outline" label="Language">
            {LANGUAGE_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.native}
                selected={prefs.language === opt.value}
                onPress={() => update({ language: opt.value })}
              />
            ))}
          </PickerRow>
        </Section>

        {/* ─── Accessibility ─────────────────────────────────────────────── */}
        <Section title="Accessibility">
          <ToggleRow
            icon="contract-outline"
            label="Reduce motion"
            helper="Fewer animations and transitions"
            value={prefs.reduceMotion}
            onChange={(v) => update({ reduceMotion: v })}
          />
        </Section>

        <Button
          label="Reset to defaults"
          variant="ghost"
          leftIcon="refresh-outline"
          onPress={handleReset}
          fullWidth
          style={styles.resetBtn}
        />

        <AppText variant="caption" tone="muted" align="center" style={styles.footnote}>
          Preferences are saved on this device and persist between launches.
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Building blocks ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="overline" tone="muted" style={styles.sectionTitle}>
        {title}
      </AppText>
      <Card variant="outlined" noPadding radius="lg" style={styles.card}>
        {children}
      </Card>
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  helper,
  value,
  onChange,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  helper?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.textSecondary} />
      </View>
      <View style={styles.rowText}>
        <AppText variant="bodyLg" style={styles.rowLabel}>
          {label}
        </AppText>
        {helper && (
          <AppText variant="caption" tone="muted">
            {helper}
          </AppText>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: 'rgba(255,255,255,0.12)', true: colors.accent }}
        thumbColor={value ? '#021007' : '#f4f4f4'}
        ios_backgroundColor="rgba(255,255,255,0.12)"
      />
    </View>
  );
}

function PickerRow({
  icon,
  label,
  helper,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.pickerRow}>
      <View style={styles.rowHeader}>
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={18} color={colors.textSecondary} />
        </View>
        <View style={styles.rowText}>
          <AppText variant="bodyLg" style={styles.rowLabel}>
            {label}
          </AppText>
          {helper && (
            <AppText variant="caption" tone="muted">
              {helper}
            </AppText>
          )}
        </View>
      </View>
      <View style={styles.chipWrap}>{children}</View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: space.xl,
    paddingBottom: space.huge,
  },
  section: {
    marginBottom: space.xl,
  },
  sectionTitle: {
    marginLeft: space.xs,
    marginBottom: space.sm,
  },
  card: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    lineHeight: 20,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  pickerRow: {
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  resetBtn: {
    marginTop: space.sm,
  },
  footnote: {
    marginTop: space.lg,
  },
});
