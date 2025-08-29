import { Stack } from 'expo-router';
import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomNavBar from '../../components/RiderBottomNavBar';

const RiderDashboardLayout = () => {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaProvider style={{ background: 'rgba(19, 50, 226, 1)' }}>
      <SafeAreaView style={{ flex: 1, paddingBottom: insets.bottom + 60 }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
        <View style={[styles.bottomNavWrapper, { bottom: insets.bottom }]}>
          <BottomNavBar />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
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