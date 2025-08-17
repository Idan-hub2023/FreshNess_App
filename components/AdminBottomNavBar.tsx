import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function BottomNavBar({ active }) {
  const router = useRouter();
  const navItems = [
    { label: 'Dashboard', icon: 'grid-outline', route: 'Dashboard', onPress: () => router.push('/Admin/DashboardScreen') },
    { label: 'Orders', icon: 'clipboard-outline', route: 'Orders', onPress: () => router.push('/Admin/Screen/OrdersScreen') },
    { label: 'Riders', icon: 'bicycle-outline', route: 'Riders', onPress: () => router.push('/Admin/Screen/RidersScreen') },
    { label: 'Users', icon: 'people-outline', route: 'Users', onPress: () => router.push('/Admin/Screen/UsersScreen') },
    { label: 'Reports', icon: 'bar-chart-outline', route: 'Reports', onPress: () => router.push('/Admin/Screen/Report') },
  ];

  return (
    <View style={styles.container}>
      {navItems.map((item) => (
        <TouchableOpacity key={item.label} style={styles.navItem} onPress={item.onPress}>
          <Icon
            name={item.icon}
            size={22}
            color={active === item.route ? '#1E3A8A' : '#9CA3AF'}
          />
          <Text style={[styles.label, active === item.route && styles.activeLabel]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '100%',
    paddingVertical: 10,
  },
  navItem: {
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  activeLabel: {
    color: '#1E3A8A',
    fontWeight: 'bold',
  },
});
