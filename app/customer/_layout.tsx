import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import BottomNavBar from '@/components/Bottomnavbar';
import TopNavBar from '@/components/TopNavBar';

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <StatusBar  />

          <View style={styles.container}>
            {/* Top Navbar */}
            <View style={styles.topNav}>
              <TopNavBar />
            </View>

            {/* Main Content */}
            <View style={styles.content}>
              <Stack screenOptions={{ headerShown: false }} />
            </View>

            {/* Bottom Navbar */}
            <View style={styles.bottomNav}>
              <BottomNavBar />
            </View>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  topNav: {
    height: 70, 
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingBottom: 70, 
  },
  bottomNav: {
    height: 70, 
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
    zIndex: 10,
  },
});
