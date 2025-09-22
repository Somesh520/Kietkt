import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

function ProfileScreen(): React.JSX.Element {
  const handleLinkPress = (url: string) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Connect with Developer</Text>
        <Text style={styles.developerName}>Somesh Tiwari</Text>
        
        <View style={styles.linksContainer}>
          <TouchableOpacity 
            style={styles.linkButton} 
            onPress={() => handleLinkPress('https://github.com/Somesh520/Kietkt')}
          >
            <Icon name="logo-github" size={24} color="#333" />
            <Text style={styles.linkText}>Source Code</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.linkButton} 
            onPress={() => handleLinkPress('https://www.linkedin.com/in/somesh-tiwari-236555322')}
          >
            <Icon name="logo-linkedin" size={24} color="#0A66C2" />
            <Text style={styles.linkText}>LinkedIn</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  container: {
    flex: 1,
    justifyContent: 'center', // Center content vertically
    alignItems: 'center',    // Center content horizontally
    padding: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 10,
  },
  developerName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 40,
  },
  linksContainer: {
    width: '100%',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#95a5a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  linkText: {
    marginLeft: 15,
    fontSize: 18,
    fontWeight: '600',
    color: '#34495e',
  },
});

export default ProfileScreen;