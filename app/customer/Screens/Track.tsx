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
  // First normalize the status to lowercase
  const normalizedStatus = status?.toLowerCase() || '';

  // Map rider status to user tracking steps
  const riderStatusMapping = {
    'pending': 1,       // 'pending' in rider -> 'Driver Assigned'
    'picked_up': 2,     // 'picked_up' in rider -> 'Picked Up'
    'processing': 3,    // 'processing' in rider -> 'In Process'
    'returning': 4,     // 'returning' in rider -> 'Quality Check'
    'delivered': 5,     // 'delivered' in rider -> 'Out for Delivery'
    'completed': 6      // 'completed' in rider -> 'Delivered'
  };

  // Check if it's a rider status first
  if (riderStatusMapping.hasOwnProperty(normalizedStatus)) {
    return riderStatusMapping[normalizedStatus];
  }

  // Fall back to original user status mapping
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

  const baseURL = Platform.OS === 'android' 
    ? 'https://freshness-eakm.onrender.com/api' 
    : 'http://192.168.1.67:5000/api';
  
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

    return (
      <View>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.orderCard}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Order ID: {order.bookingCode || 'bookingCode'}</Text>
            <Text style={styles.orderDate}>Pickup: {new Date(order.pickupDate).toLocaleDateString()}</Text>
          </View>

          <View style={styles.timelineContainer}>
            {statusSteps.map((step, index) => (
              <View key={index} style={styles.timelineStep}>
                <View style={[styles.stepIconContainer, index <= currentStatus && styles.activeStepIcon]}>
                  <Text style={styles.stepIcon}>{statusIcons[index]}</Text>
                </View>
                <View style={styles.stepTextContainer}>
                  <Text style={[styles.stepTitle, index <= currentStatus && styles.activeStepTitle]}>
                    {step}
                  </Text>
                  {index <= currentStatus && (
                    <Text style={styles.stepTime}>
                      {index === currentStatus ? 'In progress' : 'Completed'}
                    </Text>
                  )}
                </View>
                {index < statusSteps.length - 1 && (
                  <View style={[styles.connectorLine, index < currentStatus && styles.activeConnector]} />
                )}
              </View>
            ))}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Instructions:</Text>
            <Text style={styles.infoValue}>{order.instructions || 'None'}</Text>

            <Text style={styles.infoLabel}>Delivery Address:</Text>
            <Text style={styles.infoValue}>{order.location?.address || order.address || 'No address provided'}</Text>

            <Text style={styles.infoLabel}>Service Type:</Text>
            <Text style={styles.infoValue}>{order.serviceType || 'N/A'}</Text>

            <Text style={styles.infoLabel}>Payment Method:</Text>
            <Text style={styles.infoValue}>{order.payment?.method || 'N/A'}</Text>

            <Text style={styles.infoLabel}>Total Amount:</Text>
            <Text style={styles.infoValue}>
              {order.totalAmount ? `RWF ${order.totalAmount}` : 'N/A'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={orders}
      keyExtractor={item => item._id}
      renderItem={renderOrder}
      contentContainerStyle={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'white',
  },
  orderCard: {
    marginTop: 50,
    marginBottom: 30,
    borderRadius: 12,
    backgroundColor: colors.background,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  header: {
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
  },
  backButton: {
    position: 'absolute',
    left: 1,
    top: 0,
    padding: 10,
    zIndex: 10,
    backgroundColor: colors.accent,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  orderDate: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 3,
  },
  timelineContainer: {
    marginBottom: 15,
    paddingLeft: 10,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    position: 'relative',
  },
  stepIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.textLight,
    marginRight: 10,
    zIndex: 2,
  },
  activeStepIcon: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  stepIcon: {
    fontSize: 14,
  },
  stepTextContainer: {
    flex: 1,
    paddingTop: 3,
  },
  stepTitle: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 2,
  },
  activeStepTitle: {
    color: colors.textDark,
    fontWeight: '600',
  },
  stepTime: {
    fontSize: 10,
    color: colors.textLight,
  },
  connectorLine: {
    position: 'absolute',
    left: 15,
    top: 30,
    height: '100%',
    width: 1,
    backgroundColor: colors.textLight,
    zIndex: 1,
  },
  activeConnector: {
    backgroundColor: colors.accent,
  },
  infoCard: {
    marginTop: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textDark,
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default OrderTrackingPage;