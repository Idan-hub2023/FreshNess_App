// app/_layout.tsx
import { useEffect } from "react";
import { Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import NotificationService from "./Rider/services/NotificationService";

// Deep linking configuration
const linking = {
  prefixes: ["freshness://"],
  config: {
    screens: {
      "reset-password": "reset-password/:token",
    },
  },
};

export default function Layout() {
  useEffect(() => {
    // 1️⃣ Setup Android notification channel
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("high_priority", {
        name: "High Priority",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
      });
    }

    NotificationService.setupBackgroundHandler();
    NotificationService.configure((orderId) => {
      console.log("🛎️ New order received:", orderId);
    });
  }, []);

  return (
    <Stack
      linking={linking}
      screenOptions={{
        headerShown: false,
        animation: 'fade', // Smooth transitions
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Splash/Splash" 
        options={{ 
          headerShown: false,
          gestureEnabled: false, 
        }} 
      />
      <Stack.Screen 
        name="auth/welcome" 
        options={{ headerShown: false }} 
      />
    </Stack>
  );
}