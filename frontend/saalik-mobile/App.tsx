import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { queryClient, asyncStoragePersister } from './src/services/queryClient';
import { colors } from './src/theme/colors';

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.card,
    text: colors.textPrimary,
    border: 'rgba(255,255,255,0.06)',
    primary: colors.accent,
    notification: colors.accent,
  },
};

export default function App() {
  const [fontsLoaded, error] = useFonts({
    LeagueSpartan_400Regular: require('./assets/LeagueSpartan-Regular.ttf'),
  });

  useEffect(() => {
    if (error) {
      const errorStr = JSON.stringify(error) + (error.message || '');
      if (!errorStr.includes('CTFontManagerError code: 104')) {
        console.error('Error loading fonts:', error);
      }
    }
  }, [fontsLoaded, error]);

  if (!fontsLoaded && !error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#021d0f', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#15ff75" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <AuthProvider>
          <NavigationContainer theme={navTheme}>
            <StatusBar style="light" />
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
