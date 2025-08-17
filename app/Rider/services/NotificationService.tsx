import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import axios from 'axios';

const API_BASE_URL = 'https://freshness-eakm.onrender.com/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  static async configure() {
    try {
      if (!Device.isDevice) {
        Alert.alert('Push Notifications', 'Must use physical device');
        return null;
      }

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

      if (!projectId) {
        Alert.alert('Configuration Error', 'Missing projectId');
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Push notification permissions required');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const pushToken = tokenData.data;
      console.log('✅ Expo Push Token:', pushToken);

      // Send pushToken to backend
      const riderData = await AsyncStorage.getItem('user');
      if (riderData) {
        const rider = JSON.parse(riderData);
        await axios.post(`${API_BASE_URL}/save-push-token`, {
          riderId: rider._id,
          pushToken,
        });
        console.log('✅ Push token sent to backend');
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('new-orders', {
          name: 'New Orders',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          showBadge: true,
        });
      }

      return { pushToken };
    } catch (error) {
      console.error('NotificationService error:', error);
      Alert.alert('Notification Error', error.message || 'Failed to configure notifications');
      return null;
    }
  }

  // Show notification for a single order
  static async showNewOrderNotification(order) {
    try {
      if (!order) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'New Order Available! 🚚',
          body: `Customer: ${order.customerName}\nAmount: ${order.totalAmount || 0}`,
          sound: 'default',
          data: { orderId: order._id, type: 'new_order' },
          ...(Platform.OS === 'android' && { channelId: 'new-orders' }),
        },
        trigger: null,
      });

      console.log('✅ Local notification sent for order:', order._id);
    } catch (error) {
      console.error('❌ Error showing notification:', error);
    }
  }

  // Show notifications for multiple orders
  static async showOrdersNotifications(orders = []) {
    if (!Array.isArray(orders) || orders.length === 0) return;
    for (const order of orders) {
      await this.showNewOrderNotification(order);
    }
  }
}

export default NotificationService;
