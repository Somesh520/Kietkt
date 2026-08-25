import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  ImageBackground,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
const { width, height: wHeight } = Dimensions.get('window');
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { getAnalytics, logEvent } from '@react-native-firebase/analytics';
import { useTheme } from '../ThemeContext';
import CryptoJS from 'crypto-js';
import axios from 'axios';

// --- API ENCRYPTION ---
const keyB64 = "NPdLWA5w7yFQhPeUuKmO/A==";
const ivB64 = "bV5V6nK4phvQG9ZhkAjugQ==";
const key = CryptoJS.enc.Base64.parse(keyB64);
const iv = CryptoJS.enc.Base64.parse(ivB64);

function encryptText(text: string) {
  const encrypted = CryptoJS.AES.encrypt(text, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return encrypted.toString();
}

// Dummy export in case it's imported elsewhere in the app
export const RootLoginWebView = () => null;

type LoginProps = {
  onLoginSuccess: (token: string) => void;
};

const LoginPage = ({ onLoginSuccess }: LoginProps) => {
  const { colors, isDark, isBrutalist } = useTheme();
  
  // Native Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isNativeLoading, setIsNativeLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('saved_username');
        const savedPass = await AsyncStorage.getItem('saved_password');
        if (savedUser && savedPass) {
          setUsername(savedUser);
          setPassword(savedPass);
          setRememberMe(true);
        }
      } catch (e) {
        console.log('Failed to load saved credentials', e);
      }
    };
    loadCredentials();
  }, []);

  const handleLoginSuccessMethod = async (token: string, method: string) => {
    let finalToken = token;
    if (finalToken.startsWith('"')) finalToken = JSON.parse(finalToken);
    if (!finalToken.includes('GlobalEducation')) finalToken = `GlobalEducation ${finalToken}`;

    // Handle Remember Me
    try {
      if (rememberMe && !otpStep) {
        await AsyncStorage.setItem('saved_username', username);
        await AsyncStorage.setItem('saved_password', password);
      } else if (!rememberMe && !otpStep) {
        await AsyncStorage.removeItem('saved_username');
        await AsyncStorage.removeItem('saved_password');
      }
    } catch (e) {
      console.log('Failed to save credentials', e);
    }

    onLoginSuccess(finalToken);
    AsyncStorage.setItem('authToken', finalToken).catch(() => {});
    logEvent(getAnalytics(), 'login_success', { method });
  };

  const handleNativeLogin = async () => {
    console.log('--- LOGIN BUTTON PRESSED ---', { username, passwordLength: password.length, otpStep, rememberMe });
    if (!username || !password) {
      setErrorMsg('Username and password are required.');
      return;
    }
    setErrorMsg('');
    setIsNativeLoading(true);
    let payload: any = {};
    let headers: any = {};

    try {
      console.log('1. Building payload...');
      payload = {
        userName: encryptText(username),
        password: encryptText(password),
        device: "WEB",
        version: null,
        reCaptchaToken: null
      };
      console.log('2. Payload built:', JSON.stringify(payload));
      
      headers = {
        'sec-ch-ua-platform': '"macOS"',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'sec-ch-ua': '"Not=A?Brand";v="99", "Brave";v="151", "Chromium";v="151"',
        'Content-Type': 'application/json',
        'sec-ch-ua-mobile': '?0',
        'Sec-GPC': '1',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
        'host': 'kiet.cybervidya.net'
      };
      
      console.log('3. Sending POST request to /login...');
      const response = await axios.post('https://kiet.cybervidya.net/api/auth/encrypt/login', payload, { headers, timeout: 15000 });
      console.log('4. POST request completed!');
      console.log('Login Success Response Status:', response.status);
      console.log('Login Success Response Data:', JSON.stringify(response.data));

      if (response.data && response.data.token) {
        handleLoginSuccessMethod(response.data.token, 'native_direct');
      } else if (response.data && response.data.transactionId) {
        setTransactionId(response.data.transactionId);
        setOtpStep(true);
      } else if (response.data && response.data.id_token) {
        handleLoginSuccessMethod(response.data.id_token, 'native_direct');
      } else if (response.data && response.data.data && response.data.data.transactionId) {
        setTransactionId(response.data.data.transactionId);
        setOtpStep(true);
      } else if (response.data && typeof response.data.message === 'string' && response.data.message.toLowerCase().includes('otp')) {
        setTransactionId('');
        setOtpStep(true);
      } else {
        setErrorMsg('Raw: ' + JSON.stringify(response.data));
      }
    } catch (e: any) {
      console.log('Login Error Payload:', JSON.stringify(payload));
      console.log('Login Error Response Status:', e?.response?.status);
      console.log('Login Error Response Data:', JSON.stringify(e?.response?.data || e.message));
      
      let data = e.response?.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (err) {}
      }

      let serverError = data?.error?.reason || data?.message || data?.error;
      if (typeof serverError === 'object') {
        serverError = JSON.stringify(serverError);
      }
      
      const finalError = serverError ? String(serverError) : (e.message || 'An error occurred during login');
      
      setErrorMsg(finalError);
    } finally {
      setIsNativeLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    console.log('--- OTP BUTTON PRESSED ---', otp, transactionId);
    if (!otp) {
      setErrorMsg('OTP is required.');
      return;
    }
    setErrorMsg('');
    setIsNativeLoading(true);
    let payload: any = {};
    let headers: any = {};

    try {
      payload = { otp, transactionId, device: "WEB", version: null };
      headers = {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'Sec-GPC': '1',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
        'x-csrf-token': 'b41ef973-c6a5-47db-95d7-87fa0bb2c8b6',
        'host': 'kiet.cybervidya.net'
      };

      const response = await axios.post('https://kiet.cybervidya.net/api/auth/verify/otp', payload, { headers, timeout: 15000 });
      console.log('OTP Verify Response Status:', response.status);
      console.log('OTP Verify Response Data:', JSON.stringify(response.data));

      if (response.data && response.data.token) {
        handleLoginSuccessMethod(response.data.token, 'native_otp');
      } else if (response.data && response.data.id_token) {
        handleLoginSuccessMethod(response.data.id_token, 'native_otp');
      } else if (response.data && response.data.data && response.data.data.token) {
        handleLoginSuccessMethod(response.data.data.token, 'native_otp');
      } else if (response.data && response.data.data && response.data.data.id_token) {
        handleLoginSuccessMethod(response.data.data.id_token, 'native_otp');
      } else if (response.data && response.data.data && typeof response.data.data === 'string' && response.data.data.length > 20) {
        // sometimes the token is just directly in the 'data' field
        handleLoginSuccessMethod(response.data.data, 'native_otp');
      } else {
        setErrorMsg('Raw: ' + JSON.stringify(response.data));
      }
    } catch (e: any) {
      console.log('OTP Verify Error Payload:', JSON.stringify(payload));
      console.log('OTP Verify Error Response Status:', e?.response?.status);
      console.log('OTP Verify Error Response Data:', JSON.stringify(e?.response?.data || e.message));
      
      let data = e.response?.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (err) {}
      }

      let serverError = data?.error?.reason || data?.message || data?.error;
      if (typeof serverError === 'object') {
        serverError = JSON.stringify(serverError);
      }
      
      const finalError = serverError ? String(serverError) : (e.message || 'An error occurred verifying OTP');
      
      setErrorMsg(finalError);
    } finally {
      setIsNativeLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.headerBg} />
      
      <View style={[styles.header, { backgroundColor: colors.headerBg }, !isBrutalist && { borderBottomWidth: 1, borderColor: colors.border }]}>
        <Icon name="flash" size={18} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Bunkbook Login</Text>
      </View>

      <View style={styles.formWrapper}>
        <ImageBackground 
          source={require('../assets/images/login_bg.jpg')} 
          style={StyleSheet.absoluteFillObject} 
          resizeMode="cover"
        />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} 
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 60}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.nativeFormContainer} keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false}>
            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Welcome Back</Text>
            <Text style={[styles.formSubtitle, { color: colors.subText }]}>
              {otpStep ? 'Enter the OTP sent to your device' : 'Sign in to access your portal'}
            </Text>

            {errorMsg ? (
              <View style={[styles.errorContainer, { backgroundColor: isDark ? 'rgba(255, 68, 68, 0.15)' : '#ffeaea' }]}>
                <Icon name="warning" size={16} color="#ff4444" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {!otpStep ? (
              <>
                <View style={[styles.inputContainer, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
                  <Icon name="person-outline" size={20} color={colors.subText} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Username"
                    placeholderTextColor={colors.subText}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>
                <View style={[styles.inputContainer, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5', marginBottom: 12 }]}>
                  <Icon name="lock-closed-outline" size={20} color={colors.subText} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Password"
                    placeholderTextColor={colors.subText}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                    <Icon name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={colors.subText} />
                  </TouchableOpacity>
                </View>

                {/* Remember Me Row */}
                <TouchableOpacity 
                  style={styles.rememberRow} 
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <Icon 
                    name={rememberMe ? "checkbox" : "square-outline"} 
                    size={22} 
                    color={rememberMe ? colors.primary : colors.subText} 
                  />
                  <Text style={[styles.rememberText, { color: colors.subText }]}>Remember Me</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={[styles.inputContainer, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
                <Icon name="key-outline" size={20} color={colors.subText} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="OTP"
                  placeholderTextColor={colors.subText}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                />
              </View>
            )}

            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={otpStep ? handleVerifyOtp : handleNativeLogin}
              disabled={isNativeLoading}
              style={{ marginTop: 8 }}
            >
              <LinearGradient
                colors={[colors.primary, isDark ? '#4A4A4A' : '#7F56D9']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }}
                style={styles.submitButton}
              >
                {isNativeLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>{otpStep ? 'Verify OTP' : 'Login to Bunkbook'}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 56, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  formWrapper: { flex: 1 },
  nativeFormContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 20 },
  formCard: { 
    padding: 32, 
    borderRadius: 32, 
    borderWidth: 1, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 20 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 40, 
    elevation: 12,
    backgroundColor: 'rgba(255,255,255,0.98)',
    overflow: 'hidden'
  },
  formTitle: { fontSize: 32, fontWeight: '800', marginBottom: 8, letterSpacing: -1 },
  formSubtitle: { fontSize: 15, marginBottom: 28, lineHeight: 22 },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 16, 
    marginBottom: 16, 
    paddingHorizontal: 16, 
    height: 56,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, height: '100%' },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 4,
  },
  rememberText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  submitButton: { 
    height: 56, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  submitButtonText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  errorContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 20 
  },
  errorText: { color: '#ff4444', fontSize: 13.5, fontWeight: '600', flex: 1 }
});

export default LoginPage;
