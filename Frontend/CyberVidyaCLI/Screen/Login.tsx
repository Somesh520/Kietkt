import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { login } from '../api'; // ✅ Sahi import path

// ✅ Props ke liye type define kiya gaya
interface LoginPageProps {
    onLoginSuccess: (token: string) => void;
}

const LoginPage = ({ onLoginSuccess }: LoginPageProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginPress = async () => {
    if (!username || !password) {
      setError('Username aur password zaroori hai.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const token = await login(username, password);
      onLoginSuccess(token);
    } catch (err: any) {
      setError(err.message || 'Login fail ho gaya. Credentials check karein.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <Image
          source={{ uri: 'https://placehold.co/150x150/000000/FFFFFF?text=CV' }}
          style={styles.logo}
        />
        <Text style={styles.title}>CyberVidya Login</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <TextInput
          style={styles.input}
          placeholder="University Roll Number"
          placeholderTextColor="#888"
          value={username}
          onChangeText={setUsername}
          keyboardType="numeric"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLoginPress}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Styles neeche hain...
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo: { width: 100, height: 100, alignSelf: 'center', marginBottom: 30, borderRadius: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  input: { height: 55, backgroundColor: '#f0f2f5', borderRadius: 12, paddingHorizontal: 16, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e0e0e0' },
  button: { backgroundColor: '#000000', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  buttonDisabled: { backgroundColor: '#555555' },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 10 }
});

export default LoginPage;
