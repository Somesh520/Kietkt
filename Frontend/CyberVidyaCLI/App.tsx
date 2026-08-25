import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet, StatusBar, Text, TouchableOpacity, Alert, Linking, Animated } from 'react-native';

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';

// 🔥 ADVANCED MODULAR ANALYTICS IMPORT
import {
  getAnalytics,
  logEvent,
  setUserId,
  setUserProperties,
  resetAnalyticsData
} from '@react-native-firebase/analytics';

import { ThemeProvider, useTheme } from './ThemeContext';

import LoginPage from './Screen/Login';
import HomeScreen from './Screen/Home';
import ProfileScreen from './Screen/profilescreen';
import TimetableScreen from './Screen/Timetable';
import CourseDetailsScreen from './Screen/CourseDetailsScreen';
import ExamScheduleScreen from './Screen/Exams';
import HallTicketScreen from './Screen/HallTicketScreen';
import NotificationSettings from './Screen/NotificationSettings';
import TripPlannerScreen from './Screen/TripPlannerScreen';
import SplashScreen from './Screen/SplashScreen';
import { logout, onAuthError } from './api';
import NotificationService from './services/NotificationService';

const AUTH_TOKEN_KEY = 'authToken';
const CURRENT_APP_VERSION = "v1.1.6";
const UPDATE_MANIFEST_URL = "https://raw.githubusercontent.com/Somesh520/Kietkt/main/update.json";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

type AuthProps = {
  onLogout: () => void;
};

// --- Custom Exam Manager ---
function ExamManagerScreen() {
  const [viewMode, setViewMode] = useState<'schedule' | 'ticket'>('schedule');
  const { colors, isDark, isBrutalist } = useTheme();
  const underlineAnim = useRef(new Animated.Value(0)).current;

  const switchTab = (mode: 'schedule' | 'ticket') => {
    setViewMode(mode);
    Animated.spring(underlineAnim, {
      toValue: mode === 'schedule' ? 0 : 1,
      friction: 8, tension: 60, useNativeDriver: true,
    }).start();
    logEvent(getAnalytics(), 'select_content', { content_type: 'exam_tab', item_id: mode === 'schedule' ? 'datesheet' : 'hall_ticket' });
  };

  const brutBorder = isDark ? '#FFF' : '#000';

  return (
    <SafeAreaView style={[styles.examContainer, { backgroundColor: colors.background }]}>
      <View style={[
        styles.toggleContainer,
        { backgroundColor: colors.card, borderBottomColor: colors.border },
        isBrutalist && { borderBottomWidth: 4, borderColor: brutBorder }
      ]}>
        <TouchableOpacity style={styles.toggleBtn} onPress={() => switchTab('schedule')}>
          <Text style={[
            styles.toggleText,
            { color: viewMode === 'schedule' ? colors.primary : colors.subText },
            viewMode === 'schedule' && { fontWeight: 'bold' },
            isBrutalist && { fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }
          ]}>Datesheet</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toggleBtn} onPress={() => switchTab('ticket')}>
          <Text style={[
            styles.toggleText,
            { color: viewMode === 'ticket' ? colors.primary : colors.subText },
            viewMode === 'ticket' && { fontWeight: 'bold' },
            isBrutalist && { fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }
          ]}>Hall Ticket</Text>
        </TouchableOpacity>

        {/* Animated Sliding Underline */}
        <Animated.View style={[
          styles.tabUnderline,
          { backgroundColor: colors.primary },
          isBrutalist && { height: 4, backgroundColor: isDark ? '#FFD166' : '#000' },
          {
            transform: [{
              translateX: underlineAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 180], // approximate half-width shift
              })
            }]
          }
        ]} />
      </View>

      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {viewMode === 'schedule' ? <ExamScheduleScreen /> : <HallTicketScreen />}
      </View>
    </SafeAreaView>
  );
}

function AnimatedTabIcon({ name, focused, size, color }: { name: string; focused: boolean; size: number; color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.25, duration: 150, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(1);
    }
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Icon name={name} size={size} color={color} />
    </Animated.View>
  );
}

// --- Global action callback for navigation wrappers ---
let globalOnLogout: (() => void) | null = null;

// --- Navigation wrappers to prevent unmount/remount on render ---
const HomeScreenWrapper = () => {
  return <HomeScreen onLogout={globalOnLogout || (() => { })} />;
};

const ProfileScreenWrapper = () => {
  return <ProfileScreen onLogout={globalOnLogout || (() => { })} />;
};

const MainAppTabsWrapper = () => {
  return <MainAppTabs onLogout={globalOnLogout || (() => { })} />;
};

function MainAppTabs({ onLogout }: AuthProps) {
  const { colors, isDark, isBrutalist, typography, spacing } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, size }) => {
          let iconName: string = '';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Timetable') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Exams') iconName = focused ? 'school' : 'school-outline';
          else if (route.name === 'About us') iconName = focused ? 'person-circle' : 'person-circle-outline';
          return <AnimatedTabIcon name={iconName} focused={focused} size={size} color={focused ? colors.primary : colors.subText} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subText,
        headerShown: false,
        tabBarStyle: [
          {
            height: 65,
            paddingBottom: spacing.sm,
            paddingTop: spacing.xs,
            backgroundColor: colors.tabBar,
            borderTopWidth: 0,
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 12
          },
          isBrutalist && {
            borderTopWidth: 4,
            borderColor: isDark ? '#FFF' : '#000',
            backgroundColor: colors.tabBar,
            borderRadius: 0,
            shadowColor: isDark ? '#FFF' : '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 0,
          }
        ],
        tabBarLabelStyle: [
          typography.caption,
          { marginTop: -2 }
        ],
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreenWrapper} />
      <Tab.Screen name="Timetable" component={TimetableScreen} />
      <Tab.Screen name="Exams" component={ExamManagerScreen} />
      <Tab.Screen name="About us" component={ProfileScreenWrapper} />
    </Tab.Navigator>
  );
}

function AppStack({ onLogout }: AuthProps) {
  const { colors, isDark, isBrutalist, typography } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: [
          { backgroundColor: colors.headerBg },
          isBrutalist && { borderBottomWidth: 4, borderColor: '#000', elevation: 0, shadowOpacity: 0 }
        ],
        headerTintColor: colors.text,
        headerTitleStyle: [
          typography.h2,
        ],
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainAppTabsWrapper}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CourseDetails"
        component={CourseDetailsScreen}
        options={{ title: 'Lecture Details' }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettings}
        options={{ title: 'Notification Center' }}
      />
      <Stack.Screen
        name="TripPlanner"
        component={TripPlannerScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// 🚀 VERSION COMPARISON LOGIC (ProfileScreen se liya gaya)
const compareVersions = (v1: string, v2: string) => {
  const normalize = (v: string) => v.toLowerCase().startsWith('v') ? v.substring(1) : v;
  const parts1 = normalize(v1).split('.').map(Number);
  const parts2 = normalize(v2).split('.').map(Number);
  // @ts-ignore
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};

function App(): React.JSX.Element {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showSplash, setShowSplash] = useState<boolean>(true);

  const navigationRef = useNavigationContainerRef();
  const routeNameRef = useRef<string | undefined>(undefined);

  // 0. Subscribe to Auth Errors
  useEffect(() => {
    const unsubscribe = onAuthError(() => {
      console.log("🚨 Auth Error Received! Logging out...");
      handleLogout(true);
    });
    return unsubscribe;
  }, []);

  // 1. Token Check (Authentication + Expiry)
  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        const tokenTimestamp = await AsyncStorage.getItem('authTokenTimestamp');

        if (token && tokenTimestamp) {
          const savedTime = parseInt(tokenTimestamp, 10);
          const currentTime = Date.now();
          const daysPassed = (currentTime - savedTime) / (1000 * 60 * 60 * 24);

          // 🔥 TOKEN EXPIRY: 7 days ke baad auto-logout
          if (daysPassed > 7) {
            console.log('🕒 Token expired (7+ days old). Logging out...');
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
            await AsyncStorage.removeItem('authTokenTimestamp');
            setAuthToken(null);

            await logEvent(getAnalytics(), 'auto_logout', {
              reason: 'token_expired',
              days_old: Math.floor(daysPassed)
            });
          } else {
            // Token valid hai
            setAuthToken(token);
            console.log(`✅ Token valid (${Math.floor(daysPassed)} days old)`);
          }
        } else {
          // No token
          setAuthToken(null);
        }
      } catch (e) {
        console.error(e);
        setAuthToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkToken();
  }, []);



  // ...

  // 3. Notification Initialization & SMART REFRESH
  useEffect(() => {
    const initNotifications = async () => {
      console.log('🚀 initNotifications called');
      const hasPermission = await NotificationService.requestUserPermission();
      if (hasPermission) {
        await NotificationService.getFCMToken();
      }
    };

    initNotifications();
    const unsubscribe = NotificationService.listen();

    return () => {
      if (typeof unsubscribe === 'function') {
        // @ts-ignore
        unsubscribe();
      }
    };
  }, []);

  // 2. 🚀 UPDATE CHECK (Pop-up Alert Logic)
  useEffect(() => {
    const checkUpdatesAndShowAlert = async () => {
      try {
        const response = await axios.get(`${UPDATE_MANIFEST_URL}?t=${new Date().getTime()}`, { timeout: 5000 });
        const manifest = response.data;
        const latestVersion = manifest.version || CURRENT_APP_VERSION;
        const downloadLink = manifest.downloadUrl || '';

        // Agar latest version hamare current version se BADA hai (1)
        if (compareVersions(latestVersion, CURRENT_APP_VERSION) === 1) {
          Alert.alert(
            "🚀 New Update Available!",
            `Version ${latestVersion} is here! Update now for new features and fixes.`,
            [
              {
                text: "Later",
                style: "cancel"
              },
              {
                text: "Update Now",
                onPress: () => {
                  if (downloadLink) Linking.openURL(downloadLink);
                }
              }
            ],
            { cancelable: false }
          );
          // Analytics: Update alert dikhaya
          await logEvent(getAnalytics(), 'update_alert_shown', { current_version: CURRENT_APP_VERSION, latest_version: latestVersion });
        }
      } catch (error: any) {
        // Suppress 404 errors for update check
        if (error.response && error.response.status === 404) {
          console.log("ℹ️ No update manifest found (404). Details suppressed.");
        } else {
          // console.warn("Failed to check for updates:", error);
        }
        // Network error hone par koi Alert nahi dikhayenge, App ko chalne denge.
      }
    };

    // Splash screen hatne ke baad check start karo (thoda delay dekar)
    if (!showSplash) {
      // 3 Second delay taaki app stable ho jaye
      const timer = setTimeout(checkUpdatesAndShowAlert, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);


  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  const handleLoginSuccess = async (token: string) => {
    setAuthToken(token);

    // 🕒 Save timestamp for expiry tracking
    await AsyncStorage.setItem('authTokenTimestamp', Date.now().toString());

    const dummyUserId = token.substring(0, 10);
    await setUserId(getAnalytics(), dummyUserId);

    await setUserProperties(getAnalytics(), {
      student_branch: 'CSE',
      student_year: '3rd',
      app_version: CURRENT_APP_VERSION
    });

    await logEvent(getAnalytics(), 'login', { method: 'cybervidya_app' });
  };

  const handleLogout = async (showSessionExpiredAlert = false): Promise<void> => {
    try {
      if (showSessionExpiredAlert) {
        Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
      }
      try {
        await NotificationService.unsubscribeFromTopic();
      } catch (e) {
        console.log('FCM Unsubscribe error:', e);
      }
      await logout();
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem('authTokenTimestamp'); // Clear timestamp

      await logEvent(getAnalytics(), 'logout');

      await resetAnalyticsData(getAnalytics());

      setAuthToken(null);
    } catch (error: any) {
      await logEvent(getAnalytics(), 'app_error', {
        error_type: 'logout_failed',
        error_message: error?.message || 'Unknown'
      });
      setAuthToken(null);
    }
  };

  globalOnLogout = handleLogout;

  const { colors, isDark, isBrutalist } = useTheme();

  return (
    <SafeAreaProvider>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? "light-content" : "dark-content"}
      />

      <View style={{ flex: 1, backgroundColor: colors.background }}>

        {!isLoading && (
          <NavigationContainer
            ref={navigationRef}
            onReady={() => { routeNameRef.current = navigationRef.getCurrentRoute()?.name; }}
            onStateChange={async () => {
              const previousRouteName = routeNameRef.current;
              const currentRouteName = navigationRef.getCurrentRoute()?.name ?? 'Unknown';

              if (previousRouteName !== currentRouteName) {
                await logEvent(getAnalytics(), 'screen_view', {
                  screen_name: currentRouteName,
                  screen_class: currentRouteName,
                });

                if (currentRouteName === 'Timetable') {
                  await logEvent(getAnalytics(), 'check_timetable', { day: new Date().getDay() });
                }
              }
              routeNameRef.current = currentRouteName;
            }}
          >
            <SafeAreaView style={styles.safeArea}>
              {authToken ? (
                <AppStack onLogout={handleLogout} />
              ) : (
                <LoginPage onLoginSuccess={handleLoginSuccess} />
              )}
            </SafeAreaView>
          </NavigationContainer>
        )}

        {/* Splash overlays ABOVE everything — Login WebView loads underneath */}
        {showSplash && (
          <View style={styles.splashContainer}>
            <SplashScreen onFinish={handleSplashFinish} />
          </View>
        )}

      </View>
    </SafeAreaProvider>
  );
}

function AppWithTheme() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

export default AppWithTheme;

const styles = StyleSheet.create({
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: '#fff',
  },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  examContainer: { flex: 1, backgroundColor: '#fff' },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee', justifyContent: 'center', position: 'relative' },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  toggleText: { fontSize: 16, color: '#888', fontWeight: '500' },
  tabUnderline: { position: 'absolute', bottom: 0, left: 20, width: '45%', height: 3, borderRadius: 2 },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
