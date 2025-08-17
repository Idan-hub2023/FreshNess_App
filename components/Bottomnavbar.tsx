// components/BottomNavBar.js

import { useRouter } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../constants/Colors'; // ✅ make sure this path is correct
const { width: screenWidth } = Dimensions.get('window');

export default function BottomNavBar({ currentRoute = 'Home' }) {

  const router = useRouter();
  const navigationItems = [
    {
      id: 'home',
      route: 'Home',
      icon: 'home',
      iconOutline: 'home-outline',
      label: 'Home',
    },
    {
      id: 'book',
      route: 'Book',
      icon: 'calendar',
      iconOutline: 'calendar-outline',
      label: 'Book',
       onPress: () => router.push('/customer/Screens/Book')
    },
    {
      id: 'orders',
      route: 'Orders',
      icon: 'clipboard',
      iconOutline: 'clipboard-outline',
      label: 'Orders',
      onPress: () => router.push('/customer/Screens/Orders')
    },
    {
      id: 'track',
      route: 'Track',
      icon: 'location',
      iconOutline: 'location-outline',
      label: 'Track',
      onPress: () => router.push('/customer/Screens/Track')
    },
    {
      id: 'profile',
      route: 'Profile',
      icon: 'person',
      iconOutline: 'person-outline',
      label: 'Profile',
      onPress: () => router.push('/Setting')

    }
  ];


  const renderNavItem = (item) => {
    const isActive = currentRoute === item.route;
    const iconName = isActive ? item.icon : item.iconOutline;
    const iconColor = isActive ? colors.primary : colors.textLight;
    const textColor = isActive ? colors.primary : colors.textLight;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.navItem, isActive && styles.activeNavItem]}
        onPress={item.onPress}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Icon name={iconName} size={24} color={iconColor} />
          {item.badge && item.badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.badge > 99 ? '99+' : item.badge}
              </Text>
            </View>
          )}
          {isActive && <View style={styles.activeIndicator} />}
        </View>
        <Text style={[styles.navLabel, { color: textColor }]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.navBar}>
          {navigationItems.map(renderNavItem)}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
  },
  container: {
    backgroundColor: colors.background,
    shadowOffset: { width: 0, height: -3 },
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 16 : 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: screenWidth / 6,
    position: 'relative',
  },
  activeNavItem: {
    backgroundColor: colors.lightBg,
    transform: [{ scale: 1.05 }],
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -10,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
