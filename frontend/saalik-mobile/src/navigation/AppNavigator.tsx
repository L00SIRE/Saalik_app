import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthState } from '@context/AuthContext';
import { TravelerNavigator } from './TravelerNavigator';
import { GuideNavigator } from './GuideNavigator';
import { LoginScreen } from '@screens/LoginScreen';
import { colors } from '@theme/colors';

// The root stack only exists to satisfy React Navigation's requirement for a
// single root navigator. Real UX routing is decided by the role switch below.
const Root = createNativeStackNavigator();

function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function AppNavigator() {
  const { status, user } = useAuthState();

  // Hold the splash until bootstrap finishes — prevents flash of wrong navigator.
  if (status === 'idle' || status === 'loading') {
    return <LoadingScreen />;
  }

  const isGuideOrAdmin = user?.role === 'GUIDE' || user?.role === 'ADMIN';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {status === 'unauthenticated' ? (
          <Root.Screen name="Auth" component={LoginScreen} />
        ) : isGuideOrAdmin ? (
          <Root.Screen name="GuideApp" component={GuideNavigator} />
        ) : (
          <Root.Screen name="TravelerApp" component={TravelerNavigator} />
        )}
      </Root.Navigator>
    </View>
  );
}
