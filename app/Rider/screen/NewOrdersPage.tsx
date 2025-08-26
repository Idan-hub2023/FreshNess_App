import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  AppState
} from 'react-native';
import * as Location from "expo-location";
import NotificationService from '../services/NotificationService';

const API_BASE_URL = 'https://freshness-eakm.onrender.com/api';

// Utility function to safely parse JSON
const safeJsonParse = (jsonString, fallback = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return fallback;
  }
};

// Utility function to validate order data
const validateOrder = (order) => {
  return order && 
         typeof order === 'object' && 
         order._id && 
         typeof order._id === 'string' &&
         order._id.length > 0 &&
         !order._id.includes('test');
};

export default function RiderOrdersScreen() {
  // State management with proper initialization
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initError, setInitError] = useState(null);
  const [notificationStatus, setNotificationStatus] = useState('initializing');
  const [appState, setAppState] = useState(AppState.currentState);
  
  // Refs to prevent memory leaks and race conditions
  const isMountedRef = useRef(true);
  const locationUpdateRef = useRef(null);
  const fetchOrdersRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  
  const router = useRouter();
  const { workingLocation } = useLocalSearchParams();

  // Create axios instance with timeout and interceptors
  const apiClient = useRef(
    axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  );

  // Setup axios interceptors for better error handling
  useEffect(() => {
    const requestInterceptor = apiClient.current.interceptors.request.use(
      (config) => {
        console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
      }
    );

    const responseInterceptor = apiClient.current.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
        return response;
      },
      (error) => {
        console.error('❌ API Response Error:', error.response?.status || error.message);
        return Promise.reject(error);
      }
    );

    return () => {
      apiClient.current.interceptors.request.eject(requestInterceptor);
      apiClient.current.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Safe state setter - only update if component is still mounted
  const safeSetState = useCallback((setter) => {
    if (isMountedRef.current && typeof setter === 'function') {
      try {
        setter();
      } catch (error) {
        console.warn('⚠️ Safe setState error:', error);
      }
    }
  }, []);

  // Enhanced error handler with retry logic
  const handleError = useCallback((error, context = 'Unknown', canRetry = false) => {
    console.error(`❌ Error in ${context}:`, error);
    
    const errorMessage = error?.response?.data?.message || 
                        error?.message || 
                        'An unexpected error occurred';
    
    if (canRetry && !retryTimeoutRef.current) {
      retryTimeoutRef.current = setTimeout(() => {
        retryTimeoutRef.current = null;
        if (context === 'fetchOrders') {
          fetchOrders();
        } else if (context === 'locationUpdate') {
          updateRiderLocation();
        }
      }, 5000);
    }

    return errorMessage;
  }, []);

  // Location update with enhanced error handling
  const updateRiderLocation = useCallback(async () => {
    if (locationUpdateRef.current) {
      console.log('📍 Location update already in progress, skipping...');
      return { success: false, reason: 'Already updating' };
    }

    if (!isMountedRef.current) {
      return { success: false, reason: 'Component unmounted' };
    }

    locationUpdateRef.current = true;
    
    try {
      console.log('📍 Starting location update...');
      
      // Request permission with better error handling
      let permissionResult;
      try {
        permissionResult = await Location.requestForegroundPermissionsAsync();
      } catch (permissionError) {
        console.warn('⚠️ Permission request failed:', permissionError);
        return { success: false, reason: 'Permission request failed' };
      }

      if (permissionResult.status !== 'granted') {
        console.warn('⚠️ Location permission denied');
        return { success: false, reason: 'Permission denied' };
      }

      // Get location with timeout and error handling
      let location;
      try {
        location = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeout: 8000,
            maximumAge: 30000,
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Location timeout')), 10000)
          )
        ]);
      } catch (locationError) {
        console.warn('⚠️ Failed to get location:', locationError);
        return { success: false, reason: 'Location unavailable' };
      }

      if (!location?.coords) {
        return { success: false, reason: 'Invalid location data' };
      }

      const { latitude, longitude } = location.coords;
      console.log('📍 Location obtained:', { latitude, longitude });

      // Get rider data safely
      let riderData;
      try {
        riderData = await AsyncStorage.getItem('user');
        if (!riderData) {
          throw new Error('No rider data found');
        }
      } catch (storageError) {
        console.warn('⚠️ Failed to get rider data:', storageError);
        return { success: false, reason: 'Rider data unavailable' };
      }

      const rider = safeJsonParse(riderData);
      if (!rider?._id) {
        return { success: false, reason: 'Invalid rider data' };
      }

      // Update backend with retry logic
      const maxRetries = 2;
      let attempt = 0;
      
      while (attempt < maxRetries) {
        try {
          const response = await apiClient.current.put(
            `/riders/${rider._id}/location`,
            { latitude, longitude }
          );

          if (response.status === 200) {
            console.log('✅ Location updated successfully');
            return { success: true, location: { latitude, longitude } };
          }

          throw new Error(`Server error: ${response.status}`);

        } catch (requestError) {
          attempt++;
          console.warn(`⚠️ Location update attempt ${attempt} failed:`, requestError.message);
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          } else {
            return { success: false, reason: requestError.message };
          }
        }
      }

    } catch (error) {
      const errorMessage = handleError(error, 'locationUpdate');
      return { success: false, reason: errorMessage };
    } finally {
      locationUpdateRef.current = null;
    }
  }, [handleError]);

  // Enhanced order handler with comprehensive validation
  const handleNewOrder = useCallback(async (orderId) => {
    console.log('🎯 New order handler called:', orderId);
    
    // Comprehensive validation
    if (!orderId || 
        typeof orderId !== 'string' || 
        orderId.trim().length === 0 ||
        orderId.includes('test_order_id') ||
        orderId.includes('undefined') ||
        orderId.includes('null')) {
      console.log('❌ Invalid order ID:', orderId);
      return;
    }

    // Check if component is still mounted and app is active
    if (!isMountedRef.current || appStateRef.current !== 'active') {
      console.log('📱 Component unmounted or app inactive, ignoring order');
      return;
    }

    try {
      console.log('🔍 Fetching order details for:', orderId);
      
      const response = await apiClient.current.get(`/orders/${orderId}`);
      
      if (!response.data?.order) {
        console.log('❌ No order data received');
        return;
      }

      const newOrder = response.data.order;
      
      if (!validateOrder(newOrder)) {
        console.log('❌ Invalid order data received');
        return;
      }

      console.log('✅ Valid new order received:', newOrder._id);

      // Safe state update with duplicate check
      safeSetState(() => {
        setOrders(prevOrders => {
          // Check if order already exists
          const exists = prevOrders.some(order => order._id === newOrder._id);
          if (exists) {
            console.log('⚠️ Order already exists in list');
            return prevOrders;
          }
          
          // Add new order to the beginning
          const updatedOrders = [newOrder, ...prevOrders];
          console.log(`📊 Orders updated: ${updatedOrders.length} total`);
          return updatedOrders;
        });
      });

      // Show notification if component is mounted and app is active
      if (isMountedRef.current && appStateRef.current === 'active') {
        setTimeout(() => {
          if (isMountedRef.current) {
            Alert.alert(
              'New Order! 🚚',
              `Order from ${newOrder.customerName || 'Customer'} has been assigned to you.`,
              [
                {
                  text: 'View Details',
                  onPress: () => navigateToCustomer(newOrder)
                },
                { text: 'OK', style: 'default' }
              ]
            );
          }
        }, 500);
      }

    } catch (error) {
      const errorMessage = handleError(error, 'handleNewOrder');
      console.error('❌ Failed to fetch new order:', errorMessage);
    }
  }, [safeSetState, handleError]);

  // Enhanced fetch orders with better error handling
  const fetchOrders = useCallback(async () => {
    if (fetchOrdersRef.current) {
      console.log('📋 Fetch already in progress, skipping...');
      return;
    }

    if (!isMountedRef.current) {
      return;
    }

    fetchOrdersRef.current = true;

    try {
      console.log('📋 Fetching orders...');
      
      // Get rider data with validation
      const riderData = await AsyncStorage.getItem('user');
      if (!riderData) {
        safeSetState(() => {
          setInitError('Please login again');
          setLoading(false);
        });
        
        setTimeout(() => {
          if (isMountedRef.current) {
            router.replace('/login');
          }
        }, 2000);
        return;
      }

      const rider = safeJsonParse(riderData);
      if (!rider?.fullname) {
        throw new Error('Invalid rider data');
      }

      // Determine working location with fallbacks
      let workingZone = null;
      if (rider.assignedZone && Array.isArray(rider.assignedZone) && rider.assignedZone.length > 0) {
        workingZone = rider.assignedZone[0];
      } else if (rider.assignedZones && Array.isArray(rider.assignedZones) && rider.assignedZones.length > 0) {
        workingZone = rider.assignedZones[0];
      } else if (workingLocation) {
        workingZone = workingLocation;
      }

      if (!workingZone) {
        safeSetState(() => {
          setInitError('No assigned location found. Please contact administrator.');
          setLoading(false);
        });
        return;
      }

      console.log('📍 Fetching orders for zone:', workingZone);
      
      const response = await apiClient.current.get(`/assign/${encodeURIComponent(workingZone)}`);

      if (!response.data) {
        throw new Error('No response data received');
      }

      const bookingDetails = response.data.bookings || [];
      
      // Validate and filter orders
      const validOrders = bookingDetails.filter(validateOrder);
      
      console.log(`✅ Orders fetched: ${validOrders.length} valid out of ${bookingDetails.length} total`);
      
      safeSetState(() => {
        setOrders(validOrders);
        setInitError(null);
        setLoading(false);
      });

    } catch (error) {
      const errorMessage = handleError(error, 'fetchOrders', true);
      safeSetState(() => {
        setInitError(`Failed to load orders: ${errorMessage}`);
        setLoading(false);
      });
    } finally {
      fetchOrdersRef.current = null;
    }
  }, [workingLocation, router, safeSetState, handleError]);

  // App state change handler
  const handleAppStateChange = useCallback((nextAppState) => {
    console.log('📱 App state changed:', appStateRef.current, '->', nextAppState);
    appStateRef.current = nextAppState;
    
    safeSetState(() => setAppState(nextAppState));

    // Refresh data when app becomes active
    if (nextAppState === 'active' && isMountedRef.current) {
      console.log('📱 App became active, refreshing data...');
      setTimeout(() => {
        if (isMountedRef.current) {
          fetchOrders();
          updateRiderLocation();
        }
      }, 1000);
    }
  }, [fetchOrders, updateRiderLocation, safeSetState]);

  // Enhanced initialization with comprehensive error handling
  useEffect(() => {
    let cleanup = false;

    const initializeApp = async () => {
      console.log('🚀 Initializing app...');
      
      try {
        // Set mounted flag
        isMountedRef.current = true;

        // Setup app state listener
        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        // Step 1: Setup notifications (with enhanced error handling)
        console.log('📱 Setting up notifications...');
        try {
          const notificationResult = await Promise.race([
            NotificationService.configure(handleNewOrder),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Notification setup timeout')), 15000)
            )
          ]);
          
          if (!cleanup) {
            if (notificationResult?.success) {
              if (notificationResult.fallbackMode) {
                setNotificationStatus('fallback');
              } else if (notificationResult.permissionDenied) {
                setNotificationStatus('permission_denied');
              } else {
                setNotificationStatus('active');
              }
            } else {
              setNotificationStatus('disabled');
            }
          }
        } catch (notifError) {
          console.warn('⚠️ Notification setup failed:', notifError.message);
          if (!cleanup) setNotificationStatus('error');
        }

        // Step 2: Initial location update (background, non-blocking)
        if (!cleanup) {
          updateRiderLocation().catch(err => {
            console.warn('⚠️ Initial location update failed:', err);
          });
        }

        // Step 3: Fetch orders
        if (!cleanup) {
          await fetchOrders();
        }

        console.log('✅ App initialization completed');

        // Cleanup function for app state listener
        return () => {
          appStateSubscription?.remove();
        };

      } catch (error) {
        console.error('❌ App initialization failed:', error);
        if (!cleanup) {
          safeSetState(() => {
            setInitError('Failed to initialize app. Please restart.');
            setLoading(false);
          });
        }
      }
    };

    const cleanupPromise = initializeApp();

    return () => {
      cleanup = true;
      isMountedRef.current = false;
      locationUpdateRef.current = null;
      fetchOrdersRef.current = null;
      
      // Clear retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Cleanup app state listener
      cleanupPromise.then((cleanupFn) => {
        if (typeof cleanupFn === 'function') {
          cleanupFn();
        }
      });
      
      // Clean up notification service
      try {
        NotificationService.cleanup();
        console.log('🧹 NotificationService cleaned up');
      } catch (error) {
        console.warn('⚠️ Error cleaning up notifications:', error);
      }
      
      console.log('🧹 Component cleanup completed');
    };
  }, [handleNewOrder, updateRiderLocation, fetchOrders, handleAppStateChange, safeSetState]);

  // Enhanced refresh handler
  const onRefresh = useCallback(async () => {
    if (!isMountedRef.current) return;

    safeSetState(() => setRefreshing(true));
    
    try {
      // Run both operations with timeout
      await Promise.race([
        Promise.allSettled([
          fetchOrders(),
          updateRiderLocation()
        ]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Refresh timeout')), 15000)
        )
      ]);
    } catch (error) {
      console.warn('⚠️ Refresh failed:', error);
    } finally {
      safeSetState(() => setRefreshing(false));
    }
  }, [fetchOrders, updateRiderLocation, safeSetState]);

  // Enhanced navigation with comprehensive validation
  const navigateToCustomer = useCallback((order) => {
    if (!validateOrder(order)) {
      Alert.alert('Error', 'Invalid order data');
      return;
    }

    if (!isMountedRef.current) {
      console.log('Component unmounted, canceling navigation');
      return;
    }

    try {
      // Ensure all required fields with safe defaults
      const orderData = {
        _id: order._id,
        customerName: order.customerName || 'Customer',
        phoneNumber: order.phoneNumber || order.phone || '',
        serviceType: order.serviceType || 'Standard Service',
        clothingItems: Array.isArray(order.clothingItems) ? order.clothingItems : [],
        pickupDate: order.pickupDate || new Date().toISOString(),
        pickupTime: order.pickupTime || new Date().toISOString(),
        deliveryOption: order.deliveryOption || 'Standard',
        address: order.address || order.location?.address || 'Address not available',
        location: order.location || {},
        instructions: order.instructions || '',
        payment: order.payment || { method: 'Unknown', details: {} },
        totalAmount: Number(order.totalAmount) || 0,
        status: order.status || 'pending',
        createdAt: order.createdAt || new Date().toISOString(),
        bookingCode: order.bookingCode || ''
      };

      // Validate serialization
      const serializedData = JSON.stringify(orderData);
      if (!serializedData || serializedData === '{}') {
        throw new Error('Failed to serialize order data');
      }

      router.push({
        pathname: '/Rider/screen/NavigationScreen',
        params: { order: serializedData },
      });
    } catch (error) {
      console.error('❌ Navigation error:', error);
      Alert.alert('Error', 'Failed to navigate to order details. Please try again.');
    }
  }, [router]);

  // Utility functions with error handling
  const getStatusColor = useCallback((status) => {
    try {
      switch (status?.toLowerCase?.()) {
        case 'pending': return '#f59e0b';
        case 'ready': return '#10b981';
        case 'in_progress': return '#3b82f6';
        case 'completed': return '#22c55e';
        case 'cancelled': return '#ef4444';
        default: return '#6b7280';
      }
    } catch (error) {
      return '#6b7280';
    }
  }, []);

  const getStatusText = useCallback((status) => {
    try {
      if (!status || typeof status !== 'string') return 'Unknown';
      return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    } catch (error) {
      return 'Unknown';
    }
  }, []);

  const formatTime = useCallback((dateString) => {
    try {
      if (!dateString) return 'Time unknown';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Time unknown';
      return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } catch (error) {
      return 'Time unknown';
    }
  }, []);

  // Get notification status text
  const getNotificationStatusText = () => {
    switch (notificationStatus) {
      case 'active': return '🟢 Active';
      case 'fallback': return '🟡 Limited';
      case 'permission_denied': return '🔴 Permission Denied';
      case 'error': return '🔴 Error';
      case 'disabled': return '🔴 Unavailable';
      default: return '🟡 Setting up...';
    }
  };

  // Enhanced render functions
  const renderOrderItem = useCallback(({ item, index }) => {
    if (!validateOrder(item)) {
      console.warn('Invalid order in render:', item);
      return null;
    }

    return (
      <TouchableOpacity
        onPress={() => navigateToCustomer(item)}
        style={styles.orderCard}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.customerInfo}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={20} color="#fff" />
            </View>
            <View style={styles.customerDetails}>
              <Text style={styles.customerName} numberOfLines={1}>
                {item.customerName || 'Customer'}
              </Text>
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={12} color="#6b7280" />
                <Text style={styles.timeText}>
                  {formatTime(item.createdAt)}
                </Text>
              </View>
              {item.bookingCode && (
                <Text style={styles.bookingCode}>#{item.bookingCode}</Text>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#6b7280" />
            <Text style={styles.addressText} numberOfLines={2}>
              {item.location?.address || item.address || 'Address not available'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="cube-outline" size={16} color="#6b7280" />
            <Text style={styles.serviceText}>
              {item.serviceType || 'Standard Service'}
            </Text>
          </View>

          {item.totalAmount > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={16} color="#6b7280" />
              <Text style={styles.amountText}>
                {item.totalAmount} RWF
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionContainer}>
          <View style={styles.actionButton}>
            <Ionicons name="navigate-outline" size={16} color="#3b82f6" />
            <Text style={styles.actionText}>Navigate to Customer</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [navigateToCustomer, getStatusColor, getStatusText, formatTime]);

  const renderEmptyState = () => (
    <ScrollView
      contentContainerStyle={styles.emptyContainer}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={['#3b82f6']}
          tintColor="#3b82f6"
        />
      }
    >
      <View style={styles.emptyIconContainer}>
        <Ionicons name="cube-outline" size={48} color="#9ca3af" />
      </View>
      <Text style={styles.emptyTitle}>No Orders Available</Text>
      <Text style={styles.emptySubtitle}>
        {initError || "No orders found in your assigned zone. Pull to refresh."}
      </Text>
      <TouchableOpacity 
        style={styles.refreshButton} 
        onPress={onRefresh} 
        disabled={refreshing}
      >
        <Ionicons name="refresh-outline" size={16} color="#fff" />
        <Text style={styles.refreshButtonText}>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text style={styles.loadingText}>Loading orders...</Text>
      <Text style={styles.loadingSubText}>
        Notifications: {getNotificationStatusText()}
      </Text>
      {initError && (
        <Text style={styles.errorText}>{initError}</Text>
      )}
    </View>
  );

  // Error boundary-like error display
  if (initError && !loading && orders.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{initError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrders}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Available Orders</Text>
          <Text style={styles.headerSubtitle}>
            {orders.length > 0 
              ? `${orders.length} order${orders.length !== 1 ? 's' : ''} available` 
              : loading 
                ? 'Checking for orders...' 
                : 'No orders available'
            }
          </Text>
          <Text style={styles.notificationStatus}>
            {getNotificationStatusText()}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.refreshIconButton, refreshing && styles.refreshingButton]} 
          onPress={onRefresh}
          disabled={refreshing || loading}
        >
          <Ionicons 
            name="refresh-outline" 
            size={20} 
            color={refreshing || loading ? "#9ca3af" : "#3b82f6"}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          renderLoadingState()
        ) : orders.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item, index) => item._id?.toString() || `order-${index}`}
            renderItem={renderOrderItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={['#3b82f6']}
                tintColor="#3b82f6"
              />
            }
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={8}
            windowSize={6}
            initialNumToRender={4}
            getItemLayout={(data, index) => (
              {length: 200, offset: 200 * index, index}
            )}
            onEndReachedThreshold={0.5}
          />
        )}
      </View>

      {/* Debug panel in development */}
      {__DEV__ && (
        <View style={styles.debugPanel}>
          <TouchableOpacity 
            style={styles.debugButton} 
            onPress={() => NotificationService.testNotification()}
          >
            <Text style={styles.debugText}>Test</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.debugButton} 
            onPress={() => console.log('Orders:', orders.length, 'Status:', notificationStatus)}
          >
            <Text style={styles.debugText}>Log</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  notificationStatus: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  refreshIconButton: {
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  refreshingButton: {
    backgroundColor: '#f3f4f6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  list: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  bookingCode: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  orderDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  serviceText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    fontWeight: '500',
  },
  amountText: {
    fontSize: 14,
    color: '#059669',
    marginLeft: 12,
    fontWeight: '600',
  },
  actionContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
  },
  loadingSubText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 280,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  debugPanel: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    gap: 8,
  },
  debugButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  debugText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
});