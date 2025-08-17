import colors from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
const { width } = Dimensions.get('window');
    const baseURL = Platform.OS === 'android' 
  ? 'https://freshness-eakm.onrender.com/api' 
  : 'http://192.168.1.67:5000/api';

export default function OrderHistory() {
  const [activeFilter, setActiveFilter] = useState('All Order');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  
  const router = useRouter();

  const filters = ['All Order', 'New Order', 'Completed', 'Cancelled'];

  const fetchOrders = async () => {
    try {
      const phone = await AsyncStorage.getItem('userPhone');
      if (!phone) return;

      const res = await axios.get(`${baseURL}/customer/${phone}`);
      const transformedOrders = res.data.map(order => {
        // Format date
        const pickupDate = new Date(order.pickupDate);
        const formattedDate = pickupDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
        // Format time
        const pickupTime = new Date(order.pickupTime);
        const formattedTime = pickupTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });

        // Calculate total amount from clothing items
        const calculatedTotal = order.clothingItems?.reduce((total, item) => {
          return total + (item.price * item.quantity);
        }, 0) || 0;

        // Use provided totalAmount or fall back to calculated amount
        const totalAmount = order.payment?.totalAmount || calculatedTotal;

        // Map database status directly to display status
        let status, statusColor, statusBg, canCancel;
        
        switch(order.status) {
          case 'completed':
            status = 'Completed';
            statusColor = '#10B981';
            statusBg = '#D1FAE5';
            canCancel = false;
            break;
          case 'cancelled':
            status = 'cancelled';
            statusColor = '#EF4444';
            statusBg = '#FEE2E2';
            canCancel = false;
            break;
          case 'pending':
          default:
            status = 'New Order';
            statusColor = '#F59E0B';
            statusBg = '#FEF3C7';
            canCancel = true;
            break;
        }

        return {
          id: order._id,
          status: status,
          dbStatus: order.status || 'pending', // Keep original DB status for filtering
          date: formattedDate,
          service: order.serviceType || 'Laundry Service',
          location: order.address || 'Unknown Location',
          amount: `RWF ${totalAmount.toLocaleString()}`,
          time: formattedTime,
          statusColor: statusColor,
          statusBg: statusBg,
          icon: getServiceIcon(order.serviceType),
          canCancel: canCancel,
          details: {
            items: order.clothingItems?.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: `RWF ${(item.price * item.quantity).toLocaleString()}`,
              unitPrice: `RWF ${item.price.toLocaleString()}`
            })) || [],
            paymentMethod: order.payment?.method || 'Mobile Money',
            deliveryType: order.deliveryOption || 'Standard',
            notes: order.instructions || 'No special instructions',
            totalAmount: `RWF ${totalAmount.toLocaleString()}`
          }
        };
      });
      
      setOrders(transformedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        {
          text: 'No, Keep Order',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancellingOrder(orderId);
              
              // API call to cancel order
              const response = await axios.put(`${baseURL}/orders/${orderId}/cancel`);
              
              if (response.data.success) {
                Alert.alert('Success', 'Order has been canceled successfully');
                // Refresh orders list
                fetchOrders();
              } else {
                Alert.alert('Error', response.data.message || 'Failed to cancel order');
              }
            } catch (error) {
              console.error('Cancel order error:', error);
              Alert.alert('Error', 'Failed to cancel order. Please try again.');
            } finally {
              setCancellingOrder(null);
            }
          },
        },
      ]
    );
  };

  const getServiceIcon = (serviceType) => {
    switch(serviceType) {
      case 'Wash & Fold': return 'local-laundry-service';
      case 'Dry Cleaning': return 'dry-cleaning';
      case 'Ironing Only': return 'iron';
      default: return 'local-laundry-service';
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Fixed filtering logic to match database status with filter categories
  const filteredOrders = activeFilter === 'All Order' 
    ? orders 
    : orders.filter(order => {
        switch (activeFilter) {
          case 'New Order':
            // Show orders that are pending (new orders that haven't been completed or cancelled)
            return order.dbStatus === 'pending' || !order.dbStatus;
          case 'Completed':
            // Show orders with completed status
            return order.dbStatus === 'completed';
          case 'Cancelled':
            // Show orders with cancelled status
            return order.dbStatus === 'cancelled';
          default:
            return true;
        }
      });

  const getFilterButtonStyle = (filter) => (
    activeFilter === filter ? styles.activeFilterButton : styles.filterButton
  );

  const getFilterTextStyle = (filter) => (
    activeFilter === filter ? styles.activeFilterText : styles.filterText
  );

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedOrder(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>
          <Text style={styles.headerTitle}>My Order History</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <View style={styles.filterRow}>
            {filters.slice(0, 2).map((filter) => (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={getFilterButtonStyle(filter)}
                activeOpacity={0.8}
              >
                <Text style={getFilterTextStyle(filter)}>{filter}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.filterRow}>
            {filters.slice(2).map((filter) => (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={getFilterButtonStyle(filter)}
                activeOpacity={0.8}
              >
                <Text style={getFilterTextStyle(filter)}>{filter}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Loading Indicator */}
        {loading ? (
          <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Order Cards */}
            <View style={styles.cardsContainer}>
              {filteredOrders.map((order) => (
                <View key={order.id} style={styles.card}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: order.statusBg }]}>
                      <Text style={[styles.statusText, { color: order.statusColor }]}>
                        {order.status}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>{order.date}</Text>
                  </View>
      
                  {/* Service Info */}
                  <View style={styles.serviceSection}>
                    <View style={styles.serviceRow}>
                      <View style={styles.iconContainer}>
                        <Icon name={order.icon} size={20} color="#3B82F6" />
                      </View>
                      <View style={styles.serviceInfo}>
                        <Text style={styles.serviceTitle}>{order.service}</Text>
                      </View>
                    </View>

                    <View style={styles.detailsContainer}>
                      <View style={styles.detailRow}>
                        <View style={styles.detailIconContainer}>
                          <Icon name="location-on" size={16} color="#10B981" />
                        </View>
                        <Text style={styles.detailText}>{order.location}</Text>
                      </View>

                      <View style={styles.bottomRow}>
                        <View style={styles.timeContainer}>
                          <View style={styles.detailIconContainer}>
                            <Icon name="access-time" size={16} color="#8B5CF6" />
                          </View>
                          <Text style={styles.detailText}>{order.time}</Text>
                        </View>
                        
                        <View style={styles.amountContainer}>
                          <View style={styles.detailIconContainer}>
                            <Icon name="payment" size={16} color="#059669" />
                          </View>
                          <Text style={styles.amountText}>{order.amount}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Action Container */}
                  <View style={styles.actionContainer}>
                    <TouchableOpacity 
                      style={styles.actionButton} 
                      activeOpacity={0.8}
                      onPress={() => openOrderDetails(order)}
                    >
                      <Text style={styles.actionButtonText}>View Details</Text>
                      <Icon name="chevron-right" size={20} color="#6B7280" />
                    </TouchableOpacity>
                    
                    {/* Cancel Button - Only show for orders that can be canceled */}
                    {order.canCancel && (
                      <TouchableOpacity 
                        style={styles.cancelButton} 
                        activeOpacity={0.8}
                        onPress={() => handleCancelOrder(order.id)}
                        disabled={cancellingOrder === order.id}
                      >
                        {cancellingOrder === order.id ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <>
                            <Icon name="cancel" size={18} color="#EF4444" />
                            <Text style={styles.cancelButtonText}>Cancel Order</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
            
            {/* Empty State */}
            {filteredOrders.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Icon name="receipt-long" size={48} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>No orders found</Text>
                <Text style={styles.emptySubtitle}>Your {activeFilter.toLowerCase()} history will appear here</Text>
              </View>
            )}
          </>
        )}
        
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Order Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedOrder && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Order Details</Text>
                  <TouchableOpacity onPress={closeModal}>
                    <Icon name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Order Summary</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Order ID:</Text>
                      <Text style={styles.detailValue}>#{selectedOrder.id.substring(0, 8)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <View style={[styles.statusBadge, { backgroundColor: selectedOrder.statusBg }]}>
                        <Text style={[styles.statusText, { color: selectedOrder.statusColor }]}>
                          {selectedOrder.status}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date:</Text>
                      <Text style={styles.detailValue}>{selectedOrder.date} at {selectedOrder.time}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Service:</Text>
                      <Text style={styles.detailValue}>{selectedOrder.service}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Location:</Text>
                      <Text style={styles.detailValue}>{selectedOrder.location}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total Amount:</Text>
                      <Text style={[styles.detailValue, { fontWeight: 'bold' }]}>{selectedOrder.details.totalAmount}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Items</Text>
                    {selectedOrder.details.items.map((item, index) => (
                      <View key={index} style={styles.itemRow}>
                        <View style={{ flex: 2 }}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.itemUnitPrice}>{item.unitPrice} each</Text>
                        </View>
                        <View style={styles.itemDetails}>
                          <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                          <Text style={styles.itemPrice}>{item.price}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Payment & Delivery</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Payment Method:</Text>
                      <Text style={styles.detailValue}>{selectedOrder.details.paymentMethod}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Delivery Type:</Text>
                      <Text style={styles.detailValue}>{selectedOrder.details.deliveryType}</Text>
                    </View>
                  </View>

                  {selectedOrder.details.notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Notes</Text>
                      <Text style={styles.notesText}>{selectedOrder.details.notes}</Text>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalButtonContainer}>
                  {selectedOrder.canCancel && (
                    <TouchableOpacity 
                      style={styles.modalCancelButton}
                      onPress={() => {
                        closeModal();
                        handleCancelOrder(selectedOrder.id);
                      }}
                      disabled={cancellingOrder === selectedOrder.id}
                    >
                      {cancellingOrder === selectedOrder.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Text style={styles.modalCancelButtonText}>Cancel Order</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity 
                    style={[styles.modalCloseButton, { flex: selectedOrder.canCancel ? 1 : 0 }]}
                    onPress={closeModal}
                  >
                    <Text style={styles.modalCloseButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
  },
backButton: {
  position: 'absolute',
  left: 16,
  top: 0,
  marginBottom:40,
  padding: 10,
  zIndex: 10,
  backgroundColor: colors.accent, // Use your accent color
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginHorizontal:50,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeFilterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    marginHorizontal: 6,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  filterText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeFilterText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardsContainer: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  serviceSection: {
    paddingHorizontal: 20,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  detailsContainer: {
    paddingLeft: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '700',
  },
  actionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 8,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginRight: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 20,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  detailSection: {
    marginTop: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemName: {
    fontSize: 14,
    color: '#1E293B',
  },
  itemUnitPrice: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#64748B',
    marginRight: 10,
  },
  itemPrice: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  notesText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  modalCancelButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
  },
  modalCancelButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCloseButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});