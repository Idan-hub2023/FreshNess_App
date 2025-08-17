import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import colors from '../../constants/Colors';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  const baseURL = Platform.OS === 'android' 
    ? 'https://freshness-eakm.onrender.com/api' 
    : 'http://192.168.1.67:5000/api';

  // Check if user can go back to previous screen
  useEffect(() => {
    const checkCanGoBack = async () => {
      try {
        const previousRoute = await AsyncStorage.getItem('previousRoute');
        setCanGoBack(!!previousRoute);
      } catch (error) {
        console.log('Error checking previous route:', error);
      }
    };
    checkCanGoBack();
  }, []);

  // Handle back button press (Android)
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack) {
        handleBack();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [canGoBack]);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Error', 'Please enter both phone and password');
      return;
    }

    if (!/^\d{10,15}$/.test(phone)) {
      Alert.alert('Error', 'Please enter a valid phone number (10-15 digits)');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${baseURL}/login`, { phone, password }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('Login response:', response.data);

      if (response.data?.success) {
        const { token, user, role } = response.data;

        if (!token || !user?._id) {
          throw new Error('Token or user data missing in response');
        }

        const userPhone = user.phone.toString().startsWith('0') 
          ? user.phone.toString() 
          : `0${user.phone.toString()}`;

// Save auth info
await AsyncStorage.setItem('authToken', token);
await AsyncStorage.setItem('userId', user._id);
await AsyncStorage.setItem('userRole', response.data.role || user.role || 'customer'); 
await AsyncStorage.setItem('userPhone', userPhone);

// ✅ Save assignedZone array as string
await AsyncStorage.setItem('userLocation', JSON.stringify(user.assignedZone || []));
await AsyncStorage.setItem('user', JSON.stringify(user));
const currentRole = response.data.role || user.role || 'customer';
const previousRoute = await AsyncStorage.getItem('previousRoute');


        if (previousRoute && currentRole === 'customer') {
          await AsyncStorage.removeItem('previousRoute');

          Alert.alert('Success', 'Login successful!', [
            {
              text: 'OK',
              onPress: () => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('../customer/home');
                }
              }
            }
          ]);
        } else {
          // Navigate based on role (drycleaner has no role property but backend sends role: 'drycleaner')
          switch (currentRole.toLowerCase()) {
            case 'admin':
              router.replace('../Admin/DashboardScreen');
              break;
            case 'rider':
              router.replace('../Rider/RiderDashboard');
              break;
            case 'drycleaner':
              router.replace('../Admin/dry/Adddrycleaner'); 
              break;
            case 'customer':
            default:
              router.replace('../customer/home');
          }
        }

      } else {
        Alert.alert('Error', response.data?.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed. Please try again.';

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          errorMessage = 'Request timeout. Please check your connection.';
        } else if (error.code === 'ERR_NETWORK') {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.response) {
          errorMessage = error.response.data?.message ||
            (error.response.status === 401 ? 'Invalid credentials' : 'Server error');
        }
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = async () => {
    if (canGoBack) {
      try {
        await AsyncStorage.removeItem('previousRoute');
      } catch (error) {
        console.log('Error cleaning up previous route:', error);
      }
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('../customer/home');
      }
    }
  };

  // ... (return component JSX uhindure uko wabitse haruguru)

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {canGoBack && (
            <View style={styles.backButtonContainer}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Ionicons name="arrow-back" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/images/log.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandName}>Login To FreshNess</Text>
            <Text style={styles.subtitle}>Welcome back! Sign in to continue</Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons 
                  name="call-outline" 
                  size={20} 
                  color={colors.textLight} 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor={colors.textLight}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={20} 
                  color={colors.textLight} 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons 
                    name={showPassword ? "eye-outline" : "eye-off-outline"} 
                    size={20} 
                    color={colors.textLight}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => router.push('/forgetpassword')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[colors.primary, '#1d4ed8']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.background} />
                    <Text style={styles.buttonText}>Logging in...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Log In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.signupLink}
              onPress={() => router.push('/auth/signup')}
            >
              <Text style={styles.linkText}>
                Don't have an account? <Text style={styles.linkHighlight}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: height,
  },
  backButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: 20,
    zIndex: 1000,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  logoContainer: {
    marginBottom: 20,
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  logo: {
    width: 90,
    height: 90,
  },
  brandName: {
    fontSize: 32,
    fontWeight: 'bold',
    color:'#1D4ED8',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: 22,
  },
  formSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.lightBg || '#E5E7EB',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 16,
    fontSize: 16,
    color: colors.textDark,
  },
  eyeIcon: {
    padding: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signupLink: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  linkText: {
    fontSize: 16,
    color: colors.textLight,
  },
  linkHighlight: {
    color: colors.accent,
    fontWeight: 'bold',
  },
});