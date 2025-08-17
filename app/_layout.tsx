import { Stack } from 'expo-router';
import React from 'react';

// Linking configuration for deep linking
const linking = {
  prefixes: ['freshness://'],
  config: {
    screens: {
      'reset-password': 'reset-password/:token',
    },
  },
};

export default function Layout() {
  return <Stack linking={linking}         
  screenOptions={{
          headerShown: false,
        }}/>;
}
