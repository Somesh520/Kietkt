import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Alert
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

// ⚡ AGGRESSIVE SPEED SCRIPT: Block images + Fast login detect
const FAST_LOGIN_SCRIPT = `
  (function() {
    // 1. BLOCK IMAGE LOADING - सबसे पहले ये करो!
    // Override Image constructor
    const OriginalImage = window.Image;
    window.Image = function() {
      const img = new OriginalImage();
      Object.defineProperty(img, 'src', {
        set: function(v) { /* Block */ },
        get: function() { return ''; }
      });
      return img;
    };

    // Stop img tags from loading
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        m.addedNodes.forEach(function(node) {
          if (node.tagName === 'IMG') {
            node.removeAttribute('src');
            node.removeAttribute('srcset');
          }
        });
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // 2. 🔥 ALWAYS Clear Storage on Initial Load (Prevents Auto-Login)
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
      console.log('🧹 Storage cleared on page load');
    } catch(e) {
      console.log('Clear failed:', e);
    }

    // 3. Fast Token Polling (200ms)
    var check = setInterval(function() {
      var token = localStorage.getItem('authenticationtoken');
      if (token && token.length > 5) {
        clearInterval(check);
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGIN_DONE', token: token }));
      }
    }, 200);
  })();
  true;
`;

const LoginPage = ({ onLoginSuccess }: LoginProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  // 🔥 Clear session on mount to prevent auto-login
  React.useEffect(() => {
    const clearSession = async () => {
      try {
        // Clear WebView cache and storage
        webViewRef.current?.clearCache(true);

        // Inject script to clear all storage
        webViewRef.current?.injectJavaScript(`
          localStorage.clear();
          sessionStorage.clear();
          true;
        `);

        console.log('✅ WebView session cleared');
      } catch (e) {
        console.log('Failed to clear session:', e);
      }
    };

    // Small delay to ensure WebView is ready
    setTimeout(clearSession, 500);
  }, []);

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LOGIN_DONE') {
        let finalToken = data.token;
        if (finalToken.startsWith('"')) finalToken = JSON.parse(finalToken);
        if (!finalToken.includes('GlobalEducation')) finalToken = `GlobalEducation ${finalToken}`;

        // 🚀 INSTANT ACTION: No Animation Wait
        await AsyncStorage.setItem('authToken', finalToken);
        logEvent(getAnalytics(), 'login_success', { method: 'rocket_mode' });
        onLoginSuccess(finalToken);
      }
    } catch (e) { }
  };

  const handleReload = () => {
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  const handleClearCache = () => {
    Alert.alert("Reset", "Clear Cache & Reload?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes", onPress: () => {
          setIsLoading(true);
          webViewRef.current?.clearCache(true);
          webViewRef.current?.reload();
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CyberVidya (Lite Mode) ⚡</Text>
      </View>

      <View style={styles.webViewContainer}>

        {/* Loader jo turant hatt jayega */}
        {isLoading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#2980b9" />
            <Text style={styles.loadingText}>Connecting...</Text>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ uri: LOGIN_URL }}
          style={styles.webView}
          injectedJavaScript={FAST_LOGIN_SCRIPT}
          onMessage={handleMessage}

          // 🔥🔥 THE SPEED HACKS 🔥🔥
          // blockNetworkImage={true}         // 1. Images Block (Sabse Tez)
          cacheEnabled={true}              // 2. Cache On
          cacheMode="LOAD_CACHE_ELSE_NETWORK" // 3. Agar cache hai, to net mat use karo

          userAgent={USER_AGENT}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          androidLayerType="hardware"      // 4. GPU Acceleration
          overScrollMode="never"

          // 🚀 Aggressive Loader Hiding
          onLoadProgress={({ nativeEvent }) => {
            // Wait for 75% load to avoid partial rendering
            if (nativeEvent.progress > 0.75) setIsLoading(false);
          }}
        />

        {/* Reload Button (Agar atak jaye) */}
        {!isLoading && (
          <TouchableOpacity style={styles.reloadBtn} onPress={handleReload} onLongPress={handleClearCache}>
            <Icon name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { height: 45, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },

  webViewContainer: { flex: 1 },
  webView: { flex: 1 },

  loaderContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', zIndex: 10 },
  loadingText: { marginTop: 10, color: '#555' },

  reloadBtn: {
    position: 'absolute', bottom: 30, right: 30,
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#2980b9',
    justifyContent: 'center', alignItems: 'center',
    elevation: 5, zIndex: 100
  }
});

export default LoginPage;