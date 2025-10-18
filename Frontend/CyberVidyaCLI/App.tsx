import React, { useState, useEffect } from 'react';
// import AsyncStorage from '@react--native-async-storage/async-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import LoginPage from './Screen/Login';
import HomeScreen from './Screen/Home';
import ProfileScreen from './Screen/profilescreen';
import TimetableScreen from './Screen/Timetable';
import CourseDetailsScreen from './Screen/CourseDetailsScreen';
import ExamScheduleScreen from './Screen/Exams'; // Exam screen ko import karein
import { logout } from './api';
import Icon from 'react-native-vector-icons/Ionicons';

const AUTH_TOKEN_KEY = 'authToken';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

type AuthProps = {
  onLogout: () => void;
};

function MainAppTabs({ onLogout }: AuthProps) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = '';
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Timetable') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Exams') { // Exam tab ke liye icon
            iconName = focused ? 'school' : 'school-outline';
          } else if (route.name === 'About us') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2980b9',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: { height: 60, paddingBottom: 5, paddingTop: 5, borderTopWidth: 0, elevation: 5, backgroundColor: '#ffffff' },
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
      {/* Naya Exam Screen Tab */}
      <Tab.Screen
        name="Exams"
        component={ExamScheduleScreen}
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

  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      setAuthToken(token);
      setIsLoading(false);
    };
    checkToken();
  }, []);

  const handleLoginSuccess = (token: string) => {
    setAuthToken(token);
  };

  const handleLogout = async (): Promise<void> => {
    await logout();
    setAuthToken(null);
  };

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
});

export default App;

