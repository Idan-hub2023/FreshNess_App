import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert, Platform } from 'react-native';

const API_BASE_URL = 'https://freshness-eakm.onrender.com/api';

class NotificationService {
  static async configure(onNewOrder) {
    try {
      // 1. Request permissions
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        Alert.alert('Permission Denied', 'Push notification permissions required');
        return null;
      }

      // 2. Get FCM token
      const fcmToken = await messaging().getToken();
      if (!fcmToken) return null;

      // 3. Save token to backend
      const riderData = await AsyncStorage.getItem('user');
      if (riderData) {
        const rider = JSON.parse(riderData);
        await axios.post(`${API_BASE_URL}/save-push-token`, {
          riderId: rider._id,
          pushToken: fcmToken,
        });
      }

      // 4. Create notification channel (Android)
      if (Platform.OS === 'android') {
        await messaging().createNotificationChannel({
          id: 'high_priority',
          name: 'High Priority Notifications',
          description: 'Important order notifications',
          importance: 4, // IMPORTANCE_HIGH
          sound: 'default',
          vibration: true,
          vibrationPattern: [300, 500],
          lights: true,
          lightColor: '#FF231F7C',
          showBadge: true,
          badgeIconType: 1, // LARGE
        });
      }

      // 5. Foreground message handler
      messaging().onMessage(async remoteMessage => {
        if (Platform.OS === 'android') {
          remoteMessage.android = {
            ...remoteMessage.android,
            channelId: 'high_priority',
            priority: 'high',
            sound: 'default',
            vibrateTimingsMillis: [0, 500, 500],
          };
        }

        Alert.alert(
          remoteMessage.notification.title,
          remoteMessage.notification.body
        );

        if (remoteMessage.data?.orderId && onNewOrder) {
          onNewOrder(remoteMessage.data.orderId);
        }
      });

      // 6. Background/Quit state handlers
      messaging().setBackgroundMessageHandler(async remoteMessage => {
        if (remoteMessage.data?.orderId && onNewOrder) {
          onNewOrder(remoteMessage.data.orderId);
        }
        return Promise.resolve();
      });

      messaging().onNotificationOpenedApp(remoteMessage => {
        if (remoteMessage.data?.orderId && onNewOrder) {
          onNewOrder(remoteMessage.data.orderId);
        }
      });

      messaging().getInitialNotification().then(remoteMessage => {
        if (remoteMessage?.data?.orderId && onNewOrder) {
          onNewOrder(remoteMessage.data.orderId);
        }
      });

      return { fcmToken };
    } catch (error) {
      console.error('NotificationService error:', error);
      Alert.alert('Notification Error', error.message || 'Failed to configure notifications');
      return null;
    }
  }
}

export default NotificationService;