import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Pressable,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login } from '../api';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios'; // ✅ Axios ko import karein

const USER_CREDENTIALS_KEY = 'userCredentials';
const REMEMBER_ME_KEY = 'rememberMe';

// --- Custom Checkbox Component ---
const CustomCheckbox = ({ isChecked, onCheck, children }: any) => (
  <Pressable onPress={() => onCheck(!isChecked)} style={styles.checkboxContainer}>
    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
      {isChecked && <Icon name="checkmark" size={16} color="#fff" />}
    </View>
    <View style={styles.checkboxLabel}>{children}</View>
  </Pressable>
);

const LoginPage = ({ onLoginSuccess }: { onLoginSuccess: (token: string) => void; }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const rememberMePref = await AsyncStorage.getItem(REMEMBER_ME_KEY);
        if (rememberMePref !== 'false') {
          setRememberMe(true);
          const credsString = await AsyncStorage.getItem(USER_CREDENTIALS_KEY);
          if (credsString) {
            const { username: savedUser, password: savedPass } = JSON.parse(credsString);
            setUsername(savedUser);
            setPassword(savedPass);
          }
        } else {
          setRememberMe(false);
        }
      } catch (e) {
        console.error("Failed to load credentials.", e);
      }
    };
    loadCredentials();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLoginPress = async () => {
    if (!username || !password) {
      setError('Username and password are required.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const token = await login(username, password);

      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBER_ME_KEY, 'true');
        await AsyncStorage.setItem(USER_CREDENTIALS_KEY, JSON.stringify({ username, password }));
      } else {
        await AsyncStorage.setItem(REMEMBER_ME_KEY, 'false');
        await AsyncStorage.removeItem(USER_CREDENTIALS_KEY);
      }
      onLoginSuccess(token);
    } catch (err: any) {
      // ✅ Yahan badlav kiya gaya hai
      // Ab yeh backend se aa rahe 'error' message ko padhega
      if (axios.isAxiosError(err) && err.response) {
        // Agar server se error message aaya hai, toh use dikhayein
        setError(err.response.data.error || 'An error occurred.');
      } else {
        // Agar network ya koi aur error hai
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isWarning = error.toLowerCase().includes('attempt');

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#e7f2f8', '#f4f6f8']} style={styles.gradient}>
        <StatusBar barStyle="dark-content" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <Animated.Image
              source={{ uri: 'https://placehold.co/150x150/2c3e50/FFFFFF?text=B' }} // Changed text to B
              style={[styles.logo, { opacity: fadeAnim }]}
            />
            <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
              Welcome to BunkBook
            </Animated.Text>
            <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
              Sign in to continue
            </Animated.Text>
            <Animated.Text style={[styles.instructions, { opacity: fadeAnim }]}>
              Use your official KIET CyberVidya credentials.
            </Animated.Text>

            <View>
              <View style={styles.inputContainer}>
                <Icon name="person-outline" size={22} color="#7f8c8d" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Cybervidya Username"
                  placeholderTextColor="#7f8c8d"
                  value={username}
                  onChangeText={setUsername}
                  keyboardType="default"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputContainer}>
                <Icon name="lock-closed-outline" size={22} color="#7f8c8d" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Cybervidya Password"
                  placeholderTextColor="#7f8c8d"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!isPasswordVisible}
                />
                <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon}>
                  <Icon name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={22} color="#7f8c8d" />
                </TouchableOpacity>
              </View>
              <CustomCheckbox isChecked={rememberMe} onCheck={setRememberMe}>
                 <Text style={styles.checkboxText}>Remember Me</Text>
              </CustomCheckbox>
            </View>

            {error ? (
              <View style={[styles.errorContainer, isWarning && styles.warningContainer]}>
                <Icon name="alert-circle-outline" size={22} color={isWarning ? '#f39c12' : '#c0392b'} />
                <Text style={[styles.errorText, isWarning && styles.warningText]}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                isLoading && styles.buttonDisabled,
                pressed && styles.buttonPressed
              ]}
              onPress={handleLoginPress}
              disabled={isLoading}
            >
              {isLoading ? ( <ActivityIndicator color="#ffffff" /> ) : ( <Text style={styles.buttonText}>Sign In</Text> )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  gradient: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo: { width: 90, height: 90, alignSelf: 'center', marginBottom: 30, borderRadius: 25 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#7f8c8d', textAlign: 'center', marginBottom: 15 },
  instructions: { fontSize: 14, color: '#34495e', textAlign: 'center', marginBottom: 40, paddingHorizontal: 10 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#ecf0f1', elevation: 2, shadowColor: '#bdc3c7', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  icon: { paddingLeft: 15 },
  input: { flex: 1, height: 55, paddingHorizontal: 10, fontSize: 16, color: '#2c3e50' },
  eyeIcon: { padding: 15 },
  button: { backgroundColor: '#2c3e50', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 3, shadowColor: '#2c3e50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  buttonPressed: { transform: [{ scale: 0.98 }], elevation: 1 },
  buttonDisabled: { backgroundColor: '#95a5a6' },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(192, 57, 43, 0.1)', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 10, marginBottom: 10 },
  warningContainer: { backgroundColor: 'rgba(243, 156, 18, 0.1)' },
  errorText: { color: '#c0392b', fontWeight: '500', marginLeft: 10, flex: 1 },
  warningText: { color: '#f39c12' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 0 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#bdc3c7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkboxChecked: { backgroundColor: '#2c3e50', borderColor: '#2c3e50' },
  checkboxLabel: { flex: 1 },
  checkboxText: { fontSize: 14, color: '#34495e' },
});

export default LoginPage;
