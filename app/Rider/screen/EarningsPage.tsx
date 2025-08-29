import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

export default function EarningsPage() {
  const [earningsData, setEarningsData] = useState({});
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  // Add state for additional data
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [workingZone, setWorkingZone] = useState('');
  const [grossTotal, setGrossTotal] = useState(0);

      const baseURL = 'https://freshness-eakm.onrender.com/api';

const fetchEarnings = async () => {
  try {
    setLoading(true);
    setError(null);

    // 1. Get and validate user data
    const userDataString = await AsyncStorage.getItem('user');
    if (!userDataString) throw new Error('User data not found');
    
    const userData = JSON.parse(userDataString);
    const { phone, assignedZone } = userData;

    console.log('Frontend: User data from storage:', { phone, assignedZone });

    // 2. Phone number validation
    if (phone === undefined || phone === null) {
      throw new Error('Phone number is missing in user data');
    }

    // 3. Convert to string and clean
    const phoneStr = phone.toString().trim();
    const cleanPhone = phoneStr.replace(/\D/g, '');

    if (cleanPhone.length < 9 || cleanPhone.length > 12) {
      throw new Error('Invalid phone number length');
    }

    console.log('Frontend: Making API call with:', {
      zone: assignedZone,
      phone: cleanPhone,
      period: selectedPeriod
    });

    // 4. Make API request
    const response = await axios.get(
      `${baseURL}/earnings/${encodeURIComponent(assignedZone)}/${cleanPhone}/${selectedPeriod}`,
      {
        timeout: 15000,
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Frontend: API response:', response.data);

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Invalid server response');
    }

    // 5. Update state with ALL data from backend
    setEarningsData({
      ...earningsData,
      [selectedPeriod]: {
        total: response.data.total || 0,
        orders: response.data.orders || 0,
        averagePerOrder: response.data.averagePerOrder || 0,
        breakdown: response.data.breakdown || []
      }
    });

    // 6. Update additional state from backend response
    if (response.data.workingZone) {
      setWorkingZone(response.data.workingZone);
    }
    
    if (response.data.grossTotal !== undefined) {
      setGrossTotal(response.data.grossTotal);
    }

    // 7. Fetch monthly total if current period is not month
    if (selectedPeriod !== 'month') {
      try {
        const monthlyResponse = await axios.get(
          `${baseURL}/earnings/${encodeURIComponent(assignedZone)}/${cleanPhone}/month`,
          {
            timeout: 10000,
            headers: {
              'Cache-Control': 'no-cache',
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (monthlyResponse.data?.success) {
          setMonthlyTotal(monthlyResponse.data.total || 0);
        }
      } catch (monthlyError) {
        console.log('Could not fetch monthly total:', monthlyError.message);
      }
    } else {
      setMonthlyTotal(response.data.total || 0);
    }
    setRiderRating(userData.rating || 4.8);

  } catch (error) {
    console.error('Frontend: API Error:', {
      message: error.message,
      code: error.code,
      config: error.config
    });
    setError(error.message || 'Failed to fetch earnings');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarnings();
  };

  useEffect(() => {
    fetchEarnings();
  }, [selectedPeriod]);

  const currentData = earningsData[selectedPeriod] || {
    total: 0,
    orders: 0,
    averagePerOrder: 0,
    breakdown: []
  };

  const renderPeriodButton = (period, label) => (
    <TouchableOpacity
      style={[
        styles.periodButton,
        selectedPeriod === period && styles.activePeriodButton
      ]}
      onPress={() => setSelectedPeriod(period)}
      disabled={loading}
    >
      <Text style={[
        styles.periodButtonText,
        selectedPeriod === period && styles.activePeriodButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderTodayBreakdown = () => (
    <View style={styles.breakdownContainer}>
      <Text style={styles.breakdownTitle}>Today's Orders in {workingZone}</Text>
      {currentData.breakdown?.length > 0 ? (
        currentData.breakdown.map((item, index) => (
          <View key={index} style={styles.breakdownItem}>
            <View style={styles.breakdownLeft}>
              <Text style={styles.breakdownTime}>{item.time}</Text>
              <Text style={styles.breakdownCustomer}>{item.customer}</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.noDataText}>No orders found for today in {workingZone || 'your zone'}</Text>
      )}
    </View>
  );

  const renderWeekBreakdown = () => (
    <View style={styles.breakdownContainer}>
      <Text style={styles.breakdownTitle}>This Week in {workingZone}</Text>
      {currentData.breakdown?.length > 0 ? (
        currentData.breakdown.map((item, index) => (
          <View key={index} style={styles.breakdownItem}>
            <View style={styles.breakdownLeft}>
              <Text style={styles.breakdownDay}>{item.day}</Text>
              <Text style={styles.breakdownOrders}>{item.orders} orders</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.noDataText}>No orders found this week in {workingZone || 'your zone'}</Text>
      )}
    </View>
  );

  const renderMonthBreakdown = () => (
    <View style={styles.breakdownContainer}>
      <Text style={styles.breakdownTitle}>This Month in {workingZone}</Text>
      {currentData.breakdown?.length > 0 ? (
        currentData.breakdown.map((item, index) => (
          <View key={index} style={styles.breakdownItem}>
            <View style={styles.breakdownLeft}>
              <Text style={styles.breakdownWeek}>{item.week}</Text>
              <Text style={styles.breakdownOrders}>{item.orders} orders</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.noDataText}>No orders found this month in {workingZone || 'your zone'}</Text>
      )}
    </View>
  );

  const renderBreakdown = () => {
    if (loading) return null;
    
    switch (selectedPeriod) {
      case 'today':
        return renderTodayBreakdown();
      case 'week':
        return renderWeekBreakdown();
      case 'month':
        return renderMonthBreakdown();
      default:
        return null;
    }
  };

  // Calculate estimated work hours based on orders
  const getEstimatedWorkHours = () => {
    const { orders } = currentData;
    if (selectedPeriod === 'today') {
      return orders > 0 ? `${Math.max(1, Math.round(orders * 0.5))}h` : '0h';
    } else if (selectedPeriod === 'week') {
      return orders > 0 ? `${Math.max(1, Math.round(orders * 0.3))}h` : '0h';
    } else {
      return orders > 0 ? `${Math.max(1, Math.round(orders * 0.2))}h` : '0h';
    }
  };

  // Calculate next payment date (next Friday)
  const getNextPaymentDate = () => {
    const today = new Date();
    const nextFriday = new Date();
    const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
    nextFriday.setDate(today.getDate() + daysUntilFriday);
    return nextFriday.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
        <Text style={styles.loadingText}>Loading earnings data...</Text>
      </View>
    );
  }

  if (error && !refreshing) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={50} color="#FF5252" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchEarnings}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
        <Text style={styles.headerSubtitle}>Track your income from {workingZone || 'your zone'}</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#9C27B0']}
            tintColor="#9C27B0"
          />
        }
      >
        {/* Period Selection */}
        <View style={styles.periodContainer}>
          {renderPeriodButton('today', 'Today')}
          {renderPeriodButton('week', 'This Week')}
          {renderPeriodButton('month', 'This Month')}
        </View>

        {/* Main Earnings Card */}
        <View style={styles.mainCard}>
          <View style={styles.totalEarnings}>
            <Text style={styles.totalAmount}>RWF {currentData.total?.toLocaleString()}</Text>
            <Text style={styles.totalLabel}>
              Your Commission {selectedPeriod === 'today' ? 'Today' : selectedPeriod === 'week' ? 'This Week' : 'This Month'}
            </Text>
            {grossTotal > 0 && (
              <Text style={styles.grossTotalLabel}>
                (From RWF {grossTotal?.toLocaleString()} gross sales)
              </Text>
            )}
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Icon name="assignment" size={24} color="#9C27B0" />
              <Text style={styles.statValue}>{currentData.orders}</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon name="trending-up" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>RWF {currentData.averagePerOrder?.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Avg/Order</Text>
            </View>
            
            <View style={styles.statItem}>
              <Icon name="schedule" size={24} color="#FF9800" />
              <Text style={styles.statValue}>{getEstimatedWorkHours()}</Text>
              <Text style={styles.statLabel}>Est. Work</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats - Now with real data */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatCard}>
            <Icon name="account-balance-wallet" size={28} color="#2196F3" />
            <Text style={styles.quickStatAmount}>RWF {monthlyTotal?.toLocaleString()}</Text>
            <Text style={styles.quickStatLabel}>Monthly Total</Text>
          </View>
          
          <View style={styles.quickStatCard}>
            <Icon name="star" size={28} color="#FFD700" />
            <Text style={styles.quickStatAmount}>{riderRating?.toFixed(1)}</Text>
            <Text style={styles.quickStatLabel}>Rating</Text>
          </View>
        </View>

        {/* Breakdown */}
        {renderBreakdown()}

        {/* Payment Info - Now with real data */}
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentTitle}>Payment Information</Text>
          <View style={styles.paymentItem}>
            <Icon name="info" size={16} color="#666" />
            <Text style={styles.paymentText}>
              Payments are processed weekly every Friday
            </Text>
          </View>
          <View style={styles.paymentItem}>
            <Icon name="account-balance" size={16} color="#666" />
            <Text style={styles.paymentText}>
              Commission: 10% of order value
            </Text>
          </View>
          <View style={styles.paymentItem}>
            <Icon name="schedule" size={16} color="#666" />
            <Text style={styles.paymentText}>
              Next payment: {getNextPaymentDate()}
            </Text>
          </View>
          <View style={styles.paymentItem}>
            <Icon name="location-on" size={16} color="#666" />
            <Text style={styles.paymentText}>
              Working zone: {workingZone || 'Not assigned'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#9C27B0',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E1BEE7',
  },
  content: {
    flex: 1,
  },
  periodContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginHorizontal: 5,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  activePeriodButton: {
    backgroundColor: '#9C27B0',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  activePeriodButtonText: {
    color: '#fff',
  },
  mainCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  totalEarnings: {
    alignItems: 'center',
    marginBottom: 20,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#9C27B0',
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  grossTotalLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  quickStats: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  quickStatAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  breakdownContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  breakdownLeft: {
    flex: 1,
  },
  breakdownTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  breakdownCustomer: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  breakdownDay: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  breakdownWeek: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  breakdownOrders: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  paymentInfo: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 20,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 15,
  },
  retryButton: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 15,
    fontStyle: 'italic',
  },
});