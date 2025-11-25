import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { LoginScreen } from '@screens/LoginScreen';

export default function App() {
  const [fontsLoaded] = useFonts({
    LeagueSpartan_400Regular: require('./assets/LeagueSpartan-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      if (Text.defaultProps == null) {
        Text.defaultProps = {};
      }
      if (TextInput.defaultProps == null) {
        TextInput.defaultProps = {};
      }
      Text.defaultProps.style = [{ fontFamily: 'LeagueSpartan_400Regular' }, Text.defaultProps.style].flat();
      TextInput.defaultProps.style = [{ fontFamily: 'LeagueSpartan_400Regular' }, TextInput.defaultProps.style].flat();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#021d0f', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#15ff75" size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <LoginScreen />
    </>
  );
}
