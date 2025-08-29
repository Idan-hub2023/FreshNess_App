import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomNavBar from '../../components/Bottomnavbar';

export default function Layout() {
  const insets = useSafeAreaInsets();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider  style={{ background: 'rgba(19, 50, 226, 1)' }}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <StatusBar style="light" />

          {/* Keyboard Avoiding */}
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom + 60 : 0} // adjust for navbar height
          >
            {/* Main Content */}
            <View style={[styles.content, { paddingBottom: 70 }]}>
              <Stack screenOptions={{ headerShown: false }} />
            </View>

            {/* Bottom Navbar */}
            <View style={[styles.bottomNav, { bottom: insets.bottom }]}>
              <BottomNavBar />
            </View>
          </KeyboardAvoidingView>
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
  content: {
    flex: 1,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
    zIndex: 10,
  },
});
