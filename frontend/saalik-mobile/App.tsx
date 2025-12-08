import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  const [fontsLoaded, error] = useFonts({
    LeagueSpartan_400Regular: require('./assets/LeagueSpartan-Regular.ttf'),
  });

  useEffect(() => {
    if (error) {
      // Ignore "already registered" error which happens on hot reload
      const errorStr = JSON.stringify(error) + (error.message || '');
      if (!errorStr.includes('CTFontManagerError code: 104')) {
        console.error('Error loading fonts:', error);
      } else {
        console.log('Font already registered (ignoring hot reload error)');
      }
    }
    console.log('Fonts loaded:', fontsLoaded);
  }, [fontsLoaded, error]);

  // If fonts fail to load, we still want to show the app, just without the custom font
  if (!fontsLoaded && !error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#021d0f', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#15ff75" size="large" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
