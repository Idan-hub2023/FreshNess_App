import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function TopNavBar() {
  const router = useRouter();
  const [userImage, setUserImage] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);

          // Fata profileImage cyangwa profile
          const imageUrl = user.profileImage || user.profile;

          if (imageUrl) {
            setUserImage(imageUrl);
          }
        }
      } catch (error) {
        console.log('Failed to load user image:', error);
      }
    };

    loadUser();
  }, []);

  const goToProfile = () => {
    router.push('/Setting');
  };

  return (
    <View style={styles.navBar}>
      <Text style={styles.title}>Admin Panel</Text>
      <View style={styles.actions}>
        <TouchableOpacity onPress={goToProfile} style={styles.iconButton}>
          {userImage ? (
            <Image
              source={{ uri: userImage }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <Icon name="person-circle-outline" size={30} color="#1E3A8A" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.push('/Setting')}
        >
          <Icon name="settings" size={28} color="black" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 16,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
