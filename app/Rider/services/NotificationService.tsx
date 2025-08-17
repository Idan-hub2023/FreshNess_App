import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert, Platform } from 'react-native';

const API_BASE_URL = 'https://freshness-eakm.onrender.com/api';

class NotificationService {
  static async configure() {
    try {
      // Request permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        Alert.alert('Permission Denied', 'Push notification permissions required');
        return null;
      }

      // Get FCM token
      const fcmToken = await messaging().getToken();
      if (!fcmToken) {
        console.log('Failed to get FCM token');
        return null;
      }
      console.log('✅ FCM Token:', fcmToken);

      // Send FCM token to backend
      const riderData = await AsyncStorage.getItem('user');
      if (riderData) {
        const rider = JSON.parse(riderData);
        await axios.post(`${API_BASE_URL}/save-push-token`, {
          riderId: rider._id,
          pushToken: fcmToken,
        });
        console.log('✅ FCM token sent to backend');
      }

      // Optional: foreground notification handling
      messaging().onMessage(async remoteMessage => {
        Alert.alert(remoteMessage.notification.title, remoteMessage.notification.body);
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