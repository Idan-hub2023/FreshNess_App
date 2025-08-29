import axios from 'axios';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { DataTable } from 'react-native-paper';

const ReportDashboard = () => {
  const [riders, setRiders] = useState([]);
  const [users, setUsers] = useState([]);
  const [dryCleaners, setDryCleaners] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week'); // week, month, year
  const [stats, setStats] = useState({
    totalEarnings: 0,
    completedOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0
  });

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ridersRes, usersRes, dryCleanersRes, bookingsRes] = await Promise.all([
        axios.get('https://freshness-eakm.onrender.com/api/rider'),
        axios.get('https://freshness-eakm.onrender.com/api/users'),
        axios.get('https://freshness-eakm.onrender.com/api/drycleaner'),
        axios.get('https://freshness-eakm.onrender.com/api/orders')
      ]);

      setRiders(ridersRes.data);
      setUsers(usersRes.data);
      setDryCleaners(dryCleanersRes.data);
      
      const filteredBookings = filterBookingsByTime(bookingsRes.data, timeRange);
      setBookings(filteredBookings);
      calculateStatistics(filteredBookings);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const filterBookingsByTime = (data, range) => {
    const now = moment();
    let startDate;
    
    switch(range) {
      case 'week':
        startDate = now.clone().subtract(1, 'weeks');
        break;
      case 'month':
        startDate = now.clone().subtract(1, 'months');
        break;
      case 'year':
        startDate = now.clone().subtract(1, 'years');
        break;
      default:
        startDate = now.clone().subtract(1, 'weeks');
    }
    
    return data.filter(booking => 
      moment(booking.createdAt).isSameOrAfter(startDate)
    );
  };

  const calculateStatistics = (bookingsData) => {
    const earnings = bookingsData
    .filter(b => b.status === 'completed')
    .reduce((sum, booking) => sum + booking.totalAmount, 0);
    const completed = bookingsData.filter(b => b.status === 'completed').length;
    const pending = bookingsData.filter(b => b.status === 'pending').length;
    const cancelled = bookingsData.filter(b => b.status === 'cancelled').length;
    
    setStats({
      totalEarnings: earnings,
      completedOrders: completed,
      pendingOrders: pending,
      cancelledOrders: cancelled
    });
  };

  const riderEarnings = riders.map(rider => {
    const riderBookings = bookings.filter(booking => booking.userId === rider._id);
    const earnings = riderBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);
    return {
      ...rider,
      earnings,
      bookingCount: riderBookings.length,
      completed: riderBookings.filter(b => b.status === 'completed').length
    };
  }).sort((a, b) => b.earnings - a.earnings);

  // Data processing for charts
  const serviceRevenueData = bookings.reduce((acc, booking) => {
    if (!acc[booking.serviceType]) {
      acc[booking.serviceType] = 0;
    }
    acc[booking.serviceType] += booking.totalAmount;
    return acc;
  }, {});

  const serviceTypeData = bookings.reduce((acc, booking) => {
    acc[booking.serviceType] = (acc[booking.serviceType] || 0) + 1;
    return acc;
  }, {});

  const statusData = [
    { name: 'Completed', count: stats.completedOrders, color: '#4CAF50' },
    { name: 'Pending', count: stats.pendingOrders, color: '#FFC107' },
    { name: 'Cancelled', count: stats.cancelledOrders, color: '#F44336' }
  ];

  // Weekly trend data
  const weeklyRevenueData = bookings.reduce((acc, booking) => {
    const week = moment(booking.createdAt).format('WW'); // Week number
    if (!acc[week]) {
      acc[week] = 0;
    }
    acc[week] += booking.totalAmount;
    return acc;
  }, {});

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#ffa726'
    }
  };

  const screenWidth = Dimensions.get('window').width;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Loading dashboard data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>Dry Cleaning Analytics Dashboard</Text>
      
      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <TouchableOpacity 
          style={[styles.timeRangeButton, timeRange === 'week' && styles.activeTimeRange]}
          onPress={() => setTimeRange('week')}
        >
          <Text style={[styles.timeRangeButtonText, timeRange === 'week' && styles.activeTimeRangeText]}>Week</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.timeRangeButton, timeRange === 'month' && styles.activeTimeRange]}
          onPress={() => setTimeRange('month')}
        >
          <Text style={[styles.timeRangeButtonText, timeRange === 'month' && styles.activeTimeRangeText]}>Month</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.timeRangeButton, timeRange === 'year' && styles.activeTimeRange]}
          onPress={() => setTimeRange('year')}
        >
          <Text style={[styles.timeRangeButtonText, timeRange === 'year' && styles.activeTimeRangeText]}>Year</Text>
        </TouchableOpacity>
      </View>
      
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.card, styles.earningsCard]}>
          <Text style={styles.cardTitle}>Total Earnings</Text>
          <Text style={styles.cardValue}>{stats.totalEarnings.toLocaleString()} RWF</Text>
          <Text style={styles.cardSubtitle}>Last {timeRange}</Text>
        </View>
        
        <View style={[styles.card, styles.ordersCard]}>
          <Text style={styles.cardTitle}>Total Orders</Text>
          <Text style={styles.cardValue}>{bookings.length}</Text>
          <Text style={styles.cardSubtitle}>{stats.completedOrders} completed</Text>
        </View>
        
        <View style={[styles.card, styles.usersCard]}>
          <Text style={styles.cardTitle}>Active Users</Text>
          <Text style={styles.cardValue}>{users.length}</Text>
          <Text style={styles.cardSubtitle}>{riders.length} riders</Text>
        </View>

        <View style={[styles.card, styles.partnersCard]}>
          <Text style={styles.cardTitle}>Dry Cleaners</Text>
          <Text style={styles.cardValue}>{dryCleaners.length}</Text>
          <Text style={styles.cardSubtitle}>Partners</Text>
        </View>
      </View>

      {/* Main Charts Section */}
      <View style={styles.mainChartsSection}>
        {/* Revenue Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionHeader}>Revenue by Service Type</Text>
          <View style={styles.chartContainer}>
            <BarChart
              data={{
                labels: Object.keys(serviceRevenueData),
                datasets: [{
                  data: Object.values(serviceRevenueData)
                }]
              }}
              width={screenWidth - 40}
              height={250}
              yAxisLabel="RWF "
              chartConfig={{
                ...chartConfig,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(63, 81, 181, ${opacity})`,
                formatYLabel: (value) => {
                  if (value >= 1000000) return `${(value/1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value/1000).toFixed(1)}K`;
                  return `${value}`;
                },
                barPercentage: 0.6
              }}
              verticalLabelRotation={25}
              fromZero
              showBarTops={false}
              withInnerLines={false}
              style={styles.chartStyle}
            />
          </View>
        </View>

        {/* Order Status Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionHeader}>Order Status Distribution</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={statusData.map(item => ({
                name: item.name,
                population: item.count,
                color: item.color,
                legendFontColor: '#7F7F7F',
                legendFontSize: 12
              }))}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
              style={styles.chartStyle}
            />
          </View>
        </View>
      </View>

      {/* Secondary Charts Section */}
      <View style={styles.secondaryChartsSection}>
        {/* Orders by Service Type */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionHeader}>Orders by Service Type</Text>
          <View style={styles.chartContainer}>
            <BarChart
              data={{
                labels: Object.keys(serviceTypeData),
                datasets: [{
                  data: Object.values(serviceTypeData)
                }]
              }}
              width={screenWidth - 40}
              height={220}
              yAxisLabel=""
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(27, 94, 32, ${opacity})`,
              }}
              verticalLabelRotation={30}
              fromZero
              showBarTops={false}
              style={styles.chartStyle}
            />
          </View>
        </View>

        {/* Weekly Trend */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionHeader}>Weekly Revenue Trend</Text>
          <View style={styles.chartContainer}>
            <LineChart
              data={{
                labels: Object.keys(weeklyRevenueData).sort(),
                datasets: [{
                  data: Object.keys(weeklyRevenueData).sort().map(week => weeklyRevenueData[week]),
                  color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
                  strokeWidth: 2
                }]
              }}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                ...chartConfig,
                decimalPlaces: 0,
                formatYLabel: (value) => {
                  if (value >= 1000000) return `${(value/1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value/1000).toFixed(1)}K`;
                  return `${value}`;
                },
              }}
              bezier
              style={styles.chartStyle}
            />
          </View>
        </View>
      </View>

      {/* Data Tables Section */}
      <View style={styles.tablesSection}>
        {/* Top Performers */}
        <View style={styles.tableSection}>
          <Text style={styles.sectionHeader}>Top Performing Riders</Text>
          <ScrollView horizontal>
            <DataTable style={styles.dataTable}>
              <DataTable.Header>
                <DataTable.Title style={styles.tableHeader}>Rider</DataTable.Title>
                <DataTable.Title numeric style={styles.tableHeader}>Orders</DataTable.Title>
                <DataTable.Title numeric style={styles.tableHeader}>Completed</DataTable.Title>
                <DataTable.Title numeric style={styles.tableHeader}>Earnings</DataTable.Title>
              </DataTable.Header>

              {riderEarnings.slice(0, 5).map(rider => (
                <DataTable.Row key={rider._id}>
                  <DataTable.Cell style={styles.tableCell}>{rider.fullname}</DataTable.Cell>
                  <DataTable.Cell numeric style={styles.tableCell}>{rider.bookingCount}</DataTable.Cell>
                  <DataTable.Cell numeric style={styles.tableCell}>{rider.completed}</DataTable.Cell>
                  <DataTable.Cell numeric style={[styles.tableCell, styles.earningCell]}>
                    {rider.earnings.toLocaleString()} RWF
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </ScrollView>
        </View>

        {/* Recent Transactions */}
        <View style={styles.tableSection}>
          <Text style={styles.sectionHeader}>Recent Transactions</Text>
          <ScrollView horizontal>
            <DataTable style={styles.dataTable}>
              <DataTable.Header>
                <DataTable.Title style={styles.tableHeader}>Customer</DataTable.Title>
                <DataTable.Title style={styles.tableHeader}>Service</DataTable.Title>
                <DataTable.Title numeric style={styles.tableHeader}>Amount</DataTable.Title>
                <DataTable.Title style={styles.tableHeader}>Status</DataTable.Title>
                <DataTable.Title style={styles.tableHeader}>Date</DataTable.Title>
              </DataTable.Header>

              {bookings.slice(0, 5).map(booking => (
                <DataTable.Row key={booking._id}>
                  <DataTable.Cell style={styles.tableCell}>{booking.customerName || 'N/A'}</DataTable.Cell>
                  <DataTable.Cell style={styles.tableCell}>{booking.serviceType}</DataTable.Cell>
                  <DataTable.Cell numeric style={styles.tableCell}>
                    {booking.totalAmount.toLocaleString()} RWF
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.tableCell}>
                    <View style={[
                      styles.statusBadge,
                      booking.status === 'completed' && styles.completedBadge,
                      booking.status === 'pending' && styles.pendingBadge,
                      booking.status === 'cancelled' && styles.cancelledBadge
                    ]}>
                      <Text style={styles.statusText}>{booking.status}</Text>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.tableCell}>
                    {moment(booking.createdAt).format('MMM D')}
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </ScrollView>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#555',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
    textAlign: 'center',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  timeRangeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    backgroundColor: '#ecf0f1',
  },
  timeRangeButtonText: {
    color: '#34495e',
    fontWeight: '600',
  },
  activeTimeRange: {
    backgroundColor: '#3498db',
  },
  activeTimeRangeText: {
    color: 'white',
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    width: '48%',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  earningsCard: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
  },
  ordersCard: {
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 4,
    borderLeftColor: '#388e3c',
  },
  usersCard: {
    backgroundColor: '#fff3e0',
    borderLeftWidth: 4,
    borderLeftColor: '#ffa000',
  },
  partnersCard: {
    backgroundColor: '#f3e5f5',
    borderLeftWidth: 4,
    borderLeftColor: '#8e24aa',
  },
  cardTitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  mainChartsSection: {
    marginBottom: 20,
  },
  secondaryChartsSection: {
    marginBottom: 20,
  },
  tablesSection: {
    marginBottom: 20,
  },
  chartSection: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tableSection: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2c3e50',
  },
  chartContainer: {
    alignItems: 'center',
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 10,
  },
  dataTable: {
    backgroundColor: 'white',
    minWidth: Dimensions.get('window').width - 32,
  },
  tableHeader: {
    backgroundColor: '#f5f7fa',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  tableCell: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  earningCell: {
    fontWeight: 'bold',
    color: '#27ae60',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  completedBadge: {
    backgroundColor: '#e8f5e9',
  },
  pendingBadge: {
    backgroundColor: '#fff8e1',
  },
  cancelledBadge: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    textTransform: 'capitalize',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ReportDashboard;