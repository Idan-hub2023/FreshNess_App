  import { Platform } from "react-native";

  const baseURL = Platform.OS === 'android' 
    ? 'https://freshness-eakm.onrender.com' 
    : 'http://192.168.1.68:5000';

export default {
  prefixes: ['freshness://', `${baseURL}`],
  config: {
    screens: {
      ResetPassword: 'reset-password/:token',
      // ...other routes
    },
  },
};
