import MapboxGL from '@rnmapbox/maps';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const API_BASE_URL = 'https://freshness-eakm.onrender.com/api';

// Set Mapbox access token
MapboxGL.setAccessToken('pk.eyJ1IjoiaXJhaG96YSIsImEiOiJjbWUya3ZzZWcwbW8xMmtyMmM1bGFwMW8yIn0.9WHhqP1CMroXatCoO1MwHw');

export default function NavigationScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  // Memoize orderObj so it doesn't get recreated every render
  const orderObj = useMemo(() => {
    try {
      return JSON.parse(params.order);
    } catch (error) {
      console.error('Failed to parse order:', error);
      return null;
    }
  }, [params.order]);

  const [currentLocation, setCurrentLocation] = useState(null);
  const [orderStatus, setOrderStatus] = useState('navigating');
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [routeData, setRouteData] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Cannot access location');
        return;
      }

      // Get initial location
      getCurrentLocation();

      // Watch location changes
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          setCurrentLocation({ latitude, longitude });
        }
      );

      return () => subscription.remove();
    })();
  }, []);

  useEffect(() => {
    if (currentLocation && orderObj?.location?.coordinates) {
      const startCoord = [currentLocation.longitude, currentLocation.latitude];
      const endCoord = [orderObj.location.coordinates[0], orderObj.location.coordinates[1]];
      
      setRouteCoordinates([startCoord, endCoord]);
      fetchRoute(startCoord, endCoord);
    }
  }, [currentLocation, orderObj]);

  // Fetch route from Mapbox Directions API
  const fetchRoute = async (start, end) => {
    try {
      const coordinates = `${start[0]},${start[1]};${end[0]},${end[1]}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&access_token=pk.eyJ1IjoiaXJhaG96YSIsImEiOiJjbWUya3ZzZWcwbW8xMmtyMmM1bGFwMW8yIn0.9WHhqP1CMroXatCoO1MwHw`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        setRouteData(data.routes[0]);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  // Set initial status based on order status
  useEffect(() => {
    if (orderObj?.status) {
      const statusMapping = {
        'pending': 'navigating',
        'picked_up': 'pickup',
        'delivered': 'delivery',
        'processing': 'processing',
        'returning': 'returning',
        'completed': 'completed'
      };
      setOrderStatus(statusMapping[orderObj.status] || 'navigating');
    }
  }, [orderObj]);

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 1000,
        timeout: 20000,
      });
      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });
    } catch (error) {
      console.log('Location error:', error);
    }
  };

  const handleCallCustomer = async () => {
    if (!orderObj.phoneNumber) {
      Alert.alert('No phone number', 'Customer phone number not available');
      return;
    }

    let phoneNumber = orderObj.phoneNumber.replace(/[^0-9+]/g, '');
    const hasPlusPrefix = phoneNumber.startsWith('+');
    
    if (!hasPlusPrefix) {
      Alert.alert(
        'Phone Number Format',
        'This appears to be a local number. How should we format it?',
        [
          {
            text: 'Add Country Code',
            onPress: () => {
              Alert.prompt(
                'Enter Country Code',
                'Please enter the country code (e.g., 1 for US, 44 for UK):',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                  {
                    text: 'OK',
                    onPress: (countryCode) => {
                      if (countryCode && /^\d+$/.test(countryCode)) {
                        const internationalNumber = `+${countryCode}${phoneNumber}`;
                        initiateCall(internationalNumber);
                      } else {
                        Alert.alert('Invalid country code', 'Please enter numbers only');
                      }
                    },
                  },
                ],
                'plain-text',
                '',
                'number-pad'
              );
            },
          },
          {
            text: 'Use As Is',
            onPress: () => initiateCall(phoneNumber),
          },
        ]
      );
    } else {
      initiateCall(phoneNumber);
    }
  };

  const initiateCall = async (phoneNumber) => {
    const phoneUrl = `tel:${phoneNumber}`;

    try {
      const supported = await Linking.canOpenURL(phoneUrl);
      
      if (supported) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert(
          'Cannot make call', 
          "Your device doesn't support phone calls",
          [
            { 
              text: 'Copy Number', 
              onPress: () => Clipboard.setStringAsync(phoneNumber) 
            },
            { text: 'OK' }
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Call failed', 
        `Could not call ${phoneNumber}`,
        [
          { 
            text: 'Copy Number', 
            onPress: () => Clipboard.setStringAsync(phoneNumber) 
          },
          { text: 'OK' }
        ]
      );
    }
  };

  // API call to update order status
  const updateOrderStatusInDB = async (newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderObj._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newStatus }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedOrder = await response.json();
      return updatedOrder;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };

  const updateOrderStatus = async (newStatus) => {
    let message = '';
    let dbStatus = '';
    
    switch (newStatus) {
      case 'pickup':
        message = 'Mark as picked up from customer?';
        dbStatus = 'picked_up';
        break;
      case 'delivery':
        message = 'Items picked up. Going to dry cleaner?';
        dbStatus = 'delivered';
        break;
      case 'processing':
        message = 'Items delivered to dry cleaner?';
        dbStatus = 'processing';
        break;
      case 'returning':
        message = 'Items ready. Returning to customer?';
        dbStatus = 'returning';
        break;
      case 'completed':
        message = 'Order completed successfully?';
        dbStatus = 'completed';
        break;
      default:
        return;
    }

    Alert.alert('Update Status', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setIsUpdatingStatus(true);
          try {
            const updatedOrder = await updateOrderStatusInDB(dbStatus);
            setOrderStatus(newStatus);
            
            if (newStatus === 'completed') {
              Alert.alert('Order Completed', 'Great job! Order has been completed successfully.', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } else {
              Alert.alert('Status Updated', 'Order status has been updated successfully.');
            }
          } catch (error) {
            console.error('Error updating status:', error);
            Alert.alert(
              'Update Failed', 
              'Failed to update order status. Please check your connection and try again.',
              [
                {
                  text: 'Retry',
                  onPress: () => updateOrderStatus(newStatus)
                },
                {
                  text: 'Cancel',
                  style: 'cancel'
                }
              ]
            );
          } finally {
            setIsUpdatingStatus(false);
          }
        },
      },
    ]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'navigating': return '#1e40af'; // blue-700
      case 'pickup': return '#2563eb'; // blue-600
      case 'delivery': return '#3b82f6'; // blue-500
      case 'processing': return '#60a5fa'; // blue-400
      case 'returning': return '#2dd4bf'; // teal-400
      case 'completed': return '#10b981'; // emerald-500
      default: return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'navigating': return 'Navigating to Customer';
      case 'pickup': return 'Ready for Pickup';
      case 'delivery': return 'Delivering to Cleaner';
      case 'processing': return 'Items Processing';
      case 'returning': return 'Returning to Customer';
      case 'completed': return 'Completed';
      default: return 'Unknown Status';
    }
  };

  const getNextAction = () => {
    switch (orderStatus) {
      case 'navigating': return { text: 'Arrived - Pickup Items', action: 'pickup' };
      case 'pickup': return { text: 'Items Picked Up', action: 'delivery' };
      case 'delivery': return { text: 'Delivered to Cleaner', action: 'processing' };
      case 'processing': return { text: 'Items Ready - Return', action: 'returning' };
      case 'returning': return { text: 'Order Completed', action: 'completed' };
      default: return { text: 'Update Status', action: 'pickup' };
    }
  };

  if (!orderObj) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: Invalid order data.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentLocation) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <Icon name="location-searching" size={48} color="#3b82f6" />
          <Text style={styles.loadingText}>Finding your location...</Text>
          <Text style={styles.loadingSubtext}>Please wait while we get your GPS coordinates</Text>
        </View>
      </View>
    );
  }

  const nextAction = getNextAction();
  const customerLocation = orderObj.location?.coordinates 
    ? [orderObj.location.coordinates[0], orderObj.location.coordinates[1]]
    : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e40af" />
      
      {/* Enhanced Header with Gradient */}
      <LinearGradient
        colors={['#1e40af', '#2563eb', '#3b82f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          {/* Status Badge */}
          <View style={styles.statusBadgeContainer}>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(orderStatus) }]} />
              <Text style={styles.statusBadgeText}>{getStatusText(orderStatus)}</Text>
            </View>
            <View style={styles.orderIdBadge}>
              <Text style={styles.orderIdText}>#{orderObj.bookingCode || 'N/A'}</Text>
            </View>
          </View>

          {/* Customer Info */}
          <View style={styles.customerInfoContainer}>
            <View style={styles.customerAvatarContainer}>
              <Icon name="person" size={20} color="#bfdbfe" />
            </View>
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>{orderObj.customerName || 'Customer'}</Text>
              <Text style={styles.phoneNumber}>{orderObj.phoneNumber || 'No phone'}</Text>
            </View>
          </View>

          {/* Amount */}
          <View style={styles.amountContainer}>
            <Icon name="account-balance-wallet" size={20} color="#bbf7d0" />
            <View style={styles.amountDetails}>
              <Text style={styles.amountLabel}>Total Amount</Text>
              <Text style={styles.amountValue}>RWF {orderObj.totalAmount?.toLocaleString() || '0'}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Enhanced Map Section */}
      <View style={styles.mapContainer}>
        <MapboxGL.MapView 
          style={styles.map}
          styleURL={MapboxGL.StyleURL.Street}
          zoomEnabled={true}
          scrollEnabled={true}
        >
          <MapboxGL.Camera
            centerCoordinate={[currentLocation.longitude, currentLocation.latitude]}
            zoomLevel={14}
            animationDuration={2000}
          />

          {/* Current location marker */}
          <MapboxGL.PointAnnotation
            id="currentLocation"
            coordinate={[currentLocation.longitude, currentLocation.latitude]}
          >
            <View style={styles.currentLocationMarker}>
              <View style={styles.currentLocationDot} />
            </View>
          </MapboxGL.PointAnnotation>

          {/* Customer location marker */}
          {customerLocation && (
            <MapboxGL.PointAnnotation
              id="customerLocation"
              coordinate={customerLocation}
            >
              <View style={styles.customerLocationMarker}>
                <Icon name="location-on" size={30} color="#dc2626" />
              </View>
            </MapboxGL.PointAnnotation>
          )}

          {/* Route line */}
          {routeData && (
            <MapboxGL.ShapeSource 
              id="routeSource" 
              shape={routeData.geometry}
            >
              <MapboxGL.LineLayer
                id="routeLine"
                style={{
                  lineColor: '#3b82f6',
                  lineWidth: 4,
                  lineOpacity: 0.8,
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          <MapboxGL.UserLocation 
            visible={true}
            showsUserHeadingIndicator={true}
          />
        </MapboxGL.MapView>

        {/* Floating Call Button */}
        {orderStatus === 'navigating' && (
          <TouchableOpacity
            style={styles.floatingCallButton}
            onPress={handleCallCustomer}
          >
            <Icon name="phone" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Enhanced Content Section */}
      <ScrollView style={styles.detailsScrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.detailsContainer}>
          {/* Order Details Card */}
          <View style={styles.modernCard}>
            <View style={styles.cardHeader}>
              <Icon name="location-on" size={20} color="#3b82f6" />
              <Text style={styles.cardTitle}>Order Details</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.modernDetailRow}>
                <View style={styles.iconContainer}>
                  <Icon name="location-on" size={16} color="#3b82f6" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Delivery Address</Text>
                  <Text style={styles.detailText}>{orderObj.address || 'No address'}</Text>
                  {orderObj.location?.coordinates && (
                    <Text style={styles.coordinatesText}>
                      {orderObj.location.coordinates[1]?.toFixed(6)}, {orderObj.location.coordinates[0]?.toFixed(6)}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.modernDetailRow}>
                <View style={styles.iconContainer}>
                  <Icon name="schedule" size={16} color="#3b82f6" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Pickup Date & Time</Text>
                  <Text style={styles.detailText}>
                    {new Date(orderObj.pickupDate).toLocaleDateString()} •{' '}
                    {new Date(orderObj.pickupTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </Text>
                </View>
              </View>

              <View style={styles.modernDetailRow}>
                <View style={styles.iconContainer}>
                  <Icon name="local-shipping" size={16} color="#3b82f6" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Service Type</Text>
                  <Text style={styles.detailText}>{orderObj.serviceType || 'Standard Service'}</Text>
                  <Text style={styles.deliveryOptionText}>{orderObj.deliveryOption || 'Standard'}</Text>
                </View>
              </View>

              {orderObj.instructions && (
                <View style={styles.modernDetailRow}>
                  <View style={styles.iconContainer}>
                    <Icon name="info" size={16} color="#3b82f6" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Special Instructions</Text>
                    <Text style={styles.detailText}>{orderObj.instructions}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Clothing Items Card */}
          <View style={styles.modernCard}>
            <View style={styles.cardHeader}>
              <Icon name="checkroom" size={20} color="#3b82f6" />
              <Text style={styles.cardTitle}>Clothing Items</Text>
              <View style={styles.itemCountBadge}>
                <Text style={styles.itemCountText}>{orderObj.clothingItems?.length || 0}</Text>
              </View>
            </View>
            <View style={styles.cardContent}>
              {orderObj.clothingItems?.length > 0 ? (
                orderObj.clothingItems.map((item, index) => (
                  <View key={index} style={styles.itemCard}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                    </View>
                    <View style={styles.itemPricing}>
                      <Text style={styles.itemTotal}>RWF {(item.quantity * item.price)?.toLocaleString()}</Text>
                      <Text style={styles.itemPrice}>@ RWF {item.price?.toLocaleString()}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noItemsContainer}>
                  <Icon name="inventory" size={32} color="#cbd5e1" />
                  <Text style={styles.noItemsText}>No items listed</Text>
                </View>
              )}
              
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalAmount}>RWF {orderObj.totalAmount?.toLocaleString() || '0'}</Text>
              </View>
            </View>
          </View>

          {/* Payment Information Card */}
          <View style={styles.modernCard}>
            <View style={styles.cardHeader}>
              <Icon name="payment" size={20} color="#3b82f6" />
              <Text style={styles.cardTitle}>Payment Information</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payment Method</Text>
                <Text style={styles.paymentValue}>{orderObj.payment?.method || 'Unknown'}</Text>
              </View>
              
              {orderObj.payment?.details?.phoneNumber && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Phone Number</Text>
                  <Text style={styles.paymentValue}>{orderObj.payment.details.phoneNumber}</Text>
                </View>
              )}
              
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payment Status</Text>
                <View style={[
                  styles.statusChip, 
                  { backgroundColor: orderObj.status === 'completed' ? '#dcfce7' : '#fef3c7' }
                ]}>
                  <Text style={[
                    styles.statusChipText,
                    { color: orderObj.status === 'completed' ? '#166534' : '#92400e' }
                  ]}>
                    {orderObj.status === 'completed' ? 'Paid' : 'Pending'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Order Metadata */}
          <View style={styles.modernCard}>
            <View style={styles.cardHeader}>
              <Icon name="info-outline" size={20} color="#3b82f6" />
              <Text style={styles.cardTitle}>Order Information</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.modernDetailRow}>
                <View style={styles.iconContainer}>
                  <Icon name="calendar-today" size={16} color="#3b82f6" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Created At</Text>
                  <Text style={styles.detailText}>
                    {new Date(orderObj.createdAt).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Enhanced Action Container */}
      <View style={styles.actionContainer}>
        <LinearGradient
          colors={['#ffffff', '#f8fafc']}
          style={styles.actionGradient}
        >
          <View style={styles.actionButtons}>
            {orderStatus === 'navigating' && (
              <TouchableOpacity
                style={styles.secondaryActionButton}
                onPress={handleCallCustomer}
                disabled={isUpdatingStatus}
              >
                <Icon name="phone" size={20} color="#3b82f6" />
                <Text style={styles.secondaryButtonText}>Call Customer</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.primaryActionButton, 
                { 
                  backgroundColor: isUpdatingStatus ? '#cbd5e1' : getStatusColor(orderStatus),
                  opacity: isUpdatingStatus ? 0.7 : 1
                }
              ]}
              onPress={() => updateOrderStatus(nextAction.action)}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <Icon name="hourglass-empty" size={20} color="#fff" />
              ) : (
                <Icon name="check-circle" size={20} color="#fff" />
              )}
              <Text style={styles.primaryButtonText}>
                {isUpdatingStatus ? 'Updating...' : nextAction.text}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 20,
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 100,
    textAlign: 'center',
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '500',
  },
  backButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    alignSelf: 'center',
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  headerContent: {
    maxWidth: '100%',
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#dbeafe',
  },
  orderIdBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  orderIdText: {
    fontSize: 12,
    color: '#bfdbfe',
    fontWeight: '500',
  },
  customerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerAvatarContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 8,
    marginRight: 12,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  phoneNumber: {
    fontSize: 14,
    color: '#bfdbfe',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 12,
  },
  amountDetails: {
    marginLeft: 8,
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: '#bfdbfe',
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#bbf7d0',
  },
  mapContainer: {
    height: height * 0.35,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  currentLocationMarker: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    borderWidth: 3,
    borderColor: '#fff',
  },
  customerLocationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCallButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 24,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  detailsScrollContainer: {
    flex: 1,
  },
  detailsContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  modernCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
    flex: 1,
  },
  itemCountBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  itemCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  cardContent: {
    padding: 16,
  },
  modernDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 8,
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  deliveryOptionText: {
    fontSize: 14,
    color: '#3b82f6',
    marginTop: 2,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  itemCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 13,
    color: '#64748b',
  },
  itemPricing: {
    alignItems: 'flex-end',
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  itemPrice: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  noItemsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noItemsText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  paymentValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  actionGradient: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  secondaryButtonText: {
    marginLeft: 8,
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    marginLeft: 8,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});