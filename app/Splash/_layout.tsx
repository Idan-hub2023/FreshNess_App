// app/splash/_layout.tsx
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function SplashLayout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: 'rgba(19, 50, 226, 1)' }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false, // Prevent going back during splash
          animation: 'fade',
        }}
      >
        <Stack.Screen 
          name="splash" 
          options={{ 
            headerShown: false,
            gestureEnabled: false,
          }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}