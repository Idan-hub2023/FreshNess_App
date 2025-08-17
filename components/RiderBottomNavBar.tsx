// components/BottomNavBar.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const BottomNavBar = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<string | null>(null);

  useEffect(() => {
    const loadProfileImage = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed.profile) {
            setProfile(parsed.profile);
          }
        }
      } catch (error) {
        console.log('Error loading profile image:', error);
      }
    };

    loadProfileImage();
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.iconContainer}
        onPress={() => router.push('/Rider/RiderDashboard')}
      >
        <Icon name="home-outline" size={26} color="#1E3A8A" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.iconContainer}
        onPress={() => router.push('/Rider/screen/NewOrdersPage')}
      >
        <Icon name="list-outline" size={26} color="#1E3A8A" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.iconContainer}
        onPress={() => router.push('/Setting')}
      >
        {profile ? (
          <Image
            source={{ uri: profile }}
            style={styles.profileImage}
          />
        ) : (
          <Icon name="person-outline" size={26} color="#1E3A8A" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  profileImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
});

export default BottomNavBar;
