import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../constants/Colors';

const BottomNavBar = ({ currentRoute = 'Home' }) => {
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

  const navigationItems = [
    {
      id: 'home',
      route: 'Home',
      icon: 'home-outline',
      label: 'Home',
      onPress: () => router.push('/customer/home'),
    },
    {
      id: 'book',
      route: 'Book',
      icon: 'calendar-outline',
      label: 'Book',
      onPress: () => router.push('/customer/Screens/Book'),
    },
    {
      id: 'orders',
      route: 'Orders',
      icon: 'clipboard-outline',
      label: 'Orders',
      onPress: () => router.push('/customer/Screens/Orders'),
    },
    {
      id: 'track',
      route: 'Track',
      icon: 'location-outline',
      label: 'Track',
      onPress: () => router.push('/customer/Screens/Track'),
    },
    {
      id: 'profile',
      route: 'Profile',
      icon: 'person-outline',
      label: 'Profile',
      onPress: () => router.push('/Setting'),
      isProfile: true, // special case for profile image
    },
  ];

  const renderNavItem = (item) => {
    const isActive = currentRoute === item.route;
    const iconColor = isActive ? colors.primary : colors.textLight;
    const textColor = isActive ? colors.primary : colors.textLight;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.navItem}
        onPress={item.onPress}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          {item.isProfile && profile ? (
            <Image source={{ uri: profile }} style={styles.profileImage} />
          ) : (
            <Icon name={item.icon} size={26} color={iconColor} />
          )}
        </View>
        <Text style={[styles.navLabel, { color: textColor }]}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {navigationItems.map(renderNavItem)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  profileImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
});

export default BottomNavBar;
