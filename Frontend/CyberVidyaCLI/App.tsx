// App.tsx (Poora Updated Code)

import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// ✅ Navigation ke liye imports
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LoginPage from './Screen/Login';
import HomeScreen from './Screen/Home';
import ProfileScreen from './Screen/profilescreen'; // Nayi screen import
import TimetableScreen from './Screen/Timetable'; // Nayi screen import
import { logout } from './api';

const AUTH_TOKEN_KEY = 'authToken';

// ✅ Tab navigator initialize karein
const Tab = createBottomTabNavigator();

// ✅ Tabs wala component alag se banaya gaya
function MainAppTabs({ onLogout }: { onLogout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007aff',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { paddingBottom: 5, height: 60 },
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tab.Screen 
        name="Home"
        // Pass onLogout prop to HomeScreen
        children={() => <HomeScreen onLogout={onLogout} />}
      />
      <Tab.Screen name="Timetable" component={TimetableScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

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
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    // ✅ Poori app ko NavigationContainer mein wrap karein
    <NavigationContainer>
        {authToken ? (
            <MainAppTabs onLogout={handleLogout} />
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