import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomNavBar from '../../components/RiderBottomNavBar';

const RiderDashboardLayout = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 60 }]}>
      {/* Screens will be injected here */}
      <Stack screenOptions={{ headerShown: false }} />
      
      {/* Fixed Bottom Navigation */}
      <View style={[styles.bottomNavWrapper, { bottom: insets.bottom }]}>
        <BottomNavBar />
      </View>
    </View>
  );
};

export default RiderDashboardLayout;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  bottomNavWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});