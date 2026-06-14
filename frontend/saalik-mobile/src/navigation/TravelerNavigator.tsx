import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { HomeScreen } from '@screens/HomeScreen';
import { TourDetailScreen } from '@screens/TourDetailScreen';
import { SearchScreen } from '@screens/SearchScreen';
import { BookingScreen } from '@screens/BookingScreen';
import { TripsScreen } from '@screens/TripsScreen';
import { ProfileScreen } from '@screens/ProfileScreen';
import { AIChatScreen } from '@screens/AIChatScreen';
import { ScanScreen } from '@screens/ScanScreen';
import { GalleryScreen } from '@screens/GalleryScreen';
import { SavedToursScreen } from '@screens/SavedToursScreen';
import { MyReviewsScreen } from '@screens/MyReviewsScreen';
import { SettingsScreen } from '@screens/SettingsScreen';
import { CheckpointsScreen } from '@screens/CheckpointsScreen';
import type {
  TravelerTabParamList,
  ExploreStackParamList,
  TripsStackParamList,
  PlacesStackParamList,
  TravelerProfileStackParamList,
  DiscoverStackParamList,
} from '@app-types/navigation';

// ─── Stacks ───────────────────────────────────────────────────────────────────

const ExploreStack = createNativeStackNavigator<ExploreStackParamList>();
const DiscoverStack = createNativeStackNavigator<DiscoverStackParamList>();
const TripsStack = createNativeStackNavigator<TripsStackParamList>();
const PlacesStack = createNativeStackNavigator<PlacesStackParamList>();
const ProfileStack = createNativeStackNavigator<TravelerProfileStackParamList>();

const stackOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  contentStyle: { backgroundColor: colors.background },
} as const;

function ExploreNavigator() {
  return (
    <ExploreStack.Navigator screenOptions={stackOptions}>
      <ExploreStack.Screen name="Home" component={HomeScreen} />
      <ExploreStack.Screen name="TourDetail" component={TourDetailScreen} />
      <ExploreStack.Screen name="Search" component={SearchScreen} />
      <ExploreStack.Screen name="Booking" component={BookingScreen} />
      <ExploreStack.Screen name="Gallery" component={GalleryScreen} />
      <ExploreStack.Screen
        name="AIChat"
        component={AIChatScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </ExploreStack.Navigator>
  );
}

function DiscoverNavigator() {
  return (
    <DiscoverStack.Navigator screenOptions={stackOptions}>
      <DiscoverStack.Screen name="Scan" component={ScanScreen} />
    </DiscoverStack.Navigator>
  );
}

function TripsNavigator() {
  return (
    <TripsStack.Navigator screenOptions={stackOptions}>
      <TripsStack.Screen name="MyBookings" component={TripsScreen} />
      <TripsStack.Screen name="TourDetail" component={TourDetailScreen} />
    </TripsStack.Navigator>
  );
}

function PlacesNavigator() {
  return (
    <PlacesStack.Navigator screenOptions={stackOptions}>
      <PlacesStack.Screen name="Checkpoints" component={CheckpointsScreen} />
      <PlacesStack.Screen name="TourDetail" component={TourDetailScreen} />
    </PlacesStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={stackOptions}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="Saved" component={SavedToursScreen} />
      <ProfileStack.Screen name="MyReviews" component={MyReviewsScreen} />
      <ProfileStack.Screen name="Gallery" component={GalleryScreen} />
      <ProfileStack.Screen name="TourDetail" component={TourDetailScreen} />
    </ProfileStack.Navigator>
  );
}

// ─── Tab Navigator ────────────────────────────────────────────────────────────

type IconPair = [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap];

const TAB_CONFIG: Record<keyof TravelerTabParamList, { label: string; icons: IconPair }> = {
  ExploreTab: { label: 'Explore', icons: ['compass', 'compass-outline'] },
  DiscoverTab: { label: 'Discover', icons: ['scan', 'scan-outline'] },
  PlacesTab: { label: 'Places', icons: ['location', 'location-outline'] },
  TripsTab: { label: 'Trips', icons: ['ticket', 'ticket-outline'] },
  ProfileTab: { label: 'Profile', icons: ['person', 'person-outline'] },
};

const Tab = createBottomTabNavigator<TravelerTabParamList>();

export function TravelerNavigator() {
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
      <Tab.Screen name="ExploreTab" component={ExploreNavigator} />
      <Tab.Screen name="DiscoverTab" component={DiscoverNavigator} />
      <Tab.Screen name="PlacesTab" component={PlacesNavigator} />
      <Tab.Screen name="TripsTab" component={TripsNavigator} />
      <Tab.Screen name="ProfileTab" component={ProfileNavigator} />
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
