import colors from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const statusSteps = [
  'Order Confirmed',
  'Driver Assigned',
  'Picked Up',
  'In Process',
  'Quality Check',
  'Out for Delivery',
  'Delivered'
];

const statusIcons = ['📦', '🚗', '🛍️', '🧼', '🔍', '🚚', '✅'];

const mapStatusToIndex = (status) => {
  const normalizedStatus = status?.toLowerCase() || '';

  const riderStatusMapping = {
    'pending': 1,
    'picked_up': 2,
    'processing': 3,
    'returning': 4,
    'delivered': 5,
    'completed': 6
  };

  if (riderStatusMapping.hasOwnProperty(normalizedStatus)) {
    return riderStatusMapping[normalizedStatus];
  }

  switch(normalizedStatus) {
    case 'pending': return 0;
    case 'driver assigned': return 1;
    case 'picked up': return 2;
    case 'in process': return 3;
    case 'quality check': return 4;
    case 'out for delivery': return 5;
    case 'completed':
    case 'delivered': return 6;
    case 'canceled': return -1;
    default: return 0;
  }
};

const OrderTrackingPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { width } = Dimensions.get('window');

  const baseURL = 'https://freshness-eakm.onrender.com/api';

  const router = useRouter();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const phoneNumber = await AsyncStorage.getItem('userPhone');
        if (!phoneNumber) throw new Error('Phone number not found');

        const response = await axios.get(`${baseURL}/customer/${phoneNumber}`);
        if (!response.data || response.data.length === 0) throw new Error('No orders found');

        setOrders(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) return <ActivityIndicator size="large" color="#0000ff" style={{ flex: 1, justifyContent: 'center' }} />;
  if (error) return <Text style={styles.error}>{error}</Text>;
  if (orders.length === 0) return <Text style={styles.error}>No orders data</Text>;

  const renderOrder = ({ item: order }) => {
    const currentStatus = mapStatusToIndex(order.payment?.status || order.status);
    const pickupDate = new Date(order.pickupDate);
    const formattedDate = pickupDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });

    return (
      <View style={styles.container}>
        <View style={styles.orderCard}>
          {/* Booking Code Highlight */}
          <View style={styles.bookingCodeContainer}>
            <View style={styles.bookingCodeBadge}>
              <Text style={styles.bookingCodeLabel}>Order ID</Text>
              <Text style={styles.bookingCodeText}>#{order.bookingCode || 'N/A'}</Text>
            </View>
            <View style={styles.dateContainer}>
              <Icon name="schedule" size={16} color={colors.textLight} />
              <Text style={styles.orderDate}>{formattedDate}</Text>
            </View>
          </View>

          {/* Customer Info */}
          <View style={styles.customerInfoContainer}>
            <View style={styles.customerRow}>
              <Icon name="person" size={18} color={colors.accent} />
              <Text style={styles.customerName}>{order.customerName || 'Customer'}</Text>
            </View>
            <View style={styles.customerRow}>
              <Icon name="phone" size={18} color={colors.accent} />
              <Text style={styles.phoneNumber}>{order.phoneNumber || 'N/A'}</Text>
            </View>
            <View style={styles.customerRow}>
              <Icon name="access-time" size={18} color={colors.accent} />
              <Text style={styles.deliveryOption}>{order.deliveryOption || 'Standard'}</Text>
            </View>
          </View>

          {/* Timeline */}
          <View style={styles.timelineContainer}>
            <Text style={styles.sectionTitle}>Order Status</Text>
            {statusSteps.map((step, index) => (
              <View key={index} style={styles.timelineStep}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.stepIconContainer, index <= currentStatus && styles.activeStepIcon]}>
                    <Text style={[styles.stepIcon, index <= currentStatus && styles.activeStepIconText]}>
                      {statusIcons[index]}
                    </Text>
                  </View>
                  {index < statusSteps.length - 1 && (
                    <View style={[styles.connectorLine, index < currentStatus && styles.activeConnector]} />
                  )}
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, index <= currentStatus && styles.activeStepTitle]}>
                    {step}
                  </Text>
                  {index <= currentStatus && (
                    <Text style={styles.stepTime}>
                      {index === currentStatus ? '🔄 In progress' : '✅ Completed'}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Order Details */}
          <View style={styles.detailsContainer}>
            <Text style={styles.sectionTitle}>Order Details</Text>
            
            {/* Clothing Items */}
            <View style={styles.itemsContainer}>
              <Text style={styles.detailLabel}>Items:</Text>
              {order.clothingItems?.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.name} x{item.quantity}</Text>
                  <Text style={styles.itemPrice}>RWF {item.price?.toLocaleString()}</Text>
                </View>
              ))}
            </View>

            {/* Service Type */}
            <View style={styles.detailRow}>
              <Icon name="local-laundry-service" size={18} color={colors.accent} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Service Type</Text>
                <Text style={styles.detailValue}>{order.serviceType || 'N/A'}</Text>
              </View>
            </View>

            {/* Address */}
            <View style={styles.detailRow}>
              <Icon name="location-on" size={18} color={colors.accent} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Delivery Address</Text>
                <Text style={styles.detailValue}>
                  {order.location?.address || order.address || 'No address provided'}
                </Text>
              </View>
            </View>

            {/* Payment Info */}
            <View style={styles.detailRow}>
              <Icon name="payment" size={18} color={colors.accent} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Payment Method</Text>
                <Text style={styles.detailValue}>{order.payment?.method || 'N/A'}</Text>
              </View>
            </View>

            {/* Instructions */}
            {order.instructions && (
              <View style={styles.detailRow}>
                <Icon name="note" size={18} color={colors.accent} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Special Instructions</Text>
                  <Text style={styles.detailValue}>{order.instructions}</Text>
                </View>
              </View>
            )}

            {/* Total Amount */}
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>
                RWF {order.totalAmount?.toLocaleString() || '0'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

return (
  <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
    {/* Header - ONCE */}
    <View style={styles.headerContainer}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.pageTitle}>Order Tracking</Text>
    </View>

    {/* Orders List */}
    <FlatList
      data={orders}
      keyExtractor={item => item._id}
      renderItem={renderOrder}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
    />
  </View>
);

};

const styles = StyleSheet.create({
  listContainer: {
    backgroundColor: '#f8f9fa',
    minHeight: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: colors.accent || '#007bff',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  orderCard: {
    margin: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  bookingCodeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.accent || '#007bff',
    padding: 20,
  },
  bookingCodeBadge: {
    flex: 1,
  },
  bookingCodeLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bookingCodeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 6,
  },
  customerInfoContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark || '#333',
    marginLeft: 10,
  },
  phoneNumber: {
    fontSize: 14,
    color: colors.textLight || '#666',
    marginLeft: 10,
  },
  deliveryOption: {
    fontSize: 14,
    color: colors.textLight || '#666',
    marginLeft: 10,
  },
  timelineContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark || '#333',
    marginBottom: 16,
  },
  timelineStep: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 12,
  },
  stepIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStepIcon: {
    backgroundColor: colors.accent || '#007bff',
    borderColor: colors.accent || '#007bff',
  },
  stepIcon: {
    fontSize: 16,
  },
  activeStepIconText: {
    fontSize: 16,
  },
  connectorLine: {
    width: 2,
    height: 24,
    backgroundColor: '#e9ecef',
    marginTop: 4,
  },
  activeConnector: {
    backgroundColor: colors.accent || '#007bff',
  },
  stepContent: {
    flex: 1,
    paddingTop: 6,
  },
  stepTitle: {
    fontSize: 14,
    color: colors.textLight || '#666',
    marginBottom: 2,
  },
  activeStepTitle: {
    color: colors.textDark || '#333',
    fontWeight: '600',
  },
  stepTime: {
    fontSize: 12,
    color: colors.accent || '#007bff',
    fontWeight: '500',
  },
  detailsContainer: {
    padding: 20,
  },
  itemsContainer: {
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 6,
  },
  itemName: {
    fontSize: 14,
    color: colors.textDark || '#333',
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 14,
    color: colors.accent || '#007bff',
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textLight || '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: colors.textDark || '#333',
    fontWeight: '500',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.accent || '#007bff',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '800',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
});

export default OrderTrackingPage;