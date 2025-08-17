import * as Geolocation from 'expo-location';
import { PermissionsAndroid, Platform } from 'react-native';

class LocationService {
  static async requestLocationPermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to location to show nearby orders.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  }

  static getCurrentPosition() {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => resolve(position.coords),
        error => reject(error),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
      );
    });
  }

  static watchPosition(callback) {
    return Geolocation.watchPosition(
      position => callback(position.coords),
      error => console.log('Location error:', error),
      { enableHighAccuracy: true, distanceFilter: 10 }
    );
  }

  static clearWatch(watchId) {
    Geolocation.clearWatch(watchId);
  }

  // Check if rider is in specific area (Muhoza)
  static isInWorkArea(latitude, longitude) {
    const muhozaBounds = {
      north: -1.940,
      south: -1.950,
      east: 30.070,
      west: 30.050
    };

    return (
      latitude >= muhozaBounds.south &&
      latitude <= muhozaBounds.north &&
      longitude >= muhozaBounds.west &&
      longitude <= muhozaBounds.east
    );
  }
}

export default LocationService;