// screens/RiderOrdersScreen.jsx
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
  AppState,
} from 'react-native';
import * as Location from 'expo-location';
import io from 'socket.io-client';
import NotificationService from '../services/NotificationService';

const API_BASE_URL = 'https://freshness-eakm.onrender.com/api';

// utils
const safeJsonParse = (jsonString, fallback = null) => {
  try { return JSON.parse(jsonString); } catch { return fallback; }
};
const validateOrder = (order) =>
  order &&
  typeof order === 'object' &&
  order._id &&
  typeof order._id === 'string' &&
  order._id.length > 0 &&
  !order._id.includes('test');

export default function RiderOrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initError, setInitError] = useState(null);
  const [notificationStatus, setNotificationStatus] = useState('initializing');
  const [appState, setAppState] = useState(AppState.currentState);

  const isMountedRef = useRef(true);
  const locationUpdateRef = useRef(null);
  const fetchOrdersRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const socketRef = useRef(null);

  const router = useRouter();
  const { workingLocation } = useLocalSearchParams();

  const apiClient = useRef(
    axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    })
  );

  useEffect(() => {
    const reqI = apiClient.current.interceptors.request.use(
      (config) => {
        console.log(`📡 ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );
    const resI = apiClient.current.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(error)
    );
    return () => {
      apiClient.current.interceptors.request.eject(reqI);
      apiClient.current.interceptors.response.eject(resI);
    };
  }, []);

  const safeSetState = useCallback((setter) => {
    if (isMountedRef.current && typeof setter === 'function') {
      try { setter(); } catch (e) { console.warn('⚠️ safeSetState:', e.message); }
    }
  }, []);

  const handleError = useCallback((error, context = 'Unknown', canRetry = false) => {
    console.error(`❌ ${context}:`, error);
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      'Unexpected error';
    if (canRetry && !retryTimeoutRef.current) {
      retryTimeoutRef.current = setTimeout(() => {
        retryTimeoutRef.current = null;
        if (context === 'fetchOrders') fetchOrders();
        if (context === 'locationUpdate') updateRiderLocation();
      }, 5000);
    }
    return msg;
  }, []);

  const updateRiderLocation = useCallback(async () => {
    if (locationUpdateRef.current) return { success: false, reason: 'Already updating' };
    if (!isMountedRef.current) return { success: false, reason: 'Unmounted' };

    locationUpdateRef.current = true;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        return { success: false, reason: 'Permission denied' };
      }

      const location = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 8000,
          maximumAge: 30000,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Location timeout')), 10000)),
      ]);

      if (!location?.coords) return { success: false, reason: 'Invalid location' };
      const { latitude, longitude } = location.coords;

      const riderStr = await AsyncStorage.getItem('user');
      if (!riderStr) return { success: false, reason: 'No rider data' };
      const rider = safeJsonParse(riderStr);
      if (!rider?._id) return { success: false, reason: 'Invalid rider data' };

      // send location
      const maxRetries = 2;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const res = await apiClient.current.put(`/riders/${rider._id}/location`, { latitude, longitude });
          if (res.status === 200) return { success: true, location: { latitude, longitude } };
          throw new Error(`Server ${res.status}`);
        } catch (e) {
          if (attempt < maxRetries - 1) {
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          } else {
            return { success: false, reason: e.message };
          }
        }
      }
    } catch (e) {
      const msg = handleError(e, 'locationUpdate');
      return { success: false, reason: msg };
    } finally {
      locationUpdateRef.current = null;
    }
  }, [handleError]);

  const handleNewOrder = useCallback(
    async (orderId) => {
      console.log('🎯 Incoming orderId:', orderId);
      if (
        !orderId ||
        typeof orderId !== 'string' ||
        orderId.trim().length === 0 ||
        orderId.includes('test_order_id') ||
        orderId.includes('undefined') ||
        orderId.includes('null')
      ) {
        return;
      }
      if (!isMountedRef.current || appStateRef.current !== 'active') return;

      try {
        const res = await apiClient.current.get(`/orders/${orderId}`);
        const newOrder = res?.data?.order;
        if (!validateOrder(newOrder)) return;

        safeSetState(() => {
          setOrders((prev) => {
            if (prev.some((o) => o._id === newOrder._id)) return prev;
            return [newOrder, ...prev];
          });
        });

        setTimeout(() => {
          if (!isMountedRef.current) return;
          const customerName = newOrder.customerName || newOrder.userId?.fullname || 'Customer';
          Alert.alert(
            'New Order! 🚚',
            `Order from ${customerName} has been assigned to you.`,
            [
              { text: 'OK', style: 'default' },
              { text: 'View Details', onPress: () => navigateToCustomer(newOrder) },
            ]
          );
        }, 400);
      } catch (e) {
        const msg = handleError(e, 'handleNewOrder');
        console.warn('⚠️ fetch order failed:', msg);
      }
    },
    [safeSetState, handleError]
  );

  const fetchOrders = useCallback(async () => {
    if (fetchOrdersRef.current) return;
    if (!isMountedRef.current) return;
    fetchOrdersRef.current = true;

    try {
      const riderStr = await AsyncStorage.getItem('user');
      if (!riderStr) {
        safeSetState(() => {
          setInitError('Please login again');
          setLoading(false);
        });
        setTimeout(() => isMountedRef.current && router.replace('/login'), 1000);
        return;
      }
      const rider = safeJsonParse(riderStr);
      if (!rider?.fullname) throw new Error('Invalid rider data');

      // pick working zone
      let workingZone = null;
      if (Array.isArray(rider.assignedZone) && rider.assignedZone.length > 0) workingZone = rider.assignedZone[0];
      else if (Array.isArray(rider.assignedZones) && rider.assignedZones.length > 0) workingZone = rider.assignedZones[0];
      else if (workingLocation) workingZone = workingLocation;

      if (!workingZone) {
        safeSetState(() => {
          setInitError('No assigned location found. Contact admin.');
          setLoading(false);
        });
        return;
      }

      const res = await apiClient.current.get(`/assign/${encodeURIComponent(workingZone)}`);
      const all = res?.data?.bookings || [];
      const valid = all.filter(validateOrder);

      safeSetState(() => {
        setOrders(valid);
        setInitError(null);
        setLoading(false);
      });
    } catch (e) {
      const msg = handleError(e, 'fetchOrders', true);
      safeSetState(() => {
        setInitError(`Failed to load orders: ${msg}`);
        setLoading(false);
      });
    } finally {
      fetchOrdersRef.current = null;
    }
  }, [workingLocation, router, safeSetState, handleError]);

  const handleAppStateChange = useCallback(
    (next) => {
      console.log('📱 App state:', appStateRef.current, '->', next);
      appStateRef.current = next;
      safeSetState(() => setAppState(next));
      if (next === 'active' && isMountedRef.current) {
        setTimeout(() => {
          if (!isMountedRef.current) return;
          fetchOrders();
          updateRiderLocation();
        }, 600);
      }
    },
    [fetchOrders, updateRiderLocation, safeSetState]
  );

  // SOCKET.IO
  useEffect(() => {
    let mounted = true;

    const setupSocket = async () => {
      try {
        const riderStr = await AsyncStorage.getItem('user');
        const rider = safeJsonParse(riderStr);
        const riderId = rider?._id;

        // NOTE: connect to your API host root (not /api) – adjust if needed
        const apiRoot = API_BASE_URL.replace(/\/api\/?$/, '');
        const socket = io(apiRoot, { transports: ['websocket'] });
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('🔌 Socket connected', socket.id);
          if (riderId) socket.emit('join', { room: `rider-${riderId}` });
        });

        socket.on('disconnect', () => console.log('🔌 Socket disconnected'));
        socket.on('new-order-assigned', (data) => {
          console.log('📦 socket new-order-assigned:', data);
          if (data?.orderId) handleNewOrder(data.orderId);
        });
        socket.on('order-update', () => {
          // keep list fresh
          fetchOrders();
        });
      } catch (e) {
        console.warn('⚠️ Socket setup failed:', e.message);
      }
    };

    if (mounted) setupSocket();
    return () => {
      mounted = false;
      try { socketRef.current?.disconnect(); } catch {}
    };
  }, [handleNewOrder, fetchOrders]);

  // INIT: notifications + appstate + initial data
  useEffect(() => {
    let cleanup = false;

    const init = async () => {
      try {
        isMountedRef.current = true;
        const sub = AppState.addEventListener('change', handleAppStateChange);

        // notifications
        try {
          const result = await Promise.race([
            NotificationService.configure(handleNewOrder),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Notification setup timeout')), 15000)),
          ]);
          if (!cleanup) {
            if (result?.success) {
              if (result.fallbackMode) setNotificationStatus('fallback');
              else if (result.permissionDenied) setNotificationStatus('permission_denied');
              else setNotificationStatus('active');
            } else setNotificationStatus('disabled');
          }
        } catch (e) {
          console.warn('⚠️ Notifications setup failed:', e.message);
          if (!cleanup) setNotificationStatus('error');
        }

        // do not block UI
        updateRiderLocation().catch(() => {});
        await fetchOrders();

        return () => sub?.remove();
      } catch (e) {
        console.error('❌ init failed:', e);
        if (!cleanup) {
          safeSetState(() => {
            setInitError('Failed to initialize app. Please restart.');
            setLoading(false);
          });
        }
      }
    };

    const maybeCleanup = init();

    return () => {
      cleanup = true;
      isMountedRef.current = false;
      locationUpdateRef.current = null;
      fetchOrdersRef.current = null;

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      Promise.resolve(maybeCleanup).then((fn) => typeof fn === 'function' && fn());
      try {
        NotificationService.cleanup();
      } catch {}
    };
  }, [handleNewOrder, updateRiderLocation, fetchOrders, handleAppStateChange, safeSetState]);

  const onRefresh = useCallback(async () => {
    if (!isMountedRef.current) return;
    safeSetState(() => setRefreshing(true));
    try {
      await Promise.race([
        Promise.allSettled([fetchOrders(), updateRiderLocation()]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Refresh timeout')), 15000)),
      ]);
    } catch (e) {
      console.warn('⚠️ Refresh failed:', e.message);
    } finally {
      safeSetState(() => setRefreshing(false));
    }
  }, [fetchOrders, updateRiderLocation, safeSetState]);

  const navigateToCustomer = useCallback(
    (order) => {
      if (!validateOrder(order)) {
        Alert.alert('Error', 'Invalid order data');
        return;
      }
      if (!isMountedRef.current) return;

      try {
        const orderData = {
          _id: order._id,
          customerName: order.customerName || order.userId?.fullname || 'Customer',
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
          bookingCode: order.bookingCode || '',
        };

        const serialized = JSON.stringify(orderData);
        if (!serialized || serialized === '{}') throw new Error('Serialize fail');

        router.push({
          pathname: '/Rider/screen/NavigationScreen',
          params: { order: serialized },
        });
      } catch (e) {
        console.error('❌ Navigation error:', e);
        Alert.alert('Error', 'Failed to navigate to order details. Please try again.');
      }
    },
    [router]
  );

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
    } catch { return '#6b7280'; }
  }, []);

  const getStatusText = useCallback((status) => {
    try {
      if (!status || typeof status !== 'string') return 'Unknown';
      return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    } catch { return 'Unknown'; }
  }, []);

  const formatTime = useCallback((ds) => {
    try {
      if (!ds) return 'Time unknown';
      const d = new Date(ds);
      if (isNaN(d.getTime())) return 'Time unknown';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return 'Time unknown'; }
  }, []);

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

  const renderOrderItem = useCallback(
    ({ item }) => {
      if (!validateOrder(item)) return null;
      return (
        <TouchableOpacity onPress={() => navigateToCustomer(item)} style={styles.orderCard} activeOpacity={0.8}>
          <View style={styles.cardHeader}>
            <View style={styles.customerInfo}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
              <View style={styles.customerDetails}>
                <Text style={styles.customerName} numberOfLines={1}>
                  {item.customerName || item.userId?.fullname || 'Customer'}
                </Text>
                <View style={styles.timeContainer}>
                  <Ionicons name="time-outline" size={12} color="#6b7280" />
                  <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
                </View>
                {item.bookingCode && <Text style={styles.bookingCode}>#{item.bookingCode}</Text>}
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
              <Text style={styles.serviceText}>{item.serviceType || 'Standard Service'}</Text>
            </View>
            {item.totalAmount > 0 && (
              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={16} color="#6b7280" />
                <Text style={styles.amountText}>{item.totalAmount} RWF</Text>
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
    },
    [navigateToCustomer, getStatusColor, getStatusText, formatTime]
  );

  const renderEmptyState = () => (
    <ScrollView
      contentContainerStyle={styles.emptyContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} tintColor="#3b82f6" />
      }
    >
      <View style={styles.emptyIconContainer}>
        <Ionicons name="cube-outline" size={48} color="#9ca3af" />
      </View>
      <Text style={styles.emptyTitle}>No Orders Available</Text>
      <Text style={styles.emptySubtitle}>
        {initError || 'No orders found in your assigned zone. Pull to refresh.'}
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={refreshing}>
        <Ionicons name="refresh-outline" size={16} color="#fff" />
        <Text style={styles.refreshButtonText}>{refreshing ? 'Refreshing...' : 'Refresh'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text style={styles.loadingText}>Loading orders...</Text>
      <Text style={styles.loadingSubText}>Notifications: {getNotificationStatusText()}</Text>
      {initError && <Text style={styles.errorText}>{initError}</Text>}
    </View>
  );

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
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Available Orders</Text>
          <Text style={styles.headerSubtitle}>
            {orders.length > 0
              ? `${orders.length} order${orders.length !== 1 ? 's' : ''} available`
              : loading
              ? 'Checking for orders...'
              : 'No orders available'}
          </Text>
          <Text style={styles.notificationStatus}>{getNotificationStatusText()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshIconButton, refreshing && styles.refreshingButton]}
          onPress={onRefresh}
          disabled={refreshing || loading}
        >
          <Ionicons name="refresh-outline" size={20} color={refreshing || loading ? '#9ca3af' : '#3b82f6'} />
        </TouchableOpacity>
      </View>

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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} tintColor="#3b82f6" />}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            maxToRenderPerBatch={8}
            windowSize={6}
            initialNumToRender={4}
            getItemLayout={(_, index) => ({ length: 200, offset: 200 * index, index })}
            onEndReachedThreshold={0.5}
          />
        )}
      </View>

      {__DEV__ && (
        <View style={styles.debugPanel}>
          <TouchableOpacity style={styles.debugButton} onPress={() => NotificationService.testNotification()}>
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
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
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  notificationStatus: { fontSize: 12, color: '#6b7280', fontStyle: 'italic' },
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
  refreshingButton: { backgroundColor: '#f3f4f6' },
  content: { flex: 1, paddingHorizontal: 16 },
  list: { paddingTop: 16, paddingBottom: 20 },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  customerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  customerDetails: { flex: 1 },
  customerName: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  timeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  timeText: { fontSize: 12, color: '#6b7280', marginLeft: 4 },
  bookingCode: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  orderDetails: { marginBottom: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  addressText: { fontSize: 14, color: '#374151', marginLeft: 12, flex: 1, lineHeight: 20 },
  serviceText: { fontSize: 14, color: '#374151', marginLeft: 12, fontWeight: '500' },
  amountText: { fontSize: 14, color: '#059669', marginLeft: 12, fontWeight: '600' },
  actionContainer: { paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  actionButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  actionText: { fontSize: 16, color: '#3b82f6', fontWeight: '600', marginLeft: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 40 },
  emptyIconContainer: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#374151', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 24, maxWidth: 280 },
  refreshButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  refreshButtonText: { color: '#fff', fontWeight: '600', marginLeft: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  loadingText: { fontSize: 16, color: '#6b7280', marginTop: 12, textAlign: 'center' },
  loadingSubText: { fontSize: 14, color: '#9ca3af', marginTop: 8, fontStyle: 'italic', textAlign: 'center' },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 8, textAlign: 'center', maxWidth: 280 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  errorTitle: { fontSize: 20, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  errorMessage: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 24, maxWidth: 280 },
  retryButton: { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  debugPanel: { position: 'absolute', bottom: 100, right: 20, backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 8, padding: 8, flexDirection: 'row', gap: 8 },
  debugButton: { backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4 },
  debugText: { color: '#fff', fontSize: 10, textAlign: 'center', fontWeight: '600' },
});
