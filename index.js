import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { ExpoRoot } from 'expo-router';

// Firebase background handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background message received:', remoteMessage);
  return Promise.resolve();
});

AppRegistry.registerHeadlessTask(
  'RNFirebaseBackgroundMessage',
  () => messaging().setBackgroundMessageHandler
);

// Register expo-router root
AppRegistry.registerComponent('main', () => ExpoRoot);
