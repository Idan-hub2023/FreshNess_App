import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function VerifyOTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email;
  const [otp, setOtp] = useState('');

const handleVerify = async () => {
  try {
    const response = await axios.post('https://freshness-eakm.onrender.com/api/auth/verify-otp', { 
      email, 
      otp 
    });
    
    if (response.data.success) {
      router.push({
        pathname: './ResetPasswordScreen',
        params: { email },
      });
    } else {
      Alert.alert('Error', response.data.message || 'Invalid OTP');
    }
    console.log('Verification response:', response.data);
  } catch (error) {
    console.error('Verification error:', error.response?.data || error.message);
    Alert.alert('Error', error.response?.data?.message || 'Verification failed');
  }
  
};

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>We've sent a verification code to</Text>
          <Text style={styles.email}>{email}</Text>
          <Text style={styles.instruction}>Enter the 6-digit code below</Text>
        </View>
        
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Verification Code</Text>
            <TextInput
              placeholder="000000"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              style={styles.input}
              placeholderTextColor="#9CA3AF"
              maxLength={6}
              textAlign="center"
            />
          </View>
          
          <TouchableOpacity onPress={handleVerify} style={styles.button}>
            <Text style={styles.buttonText}>Verify Code</Text>
          </TouchableOpacity>
          
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            <TouchableOpacity>
              <Text style={styles.resendLink}>Resend OTP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: { 
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    textAlign: 'center',
    marginBottom: 16,
  },
  instruction: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    height: 64,
    width: '100%',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: '600',
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    letterSpacing: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: { 
    color: '#FFFFFF', 
    textAlign: 'center', 
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  resendText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
});