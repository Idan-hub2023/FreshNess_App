import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import BottomNavBar from '@/components/AdminBottomNavBar';
import TopNavBar from '@/components/AdminTopNavBar';

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider style={{ background: '#1226ddff' }}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <StatusBar style="dark" />
          
          {/* Whole screen */}
          <View style={styles.container}>
            
            {/* Top Navbar */}
            <View style={styles.navBar}>
              <TopNavBar />
            </View>

            {/* Middle Content */}
            <View style={styles.content}>
              <Stack screenOptions={{ headerShown: false }} />
            </View>

            {/* Bottom Navbar */}
            <View style={styles.bottomBar}>
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
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  navBar: {
    height: 70, // 🚨 Give it fixed height
  },
  content: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  bottomBar: {
    height: 70, // 🚨 Fixed height again
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});
