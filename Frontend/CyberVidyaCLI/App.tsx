import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet, StatusBar, Text, TouchableOpacity } from 'react-native';

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';

// --- Imports ---
import LoginPage from './Screen/Login';
import HomeScreen from './Screen/Home';
import ProfileScreen from './Screen/profilescreen';
import TimetableScreen from './Screen/Timetable';
import CourseDetailsScreen from './Screen/CourseDetailsScreen';
import ExamScheduleScreen from './Screen/Exams'; 
// Ensure this filename matches your actual file (HallTicket.tsx or HallTicketScreen.tsx)
import HallTicketScreen from './Screen/HallTicketScreen'; 
import SplashScreen from './Screen/SplashScreen';
import { logout } from './api';

const AUTH_TOKEN_KEY = 'authToken';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

type AuthProps = {
  onLogout: () => void;
};

// --- Custom Exam Manager (Toggle Switch) ---
function ExamManagerScreen() {
  const [viewMode, setViewMode] = useState<'schedule' | 'ticket'>('schedule');

  return (
    <SafeAreaView style={styles.examContainer}>
      {/* Custom Toggle Header */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleBtn, viewMode === 'schedule' && styles.toggleBtnActive]} 
          onPress={() => setViewMode('schedule')}
        >
          <Text style={[styles.toggleText, viewMode === 'schedule' && styles.toggleTextActive]}>Datesheet</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.toggleBtn, viewMode === 'ticket' && styles.toggleBtnActive]} 
          onPress={() => setViewMode('ticket')}
        >
          <Text style={[styles.toggleText, viewMode === 'ticket' && styles.toggleTextActive]}>Hall Ticket</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1, backgroundColor: '#f4f6f8' }}>
        {viewMode === 'schedule' ? <ExamScheduleScreen /> : <HallTicketScreen />}
      </View>
    </SafeAreaView>
  );
}

// --- Main Tabs ---
function MainAppTabs({ onLogout }: AuthProps) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = '';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Timetable') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Exams') iconName = focused ? 'school' : 'school-outline';
          else if (route.name === 'About us') iconName = focused ? 'person-circle' : 'person-circle-outline';
          
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2980b9',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: { height: 60, paddingBottom: 5, paddingTop: 5, backgroundColor: '#ffffff', borderTopWidth: 0, elevation: 5 },
        tabBarLabelStyle: { fontSize: 12 },
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen
        name="Home"
        children={() => <HomeScreen onLogout={onLogout} />}
      />
      <Tab.Screen
        name="Timetable"
        component={TimetableScreen}
      />
      <Tab.Screen
        name="Exams"
        component={ExamManagerScreen}
      />
      <Tab.Screen
        name="About us"
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
}

function AppStack({ onLogout }: AuthProps) {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        children={() => <MainAppTabs onLogout={onLogout} />}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CourseDetails"
        component={CourseDetailsScreen}
        options={{ title: 'Lecture Details' }}
      />
    </Stack.Navigator>
  );
}

function App(): React.JSX.Element {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showSplash, setShowSplash] = useState<boolean>(true);

  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      setAuthToken(token);
    };
    checkToken();
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
    setIsLoading(false);
  };

  const handleLoginSuccess = (token: string) => {
    setAuthToken(token);
  };

  const handleLogout = async (): Promise<void> => {
    await logout();
    setAuthToken(null);
  };

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2980b9" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <NavigationContainer>
        <SafeAreaView style={styles.safeArea}>
          {authToken ? (
            <AppStack onLogout={handleLogout} />
          ) : (
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          )}
        </SafeAreaView>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  examContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    justifyContent: 'center',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  toggleBtnActive: {
    borderBottomColor: '#2980b9',
  },
  toggleText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#2980b9',
    fontWeight: 'bold',
  },
});

export default App;