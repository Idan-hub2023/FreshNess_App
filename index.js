import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';

// Background handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background message received:', remoteMessage);
  return Promise.resolve();
});

// Register headless task
AppRegistry.registerHeadlessTask(
  'RNFirebaseBackgroundMessage',
  () => messaging().setBackgroundMessageHandler
);