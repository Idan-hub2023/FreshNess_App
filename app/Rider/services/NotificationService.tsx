import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert, Platform } from 'react-native';

const API_BASE_URL = 'https://freshness-eakm.onrender.com/api';

class NotificationService {
  static isConfigured = false;
  static currentOnNewOrderHandler = null;

  static async configure(onNewOrder) {
    try {
      if (this.isConfigured) {
        console.log('Notifications already configured');
        return;
      }

      console.log('🚀 Starting notification configuration...');

      // Store the current handler
      this.currentOnNewOrderHandler = onNewOrder;

      // 1. Check if Firebase messaging is available
      if (!messaging || !messaging().isRegisteredForRemoteMessages) {
        console.log('⚠️ Firebase messaging not available');
        throw new Error('Firebase messaging not available');
      }

      // 2. Register device for remote messages
      try {
        if (!messaging().isRegisteredForRemoteMessages) {
          console.log('📱 Registering device for remote messages...');
          await messaging().registerDeviceForRemoteMessages();
        }
      } catch (error) {
        console.error('Failed to register device:', error);
        // Continue anyway - this might work on some platforms without explicit registration
      }

      // 3. Request permissions
      console.log('🔐 Requesting notification permissions...');
      let authStatus;
      try {
        authStatus = await messaging().requestPermission();
        console.log('Permission status:', authStatus);
      } catch (error) {
        console.error('Failed to request permission:', error);
        // On some platforms, permission might already be granted
        authStatus = messaging.AuthorizationStatus.AUTHORIZED;
      }

      const enabled = (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      );

      if (!enabled) {
        console.log('❌ Notification permission not granted');
        // Don't throw error, just continue without notifications
        this.isConfigured = true;
        return { fcmToken: null };
      }

      // 4. Get FCM token
      console.log('🔑 Getting FCM token...');
      let fcmToken;
      try {
        fcmToken = await messaging().getToken();
        console.log('✅ FCM Token received:', fcmToken?.substring(0, 20) + '...');
      } catch (tokenError) {
        console.error('❌ Failed to get FCM token:', tokenError);
        // Continue without token - notifications won't work but app shouldn't crash
        this.isConfigured = true;
        return { fcmToken: null };
      }

      if (!fcmToken) {
        console.log('❌ No FCM token available');
        this.isConfigured = true;
        return { fcmToken: null };
      }

      // 5. Save token to backend
      console.log('💾 Saving push token to backend...');
      try {
        const riderData = await AsyncStorage.getItem('user');
        if (riderData) {
          const rider = JSON.parse(riderData);
          console.log('Saving token for rider:', rider.fullname);
          
          await axios.post(`${API_BASE_URL}/save-push-token`, {
            riderId: rider._id,
            pushToken: fcmToken,
          });
          console.log('✅ Push token saved successfully');
        }
      } catch (saveError) {
        console.error('❌ Failed to save push token:', saveError);
        // Continue even if saving fails
      }

      // 6. Create notification channel (Android)
      if (Platform.OS === 'android') {
        try {
          await messaging().createNotificationChannel({
            id: 'high_priority',
            name: 'High Priority Notifications',
            description: 'Important order notifications',
            importance: 4, // IMPORTANCE_HIGH
            sound: 'default',
            vibration: true,
            vibrationPattern: [300, 500, 300, 500],
            lights: true,
            lightColor: '#FF231F7C',
            showBadge: true,
          });
          console.log('✅ Android notification channel created');
        } catch (channelError) {
          console.error('❌ Failed to create notification channel:', channelError);
        }
      }

      // 7. Setup message handlers
      this.setupMessageHandlers();

      // 8. Handle token refresh
      this.setupTokenRefreshHandler();

      this.isConfigured = true;
      console.log('✅ Notification service configured successfully');
      
      return { fcmToken };

    } catch (error) {
      console.error('❌ Notification configuration failed:', error);
      this.isConfigured = true; // Mark as configured to prevent retries
      return { fcmToken: null };
    }
  }

  static setupMessageHandlers() {
    console.log('🔧 Setting up message handlers...');

    // Handle foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log('📨 Foreground message received:', JSON.stringify(remoteMessage, null, 2));
      
      // Show local alert for foreground messages
      if (remoteMessage.notification) {
        Alert.alert(
          remoteMessage.notification.title || 'New Notification',
          remoteMessage.notification.body || 'You have a new notification',
          [
            {
              text: 'Dismiss',
              style: 'cancel',
            },
            {
              text: 'View',
              onPress: () => {
                if (remoteMessage.data?.orderId && this.currentOnNewOrderHandler) {
                  console.log('🔄 Processing foreground order:', remoteMessage.data.orderId);
                  this.currentOnNewOrderHandler(remoteMessage.data.orderId);
                }
              },
            },
          ]
        );
      }

      // Always handle the order if orderId is present
      if (remoteMessage.data?.orderId && this.currentOnNewOrderHandler) {
        console.log('🔄 Auto-processing new order:', remoteMessage.data.orderId);
        setTimeout(() => {
          this.currentOnNewOrderHandler(remoteMessage.data.orderId);
        }, 1000);
      }
    });

    // Handle background messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('📨 Background message received:', JSON.stringify(remoteMessage, null, 2));
      
      // Store the order ID for when app comes to foreground
      if (remoteMessage.data?.orderId) {
        try {
          await AsyncStorage.setItem('pendingOrderId', remoteMessage.data.orderId);
          console.log('📝 Stored pending order ID:', remoteMessage.data.orderId);
        } catch (error) {
          console.error('Failed to store pending order ID:', error);
        }
      }
      
      return Promise.resolve();
    });

    // Handle notification opened app (from background/killed state)
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('📱 App opened from notification:', JSON.stringify(remoteMessage, null, 2));
      
      if (remoteMessage.data?.orderId && this.currentOnNewOrderHandler) {
        console.log('🔄 Processing order from opened notification:', remoteMessage.data.orderId);
        // Add delay to ensure app is fully loaded
        setTimeout(() => {
          this.currentOnNewOrderHandler(remoteMessage.data.orderId);
        }, 2000);
      }
    });

    // Check for initial notification (app opened from killed state)
    messaging().getInitialNotification().then((remoteMessage) => {
      if (remoteMessage) {
        console.log('📱 Initial notification found:', JSON.stringify(remoteMessage, null, 2));
        if (remoteMessage.data?.orderId && this.currentOnNewOrderHandler) {
          console.log('🔄 Processing initial order:', remoteMessage.data.orderId);
          // Add delay to ensure app is fully initialized
          setTimeout(() => {
            this.currentOnNewOrderHandler(remoteMessage.data.orderId);
          }, 3000);
        }
      }
    });

    console.log('✅ Message handlers setup complete');
  }

  static setupTokenRefreshHandler() {
    // Handle token refresh
    messaging().onTokenRefresh(async (fcmToken) => {
      console.log('🔄 FCM Token refreshed:', fcmToken?.substring(0, 20) + '...');
      
      try {
        const riderData = await AsyncStorage.getItem('user');
        if (riderData) {
          const rider = JSON.parse(riderData);
          await axios.post(`${API_BASE_URL}/save-push-token`, {
            riderId: rider._id,
            pushToken: fcmToken,
          });
          console.log('✅ Refreshed token saved to backend');
        }
      } catch (error) {
        console.error('❌ Failed to save refreshed token:', error);
      }
    });
  }

  // Check for pending orders when app becomes active
  static async checkPendingOrders() {
    try {
      const pendingOrderId = await AsyncStorage.getItem('pendingOrderId');
      if (pendingOrderId && this.currentOnNewOrderHandler) {
        console.log('📋 Found pending order:', pendingOrderId);
        await AsyncStorage.removeItem('pendingOrderId');
        
        // Add delay to ensure UI is ready
        setTimeout(() => {
          this.currentOnNewOrderHandler(pendingOrderId);
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to check pending orders:', error);
    }
  }

  // Get current token
  static async getToken() {
    try {
      const token = await messaging().getToken();
      console.log('🔄 Retrieved FCM token');
      return token;
    } catch (error) {
      console.error('❌ Failed to get FCM token:', error);
      return null;
    }
  }

  // Test notification
  static async testNotification() {
    if (this.currentOnNewOrderHandler) {
      console.log('🧪 Testing notification handler...');
      Alert.alert(
        'Test Notification',
        'This is a test notification to verify the system is working',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Test Handler', 
            onPress: () => this.currentOnNewOrderHandler('test_order_id')
          }
        ]
      );
    }
  }

  // Clean up
  static cleanup() {
    console.log('🧹 Cleaning up notification service...');
    this.isConfigured = false;
    this.currentOnNewOrderHandler = null;
  }
}

export default NotificationService;