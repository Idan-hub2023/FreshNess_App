import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function CompletedOrdersPage() {
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

      const baseURL = Platform.OS === 'android' 
    ? 'https://freshness-eakm.onrender.com/api' 
    : 'http://192.168.1.67:5000/api';
  
  const fetchCompletedOrders = async () => {
    try {
      const storedLocation = await AsyncStorage.getItem('userLocation');
      const location = storedLocation || 'Muhoza';

      const response = await axios.get(`${baseURL}/bookings/location/${location}/completed`);
      const bookings = response.data;

      const formattedOrders = bookings.map((booking) => ({
        id: booking._id,
        customerName: booking.customerName,
        service: booking.serviceType,
        amount: `RWF ${booking.totalAmount?.toLocaleString() || 0}`,
        items: booking.clothingItems.map(item => `${item.quantity} ${item.name}`),
        completedDate: new Date(booking.createdAt).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }),
        completedTime: new Date(booking.createdAt).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        location: booking.address || 'Unknown',
        rating: 5,
        earnings: Math.round((booking.totalAmount || 0) * 0.1),
      }));

      setCompletedOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching completed orders:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompletedOrders();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCompletedOrders();
  };

  const renderStars = (rating) => {
    return Array(5).fill(0).map((_, i) => (
      <Icon
        key={i}
        name={i < rating ? 'star' : 'star-border'}
        size={16}
        color={i < rating ? '#FFC107' : '#E0E0E0'}
        style={styles.starIcon}
      />
    ));
  };

  const renderOrderCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      activeOpacity={0.9}
    >
      <View style={styles.orderHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.customerName} numberOfLines={1}>{item.customerName}</Text>
          <View style={styles.ratingContainer}>
            {renderStars(item.rating)}
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.amount}>{item.amount}</Text>
          <Text style={styles.earnings}>+RWF {item.earnings.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Icon name="cleaning-services" size={18} color="#6C63FF" />
          <Text style={styles.detailText}>{item.service}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="schedule" size={18} color="#6C63FF" />
          <Text style={styles.detailText}>
            {item.completedDate} • {item.completedTime}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="location-on" size={18} color="#6C63FF" />
          <Text style={styles.detailText}>{item.location}</Text>
        </View>
      </View>

      <View style={styles.itemsContainer}>
        <Text style={styles.itemsTitle}>ITEMS CLEANED</Text>
        <View style={styles.itemsGrid}>
          {item.items.map((itemName, index) => (
            <View key={index} style={styles.itemPill}>
              <Text style={styles.itemText}>{itemName}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.statusContainer}>
        <View style={styles.statusBadge}>
          <Icon name="check-circle" size={16} color="#4CAF50" />
          <Text style={styles.statusText}>Completed</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getTotalEarnings = () => {
    return completedOrders.reduce((total, order) => total + order.earnings, 0);
  };

  const getOrdersToday = () => {
    const today = new Date().toLocaleDateString('en-US');
    return completedOrders.filter(order => 
      new Date(order.completedDate).toLocaleDateString('en-US') === today
    ).length;
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Image 
        source={require('../../../assets/images/Order ride-amico.png')}
        style={styles.emptyImage}
        resizeMode="contain"
      />
      <Text style={styles.emptyTitle}>No Completed Orders</Text>
      <Text style={styles.emptyText}>
        Your completed orders will appear here once you start delivering.
      </Text>
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={handleRefresh}
      >
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading your orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6C63FF', '#4A42E8']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.headerTitle}>Completed Orders</Text>
        <Text style={styles.headerSubtitle}>Your delivery history and earnings</Text>
      </LinearGradient>

      {completedOrders.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{completedOrders.length}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{getOrdersToday()}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>RWF {getTotalEarnings().toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
        </View>
      )}

      {completedOrders.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={completedOrders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 25,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
    fontFamily: 'Roboto-Bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Roboto-Regular',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    marginTop: -20,
    marginHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3A3A3A',
    fontFamily: 'Roboto-Bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#6C63FF',
    marginTop: 6,
    fontFamily: 'Roboto-Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContainer: {
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 6,
    fontFamily: 'Roboto-Medium',
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  starIcon: {
    marginRight: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A3A3A',
    fontFamily: 'Roboto-Bold',
  },
  earnings: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 4,
    fontFamily: 'Roboto-Medium',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  orderDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#5A5A5A',
    fontFamily: 'Roboto-Regular',
  },
  itemsContainer: {
    marginBottom: 16,
  },
  itemsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C63FF',
    marginBottom: 8,
    fontFamily: 'Roboto-Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  itemPill: {
    backgroundColor: '#F0F0FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  itemText: {
    fontSize: 12,
    color: '#6C63FF',
    fontFamily: 'Roboto-Medium',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    marginLeft: 6,
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Roboto-Medium',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyImage: {
    width: 240,
    height: 240,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3A3A3A',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Roboto-Medium',
  },
  emptyText: {
    fontSize: 14,
    color: '#7A7A7A',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    fontFamily: 'Roboto-Regular',
  },
  refreshButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Roboto-Medium',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6C63FF',
    fontFamily: 'Roboto-Regular',
  },
});