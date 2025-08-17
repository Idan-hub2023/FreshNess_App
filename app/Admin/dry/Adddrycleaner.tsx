import axios from 'axios';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterDryCleanerScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isLoading, setIsLoading] = useState(false);

        const API_URL = Platform.OS === 'android' 
    ? 'https://freshness-eakm.onrender.com' 
    : 'http://192.168.1.67:5000';
  
  const handleGetLocation = async () => {
    setIsLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'We need location permission to register your business');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLatitude(location.coords.latitude.toString());
      setLongitude(location.coords.longitude.toString());
      Alert.alert('Location captured', 'Your business location has been saved');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name || !phone || !locationName || !latitude || !longitude) {
      Alert.alert('Error', 'Please fill all fields and get your location');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/api/drycleaner`, {
        name, 
        phone, 
        locationName, 
        latitude: parseFloat(latitude), 
        longitude: parseFloat(longitude)
      });
      Alert.alert('Success', 'Dry cleaner registered successfully!');
      // Clear form
      setName('');
      setPhone('');
      setLocationName('');
      setLatitude('');
      setLongitude('');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingView}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Register Your Dry Cleaning Business</Text>
          <Text style={styles.subtitle}>Fill in your business details below</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Business Name</Text>
            <TextInput 
              placeholder="e.g. Fresh Cleaners" 
              value={name} 
              onChangeText={setName} 
              style={styles.input} 
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput 
              placeholder="e.g. 0781234567" 
              value={phone} 
              onChangeText={setPhone} 
              style={styles.input}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Location Name</Text>
            <TextInput 
              placeholder="e.g. Kigali Heights, 2nd Floor" 
              value={locationName} 
              onChangeText={setLocationName} 
              style={styles.input} 
            />
          </View>

          <View style={styles.locationContainer}>
            <Text style={styles.label}>Business Location</Text>
            <TouchableOpacity 
              onPress={handleGetLocation} 
              style={styles.locationButton}
              disabled={isLoading}
            >
              <Ionicons name="location" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {isLoading ? 'Getting Location...' : 'Get GPS Location'}
              </Text>
            </TouchableOpacity>

            {latitude && longitude && (
              <View style={styles.coordinatesContainer}>
                <Text style={styles.coordinateText}>
                  <Text style={styles.coordinateLabel}>Latitude:</Text> {latitude}
                </Text>
                <Text style={styles.coordinateText}>
                  <Text style={styles.coordinateLabel}>Longitude:</Text> {longitude}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity 
            onPress={handleSubmit} 
            style={styles.submitButton}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Registering...' : 'Register Business'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 25,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#444',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  locationContainer: {
    marginBottom: 25,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  coordinatesContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  coordinateText: {
    fontSize: 14,
    marginBottom: 5,
  },
  coordinateLabel: {
    fontWeight: 'bold',
    color: '#4a90e2',
  },
  submitButton: {
    backgroundColor: '#2ecc71',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});