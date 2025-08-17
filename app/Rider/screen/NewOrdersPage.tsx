import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
  View
} from 'react-native';
import NotificationService from '../services/NotificationService';

export default function RiderOrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

      const API_BASE_URL = Platform.OS === 'android' 
    ? 'https://freshness-eakm.onrender.com/api' 
    : 'http://192.168.1.67:5000/api';
  
  // workingLocation from route params fallback
  const { workingLocation } = useLocalSearchParams();

  useEffect(() => {
    NotificationService.configure();
    fetchOrders();
  }, []);

const fetchOrders = async () => {
  try {
    const riderData = await AsyncStorage.getItem('user');
    if (!riderData) {
      Alert.alert('Login required', 'Please login again.');
      setLoading(false);
      return;
    }

    const rider = JSON.parse(riderData);

    // Take the first assigned zone or fallback to workingLocation param
    const location = (rider.assignedZones && rider.assignedZones.length > 0)
      ? rider.assignedZones[0] 
      : workingLocation;

    if (!location) {
      Alert.alert('Error', 'No assigned location found for rider.');
      setLoading(false);
      return;
    }

    // Call backend assignRiderByLocation API
    const res = await axios.get(`${API_BASE_URL}/assign/${encodeURIComponent(location)}`);

    // Orders assigned to this rider
    const ordersForRider = res.data.rider.assignedBookings || [];

    // Fetch full booking details
    const bookingDetails = await Promise.all(
      ordersForRider.map(id => axios.get(`${API_BASE_URL}/bookings/${id}`).then(r => r.data))
    );

    setOrders(bookingDetails);

    // Notifications
    if (bookingDetails.length > 0) {
      NotificationService.showOrdersNotifications(bookingDetails);
    }

  } catch (error) {
    console.error('Failed to fetch orders:', error);
    Alert.alert('Error', 'Could not load orders. Please try again.');
  } finally {
    setLoading(false);
  }
};



  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#f59e0b';
      case 'ready': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'completed': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

const navigateToCustomer = (order) => {
  router.push({
    pathname: '/Rider/screen/NavigationScreen',
    params: { 
      order: JSON.stringify({
        ...order,
        _id: order._id,
        customerName: order.customerName || 'Customer',
        phoneNumber: order.phoneNumber || '',
        serviceType: order.serviceType || 'Standard Service',
        clothingItems: order.clothingItems || [],
        pickupDate: order.pickupDate || new Date().toISOString(),
        pickupTime: order.pickupTime || new Date().toISOString(),
        deliveryOption: order.deliveryOption || 'Standard',
        address: order.address || 'Address not available',
        location: order.location || {},
        instructions: order.instructions || '',
        payment: order.payment || {
          method: 'Unknown',
          details: {}
        },
        totalAmount: order.totalAmount || 0,
        status: order.status || 'pending',
        createdAt: order.createdAt || new Date().toISOString()
      })
    },
  });
};

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigateToCustomer(item)}
      style={styles.orderCard}
      activeOpacity={0.8}
    >
      {/* Header with customer info and status */}
      <View style={styles.cardHeader}>
        <View style={styles.customerInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={20} color="#fff" />
          </View>
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={12} color="#6b7280" />
              <Text style={styles.timeText}>
                {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      {/* Order details */}
      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#6b7280" />
          <Text style={styles.addressText} numberOfLines={2}>
            {item.location?.address || 'Address not available'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="cube-outline" size={16} color="#6b7280" />
          <Text style={styles.serviceText}>{item.serviceType}</Text>
        </View>

        <View style={styles.estimateContainer}>
          <View style={styles.estimateItem}>
            <Ionicons name="time-outline" size={14} color="#3b82f6" />
            <Text style={styles.estimateText}>Est. delivery</Text>
          </View>
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Status: {getStatusText(item.status)}</Text>
          </View>
        </View>
      </View>

      {/* Action button */}
      <View style={styles.actionContainer}>
        <View style={styles.actionButton}>
          <Ionicons name="navigate-outline" size={16} color="#3b82f6" />
          <Text style={styles.actionText}>Navigate to Customer</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <ScrollView
      contentContainerStyle={styles.emptyContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.emptyIconContainer}>
        <Ionicons name="cube-outline" size={48} color="#9ca3af" />
      </View>
      <Text style={styles.emptyTitle}>No Orders Available</Text>
      <Text style={styles.emptySubtitle}>No orders in your location</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
        <Ionicons name="refresh-outline" size={16} color="#fff" />
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text style={styles.loadingText}>Loading orders...</Text>
    </View>
  );

  const renderStatsFooter = () => {
    if (loading || orders.length === 0) return null;
    
    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{orders.length}</Text>
          <Text style={styles.statLabel}>Available Orders</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#10b981' }]}>
            {orders.filter(o => o.status?.toLowerCase() === 'ready').length}
          </Text>
          <Text style={styles.statLabel}>Ready for Pickup</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#f59e0b' }]}>
            {orders.filter(o => o.status?.toLowerCase() === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Available Orders</Text>
          <Text style={styles.headerSubtitle}>Orders in your assigned zone</Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshIconButton} 
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Ionicons 
            name="refresh-outline" 
            size={20} 
            color="#3b82f6"
            style={refreshing ? { transform: [{ rotate: '180deg' }] } : {}}
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
            keyExtractor={(item) => item._id}
            renderItem={renderOrderItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Stats Footer */}
      {renderStatsFooter()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  refreshIconButton: {
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
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
  },
  timeText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
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
  estimateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
  },
  estimateItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  estimateText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 6,
    fontWeight: '500',
  },
  statusContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6b7280',
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
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  statsContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});