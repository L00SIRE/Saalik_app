import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

// ─── Traveler Stacks ──────────────────────────────────────────────────────────

export type ExploreStackParamList = {
  Home: undefined;
  TourDetail: { tourId: string };
  Booking: { tourId: string; scheduleId: string };
  AIChat: { tourId?: string };
  Search: undefined;
  Gallery: undefined;
};

export type TripsStackParamList = {
  MyBookings: undefined;
  TourDetail: { tourId: string };
};

export type PlacesStackParamList = {
  Checkpoints: undefined;
  TourDetail: { tourId: string };
};

export type TravelerProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
  Saved: undefined;
  MyReviews: undefined;
  Gallery: undefined;
  TourDetail: { tourId: string };
};

export type DiscoverStackParamList = {
  Scan: undefined;
};

export type TravelerTabParamList = {
  ExploreTab: NavigatorScreenParams<ExploreStackParamList>;
  DiscoverTab: NavigatorScreenParams<DiscoverStackParamList>;
  PlacesTab: NavigatorScreenParams<PlacesStackParamList>;
  TripsTab: NavigatorScreenParams<TripsStackParamList>;
  ProfileTab: NavigatorScreenParams<TravelerProfileStackParamList>;
};

// ─── Guide Stacks ─────────────────────────────────────────────────────────────

export type GuideDashboardStackParamList = {
  Dashboard: undefined;
  TourDetail: { tourId: string };
};

export type GuideMyToursStackParamList = {
  MyTours: undefined;
};

export type GuideProfileStackParamList = {
  GuideProfile: undefined;
};

export type GuideTabParamList = {
  GuideDashboardTab: NavigatorScreenParams<GuideDashboardStackParamList>;
  GuideMyToursTab: NavigatorScreenParams<GuideMyToursStackParamList>;
  GuideProfileTab: NavigatorScreenParams<GuideProfileStackParamList>;
};

// ─── Typed Screen Props ───────────────────────────────────────────────────────

export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type ExploreScreenProps<T extends keyof ExploreStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ExploreStackParamList, T>,
    BottomTabScreenProps<TravelerTabParamList>
  >;

export type TripsScreenProps<T extends keyof TripsStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<TripsStackParamList, T>,
    BottomTabScreenProps<TravelerTabParamList>
  >;

export type GuideDashScreenProps<T extends keyof GuideDashboardStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<GuideDashboardStackParamList, T>,
    BottomTabScreenProps<GuideTabParamList>
  >;
