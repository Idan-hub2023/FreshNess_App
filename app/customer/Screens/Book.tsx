
import colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import Mapbox from '@rnmapbox/maps';
import axios from 'axios';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Initialize Mapbox (put your access token here)
Mapbox.setAccessToken('pk.eyJ1IjoiaXJhaG96YSIsImEiOiJjbWUya3ZzZWcwbW8xMmtyMmM1bGFwMW8yIn0.9WHhqP1CMroXatCoO1MwHw');

const baseURL = 'https://freshness-eakm.onrender.com/api';

export default function BookLaundryPickup() {
  // State declarations
  const [serviceType, setServiceType] = useState('Wash & Fold');
  const [deliveryOption, setDeliveryOption] = useState('Next Day');
  const [paymentMethod, setPaymentMethod] = useState('MTN MoMo');
  const [pickupDate, setPickupDate] = useState(new Date());
  const [pickupTime, setPickupTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [clothingItems, setClothingItems] = useState({});
  const [availableItems, setAvailableItems] = useState([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [confirmedLocation, setConfirmedLocation] = useState(null);
  const [mapCamera, setMapCamera] = useState({
    centerCoordinate: [29.6326, -1.5084],
    zoomLevel: 12,
  });

  const router = useRouter();
  const SERVICE_PRICE_KEYS = {
    'Wash & Fold': 'washAndFold',
    'Ironing Only': 'ironOnly',
    'Dry Cleaning': 'dryCleaning',
    'Wash & Iron': 'washAndIron'
  };

  const getItemPrice = (item) => {
    try {
      if (!item || typeof item !== 'object') return 0;
      const priceKey = SERVICE_PRICE_KEYS[serviceType];
      if (!priceKey || !item.prices) return 0;
      return Number(item.prices[priceKey]) || 0;
    } catch (error) {
      console.error('Error getting item price:', error);
      return 0;
    }
  };

  const calculateTotal = () => {
    try {
      return Object.entries(clothingItems).reduce((total, [itemId, quantity]) => {
        const item = availableItems.find(i => i?._id === itemId || i?.id === itemId);
        if (!item || !quantity) return total;
        const itemPrice = getItemPrice(item);
        return total + (itemPrice * (quantity || 0));
      }, 0);
    } catch (error) {
      console.error('Error calculating total:', error);
      return 0;
    }
  };

  const getTotalItems = () => {
    try {
      return Object.values(clothingItems).reduce((total, quantity) => 
        total + (quantity || 0), 0);
    } catch (error) {
      console.error('Error counting items:', error);
      return 0;
    }
  };

  const formatPrice = (price) => {
    try {
      return (price || 0).toLocaleString();
    } catch {
      return '0';
    }
  };

  const loadItems = async () => {
    setItemsLoading(true);
    try {
      const response = await axios.get(`${baseURL}/items`);
      setAvailableItems(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load items:', error);
      Alert.alert('Error', 'Failed to load clothing items. Please try again later.');
      setAvailableItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          setMapCamera({
            centerCoordinate: [location.coords.longitude, location.coords.latitude],
            zoomLevel: 14,
          });
        }
      } catch (error) {
        console.log('Location error:', error);
      }
    })();
  }, []);

  const updateClothingQuantity = (itemId, quantity) => {
    setClothingItems(prev => ({
      ...prev,
      [itemId]: quantity > 0 ? quantity : undefined
    }));
  };

  const handleDateChange = (_, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setPickupDate(selectedDate);
  };

  const handleTimeChange = (_, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) setPickupTime(selectedTime);
  };

  const confirmMapLocation = async () => {
    if (selectedLocation) {
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: selectedLocation[1],
          longitude: selectedLocation[0]
        });
        
        if (reverseGeocode[0]) {
          const { 
            street, 
            streetNumber,
            sector, 
            district, 
            city, 
            region, 
            subregion,
            name,
            formattedAddress 
          } = reverseGeocode[0];
          
          // Create an array of non-empty address components
          const addressComponents = [
            street && streetNumber ? `${street} ${streetNumber}` : street,
            name,
            sector, // This often contains landmark or place names
            district,
            subregion, // This might contain more specific location info
            city,
            region
          ].filter(component => component && component.trim() !== '');
          
          // Remove duplicates while preserving order
          const uniqueComponents = [...new Set(addressComponents)];
          
          // Format the final address
          let formattedAddr = '';
          if (uniqueComponents.length > 0) {
            formattedAddr = uniqueComponents.join(', ');
          } else if (formattedAddress) {
            // Fallback to the system's formatted address if available
            formattedAddr = formattedAddress;
          } else {
            // Last resort: use coordinates
            formattedAddr = `Lat: ${selectedLocation[1].toFixed(6)}, Lng: ${selectedLocation[0].toFixed(6)}`;
          }
          
          // Additional cleanup: remove multiple commas and trim
          formattedAddr = formattedAddr
            .replace(/,\s*,/g, ',')  // Remove double commas
            .replace(/^,\s*|,\s*$/g, '')  // Remove leading/trailing commas
            .trim();
          
          // If still empty or just commas, use a default format
          if (!formattedAddr || formattedAddr === ',' || formattedAddr.match(/^[,\s]*$/)) {
            formattedAddr = `Location near ${region || 'Rwanda'} (${selectedLocation[1].toFixed(4)}, ${selectedLocation[0].toFixed(4)})`;
          }
          
          setAddress(formattedAddr);
          setConfirmedLocation({
            latitude: selectedLocation[1],
            longitude: selectedLocation[0]
          });
          
          console.log('Reverse geocode result:', reverseGeocode[0]);
          console.log('Formatted address:', formattedAddr);
        }
        setShowMapModal(false);
      } catch (error) {
        console.error('Reverse geocoding error:', error);
        
        // Fallback: create address from coordinates
        const fallbackAddress = `Location: ${selectedLocation[1].toFixed(4)}, ${selectedLocation[0].toFixed(4)}`;
        setAddress(fallbackAddress);
        setConfirmedLocation({
          latitude: selectedLocation[1],
          longitude: selectedLocation[0]
        });
        
        Alert.alert('Location Selected', 'Address details could not be retrieved, but location has been saved.');
        setShowMapModal(false);
      }
    }
  };

  const validateForm = () => {
    if (!customerName.trim()) {
      Alert.alert('Name Required', 'Please enter your full name');
      return false;
    }
    if (!phoneNumber.trim()) {
      Alert.alert('Phone Required', 'Please enter your phone number');
      return false;
    }
    if (!address.trim() || !confirmedLocation) {
      Alert.alert('Location Required', 'Please select your pickup location on the map');
      return false;
    }
    if (getTotalItems() === 0) {
      Alert.alert('Items Required', 'Please select at least one clothing item');
      return false;
    }
    return true;
  };

  const handleBooking = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Get token and userId from storage
      const token = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');

      if (!token || !userId) {
        Alert.alert('Error', 'You need to login first');
        return;
      }

      const geoLocation = confirmedLocation ? {
        type: 'Point',
        coordinates: [confirmedLocation.longitude, confirmedLocation.latitude],
        address: address
      } : null;

      // Map frontend payment methods to backend expected values
      const paymentMethodMapping = {
        'MTN MoMo': 'mtn momo',
        'Airtel Money': 'airtel money', 
        'Visa/Mastercard': 'card',
        'Cash on Delivery': 'cash'
      };

      const mappedPaymentMethod = paymentMethodMapping[paymentMethod] || paymentMethod.toLowerCase();

      const formattedPickupDate = new Date(pickupDate).toISOString();
      const formattedPickupTime = new Date(pickupTime).toISOString();

      const preparedClothingItems = Object.entries(clothingItems)
        .filter(([_, quantity]) => quantity > 0)
        .map(([itemId, quantity]) => {
          const item = availableItems.find(item =>
            item._id?.toString() === itemId ||
            item.id?.toString() === itemId
          );
          if (!item) {
            throw new Error(`Item with ID ${itemId} not found`);
          }

          const priceKey = SERVICE_PRICE_KEYS[serviceType];
          const itemPrice = item.prices?.[priceKey] || item.price;

          return {
            itemId: item._id?.toString() || item.id?.toString(),
            name: item.name,
            quantity: Number(quantity),
            price: Number(itemPrice),
            serviceType: serviceType,
            category: item.category || 'General'
          };
        });

      const bookingData = {
        userId,
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        serviceType,
        clothingItems: preparedClothingItems,
        pickupDate: formattedPickupDate,
        pickupTime: formattedPickupTime,
        deliveryOption,
        address: address.trim(),
        location: geoLocation,
        instructions: instructions.trim(),
        paymentMethod: mappedPaymentMethod  // Use mapped value
      };

      console.log('Submitting booking:', bookingData);

      const response = await axios.post(`${baseURL}/add/booking`, bookingData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 15000,
      });

      // Handle different response scenarios
      if (response.data.success) {
        const { bookingId, bookingCode, paymentLink, assignedRider } = response.data;
        
        const selectedItems = preparedClothingItems
          .map(item => `${item.name}: ${item.quantity}`)
          .join(', ');

        let alertMessage = `Booking ID: ${bookingCode || bookingId}\n\nService: ${serviceType}\nItems: ${selectedItems}\nTotal: RWF ${formatPrice(calculateTotal())}\nPickup: ${pickupDate.toLocaleDateString()} at ${pickupTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        
        if (assignedRider) {
          alertMessage += `\n\nRider: ${assignedRider.name}\nPhone: ${assignedRider.phone}`;
        }

        if (paymentLink) {
          Alert.alert(
            'Booking Created - Payment Required',
            alertMessage + '\n\nPlease complete payment to confirm your booking.',
            [
              { 
                text: 'Pay Now', 
                onPress: () => {
                  Linking.openURL(paymentLink).catch(err => {
                    console.error('Failed to open payment link:', err);
                    Alert.alert('Error', 'Could not open payment link. Please try again.');
                  });
                  resetForm();
                }
              },
              { 
                text: 'Pay Later', 
                style: 'cancel',
                onPress: resetForm 
              }
            ]
          );
        } else {
          Alert.alert(
            'Booking Confirmed',
            alertMessage + '\n\nYou will receive a confirmation call shortly.',
            [{ text: 'OK', onPress: resetForm }]
          );
        }
      } else {
        throw new Error(response.data.message || 'Booking creation failed');
      }

    } catch (error) {
      console.error('Full booking error:', error);
      let errorMessage = 'Booking failed. Please try again.';

      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
        console.error('Server response:', error.response.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
        errorMessage = 'No response from server. Check your connection.';
      } else {
        console.error('Error:', error.message);
      }

      Alert.alert('Booking Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setPhoneNumber('');
    setAddress('');
    setInstructions('');
    setClothingItems({});
    setConfirmedLocation(null);
    setSelectedLocation(null);
    setPickupDate(new Date());
    setPickupTime(new Date());
  };

  // UI Components
  const OptionButton = ({ value, selected, setter, icon }) => (
    <TouchableOpacity 
      style={[styles.option, selected && styles.optionSelected]}
      onPress={() => setter(value)}
    >
      <Ionicons name={icon} size={20} color={selected ? colors.primary : colors.textLight} />
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{value}</Text>
    </TouchableOpacity>
  );

  const ClothingItem = ({ item }) => {
    if (!item) return null;
    
    const itemId = item._id || item.id;
    const quantity = clothingItems[itemId] || 0;
    const adjustedPrice = getItemPrice(item);
    const originalPrice = item.price;

    return (
      <View style={styles.clothingItem}>
        <View style={styles.clothingItemLeft}>
          <Ionicons name="shirt-outline" size={24} color={colors.primary} />
          <View style={styles.clothingItemInfo}>
            <Text style={styles.clothingItemName}>{item.name || 'Unknown Item'}</Text>
            <Text style={styles.clothingItemPrice}>
              RWF {formatPrice(adjustedPrice)}
            </Text>
            {originalPrice && adjustedPrice !== originalPrice && (
              <Text style={styles.originalPrice}>
                Original: RWF {formatPrice(originalPrice)}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.quantityContainer}>
          <TouchableOpacity 
            style={styles.quantityBtn}
            onPress={() => updateClothingQuantity(itemId, Math.max(0, quantity - 1))}
          >
            <Ionicons name="remove" size={16} color={colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity 
            style={styles.quantityBtn}
            onPress={() => updateClothingQuantity(itemId, quantity + 1)}
          >
            <Ionicons name="add" size={16} color={colors.textDark} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSelectedItems = () => {
    return Object.entries(clothingItems)
      .filter(([_, q]) => q > 0)
      .map(([id, q]) => {
        const item = availableItems.find(item => (item._id === id || item.id === id));
        const adjustedPrice = item ? getItemPrice(item) : 0;
        const itemName = item?.name || 'Unknown Item';
        const totalPrice = (adjustedPrice * q) || 0;

        return (
          <View key={id} style={styles.selectedItem}>
            <Text style={styles.selectedItemText}>{itemName} × {q}</Text>
            <Text style={styles.selectedItemPrice}>
              RWF {formatPrice(totalPrice)}
            </Text>
          </View>
        );
      });
  };

  const handleMapPress = async (e) => {
    const { geometry } = e.features[0];
    if (geometry.type === 'Point') {
      setSelectedLocation(geometry.coordinates);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity> 
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>Schedule Laundry Pickup</Text>
          <Image source={require('@/assets/images/Laundry and dry cleaning-bro.png')} style={styles.logo} />
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Customer Information</Text>
          </View>
          <TextInput 
            placeholder="Full Name *"
            style={styles.input}
            value={customerName}
            onChangeText={setCustomerName}
            placeholderTextColor={colors.textLight}
          />
          <TextInput 
            placeholder="Phone Number *"
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Service Type */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="options-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Service Type</Text>
          </View>
          <View style={styles.optionsContainer}>
            {Object.keys(SERVICE_PRICE_KEYS).map(service => (
              <OptionButton 
                key={service}
                value={service} 
                selected={serviceType === service} 
                setter={setServiceType} 
                icon="shirt-outline" 
              />
            ))}
          </View>
        </View>

        {/* Clothing Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shirt-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Select Clothing Items</Text>
            <TouchableOpacity 
              style={styles.addItemsBtn} 
              onPress={() => setShowItemModal(true)}
            >
              <Ionicons name="add-circle" size={20} color={colors.primary} />
              <Text style={styles.addItemsText}>Add Items</Text>
            </TouchableOpacity>
          </View>

          {getTotalItems() > 0 && (
            <View style={styles.selectedItemsContainer}>
              <Text style={styles.selectedItemsTitle}>Selected Items ({getTotalItems()} items)</Text>
              {renderSelectedItems()}
              <View style={styles.totalContainer}>
                <Text style={styles.totalText}>
                  Total: RWF {formatPrice(calculateTotal())}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Pickup Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Pickup Schedule</Text>
          </View>
          <View style={styles.datetimeContainer}>
            <TouchableOpacity style={styles.datetimeInput} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={styles.datetimeText}>{pickupDate.toLocaleDateString()}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.datetimeInput} onPress={() => setShowTimePicker(true)}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={styles.datetimeText}>{pickupTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={pickupDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={pickupTime}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </View>

        {/* Address - Map Only */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Pickup Address</Text>
          </View>

          <View style={styles.mapContainer}>
            <TouchableOpacity 
              style={styles.mapButton}
              onPress={() => {
                setSelectedLocation(confirmedLocation ? 
                  [confirmedLocation.longitude, confirmedLocation.latitude] : 
                  currentLocation ? 
                  [currentLocation.longitude, currentLocation.latitude] : 
                  null
                );
                setShowMapModal(true);
              }}
            >
              <Ionicons name="map" size={20} color={colors.primary} />
              <Text style={styles.mapButtonText}>
                {address ? 'Change Location on Map' : 'Select Location on Map *'}
              </Text>
            </TouchableOpacity>
            {address && (
              <View style={styles.selectedAddressContainer}>
                <Text style={styles.selectedAddressLabel}>Selected Address:</Text>
                <Text style={styles.selectedAddressText}>{address}</Text>
                {confirmedLocation && (
                  <Text style={styles.coordinatesText}>
                    Coordinates: {confirmedLocation.latitude.toFixed(6)}, {confirmedLocation.longitude.toFixed(6)}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Delivery Option */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Delivery Option</Text>
          </View>
          <View style={styles.optionsContainer}>
            {['Same Day ', 'Next Day', '48 Hours', '3-5 Days'].map(option => (
              <OptionButton 
                key={option}
                value={option} 
                selected={deliveryOption === option} 
                setter={setDeliveryOption} 
                icon="time-outline" 
              />
            ))}
          </View>
        </View>

        {/* Special Instructions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Special Instructions</Text>
          </View>
          <TextInput 
            placeholder="Fragile items, stain removal, special handling, etc."
            style={[styles.input, { height: 80 }]}
            value={instructions}
            onChangeText={setInstructions}
            multiline
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>
          <View style={styles.optionsContainer}>
            {['MTN MoMo', 'Airtel Money', 'Visa/Mastercard', 'Cash on Delivery'].map(method => (
              <OptionButton 
                key={method}
                value={method} 
                selected={paymentMethod === method} 
                setter={setPaymentMethod} 
                icon="card-outline" 
              />
            ))}
          </View>
          
          {/* Payment info note */}
          <View style={styles.paymentNote}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textLight} />
            <Text style={styles.paymentNoteText}>
              {paymentMethod === 'Cash on Delivery' 
                ? 'Pay when your items are delivered'
                : 'Secure payment link will be provided after booking confirmation'
              }
            </Text>
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity 
          style={[styles.confirmBtn, isLoading && styles.confirmBtnDisabled]} 
          onPress={handleBooking}
          disabled={isLoading}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.confirmText}>Processing...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.confirmText}>Confirm Booking</Text>
              <View style={styles.totalBadge}>
                <Text style={styles.totalBadgeText}>RWF {formatPrice(calculateTotal())}</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Map Modal */}
      <Modal visible={showMapModal} animationType="slide" transparent>
        <View style={styles.mapModalOverlay}>
          <View style={styles.mapModalContainer}>
            <View style={styles.mapModalHeader}>
              <Text style={styles.mapModalTitle}>Select Pickup Location</Text>
              <TouchableOpacity onPress={() => setShowMapModal(false)}>
                <Ionicons name="close" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>
            <Mapbox.MapView
              style={styles.mapModalMap}
              styleURL={Mapbox.StyleURL.Street}
              onPress={handleMapPress}
            >
              <Mapbox.Camera
                zoomLevel={mapCamera.zoomLevel}
                centerCoordinate={mapCamera.centerCoordinate}
                animationMode={'flyTo'}
                animationDuration={2000}
              />
              {selectedLocation && (
                <Mapbox.PointAnnotation
                  id="selectedLocation"
                  coordinate={selectedLocation}
                >
                  <View style={styles.mapMarker}>
                    <View style={styles.mapMarkerInner} />
                  </View>
                </Mapbox.PointAnnotation>
              )}
            </Mapbox.MapView>
            <View style={styles.mapModalActions}>
              <TouchableOpacity style={styles.mapModalConfirmBtn} onPress={confirmMapLocation}>
                <Text style={styles.mapModalConfirmText}>Confirm Location</Text>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.mapModalCancelBtn} onPress={() => setShowMapModal(false)}>
                <Text style={styles.mapModalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Clothing Items Modal */}
      <Modal visible={showItemModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Clothing Items</Text>
            <TouchableOpacity onPress={() => setShowItemModal(false)}>
              <Ionicons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {itemsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading items...</Text>
              </View>
            ) : availableItems.length === 0 ? (
              <View style={styles.noItemsContainer}>
                <Ionicons name="shirt-outline" size={48} color={colors.textLight} />
                <Text style={styles.noItemsText}>No items found</Text>
                <TouchableOpacity style={styles.refreshBtn} onPress={loadItems}>
                  <Ionicons name="refresh" size={20} color={colors.primary} />
                  <Text style={styles.refreshBtnText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            ) : (
              availableItems.map(item => <ClothingItem key={item._id || item.id} item={item} />)
            )}
          </ScrollView>
          <View style={styles.modalFooter}>
            <Text style={styles.modalTotalText}>Total: RWF {formatPrice(calculateTotal())}</Text>
            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowItemModal(false)}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  contentContainer: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logo: { width: 50, height: 50, borderRadius: 10 },
  heading: { fontSize: 24, fontWeight: '700', color: colors.primary, flex: 1, marginTop: 30 },
  section: { marginBottom: 20, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.textDark, marginLeft: 8 },
  input: { borderWidth: 1, borderColor: colors.lightBorder, borderRadius: 12, padding: 16, backgroundColor: '#fff', fontSize: 16, marginBottom: 12, textAlignVertical: 'top', color: colors.textDark },
  optionsContainer: { marginBottom: 8 },
  option: { padding: 16, backgroundColor: '#fff', marginBottom: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.lightBorder, flexDirection: 'row', alignItems: 'center' },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.accent + '10' },
  optionText: { color: colors.textDark, fontSize: 16, marginLeft: 12 },
  optionTextSelected: { color: colors.primary, fontWeight: '600' },
  addItemsBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accent + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginLeft: 'auto' },
  addItemsText: { color: colors.primary, fontWeight: '600', marginLeft: 4, fontSize: 14 },
  selectedItemsContainer: { backgroundColor: '#f8f8f8', borderRadius: 12, padding: 16, marginBottom: 8 },
  selectedItemsTitle: { fontSize: 16, fontWeight: '600', color: colors.textDark, marginBottom: 12 },
  selectedItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.lightBorder },
  selectedItemText: { fontSize: 15, color: colors.textDark },
  selectedItemPrice: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  totalContainer: { paddingTop: 12, marginTop: 8 },
  totalText: { fontSize: 18, fontWeight: '700', color: colors.primary, textAlign: 'right' },
  datetimeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  datetimeInput: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.lightBorder, borderRadius: 12, padding: 16, marginRight: 10 },
  datetimeText: { marginLeft: 10, color: colors.textDark, fontSize: 16 },
  mapContainer: { marginBottom: 8 },
  mapButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.lightBorder, borderRadius: 12, padding: 16 },
  mapButtonText: { marginLeft: 10, color: colors.textDark, fontSize: 16 },
  selectedAddressContainer: { marginTop: 12, padding: 16, backgroundColor: '#f8f8f8', borderRadius: 12, borderWidth: 1, borderColor: colors.lightBorder },
  selectedAddressLabel: { fontSize: 14, color: colors.textLight, marginBottom: 4 },
  selectedAddressText: { fontSize: 15, color: colors.textDark, marginBottom: 4 },
  coordinatesText: { 
    fontSize: 12, 
    color: colors.textLight, 
    marginTop: 4, 
    fontFamily: 'monospace' 
  },
  cardInputRow: { flexDirection: 'row', justifyContent: 'space-between' },
  confirmBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 16, marginTop: 24, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  confirmBtnDisabled: { backgroundColor: colors.textLight, opacity: 0.7 },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 },
  loadingText: { marginLeft: 8, color: colors.textLight, fontSize: 16 },
  totalBadge: { backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  totalBadgeText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  mapModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  mapModalContainer: { width: '95%', height: '80%', backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 12 },
  mapModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.lightBorder },
  mapModalTitle: { fontSize: 18, fontWeight: '600', color: colors.textDark },
  mapModalMap: { width: '100%', height: '70%' },
  mapMarker: { 
    width: 30, 
    height: 30, 
    borderRadius: 15, 
    backgroundColor: colors.primary, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5
  },
  mapMarkerInner: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: '#fff' 
  },
  mapModalActions: { width: '100%', padding: 16, backgroundColor: '#fff', alignItems: 'center', gap: 12 },
  mapModalConfirmBtn: { width: '100%', backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12 },
  mapModalConfirmText: { color: '#fff', fontWeight: '700', fontSize: 16, marginRight: 8 },
  mapModalCancelBtn: { width: '100%', backgroundColor: colors.textLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12 },
  mapModalCancelText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  modalContainer: { flex: 1, backgroundColor: colors.lightBg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.lightBorder },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.primary },
  modalContent: { flex: 1, padding: 20 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.lightBorder },
  modalTotalText: { fontSize: 18, fontWeight: '600', color: colors.primary },
  clothingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.lightBorder },
  clothingItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  clothingItemInfo: { marginLeft: 16, flex: 1 },
  clothingItemName: { fontSize: 16, fontWeight: '600', color: colors.textDark },
  clothingItemPrice: { fontSize: 14, color: colors.textLight, marginTop: 4 },
  originalPrice: { fontSize: 12, color: colors.textLight, textDecorationLine: 'line-through', marginTop: 2 },
  quantityContainer: { flexDirection: 'row', alignItems: 'center' },
  quantityBtn: { backgroundColor: colors.lightBg, borderRadius: 20, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  quantityText: { fontSize: 16, fontWeight: '600', color: colors.textDark, marginHorizontal: 12, minWidth: 20, textAlign: 'center' },
  doneBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  noItemsContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  noItemsText: { fontSize: 18, color: colors.textLight, marginTop: 16, marginBottom: 20 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accent + '20', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  refreshBtnText: { marginLeft: 8, color: colors.primary, fontWeight: '600' },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 1,
    bottom: 20,
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
    paymentNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  paymentNoteText: {
    fontSize: 12,
    color: colors.textLight,
    marginLeft: 8,
    flex: 1,
  },
});