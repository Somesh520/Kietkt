import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Text,
  SafeAreaView,
  Animated,
  Easing
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { getAnalytics, logEvent } from '@react-native-firebase/analytics';

const LOGIN_URL = 'https://kiet.cybervidya.net/';
const USER_AGENT = "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36";

type LoginProps = {
  onLoginSuccess: (token: string) => void;
};

// 🧹 CLEANUP SCRIPT (Previous session clear)
const CLEAR_SESSION_SCRIPT = `
    (function() {
      window.localStorage.clear();
      window.sessionStorage.clear();
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
    })();
    true;
  `;

// 🛠️ LOGIN DETECTION SCRIPT - Optimized for speed (100ms polling, immediate clear)
const CHECK_LOGIN_SCRIPT = `
    var intervalId = setInterval(function() {
      var url = window.location.href;
      if (url.includes('home') || url.includes('dashboard') || url.includes('main')) {
        var token = localStorage.getItem('authenticationtoken');
        if (token) {
          clearInterval(intervalId); // 🔥 महत्वपूर्ण: टोकन मिलने पर तुरंत बंद करें
          if (token.startsWith('"')) { token = JSON.parse(token); }
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'LOGIN_DONE',
            token: token
          }));
        }
      }
    }, 100); // 100 मिलीसेकंड पर चेक करें
`;

const LoginPage = ({ onLoginSuccess }: LoginProps) => {
  const [loading, setLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showAnim, setShowAnim] = useState(false); 
  
  const webViewRef = useRef<WebView>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;  
  const scaleAnim = useRef(new Animated.Value(0.3)).current; 

  const triggerSuccessAnimation = async (finalToken: string) => {
    setShowAnim(true); 
    await AsyncStorage.setItem('authToken', finalToken);

    // 📊 ANALYTICS LOGGING
    try {
        await logEvent(getAnalytics(), 'login_success', {
            method: 'cybervidya_webview',
            timestamp: new Date().toISOString(),
        });
        console.log("📊 Analytics Event Sent");
    } catch (error) {
        console.log("⚠️ Analytics Error:", error);
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();

    // 1.5 सेकंड के बजाय, 1 सेकंड के बाद रीडायरेक्ट करें
    setTimeout(() => {
      onLoginSuccess(finalToken);
    }, 1000); // 🔥 500ms कम किया गया
  };

  const handleMessage = async (event: any) => {
    if (isSuccess) return;
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LOGIN_DONE') {
        console.log("✅ Login Found!");
        let finalToken = data.token;
        if (!finalToken.includes('GlobalEducation')) {
            finalToken = `GlobalEducation ${finalToken}`;
        }
        setIsSuccess(true);
        triggerSuccessAnimation(finalToken);
      }
    } catch (e) { }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CyberVidya Login</Text>
      </View>

      <View style={styles.securityBanner}>
        <Icon name="information-circle" size={18} color="#856404" />
        <Text style={styles.securityText}>
          Due to tightened security on CyberVidya, we are using this secure browser method to log you in.
        </Text>
      </View>

      <View style={styles.webViewContainer}>
        {loading && !showAnim && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#2980b9" />
            <Text style={styles.loadingText}>Opening Portal...</Text>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ uri: LOGIN_URL }}
          style={styles.webView}
          injectedJavaScriptBeforeContentLoaded={CLEAR_SESSION_SCRIPT}
          injectedJavaScript={CHECK_LOGIN_SCRIPT} // ✅ Updated Script
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={true}
          cacheEnabled={true}
          mixedContentMode="always" 
          userAgent={USER_AGENT}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          androidLayerType="hardware" // 🔥 Android Performance Improvement
        />

        {showAnim && (
          <View style={styles.successOverlay}>
            <Animated.View style={[styles.animBox, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
              <View style={styles.iconCircle}>
                <Icon name="checkmark" size={50} color="#fff" />
              </View>
              <Text style={styles.successTitle}>Login Successful!</Text>
              <Text style={styles.successSub}>Redirecting to App...</Text>
            </Animated.View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Icon name="lock-closed" size={14} color="green" />
        <Text style={styles.footerText}> End-to-End Encrypted Session </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { height: 50, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  securityBanner: { backgroundColor: '#fff3cd', padding: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#ffeeba' },
  securityText: { color: '#856404', fontSize: 12, marginLeft: 8, flex: 1, flexWrap: 'wrap' },
  webViewContainer: { flex: 1, width: '100%', height: '100%', position: 'relative' },
  webView: { flex: 1, backgroundColor: 'transparent' },
  loaderContainer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', zIndex: 10 },
  loadingText: { marginTop: 10, color: '#2980b9' },
  
  successOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  
  animBox: { alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 20 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#27ae60', justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 8 },
  successTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 5 },
  successSub: { fontSize: 14, color: '#7f8c8d' },
  footer: { padding: 8, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#f9f9f9' },
  footerText: { fontSize: 12, color: '#666', marginLeft: 5 }
});

export default LoginPage;