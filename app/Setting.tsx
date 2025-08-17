import colors from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

    const baseURL = Platform.OS === 'android' 
  ? 'https://freshness-eakm.onrender.com/api' 
  : 'http://192.168.1.67:5000/api';

export default function SettingsScreen() {
  const [userId, setUserId] = useState('');
  const [user, setUser] = useState(null);
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [image, setImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();
  useEffect(() => {
  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      router.replace('/auth/login'); // Redirect if not logged in
    }
  };

  checkAuth();
}, []);

  // ✅ Load user info from API
  useEffect(() => {
    const loadUser = async () => {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) return;

      setUserId(storedUserId);

      try {
        const res = await axios.get(`${baseURL}/user/${storedUserId}`);
        const userData = res.data?.user;

        if (userData) {
          setUser(userData);
          setFullname(userData.fullname || '');
          setEmail(userData.email || '');
          setPhone(userData.phone?.toString() || '');
          // ✅ FIXED: Handle both profileImage and profile fields
          setImage(userData.profileImage || userData.profile || null);
        }
      } catch (error) {
        console.error('Load user error:', error);
        Alert.alert('Error', 'Failed to load user');
      }
    };

    loadUser();
  }, []);

  // ✅ Pick Image from gallery
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission denied', 'Enable gallery access in settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      aspect: [1, 1], // Square aspect ratio
    });

    if (!result.canceled && result.assets.length > 0) {
      const picked = result.assets[0];
      setImage(picked.uri);
    }
  };

  // ✅ FIXED: Update user profile with proper FormData handling
  const handleUpdate = async () => {
    if (!fullname || !email || !phone) {
      Alert.alert('Validation Error', 'All fields are required');
      return;
    }

    setIsLoading(true);
    
    try {
      const formData = new FormData();

      // Add text fields
      formData.append('fullname', fullname);
      formData.append('email', email);
      formData.append('phone', phone);

      // ✅ FIXED: Handle image upload properly
      if (image && !image.startsWith('http')) {
        // This is a new local image that needs to be uploaded
        const uriParts = image.split('/');
        const fileName = uriParts[uriParts.length - 1];
        
        // Get file extension from URI or default to jpg
        const fileExtension = fileName.split('.').pop() || 'jpg';
        const finalFileName = `profile-${Date.now()}.${fileExtension}`;
        
        formData.append('profileImage', {
          uri: image,
          name: finalFileName,
          type: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
        });
      }

      console.log('Sending update request for user:', userId);

      const res = await axios.put(`${baseURL}/user/update/${userId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout for image upload
      });

      console.log('Update response:', res.data);

      if (res.data.user) {
        const updatedUser = res.data.user;
        
        // Update local storage
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        // Update local state with the new image URL from server
        if (updatedUser.profileImage) {
          setImage(updatedUser.profileImage);
        }
        
        Alert.alert('Success', 'Profile updated successfully!');
      }

    } catch (error) {
      console.error('Update error:', error);
      
      let errorMessage = 'Update failed';
      
      if (error.response) {
        errorMessage = error.response.data?.message || 'Server error occurred';
        console.error('Server response:', error.response.data);
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Logout
const handleLogout = async () => {
  try {
    const token = await AsyncStorage.getItem('authToken');

    if (token) {
      await axios.post(`${baseURL}/logout`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.log('Logout API call failed:', error.response?.data || error.message);
  } finally {
    // Clear token and any saved user info
    await AsyncStorage.clear();

    // Redirect to login screen
    router.replace('/auth/login');
  }
};

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={styles.title}>Profile Settings</Text>

      <TouchableOpacity onPress={pickImage}>
        <Image
          source={{ 
            uri: image || 'https://via.placeholder.com/100?text=No+Image' 
          }}
          style={styles.image}
        />
        <Text style={styles.changePhoto}>Tap to change photo</Text>
      </TouchableOpacity>

      <TextInput
        placeholder="Full Name"
        value={fullname}
        onChangeText={setFullname}
        style={styles.input}
      />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Phone"
        value={phone}
        onChangeText={setPhone}
        style={styles.input}
        keyboardType="phone-pad"
      />

      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={handleUpdate} 
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save Changes</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fff',
    flexGrow: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
  },
  changePhoto: {
    color: '#1d4ed8',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#1d4ed8',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  logoutButton: {
    marginTop: 30,
  },
  backButton: {
  position: 'absolute',
  left: 16,
  top: 46,
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
  logoutText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 16,
  },
});