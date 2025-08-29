// app/index.tsx
import { useRouter } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

// Prevent auto-hide of splash screen
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(async () => {
      // Hide Expo splash screen first
      await SplashScreen.hideAsync();
      router.replace("./Splash/Splash");
    }, 1000); 

    return () => clearTimeout(timeout);
  }, []);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E90FF"
  }
});