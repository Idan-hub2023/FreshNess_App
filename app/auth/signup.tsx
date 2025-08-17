import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const validateInputs = () => {
    // Check required fields
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }

    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return false;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a password');
      return false;
    }

    if (!confirmPassword.trim()) {
      Alert.alert('Error', 'Please confirm your password');
      return false;
    }

    // Check password match
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    // Check password length (backend validates max 20)
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }

    if (password.length > 20) {
      Alert.alert('Error', 'Password cannot be more than 20 characters');
      return false;
    }

    // Validate phone number
    if (!/^\d{10,15}$/.test(phone)) {
      Alert.alert('Error', 'Please enter a valid phone number (10-15 digits)');
      return false;
    }

    // Validate email if provided
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    // Check terms agreement
    if (!agreeTerms) {
      Alert.alert('Error', 'You must agree to the terms and conditions');
      return false;
    }

    return true;
  };

  const baseURL = Platform.OS === 'android' 
    ? 'https://freshness-eakm.onrender.com/api' 
    : 'http://192.168.1.67:5000/api';

  const handleSignup = async () => {
    if (!validateInputs()) return;

    setIsLoading(true);

    try {
      const userData = {
        fullname: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined, // Send undefined if empty
        password: password,
      };

      const response = await axios.post(`${baseURL}/add/user`, userData, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // Success response
      const { user } = response.data;
      const userRole = user?.role || 'user';
      
      let successMessage = 'Account created successfully!';
      if (userRole === 'rider') {
        successMessage = 'Welcome! Your rider account has been activated successfully!';
      }

      Alert.alert(
        'Success', 
        successMessage,
        [
          {
            text: 'Continue',
            onPress: () => router.replace('./login')
          }
        ]
      );

    } catch (error) {
      console.error('Signup error:', error);
      
      let errorMessage = 'Signup failed. Please try again.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection and try again.';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.response) {
        const status = error.response.status;
        const responseMessage = error.response.data?.message;
        
        switch (status) {
          case 400:
            if (responseMessage?.includes('Email or phone already registered')) {
              errorMessage = 'An account with this email or phone number already exists';
            } else if (responseMessage?.includes('Password max length')) {
              errorMessage = 'Password is too long (maximum 20 characters)';
            } else {
              errorMessage = responseMessage || 'Invalid data provided. Please check your information.';
            }
            break;
          case 409:
            errorMessage = 'User already exists with this phone number or email';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
          default:
            errorMessage = responseMessage || `Server error (${status}). Please try again.`;
        }
      }
      
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.container}>
        {/* Background Design */}
        <LinearGradient
          colors={[colors.primary, '#1d4ed8', '#2563eb']}
          style={styles.headerBackground}
        >
          {/* Decorative circles */}
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
          <View style={[styles.circle, styles.circle3]} />
        </LinearGradient>

        <KeyboardAvoidingView 
          style={styles.keyboardContainer} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {/* Header Section with Logo */}
            <View style={styles.headerSection}>
              <View style={styles.logoContainer}>
                <View style={styles.logoBackground}>
                  <Image
                    source={require('../../assets/images/log.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <Text style={styles.brandName}>Join Freshness</Text>
              <Text style={styles.subtitle}>Create your account today</Text>
            </View>

            {/* Main Content Card */}
            <View style={styles.contentCard}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.description}>Fill in your details to get started</Text>

              {/* Full Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <View style={[
                  styles.inputWrapper, 
                  focusedInput === 'name' && styles.inputFocused
                ]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons 
                      name="person-outline" 
                      size={20} 
                      color={focusedInput === 'name' ? colors.primary : colors.textLight}
                    />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.textLight}
                    value={name}
                    onChangeText={setName}
                    // onFocus={() => setFocusedInput('name')}
                    // onBlur={() => setFocusedInput(null)}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Phone Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number *</Text>
                <View style={[
                  styles.inputWrapper, 
                  focusedInput === 'phone' && styles.inputFocused
                ]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons 
                      name="call-outline" 
                      size={20} 
                      color={focusedInput === 'phone' ? colors.primary : colors.textLight}
                    />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your phone number"
                    placeholderTextColor={colors.textLight}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    returnKeyType="next"
                    // onFocus={() => setFocusedInput('phone')}
                    // onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Email <Text style={styles.optionalText}>(Optional)</Text>
                </Text>
                <View style={[
                  styles.inputWrapper, 
                  focusedInput === 'email' && styles.inputFocused
                ]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons 
                      name="mail-outline" 
                      size={20} 
                      color={focusedInput === 'email' ? colors.primary : colors.textLight}
                    />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email address"
                    placeholderTextColor={colors.textLight}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    // onFocus={() => setFocusedInput('email')}
                    // onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password *</Text>
                <Text style={styles.passwordHint}>6-20 characters</Text>
                <View style={[
                  styles.inputWrapper, 
                  focusedInput === 'password' && styles.inputFocused
                ]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons 
                      name="lock-closed-outline" 
                      size={20} 
                      color={focusedInput === 'password' ? colors.primary : colors.textLight}
                    />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Create a strong password"
                    placeholderTextColor={colors.textLight}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="next"
                    maxLength={20}
                    // onFocus={() => setFocusedInput('password')}
                    // onBlur={() => setFocusedInput(null)}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-outline" : "eye-off-outline"} 
                      size={20} 
                      color={colors.textLight}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password *</Text>
                <View style={[
                  styles.inputWrapper, 
                  focusedInput === 'confirmPassword' && styles.inputFocused
                ]}>
                  <View style={styles.inputIconContainer}>
                    <Ionicons 
                      name="shield-checkmark-outline" 
                      size={20} 
                      color={focusedInput === 'confirmPassword' ? colors.primary : colors.textLight}
                    />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    placeholderTextColor={colors.textLight}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    returnKeyType="done"
                    maxLength={20}
                    // onFocus={() => setFocusedInput('confirmPassword')}
                    // onBlur={() => setFocusedInput(null)}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                      size={20} 
                      color={colors.textLight}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Terms and Conditions */}
              <TouchableOpacity 
                style={styles.termsContainer}
                onPress={() => setAgreeTerms(!agreeTerms)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                  {agreeTerms && (
                    <Ionicons name="checkmark" size={16} color={colors.background} />
                  )}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.termsLink}>Terms & Conditions</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              {/* Create Account Button */}
              <TouchableOpacity 
                style={[
                  styles.signupButton, 
                  (!agreeTerms || isLoading) && styles.buttonDisabled
                ]} 
                onPress={handleSignup}
                disabled={!agreeTerms || isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={(!agreeTerms || isLoading) ? ['#94a3b8', '#64748b'] : [colors.primary, '#1d4ed8']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={colors.background} />
                      <Text style={styles.buttonText}>Creating Account...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <Text style={styles.buttonText}>Create Account</Text>
                      <Ionicons name="arrow-forward" size={20} color={colors.background} />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Benefits Section */}
              <View style={styles.benefitsContainer}>
                <Text style={styles.benefitsTitle}>Why join Freshness?</Text>
                <View style={styles.benefitsList}>
                  <View style={styles.benefitItem}>
                    <View style={styles.benefitIcon}>
                      <Ionicons name="leaf" size={16} color={colors.accent} />
                    </View>
                    <Text style={styles.benefitText}>Fresh produce delivered daily</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <View style={styles.benefitIcon}>
                      <Ionicons name="flash" size={16} color={colors.accent} />
                    </View>
                    <Text style={styles.benefitText}>Lightning fast delivery</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <View style={styles.benefitIcon}>
                      <Ionicons name="shield-checkmark" size={16} color={colors.accent} />
                    </View>
                    <Text style={styles.benefitText}>Quality guarantee</Text>
                  </View>
                </View>
              </View>

              {/* Info Note */}
            </View>

            {/* Bottom Section */}
            <View style={styles.bottomSection}>
              <TouchableOpacity 
                style={styles.loginContainer}
                onPress={() => router.push('/auth/login')}
                activeOpacity={0.7}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Text style={styles.loginText}>
                  Already have an account? 
                </Text>
                <Text style={styles.loginLink}> Sign In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.35,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 999,
  },
  circle1: {
    width: 180,
    height: 180,
    top: -40,
    right: -40,
  },
  circle2: {
    width: 120,
    height: 120,
    top: height * 0.12,
    left: -20,
  },
  circle3: {
    width: 80,
    height: 80,
    top: height * 0.2,
    right: width * 0.25,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoBackground: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 24,
    elevation: 10,
  },
  logo: {
    width: 60,
    height: 60,
  },
  brandName: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.background,
    marginBottom: 6,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '400',
  },
  contentCard: {
    backgroundColor: colors.background,
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginTop: -15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 15,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 15,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 28,
    fontWeight: '400',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 8,
    marginLeft: 4,
  },
  optionalText: {
    fontWeight: '400',
    color: colors.textLight,
    fontSize: 12,
  },
  passwordHint: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 6,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightBg,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.lightBg,
    minHeight: 52,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  inputIconContainer: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 16,
    fontSize: 15,
    color: colors.textDark,
    fontWeight: '400',
  },
  eyeIcon: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.textLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  signupButton: {
    borderRadius: 14,
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.background,
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitsContainer: {
    backgroundColor: colors.lightBg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 16,
    textAlign: 'center',
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitText: {
    fontSize: 14,
    color: colors.textDark,
    fontWeight: '500',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.primary,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loginText: {
    fontSize: 16,
    color: colors.textLight,
    fontWeight: '400',
  },
  loginLink: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
});