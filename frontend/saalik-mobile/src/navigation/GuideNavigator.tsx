import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { GuideDashboardScreen } from '@screens/GuideDashboardScreen';
import { GuideMyToursScreen } from '@screens/GuideMyToursScreen';
import { ProfileScreen } from '@screens/ProfileScreen';
import type {
  GuideTabParamList,
  GuideDashboardStackParamList,
  GuideMyToursStackParamList,
  GuideProfileStackParamList,
} from '@app-types/navigation';

// ─── Stacks ───────────────────────────────────────────────────────────────────

const DashboardStack = createNativeStackNavigator<GuideDashboardStackParamList>();
const MyToursStack = createNativeStackNavigator<GuideMyToursStackParamList>();
const GuideProfileStack = createNativeStackNavigator<GuideProfileStackParamList>();

const stackOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
} as const;

function DashboardNavigator() {
  return (
    <DashboardStack.Navigator screenOptions={stackOptions}>
      <DashboardStack.Screen name="Dashboard" component={GuideDashboardScreen} />
    </DashboardStack.Navigator>
  );
}

function MyToursNavigator() {
  return (
    <MyToursStack.Navigator screenOptions={stackOptions}>
      <MyToursStack.Screen name="MyTours" component={GuideMyToursScreen} />
    </MyToursStack.Navigator>
  );
}

function GuideProfileNavigator() {
  return (
    <GuideProfileStack.Navigator screenOptions={stackOptions}>
      <GuideProfileStack.Screen name="GuideProfile" component={ProfileScreen} />
    </GuideProfileStack.Navigator>
  );
}

// ─── Tab Navigator ────────────────────────────────────────────────────────────

type IconPair = [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap];

const TAB_CONFIG: Record<keyof GuideTabParamList, { label: string; icons: IconPair }> = {
  GuideDashboardTab: { label: 'Dashboard', icons: ['grid', 'grid-outline'] },
  GuideMyToursTab: { label: 'Tours', icons: ['map', 'map-outline'] },
  GuideProfileTab: { label: 'Profile', icons: ['person', 'person-outline'] },
};

const Tab = createBottomTabNavigator<GuideTabParamList>();

export function GuideNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const { label, icons } = TAB_CONFIG[route.name];
        return {
          headerShown: false,
          tabBarLabel: label,
          tabBarHideOnKeyboard: Platform.OS === 'android',
          tabBarStyle: {
            backgroundColor: 'rgba(2, 18, 8, 0.96)',
            borderTopColor: 'rgba(255,255,255,0.06)',
            borderTopWidth: StyleSheet.hairlineWidth,
            height: 60 + bottomPadding,
            paddingTop: 10,
            paddingBottom: bottomPadding,
          },
          tabBarLabelStyle: {
            fontFamily: typography.regular,
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 0.3,
            marginTop: 2,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarIcon: ({ focused, color }) => (
            <View style={styles.iconWrap}>
              {focused && <View style={styles.activeBar} />}
              <Ionicons name={focused ? icons[0] : icons[1]} size={22} color={color} />
            </View>
          ),
        };
      }}
    >
      <Tab.Screen name="GuideDashboardTab" component={DashboardNavigator} />
      <Tab.Screen name="GuideMyToursTab" component={MyToursNavigator} />
      <Tab.Screen name="GuideProfileTab" component={GuideProfileNavigator} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBar: {
    position: 'absolute',
    top: -10,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
});
