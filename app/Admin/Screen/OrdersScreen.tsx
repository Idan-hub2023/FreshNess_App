import colors from '@/constants/Colors';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

type ClothingItem = {
  _id: string;
  name: string;
  quantity: number;
  price: number;
};

type Order = {
  _id: string;
  customerName: string;
  phoneNumber: string;
  serviceType: string;
  clothingItems: ClothingItem[];
  pickupDate: string;
  deliveryOption: string;
  address: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  bookingCode?: string;
  payment: {
    method: string;
    details: {
      phoneNumber: string;
    };
  };
};

const API_URL = 'https://freshness-eakm.onrender.com/api/orders';

const OrdersScreen = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const fetchOrders = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }
      
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders:', err);
      Alert.alert('Error', 'Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    fetchOrders();
  };

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === selectedStatus);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(order => 
        order.customerName.toLowerCase().includes(query) ||
        order.phoneNumber.includes(query) ||
        order.serviceType.toLowerCase().includes(query) ||
        order.address.toLowerCase().includes(query) ||
        (order.bookingCode && order.bookingCode.toLowerCase().includes(query)) ||
        order._id.includes(query)
      );
    }

    // Sort by creation date (newest first)
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, searchQuery, selectedStatus]);

  // Get status counts for filter tabs
  const statusCounts = useMemo(() => {
    const counts = {
      all: orders.length,
      pending: 0,
      'in-progress': 0,
      picked: 0,
      completed: 0
    };

    orders.forEach(order => {
      if (counts.hasOwnProperty(order.status)) {
        counts[order.status as keyof typeof counts]++;
      }
    });

    return counts;
  }, [orders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981'; // Green
      case 'picked':
        return '#3B82F6'; // Blue
      case 'in-progress':
        return '#F59E0B'; // Amber
      case 'pending':
        return '#EF4444'; // Red
      default:
        return colors.textLight;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Delivered';
      case 'picked':
        return 'Picked Up';
      case 'in-progress':
        return 'In Progress';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'picked':
        return '📦';
      case 'in-progress':
        return '⏳';
      case 'pending':
        return '⏰';
      default:
        return '•';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const viewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const renderStatusFilter = () => {
    const statusOptions = [
      { key: 'all', label: 'All', count: statusCounts.all },
      { key: 'pending', label: 'Pending', count: statusCounts.pending },
      { key: 'in-progress', label: 'In Progress', count: statusCounts['in-progress'] },
      { key: 'picked', label: 'Picked', count: statusCounts.picked },
      { key: 'completed', label: 'Completed', count: statusCounts.completed },
    ];

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {statusOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.filterTab,
              selectedStatus === option.key && styles.activeFilterTab
            ]}
            onPress={() => setSelectedStatus(option.key)}
          >
            <Text style={[
              styles.filterTabText,
              selectedStatus === option.key && styles.activeFilterTabText
            ]}>
              {option.label}
            </Text>
            <View style={[
              styles.countBadge,
              selectedStatus === option.key && styles.activeCountBadge
            ]}>
              <Text style={[
                styles.countText,
                selectedStatus === option.key && styles.activeCountText
              ]}>
                {option.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.7}
      onPress={() => viewOrderDetails(item)}
    >
      {/* Header Row */}
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>
          #{item.bookingCode || item._id.slice(-6).toUpperCase()}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusIcon}>{getStatusIcon(item.status)}</Text>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      {/* Customer and Service */}
      <View style={styles.mainInfo}>
        <Text style={styles.customerName}>{item.customerName}</Text>
        <Text style={styles.serviceType}>{item.serviceType}</Text>
      </View>

      {/* Price */}
      <Text style={styles.price}>{item.totalAmount.toLocaleString()} RWF</Text>

      {/* Quick Details */}
      <View style={styles.quickDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📞</Text>
          <Text style={styles.detailText}>{item.phoneNumber}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📍</Text>
          <Text style={styles.detailText} numberOfLines={1}>{item.address}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailText}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>

      {/* Items count */}
      <View style={styles.cardFooter}>
        <Text style={styles.itemsCount}>
          {item.clothingItems.length} item{item.clothingItems.length !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity 
          style={styles.viewButton}
          onPress={() => viewOrderDetails(item)}
        >
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>📦</Text>
      <Text style={styles.emptyTitle}>
        {searchQuery || selectedStatus !== 'all' ? 'No Matching Orders' : 'No Orders Found'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || selectedStatus !== 'all' 
          ? 'Try adjusting your search or filter criteria'
          : 'Orders will appear here once they are created'
        }
      </Text>
      {(searchQuery || selectedStatus !== 'all') && (
        <TouchableOpacity 
          style={styles.clearFiltersButton}
          onPress={() => {
            setSearchQuery('');
            setSelectedStatus('all');
          }}
        >
          <Text style={styles.clearFiltersText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Orders Management</Text>
        <Text style={styles.subtitle}>
          {filteredOrders.length} of {orders.length} orders
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by customer, phone, service, or order ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textLight}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filter */}
      {renderStatusFilter()}

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />

      {/* Order Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        {selectedOrder && (
          <ScrollView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Order Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order ID:</Text>
                <Text style={styles.detailValue}>
                  #{selectedOrder.bookingCode || selectedOrder._id.slice(-6).toUpperCase()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(selectedOrder.status)}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Service Type:</Text>
                <Text style={styles.detailValue}>{selectedOrder.serviceType}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Amount:</Text>
                <Text style={[styles.detailValue, styles.priceText]}>{selectedOrder.totalAmount.toLocaleString()} RWF</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Created:</Text>
                <Text style={styles.detailValue}>{formatDate(selectedOrder.createdAt)} at {formatTime(selectedOrder.createdAt)}</Text>
              </View>
            </View>

            {/* Customer Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>{selectedOrder.customerName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>{selectedOrder.phoneNumber}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Address:</Text>
                <Text style={styles.detailValue}>{selectedOrder.address}</Text>
              </View>
            </View>

            {/* Clothing Items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Clothing Items ({selectedOrder.clothingItems.length})</Text>
              {selectedOrder.clothingItems.map((item, index) => (
                <View key={item._id} style={styles.itemRow}>
                  <Text style={styles.itemName}>{index + 1}. {item.name}</Text>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                    <Text style={styles.itemPrice}>{item.price.toLocaleString()} RWF</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Payment Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Method:</Text>
                <Text style={styles.detailValue}>{selectedOrder.payment.method}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone Number:</Text>
                <Text style={styles.detailValue}>{selectedOrder.payment.details.phoneNumber}</Text>
              </View>
            </View>

            {/* Delivery Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pickup Date:</Text>
                <Text style={styles.detailValue}>{formatDate(selectedOrder.pickupDate)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Delivery Option:</Text>
                <Text style={styles.detailValue}>{selectedOrder.deliveryOption}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  headerContainer: {
    marginBottom: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
  },
  // Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textDark,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 16,
    color: colors.textLight,
  },
  // Filter Styles
  filterContainer: {
    marginBottom: 6,
    height: 60,
  },
  filterContent: {
    paddingHorizontal: 4,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeFilterTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textDark,
    marginRight: 6,
  },
  activeFilterTabText: {
    color: 'white',
  },
  countBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  activeCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textDark,
  },
  activeCountText: {
    color: 'white',
  },
  list: {
    paddingBottom: 10,
    paddingVertical: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  statusIcon: {
    fontSize: 10,
    color: 'white',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  mainInfo: {
    marginBottom: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 2,
  },
  serviceType: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 12,
  },
  quickDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 12,
    marginRight: 8,
    width: 16,
  },
  detailText: {
    fontSize: 13,
    color: colors.textLight,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  itemsCount: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500',
  },
  viewButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 150,
    paddingBottom: 120,
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  clearFiltersButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  clearFiltersText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal Styles (keeping existing styles)
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.textLight,
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textLight,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
    flex: 2,
    textAlign: 'right',
  },
  priceText: {
    color: '#059669',
    fontWeight: 'bold',
  },
  itemRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemQuantity: {
    fontSize: 14,
    color: colors.textLight,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
  },
  closeModalButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  closeModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OrdersScreen;