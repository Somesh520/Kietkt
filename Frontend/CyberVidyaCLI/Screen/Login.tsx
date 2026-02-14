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

// 🚀🚀🚀 EXTREME SPEED SCRIPT 🚀🚀🚀
// 1. Nukes all non-login DOM elements
// 2. Blocks dynamically loaded scripts
// 3. Polls for login token
const EXTREME_SPEED_SCRIPT = `
  (function() {
    // 1. Clear storage (prevent auto-login)
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch(e) {}

    // 2. 🔥 NUKE NON-LOGIN ELEMENTS from DOM
    function stripPage() {
      // Remove heavy script tags
      var scripts = document.querySelectorAll('script[src]');
      scripts.forEach(function(s) {
        var src = s.src.toLowerCase();
        if (src.indexOf('jspdf') > -1 || src.indexOf('html2canvas') > -1 ||
            src.indexOf('mathlive') > -1 || src.indexOf('mathjax') > -1 ||
            src.indexOf('tabulator') > -1 || src.indexOf('highcharts') > -1 ||
            src.indexOf('easebuzz') > -1 || src.indexOf('adminlte') > -1 ||
            src.indexOf('daterangepicker') > -1 || src.indexOf('overlayScrollbars') > -1 ||
            src.indexOf('moment.min') > -1 || src.indexOf('jquery-ui') > -1 ||
            src.indexOf('bootstrap-select') > -1 || src.indexOf('d3.v5') > -1 ||
            src.indexOf('c3.min') > -1) {
          s.remove();
        }
      });

      // Remove unused CSS
      var links = document.querySelectorAll('link[rel="stylesheet"]');
      links.forEach(function(l) {
        var href = (l.href || '').toLowerCase();
        if (href.indexOf('tabulator') > -1 || href.indexOf('mathlive') > -1 ||
            href.indexOf('flaticon') > -1 || href.indexOf('icheck') > -1 ||
            href.indexOf('bootstrap-float-label') > -1 || href.indexOf('bootstrap-select') > -1 ||
            href.indexOf('c3.css') > -1 || href.indexOf('font-awesome.min.css') > -1) {
          l.remove();
        }
      });

      // Hide sidebar, footer, navbar
      var sidebar = document.querySelector('.main-sidebar');
      if (sidebar) sidebar.style.display = 'none';
      var footer = document.querySelector('.main-footer');
      if (footer) footer.style.display = 'none';
      var navbar = document.querySelector('.main-header');
      if (navbar) navbar.style.display = 'none';

      // Block all images
      var imgs = document.querySelectorAll('img');
      imgs.forEach(function(img) { img.src = ''; img.style.display = 'none'; });
    }

    stripPage();
    setTimeout(stripPage, 500);
    setTimeout(stripPage, 1500);
    setTimeout(stripPage, 3000);

    // 3. 🔒 BLOCK new script injections (MutationObserver)
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        m.addedNodes.forEach(function(node) {
          if (node.tagName === 'SCRIPT' && node.src) {
            var src = node.src.toLowerCase();
            if (src.indexOf('main-es') === -1 && src.indexOf('runtime') === -1 &&
                src.indexOf('polyfills') === -1 && src.indexOf('scripts.') === -1 &&
                src.indexOf('recaptcha') === -1 && src.indexOf('jquery.min') === -1 &&
                src.indexOf('bootstrap.min') === -1 && src.indexOf('popper') === -1) {
              node.remove();
            }
          }
        });
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // 4. ⚡ Fast Token Polling (200ms)
    var check = setInterval(function() {
      var token = localStorage.getItem('authenticationtoken');
      if (token && token.length > 5) {
        clearInterval(check);
        observer.disconnect();
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGIN_DONE', token: token }));
      }
    }, 200);
  })();
  true;
`;

const LoginPage = ({ onLoginSuccess }: LoginProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);
  const startTime = useRef(Date.now());

  // 🧹 Clears storage BEFORE Angular boots (prevents 404 after logout)
  const CLEAR_BEFORE_LOAD = `
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch(e) {}
    true;
  `;

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LOGIN_DONE') {
        let finalToken = data.token;
        if (finalToken.startsWith('"')) finalToken = JSON.parse(finalToken);
        if (!finalToken.includes('GlobalEducation')) finalToken = `GlobalEducation ${finalToken}`;

        await AsyncStorage.setItem('authToken', finalToken);
        logEvent(getAnalytics(), 'login_success', { method: 'rocket_mode' });

        const endTime = Date.now();
        const duration = (endTime - startTime.current) / 1000;
        console.log(`\n\n⏱️⏱️⏱️ LOGIN TOOK: ${duration} seconds ⏱️⏱️⏱️\n\n`);

        setIsLoading(false); // Hide Loader
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

      <View style={styles.header}>
        <Text style={styles.headerTitle}>CyberVidya (Lite Mode) ⚡</Text>
      </View>

      <View style={styles.webViewContainer}>

        {isLoading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#2980b9" />
            <Text style={styles.loadingText}>Loading Login...</Text>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ uri: LOGIN_URL }}
          style={styles.webView}
          injectedJavaScriptBeforeContentLoaded={CLEAR_BEFORE_LOAD}
          injectedJavaScript={EXTREME_SPEED_SCRIPT}
          onMessage={handleMessage}

          // @ts-ignore
          blockNetworkImage={true}
          cacheEnabled={true}
          cacheMode="LOAD_CACHE_ELSE_NETWORK"

          userAgent={USER_AGENT}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          androidLayerType="hardware"
          overScrollMode="never"
          startInLoadingState={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}

          onLoadProgress={({ nativeEvent }) => {
            if (nativeEvent.progress > 0.85) setIsLoading(false);
          }}
        />

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

  loaderContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', zIndex: 100 },
  loadingText: { marginTop: 20, color: '#2980b9', fontWeight: 'bold', fontSize: 16 },

  reloadBtn: {
    position: 'absolute', bottom: 30, right: 30,
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#2980b9',
    justifyContent: 'center', alignItems: 'center',
    elevation: 5, zIndex: 100
  }
});

export default LoginPage;