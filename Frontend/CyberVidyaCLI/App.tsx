import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// ✅ Navigation imports updated for Stack Navigator
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import LoginPage from './Screen/Login';
import HomeScreen from './Screen/Home';
import ProfileScreen from './Screen/profilescreen'; // Corrected filename casing
import TimetableScreen from './Screen/Timetable';
import CourseDetailsScreen from './Screen/CourseDetailsScreen'; // ✅ Import the new screen
import { logout } from './api';
import Icon from 'react-native-vector-icons/Ionicons';

const AUTH_TOKEN_KEY = 'authToken';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator(); // ✅ Initialize Stack Navigator

// This component defines your bottom tabs
function MainAppTabs({ onLogout }: { onLogout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Function to set icons for each tab
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Timetable') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2980b9',
        tabBarInactiveTintColor: 'gray',
        headerShown: false, // We hide the default header for tab screens
        tabBarStyle: { paddingBottom: 5, paddingTop: 5, height: 60 },
        tabBarLabelStyle: { fontSize: 12 },
      })}
    >
      <Tab.Screen 
        name="Home"
        children={() => <HomeScreen onLogout={onLogout} />}
      />
      <Tab.Screen name="Timetable" component={TimetableScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ✅ This is the main navigator for your app after login
// It contains both the Tab Navigator and any other screens you want to navigate to
function AppStack({ onLogout }: { onLogout: () => void }) {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        children={() => <MainAppTabs onLogout={onLogout} />}
        options={{ headerShown: false }} // The tabs screen doesn't need its own header
      />
      <Stack.Screen 
        name="CourseDetails" 
        component={CourseDetailsScreen}
        options={{ title: 'Lecture Details' }} // This title will show on the details screen
      />
    </Stack.Navigator>
  );
}

// Main App Component
function App(): React.JSX.Element {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleLogout = async () => {
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
    <NavigationContainer>
        {authToken ? (
            // ✅ After login, we now render the Stack Navigator
            <AppStack onLogout={handleLogout} />
        ) : (
            <LoginPage onLoginSuccess={handleLoginSuccess} />
        )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default App;