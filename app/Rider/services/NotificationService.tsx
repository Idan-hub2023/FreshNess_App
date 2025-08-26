import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert, Platform } from 'react-native';
const API_BASE_URL = 'https://freshness-eakm.onrender.com/api';

class NotificationService {
  static instance = null;
  static isConfigured = false;
  static currentHandler = null;
  static messaging = null;
  static isInitializing = false;
  static tokenRefreshUnsubscribe = null;

  // Singleton pattern to prevent multiple instances
  static getInstance() {
    if (!this.instance) {
      this.instance = new NotificationService();
    }
    return this.instance;
  }

  // Main configuration method
  static async configure(onNewOrder) {
    console.log('🔧 Configuring NotificationService...');
    
    // Prevent multiple simultaneous configurations
    if (this.isInitializing) {
      console.log('Already configuring, waiting...');
      // Wait for current initialization to complete
      let attempts = 0;
      while (this.isInitializing && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
    }

    if (this.isConfigured) {
      console.log('✅ NotificationService already configured');
      this.currentHandler = onNewOrder;
      return { success: true, alreadyConfigured: true };
    }

    this.isInitializing = true;
    this.currentHandler = onNewOrder;

    try {
      // Try to initialize Firebase messaging
      const messagingAvailable = await this.initializeFirebase();
      
      if (!messagingAvailable) {
        console.log('⚠️ Firebase not available, using fallback mode');
        this.isConfigured = true;
        this.isInitializing = false;
        return { success: true, fallbackMode: true };
      }

      // Request permissions
      const permissionGranted = await this.requestPermissions();
      if (!permissionGranted) {
        console.log('⚠️ Notification permission denied');
        this.isConfigured = true;
        this.isInitializing = false;
        return { success: true, permissionDenied: true };
      }

      // Get FCM token
      const token = await this.getFCMToken();
      if (token) {
        // Save token to backend (non-blocking)
        this.saveTokenToBackend(token).catch(err => 
          console.warn('Failed to save token:', err.message)
        );
      }

      // Setup message handlers
      this.setupMessageHandlers();
      this.setupTokenRefreshHandler();

      this.isConfigured = true;
      this.isInitializing = false;
      console.log('✅ NotificationService configured successfully');
      
      return { 
        success: true, 
        token,
        hasPermission: true,
        messagingAvailable: true
      };

    } catch (error) {
      console.error('❌ Configuration failed:', error.message);
      this.isConfigured = true; // Mark as configured to prevent retry loops
      this.isInitializing = false;
      return { 
        success: true, // Don't crash the app
        error: error.message,
        fallbackMode: true 
      };
    }
  }

  // Initialize Firebase messaging safely
  static async initializeFirebase() {
    try {
      console.log('🔥 Initializing Firebase messaging...');
      
      // Import with timeout
      const importPromise = import('@react-native-firebase/messaging');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Import timeout')), 5000)
      );

      const { default: messaging } = await Promise.race([
        importPromise, 
        timeoutPromise
      ]);
      
      if (!messaging || typeof messaging !== 'function') {
        throw new Error('Invalid messaging module');
      }

      // Test if messaging works
      const instance = messaging();
      if (!instance) {
        throw new Error('Failed to create messaging instance');
      }

      this.messaging = messaging;
      console.log('✅ Firebase messaging initialized');
      return true;

    } catch (error) {
      console.warn('⚠️ Firebase initialization failed:', error.message);
      this.messaging = null;
      return false;
    }
  }

  // Request notification permissions safely
  static async requestPermissions() {
    if (!this.messaging) return false;

    try {
      console.log('🔐 Requesting notification permissions...');
      
      // Register device first (wrap in try-catch to prevent crashes)
      try {
        const isRegistered = await this.messaging().isRegisteredForRemoteMessages;
        if (!isRegistered) {
          await this.messaging().registerDeviceForRemoteMessages();
          console.log('✅ Device registered for remote messages');
        }
      } catch (registerError) {
        console.warn('⚠️ Device registration failed (continuing anyway):', registerError.message);
        // Continue anyway - not critical on all devices
      }

      // Request permission with timeout
      const permissionPromise = this.messaging().requestPermission({
        alert: true,
        badge: true,
        sound: true,
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Permission timeout')), 8000)
      );

      const authStatus = await Promise.race([permissionPromise, timeoutPromise]);
      
      const enabled = authStatus === this.messaging.AuthorizationStatus.AUTHORIZED ||
                     authStatus === this.messaging.AuthorizationStatus.PROVISIONAL;
      
      if (enabled) {
        console.log('✅ Notification permission granted');
        return true;
      } else {
        console.warn('❌ Notification permission denied');
        return false;
      }

    } catch (error) {
      console.warn('⚠️ Permission request failed:', error.message);
      return false;
    }
  }

  // Get FCM token with retry logic
  static async getFCMToken() {
    if (!this.messaging) return null;

    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🎫 Getting FCM token (attempt ${attempt}/${maxRetries})...`);
        
        const tokenPromise = this.messaging().getToken();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Token timeout')), 6000)
        );

        const token = await Promise.race([tokenPromise, timeoutPromise]);
        
        if (token && token.length > 10) {
          console.log('✅ FCM token obtained:', token.substring(0, 30) + '...');
          return token;
        } else {
          throw new Error('Invalid token received');
        }

      } catch (error) {
        console.warn(`⚠️ Token attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          const delay = 1000 * attempt; // Incremental delay
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.warn('❌ Failed to get FCM token after all retries');
    return null;
  }

  // Save token to backend
  static async saveTokenToBackend(fcmToken) {
    try {
      console.log('💾 Saving FCM token to backend...');
      
      const riderData = await AsyncStorage.getItem('user');
      if (!riderData) {
        throw new Error('No rider data found');
      }

      const rider = JSON.parse(riderData);
      if (!rider._id) {
        throw new Error('Invalid rider data');
      }

      const response = await axios.post(
        `${API_BASE_URL}/save-push-token`,
        {
          riderId: rider._id,
          pushToken: fcmToken,
        },
        {
          timeout: 8000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.status === 200) {
        console.log('✅ FCM token saved successfully');
        return true;
      } else {
        throw new Error(`Server error: ${response.status}`);
      }

    } catch (error) {
      console.error('❌ Failed to save FCM token:', error.message);
      throw error;
    }
  }

  // Setup message handlers
  static setupMessageHandlers() {
    if (!this.messaging || !this.currentHandler) {
      console.warn('⚠️ Cannot setup handlers - missing requirements');
      return;
    }

    try {
      console.log('📨 Setting up message handlers...');

      // Foreground messages - wrap in try-catch
      try {
        this.messaging().onMessage(async (remoteMessage) => {
          console.log('📱 Foreground message received:', {
            title: remoteMessage?.notification?.title,
            body: remoteMessage?.notification?.body,
            orderId: remoteMessage?.data?.orderId
          });
          
          this.handleIncomingMessage(remoteMessage, 'foreground');
        });
      } catch (error) {
        console.warn('⚠️ Failed to setup foreground message handler:', error.message);
      }

      // Background messages (app opened from notification) - wrap in try-catch
      try {
        this.messaging().onNotificationOpenedApp((remoteMessage) => {
          console.log('🔄 App opened from notification');
          
          // Add delay to ensure app is ready
          setTimeout(() => {
            this.handleIncomingMessage(remoteMessage, 'background');
          }, 1000);
        });
      } catch (error) {
        console.warn('⚠️ Failed to setup background message handler:', error.message);
      }

      // Initial notification (app launched from notification) - wrap in try-catch
      try {
        this.messaging().getInitialNotification()
          .then((remoteMessage) => {
            if (remoteMessage) {
              console.log('🚀 App launched from notification');
              
              // Add longer delay for app initialization
              setTimeout(() => {
                this.handleIncomingMessage(remoteMessage, 'initial');
              }, 2000);
            }
          })
          .catch((error) => {
            console.warn('⚠️ Failed to get initial notification:', error.message);
          });
      } catch (error) {
        console.warn('⚠️ Failed to setup initial notification handler:', error.message);
      }

      console.log('✅ Message handlers setup completed');

    } catch (error) {
      console.error('❌ Message handler setup failed:', error);
    }
  }

  // Handle incoming messages safely
  static handleIncomingMessage(remoteMessage, source) {
    try {
      console.log(`📩 Handling ${source} message:`, remoteMessage?.data);
      
      // Validate message data
      if (!remoteMessage?.data?.orderId) {
        console.warn('⚠️ No order ID in message');
        return;
      }

      const orderId = remoteMessage.data.orderId;
      
      // Validate order ID
      if (typeof orderId !== 'string' || orderId.includes('test_order_id')) {
        console.warn('⚠️ Invalid order ID:', orderId);
        return;
      }

      // Call handler if available
      if (this.currentHandler && typeof this.currentHandler === 'function') {
        console.log('🎯 Calling order handler for:', orderId);
        try {
          this.currentHandler(orderId);
        } catch (handlerError) {
          console.error('❌ Error in order handler:', handlerError);
        }
      } else {
        console.warn('⚠️ No order handler available');
      }

      // Show notification for foreground messages
      if (source === 'foreground' && remoteMessage?.notification) {
        try {
          Alert.alert(
            remoteMessage.notification.title || 'New Order! 🚚',
            remoteMessage.notification.body || 'You have a new order assignment'
          );
        } catch (alertError) {
          console.warn('⚠️ Failed to show alert:', alertError);
        }
      }

    } catch (error) {
      console.error('❌ Error handling message:', error);
    }
  }

  // FIXED: Setup token refresh handler with proper error handling
  static setupTokenRefreshHandler() {
    if (!this.messaging) return;

    try {
      console.log('🔄 Setting up token refresh handler...');
      
      // Clean up any existing subscription first
      if (this.tokenRefreshUnsubscribe && typeof this.tokenRefreshUnsubscribe === 'function') {
        try {
          this.tokenRefreshUnsubscribe();
        } catch (cleanupError) {
          console.warn('⚠️ Error cleaning up old token refresh handler:', cleanupError);
        }
      }
      
      // Setup new token refresh handler with proper error handling
      const unsubscribe = this.messaging().onTokenRefresh(async (fcmToken) => {
        console.log('🔄 FCM token refreshed');
        
        try {
          await this.saveTokenToBackend(fcmToken);
          console.log('✅ Refreshed token saved successfully');
        } catch (error) {
          console.warn('⚠️ Failed to save refreshed token:', error.message);
        }
      });
      
      // Store the unsubscribe function
      this.tokenRefreshUnsubscribe = unsubscribe;

      console.log('✅ Token refresh handler setup completed');
    } catch (error) {
      console.error('❌ Token refresh setup failed:', error);
      // Don't throw - just log and continue
    }
  }

  // Test notification (for debugging)
  static async testNotification() {
    console.log('🧪 Testing notification system...');
    
    if (!this.currentHandler) {
      Alert.alert('Test Failed ❌', 'No order handler registered');
      return;
    }

    try {
      Alert.alert(
        'Test Notification 🧪',
        'Choose a test action:',
        [
          {
            text: 'Test New Order',
            onPress: () => {
              try {
                const testOrderId = `test_order_${Date.now()}`;
                console.log('🚚 Testing with order ID:', testOrderId);
                this.currentHandler(testOrderId);
              } catch (error) {
                console.error('❌ Test order error:', error);
              }
            }
          },
          {
            text: 'Check Status',
            onPress: async () => {
              try {
                const status = await this.getStatus();
                Alert.alert('Status', JSON.stringify(status, null, 2));
              } catch (error) {
                Alert.alert('Status Error', error.message);
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('❌ Test notification error:', error);
    }
  }

  // Get service status
  static async getStatus() {
    const status = {
      isConfigured: this.isConfigured,
      isInitializing: this.isInitializing,
      hasMessaging: !!this.messaging,
      hasHandler: !!this.currentHandler,
      platform: Platform.OS,
      hasTokenRefreshHandler: !!this.tokenRefreshUnsubscribe
    };

    if (this.messaging) {
      try {
        const messagingInstance = this.messaging();
        
        const [hasPermission, token, isRegistered] = await Promise.allSettled([
          messagingInstance.hasPermission().catch(() => null),
          messagingInstance.getToken().catch(() => null),
          messagingInstance.isRegisteredForRemoteMessages.catch(() => false)
        ]);
        
        status.hasPermission = hasPermission.status === 'fulfilled' && 
                              hasPermission.value === this.messaging.AuthorizationStatus.AUTHORIZED;
        status.hasToken = token.status === 'fulfilled' && !!token.value;
        status.isRegistered = isRegistered.status === 'fulfilled' && isRegistered.value;
        
        if (token.status === 'fulfilled' && token.value) {
          status.tokenPreview = token.value.substring(0, 30) + '...';
        }
      } catch (error) {
        status.error = error.message;
      }
    }

    console.log('📊 Notification status:', status);
    return status;
  }

  // Cleanup resources safely
  static cleanup() {
    console.log('🧹 Cleaning up NotificationService...');
    
    // Clean up token refresh handler
    if (this.tokenRefreshUnsubscribe && typeof this.tokenRefreshUnsubscribe === 'function') {
      try {
        this.tokenRefreshUnsubscribe();
        console.log('✅ Token refresh handler unsubscribed');
      } catch (error) {
        console.warn('⚠️ Error unsubscribing token refresh handler:', error);
      }
    }
    
    // Reset all static properties
    this.tokenRefreshUnsubscribe = null;
    this.isConfigured = false;
    this.isInitializing = false;
    this.currentHandler = null;
    this.messaging = null;
    this.instance = null;
    
    console.log('✅ NotificationService cleanup completed');
  }

  // Update handler (useful for hot reloading)
  static updateHandler(newHandler) {
    console.log('🔄 Updating notification handler...');
    this.currentHandler = newHandler;
  }
}

export default NotificationService;