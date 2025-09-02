// services/NotificationService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert, Platform, AppState } from 'react-native';
import messaging from '@react-native-firebase/messaging';

const API_BASE_URL = 'https://freshness-eakm.onrender.com/api';

class NotificationService {
  static instance = null;
  static isConfigured = false;
  static currentHandler = null;
  static isInitializing = false;
  static tokenRefreshUnsubscribe = null;
  static foregroundHandler = null;

  static getInstance() {
    if (!this.instance) this.instance = new NotificationService();
    return this.instance;
  }

  // Must be called in index.js (see below)
  static setupBackgroundHandler() {
    try {
      console.log('🔧 Setting up background message handler...');
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        try {
          console.log('📩 BG message:', {
            title: remoteMessage.notification?.title,
            body: remoteMessage.notification?.body,
            data: remoteMessage.data,
          });

          const backgroundOrder = {
            orderId: remoteMessage.data?.orderId,
            title: remoteMessage.notification?.title,
            body: remoteMessage.notification?.body,
            timestamp: Date.now(),
          };

          await AsyncStorage.setItem(
            'pendingBackgroundOrder',
            JSON.stringify(backgroundOrder)
          );
          console.log('✅ Stored pending background order');
        } catch (err) {
          console.error('❌ Error storing BG order:', err);
        }
      });
      console.log('✅ BG handler ready');
    } catch (error) {
      console.error('❌ BG handler setup failed:', error);
    }
  }

  static async configure(onNewOrder) {
    console.log('🔧 Configuring NotificationService...');
    if (this.isInitializing) {
      let i = 0;
      while (this.isInitializing && i < 30) {
        // wait for another config in flight
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 500));
        i++;
      }
    }

    if (this.isConfigured) {
      console.log('✅ Already configured; update handler & process pending');
      this.currentHandler = onNewOrder;
      this.processPendingBackgroundOrders();
      return { success: true, alreadyConfigured: true };
    }

    this.isInitializing = true;
    this.currentHandler = onNewOrder;

    try {
      // 1) Request permission
      console.log('🔐 Requesting notification permission...');
      const permGranted = await this.requestPermissions();
      if (!permGranted) {
        console.log('⚠️ Permission denied');
        this.isConfigured = true;
        this.isInitializing = false;
        return { success: true, permissionDenied: true };
      }

      // 2) Get token
      console.log('🎫 Fetching FCM token...');
      const token = await this.getFCMToken();
      if (token) {
        await this.saveTokenToBackend(token);
      }

      // 3) Handlers
      this.setupForegroundHandler();
      this.setupNotificationOpenedHandlers();
      this.setupTokenRefreshHandler();

      // 4) Process any pending
      await this.processPendingBackgroundOrders();

      this.isConfigured = true;
      this.isInitializing = false;
      console.log('✅ NotificationService configured');
      return { success: true, token, hasPermission: true };
    } catch (error) {
      console.error('❌ configure() failed:', error);
      this.isConfigured = true; // prevent re-entrancy loops
      this.isInitializing = false;
      return { success: true, error: error.message, fallbackMode: true };
    }
  }

  static async requestPermissions() {
    try {
      // Directly request; RNFirebase removed hasPermission()
      const authStatus = await messaging().requestPermission({
        alert: true,
        badge: true,
        sound: true,
        announcement: true,
        provisional: false,
        criticalAlert: true,
        carPlay: true,
      });

      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) return false;

      if (Platform.OS === 'ios') {
        try {
          // ensure registration; on iOS this is required once
          const isRegistered = messaging().isDeviceRegisteredForRemoteMessages;
          if (!isRegistered) {
            await messaging().registerDeviceForRemoteMessages();
            console.log('📱 iOS registered for remote messages');
          }
        } catch (e) {
          console.warn('⚠️ iOS registerDeviceForRemoteMessages failed:', e);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ requestPermissions error:', error);
      return false;
    }
  }

  static async getFCMToken() {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (Platform.OS === 'ios') {
          const isRegistered = messaging().isDeviceRegisteredForRemoteMessages;
          if (!isRegistered) {
            await messaging().registerDeviceForRemoteMessages();
          }
        }
        const token = await messaging().getToken();
        if (token && token.length > 10) {
          console.log('✅ FCM token:', token.slice(0, 12) + '...');
          return token;
        }
        throw new Error('Invalid token');
      } catch (e) {
        console.warn(`⚠️ getToken attempt ${attempt} failed:`, e.message);
        if (attempt < maxRetries) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
      }
    }
    console.warn('❌ getFCMToken exhausted retries');
    return null;
  }

  static async saveTokenToBackend(fcmToken) {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const riderData = await AsyncStorage.getItem('user');
        if (!riderData) throw new Error('No rider data');
        const rider = JSON.parse(riderData);
        if (!rider?._id) throw new Error('Invalid rider data');

        // keep your original POST route
        const res = await axios.post(
          `${API_BASE_URL}/save-push-token`,
          { riderId: rider._id, pushToken: fcmToken },
          { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
        );
        if (res.status === 200) {
          console.log('✅ Token saved to backend');
          return true;
        }
        throw new Error(`Server responded ${res.status}`);
      } catch (e) {
        console.warn(`⚠️ saveToken attempt ${attempt} failed:`, e.message);
        if (attempt < maxRetries) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 1500 * attempt));
        } else {
          throw e;
        }
      }
    }
  }

  static setupForegroundHandler() {
    try {
      console.log('📱 Setting foreground handler...');
      if (this.foregroundHandler) {
        this.foregroundHandler();
        this.foregroundHandler = null;
      }
      this.foregroundHandler = messaging().onMessage(async (remoteMessage) => {
        console.log('📩 FG message:', {
          title: remoteMessage?.notification?.title,
          body: remoteMessage?.notification?.body,
          data: remoteMessage?.data,
        });
        await this.processNewOrderMessage(remoteMessage, 'foreground');

        if (remoteMessage?.notification) {
          Alert.alert(
            remoteMessage.notification.title || 'New Order!',
            remoteMessage.notification.body || 'You have a new order',
            [
              { text: 'Dismiss', style: 'cancel' },
              {
                text: 'View Order',
                onPress: () => {
                  const id = remoteMessage.data?.orderId;
                  if (id && this.currentHandler) this.currentHandler(id);
                },
              },
            ]
          );
        }
      });
      console.log('✅ FG handler ready');
    } catch (e) {
      console.error('❌ setupForegroundHandler error:', e);
    }
  }

  static setupNotificationOpenedHandlers() {
    try {
      console.log('🔄 Setting opened handlers...');
      messaging().onNotificationOpenedApp((remoteMessage) => {
        setTimeout(() => {
          this.processNewOrderMessage(remoteMessage, 'background_opened');
        }, 1000);
      });
      messaging()
        .getInitialNotification()
        .then((remoteMessage) => {
          if (remoteMessage) {
            setTimeout(() => {
              this.processNewOrderMessage(remoteMessage, 'quit_opened');
            }, 3000);
          }
        })
        .catch((e) => console.warn('⚠️ getInitialNotification failed:', e));
      console.log('✅ Opened handlers ready');
    } catch (e) {
      console.error('❌ setupNotificationOpenedHandlers error:', e);
    }
  }

  static async processNewOrderMessage(remoteMessage, source) {
    try {
      const orderId = remoteMessage?.data?.orderId;
      if (!orderId || typeof orderId !== 'string' || orderId.includes('test_order_id')) {
        console.warn('⚠️ Invalid orderId in message', remoteMessage?.data);
        return;
      }

      const appState = AppState.currentState;
      if (appState === 'active' && this.currentHandler && typeof this.currentHandler === 'function') {
        try {
          this.currentHandler(orderId);
        } catch (err) {
          console.error('❌ Error in handler:', err);
        }
      } else {
        // store for later
        const pendingOrder = {
          orderId,
          title: remoteMessage.notification?.title,
          body: remoteMessage.notification?.body,
          timestamp: Date.now(),
          source,
        };
        await AsyncStorage.setItem('pendingOrder', JSON.stringify(pendingOrder));
      }
    } catch (error) {
      console.error('❌ processNewOrderMessage failed:', error);
    }
  }

  static async processPendingBackgroundOrders() {
    try {
      // from setBackgroundMessageHandler
      const pendingBG = await AsyncStorage.getItem('pendingBackgroundOrder');
      if (pendingBG) {
        const pb = JSON.parse(pendingBG);
        await AsyncStorage.removeItem('pendingBackgroundOrder');
        if (this.currentHandler && pb?.orderId) {
          setTimeout(() => this.currentHandler(pb.orderId), 1500);
        }
      }

      // from quit/background opened store
      const pending = await AsyncStorage.getItem('pendingOrder');
      if (pending) {
        const po = JSON.parse(pending);
        await AsyncStorage.removeItem('pendingOrder');
        if (this.currentHandler && po?.orderId) {
          setTimeout(() => this.currentHandler(po.orderId), 800);
        }
      }
    } catch (e) {
      console.error('❌ processPendingBackgroundOrders error:', e);
    }
  }

  static setupTokenRefreshHandler() {
    try {
      if (this.tokenRefreshUnsubscribe) {
        this.tokenRefreshUnsubscribe();
        this.tokenRefreshUnsubscribe = null;
      }
      this.tokenRefreshUnsubscribe = messaging().onTokenRefresh(async (fcmToken) => {
        try {
          await this.saveTokenToBackend(fcmToken);
          console.log('✅ Refreshed token saved');
        } catch (e) {
          console.warn('⚠️ Failed saving refreshed token:', e);
        }
      });
    } catch (e) {
      console.error('❌ setupTokenRefreshHandler error:', e);
    }
  }


  static async getStatus() {
    const status = {
      isConfigured: this.isConfigured,
      isInitializing: this.isInitializing,
      hasHandler: !!this.currentHandler,
      platform: Platform.OS,
      appState: AppState.currentState,
    };
    try {
      const authStatus = await messaging().requestPermission(); // idempotent check
      status.hasPermission =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      const token = await messaging().getToken();
      status.hasToken = !!token;
      if (token) status.tokenPreview = token.slice(0, 30) + '...';

      status.isRegistered =
        Platform.OS === 'ios'
          ? !!messaging().isDeviceRegisteredForRemoteMessages
          : true;
    } catch (e) {
      status.error = e.message;
    }
    return status;
  }

  static cleanup() {
    console.log('🧹 Cleaning NotificationService...');
    if (this.tokenRefreshUnsubscribe) this.tokenRefreshUnsubscribe();
    if (this.foregroundHandler) this.foregroundHandler();
    this.tokenRefreshUnsubscribe = null;
    this.foregroundHandler = null;
    this.isConfigured = false;
    this.isInitializing = false;
    this.currentHandler = null;
    this.instance = null;
  }

  static updateHandler(newHandler) {
    this.currentHandler = newHandler;
    this.processPendingBackgroundOrders();
  }
}

export default NotificationService;
