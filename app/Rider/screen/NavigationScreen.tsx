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
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

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
      // Map database status to local status
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
    
    // If no international prefix, assume it's local format
    if (!hasPlusPrefix) {
      Alert.alert(
        'Phone Number Format',
        'This appears to be a local number. How should we format it?',
        [
          {
            text: 'Add Country Code',
            onPress: () => {
              // Prompt user to enter country code
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
      // Number already has international format
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
            // Update status in database
            const updatedOrder = await updateOrderStatusInDB(dbStatus);
            
            // Update local state
            setOrderStatus(newStatus);
            
            if (newStatus === 'completed') {
              Alert.alert('Order Completed', 'Great job! Order has been completed successfully.', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } else {
              // Show success message for other status updates
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
      case 'navigating': return '#2196F3';
      case 'pickup': return '#FF9800';
      case 'delivery': return '#9C27B0';
      case 'processing': return '#607D8B';
      case 'returning': return '#4CAF50';
      case 'completed': return '#22C55E';
      default: return '#666';
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
        <Text style={styles.loadingText}>Loading your location...</Text>
      </View>
    );
  }

  const nextAction = getNextAction();
  const customerLocation = orderObj.location?.coordinates 
    ? [orderObj.location.coordinates[0], orderObj.location.coordinates[1]]
    : null;

  return (
    <View style={styles.container}>
      {/* Header with Order Info */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.customerName}>{orderObj.customerName || 'Customer'}</Text>
          <Text style={styles.orderAmount}>RWF {orderObj.totalAmount?.toLocaleString() || '0'}</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(orderStatus) }]} />
            <Text style={styles.statusText}>{getStatusText(orderStatus)}</Text>
          </View>
          <Text style={styles.orderId}>Order ID: {orderObj.bookingCode || 'N/A'}</Text>
          <Text style={styles.phoneNumber}>{orderObj.phoneNumber || 'No phone'}</Text>
        </View>
      </View>

      {/* Mapbox Map Section */}
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
                <Icon name="location-on" size={30} color="#FF5722" />
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
                  lineColor: '#2196F3',
                  lineWidth: 4,
                  lineOpacity: 0.8,
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          {/* User location indicator */}
          <MapboxGL.UserLocation 
            visible={true}
            showsUserHeadingIndicator={true}
          />
        </MapboxGL.MapView>
      </View>

      {/* Order Details Section */}
      <ScrollView style={styles.detailsScrollContainer}>
        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Order Details</Text>

          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Icon name="location-on" size={20} color="#666" style={styles.detailIcon} />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Delivery Address</Text>
                <Text style={styles.detailText}>{orderObj.address || 'No address'}</Text>
                {orderObj.location?.coordinates && (
                  <Text style={styles.coordinatesText}>
                    {orderObj.location.coordinates[1]?.toFixed(6)}, {orderObj.location.coordinates[0]?.toFixed(6)}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.detailRow}>
              <Icon name="schedule" size={20} color="#666" style={styles.detailIcon} />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Pickup Date & Time</Text>
                <Text style={styles.detailText}>
                  {new Date(orderObj.pickupDate).toLocaleDateString()} •{' '}
                  {new Date(orderObj.pickupTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Icon name="local-shipping" size={20} color="#666" style={styles.detailIcon} />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Delivery Option</Text>
                <Text style={styles.detailText}>{orderObj.deliveryOption || 'Standard'}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Icon name="cleaning-services" size={20} color="#666" style={styles.detailIcon} />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Service Type</Text>
                <Text style={styles.detailText}>{orderObj.serviceType || 'Standard Service'}</Text>
              </View>
            </View>

            {orderObj.instructions && (
              <View style={styles.detailRow}>
                <Icon name="info" size={20} color="#666" style={styles.detailIcon} />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Special Instructions</Text>
                  <Text style={styles.detailText}>{orderObj.instructions}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Clothing Items Section */}
          <View style={styles.itemsCard}>
            <Text style={styles.sectionTitle}>Clothing Items ({orderObj.clothingItems?.length || 0})</Text>
            {orderObj.clothingItems?.length > 0 ? (
              orderObj.clothingItems.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.bullet}>•</Text>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemQuantityPrice}>
                      {item.quantity} × RWF {item.price?.toLocaleString()} = RWF {(item.quantity * item.price)?.toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noItemsText}>No items listed.</Text>
            )}
            <View style={styles.totalAmountContainer}>
              <Text style={styles.totalAmountLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>RWF {orderObj.totalAmount?.toLocaleString() || '0'}</Text>
            </View>
          </View>

          {/* Payment Information */}
          <View style={styles.paymentCard}>
            <Text style={styles.sectionTitle}>Payment Information</Text>
            <View style={styles.detailRow}>
              <Icon name="payment" size={20} color="#666" style={styles.detailIcon} />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Payment Method</Text>
                <Text style={styles.detailText}>{orderObj.payment?.method || 'Unknown'}</Text>
              </View>
            </View>
            
            {orderObj.payment?.details?.phoneNumber && (
              <View style={styles.detailRow}>
                <Icon name="phone" size={20} color="#666" style={styles.detailIcon} />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Payment Phone</Text>
                  <Text style={styles.detailText}>{orderObj.payment.details.phoneNumber}</Text>
                </View>
              </View>
            )}
            
            <View style={styles.detailRow}>
              <Icon name="check-circle" size={20} color="#666" style={styles.detailIcon} />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Payment Status</Text>
                <Text style={[styles.detailText, { color: orderObj.status === 'completed' ? '#4CAF50' : '#FF5722' }]}>
                  {orderObj.status === 'completed' ? 'Paid' : 'Pending'}
                </Text>
              </View>
            </View>
          </View>

          {/* Order Metadata */}
          <View style={styles.metaCard}>
            <Text style={styles.sectionTitle}>Order Information</Text>
            <View style={styles.detailRow}>
              <Icon name="calendar-today" size={20} color="#666" style={styles.detailIcon} />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Created At</Text>
                <Text style={styles.detailText}>
                  {new Date(orderObj.createdAt).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons Section */}
      <View style={styles.actionContainer}>
        {orderStatus === 'navigating' && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleCallCustomer}
            disabled={isUpdatingStatus}
          >
            <Icon name="phone" size={24} color="#4CAF50" />
            <Text style={styles.secondaryButtonText}>Call Customer</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.primaryButton, 
            { 
              backgroundColor: isUpdatingStatus ? '#ccc' : getStatusColor(orderStatus),
              opacity: isUpdatingStatus ? 0.7 : 1
            }
          ]}
          onPress={() => updateOrderStatus(nextAction.action)}
          disabled={isUpdatingStatus}
        >
          {isUpdatingStatus ? (
            <Icon name="hourglass-empty" size={24} color="#fff" />
          ) : (
            <Icon name="check-circle" size={24} color="#fff" />
          )}
          <Text style={styles.primaryButtonText}>
            {isUpdatingStatus ? 'Updating...' : nextAction.text}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBlockStart: 2,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 100,
    textAlign: 'center',
    color: 'red',
    fontSize: 16,
  },
  backButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    alignSelf: 'center',
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  headerContent: {
    maxWidth: '100%',
  },
  customerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  phoneNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  mapContainer: {
    height: height * 0.35,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    backgroundColor: '#2196F3',
    borderWidth: 2,
    borderColor: '#fff',
  },
  customerLocationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsScrollContainer: {
    flex: 1,
  },
  detailsContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  itemsCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  metaCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    marginRight: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  detailText: {
    fontSize: 15,
    color: '#555',
  },
  coordinatesText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    marginRight: 10,
    fontSize: 16,
    color: '#666',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    color: '#444',
    fontWeight: '500',
  },
  itemQuantityPrice: {
    fontSize: 13,
    color: '#666',
  },
  noItemsText: {
    fontSize: 15,
    color: '#888',
    fontStyle: 'italic',
  },
  totalAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  actionContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
    marginLeft: 10,
  },
  primaryButtonText: {
    marginLeft: 10,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    marginLeft: 8,
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 14,
  },
});