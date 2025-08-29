import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import Mapbox, { Camera, MapView, PointAnnotation, UserLocation } from '@rnmapbox/maps';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';

import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width, height } = Dimensions.get('window');

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiaXJhaG96YSIsImEiOiJjbWUya3ZzZWcwbW8xMmtyMmM1bGFwMW8yIn0.9WHhqP1CMroXatCoO1MwHw'; 
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

export default function RiderDashboard() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dryCleaners, setDryCleaners] = useState([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    initializeApp();
  }, []);

  // Initialize app with proper error handling
  const initializeApp = async () => {
    try {
      await getCurrentLocation();
      await fetchDryCleaners();
    } catch (error) {
      console.error('App initialization error:', error);
      handleInitializationError(error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const checkAuth = async () => {
        try {
          const token = await AsyncStorage.getItem('authToken');
          if (!token) {
            router.replace('/auth/login');
            return;
          }
        } catch (error) {
          console.error('Auth check error:', error);
        }
      };

      // Disable back navigation unless logout
      const onBackPress = () => {
        return true;
      };

      checkAuth();
      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => backHandler.remove();
    }, [])
  );

  const fetchDryCleaners = async () => {
    setApiLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('https://freshness-eakm.onrender.com/api/drycleaner', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received');
      }
      
      setDryCleaners(data.map(cleaner => ({
        _id: cleaner._id,
        name: cleaner.name || 'Unknown Cleaner',
        phone: cleaner.phone || 'No phone',
        latitude: parseFloat(cleaner.latitude),
        longitude: parseFloat(cleaner.longitude),
        locationName: cleaner.locationName || 'Unknown Location',
        rating: cleaner.rating || 4.5,
        distance: currentLocation ? calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          parseFloat(cleaner.latitude),
          parseFloat(cleaner.longitude)
        ) : 'Calculating...'
      })).filter(cleaner => !isNaN(cleaner.latitude) && !isNaN(cleaner.longitude)));
      
    } catch (error) {
      console.error('Error fetching dry cleaners:', error);
      Alert.alert(
        'Connection Error', 
        'Failed to load dry cleaners. Please check your internet connection and try again.',
        [
          { text: 'Retry', onPress: () => fetchDryCleaners() },
          { text: 'OK', style: 'cancel' }
        ]
      );
    } finally {
      setApiLoading(false);
    }
  };

  // Helper function to calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 'Unknown';
    
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1); 
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km
    return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      // Check if location services are enabled
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services to continue.',
          [
            { text: 'OK', onPress: () => useDefaultLocation() }
          ]
        );
        return;
      }

      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'This app needs location permission to show nearby dry cleaners.',
          [
            { text: 'Grant Permission', onPress: () => getCurrentLocation() },
            { text: 'Use Default Location', onPress: () => useDefaultLocation() }
          ]
        );
        return;
      }

      // Get current position with timeout
      const location = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          maximumAge: 10000,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Location timeout')), 15000)
        )
      ]);

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };

      setCurrentLocation(newLocation);
      
      // Update distances when location is obtained
      updateDistances(location.coords.latitude, location.coords.longitude);
      
    } catch (error) {
      console.error('Error getting location:', error);
      
      if (retryCount < 2) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => getCurrentLocation(), 2000);
      } else {
        Alert.alert(
          'Location Error',
          'Unable to get your current location. Using default location (Kigali).',
          [{ text: 'OK', onPress: () => useDefaultLocation() }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const useDefaultLocation = () => {
    // Default to Kigali coordinates
    const defaultLocation = {
      latitude: -1.9441,
      longitude: 30.0619,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };
    setCurrentLocation(defaultLocation);
    updateDistances(defaultLocation.latitude, defaultLocation.longitude);
    setLoading(false);
  };

  const updateDistances = (latitude, longitude) => {
    setDryCleaners(prev => prev.map(cleaner => ({
      ...cleaner,
      distance: calculateDistance(
        latitude,
        longitude,
        cleaner.latitude,
        cleaner.longitude
      )
    })));
  };

  const handleInitializationError = (error) => {
    console.error('Initialization error:', error);
    Alert.alert(
      'App Loading Error',
      'There was a problem loading the app. Please check your connection and try again.',
      [
        { text: 'Retry', onPress: () => initializeApp() },
        { text: 'Exit', onPress: () => BackHandler.exitApp() }
      ]
    );
  };

  const renderStars = (rating) => {
    const numRating = parseFloat(rating) || 0;
    return Array(5).fill(0).map((_, i) => (
      <Icon
        key={i}
        name={i < Math.floor(numRating) ? 'star' : 'star-border'}
        size={14}
        color={i < Math.floor(numRating) ? '#FFC107' : '#E0E0E0'}
        style={styles.starIcon}
      />
    ));
  };

  const onMapReady = () => {
    console.log('Mapbox map is ready');
    setMapLoaded(true);
  };

  const onMapLoadError = (error) => {
    console.error('Mapbox map load error:', error);
    Alert.alert(
      'Map Error',
      'Failed to load map. Please check your internet connection.',
      [{ text: 'OK' }]
    );
  };

  if (loading || apiLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>
          {loading ? 'Getting your location...' : 'Loading dry cleaners...'}
        </Text>
        {retryCount > 0 && (
          <Text style={styles.retryText}>Retrying... ({retryCount}/2)</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2563EB', '#1D4ED8']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.headerTitle}>Rider Dashboard</Text>
        <Text style={styles.headerSubtitle}>Find nearby dry cleaners</Text>
        {locationPermission !== 'granted' && (
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={getCurrentLocation}
          >
            <Icon name="location-on" size={16} color="#FFF" />
            <Text style={styles.locationButtonText}>Enable Location</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.mapContainer}>
          {currentLocation ? (
            <MapView
              style={styles.map}
              styleURL={Mapbox.StyleURL.Street}
              onDidFinishLoadingMap={onMapReady}
              onDidFailLoadingMap={onMapLoadError}
              logoEnabled={false}
              attributionEnabled={false}
              compassEnabled={true}
              scaleBarEnabled={false}
              rotateEnabled={true}
              scrollEnabled={true}
              pitchEnabled={false}
              zoomEnabled={true}
            >
              <Camera
                centerCoordinate={[currentLocation.longitude, currentLocation.latitude]}
                zoomLevel={12}
                animationDuration={1000}
              />
              
              <UserLocation
                visible={true}
                showsUserHeadingIndicator={true}
                minDisplacement={10}
              />

              {dryCleaners.map((cleaner) => (
                <PointAnnotation
                  key={cleaner._id}
                  id={`cleaner-${cleaner._id}`}
                  coordinate={[cleaner.longitude, cleaner.latitude]}
                  title={cleaner.name}
                  snippet={`${cleaner.locationName} • ${cleaner.distance}`}
                >
                  <View style={styles.mapMarker}>
                    <View style={styles.markerBubble}>
                      <Icon name="local-laundry-service" size={16} color="#FFF" />
                    </View>
                    <View style={styles.markerArrow} />
                  </View>
                </PointAnnotation>
              ))}
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Icon name="location-off" size={48} color="#BDBDBD" />
              <Text style={styles.mapPlaceholderText}>Location unavailable</Text>
              <TouchableOpacity 
                style={styles.retryLocationButton}
                onPress={getCurrentLocation}
              >
                <Text style={styles.retryLocationText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.nearbyContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Cleaners</Text>
            <TouchableOpacity onPress={fetchDryCleaners}>
              <Icon name="refresh" size={20} color="#2563EB" />
            </TouchableOpacity>
          </View>
          
          {dryCleaners.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="search-off" size={48} color="#BDBDBD" />
              <Text style={styles.emptyStateText}>No dry cleaners found nearby</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={fetchDryCleaners}
              >
                <Text style={styles.retryButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            dryCleaners.map((cleaner) => (
              <TouchableOpacity 
                key={cleaner._id} 
                style={styles.cleanerCard}
                activeOpacity={0.9}
                onPress={() => {
                  // Add navigation to cleaner details or call functionality
                  Alert.alert(
                    cleaner.name,
                    `Call ${cleaner.phone}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Call', onPress: () => console.log('Calling:', cleaner.phone) }
                    ]
                  );
                }}
              >
                <View style={styles.cleanerInfo}>
                  <View style={styles.cleanerIcon}>
                    <Icon name="local-laundry-service" size={24} color="#6C63FF" />
                  </View>
                  <View style={styles.cleanerDetails}>
                    <Text style={styles.cleanerName}>{cleaner.name}</Text>
                    <Text style={styles.cleanerAddress}>{cleaner.locationName}</Text>
                    <Text style={styles.cleanerPhone}>{cleaner.phone}</Text>
                    <View style={styles.ratingContainer}>
                      {renderStars(cleaner.rating)}
                      <Text style={styles.ratingText}>{cleaner.rating}</Text>
                      <Text style={styles.distanceText}>{cleaner.distance}</Text>
                    </View>
                  </View>
                </View>
                <Icon name="chevron-right" size={24} color="#BDBDBD" />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/Rider/screen/NewOrdersPage')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#0026ffff', '#5771e2ff']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="assignment" size={28} color="#fff" />
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonText}>New Orders</Text>
                  <Text style={styles.buttonSubtext}>View available orders</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/Rider/screen/CompletedOrdersPage')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#0026ffff', '#5771e2ff']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="check-circle" size={28} color="#fff" />
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonText}>Completed Orders</Text>
                  <Text style={styles.buttonSubtext}>View order history</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/Rider/screen/EarningsPage')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#0026ffff', '#5771e2ff']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="account-balance-wallet" size={28} color="#fff" />
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonText}>Earnings</Text>
                  <Text style={styles.buttonSubtext}>Track your income</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  locationButtonText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 4,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  mapContainer: {
    height: height * 0.4,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: '#FFF',
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 12,
    marginBottom: 16,
  },
  retryLocationButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#6C63FF',
    borderRadius: 8,
  },
  retryLocationText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  mapMarker: {
    alignItems: 'center',
  },
  markerBubble: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#6C63FF',
    transform: [{ rotate: '180deg' }],
    marginTop: -2,
  },
  nearbyContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3A3A3A',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#6C63FF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cleanerCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cleanerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cleanerIcon: {
    backgroundColor: '#F0F0FF',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cleanerDetails: {
    flex: 1,
  },
  cleanerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 4,
  },
  cleanerAddress: {
    fontSize: 12,
    color: '#7A7A7A',
    marginBottom: 6,
  },
  cleanerPhone: {
    fontSize: 12,
    color: '#6C63FF',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: 2,
  },
  ratingText: {
    fontSize: 12,
    color: '#3A3A3A',
    marginLeft: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#6C63FF',
    marginLeft: 12,
  },
  quickActions: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  buttonsContainer: {
    marginTop: 8,
  },
  actionButton: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonTextContainer: {
    marginLeft: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
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
  },
  retryText: {
    marginTop: 8,
    fontSize: 14,
    color: '#FF9800',
  },
});