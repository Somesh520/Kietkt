import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

// --- Data for Team Members ---
const teamMembers = [
  {
    name: 'Somesh Tiwari',
    linkedinUrl: 'https://www.linkedin.com/in/somesh-tiwari-236555322/',
  },
  {
    name: 'Aviral Rajput',
    linkedinUrl: 'https://www.linkedin.com/in/aviral-rajput-077a37309/',
  },
  {
    name: 'Sujal Kumar',
    linkedinUrl: 'https://www.linkedin.com/in/sujal-kumar-8a31bb320/',
  },
  {
    name: 'Pushkar Garg',
    linkedinUrl: 'https://www.linkedin.com/in/pushkar-garg-836542328/',
  },
];

function ProfileScreen(): React.JSX.Element {
  const handleLinkPress = (url: string) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  // Simple fade-in animation for the whole screen content
  const opacity = useSharedValue(0);
  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500 });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Animated.View style={animatedContainerStyle}>
          <Text style={styles.headerTitle}>About the App</Text>

          {/* === Developers Section === */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Developed and Designed By</Text>
            <View style={styles.card}>
              {teamMembers.map((member, index) => (
                <React.Fragment key={member.name}>
                  <TouchableOpacity
                    style={styles.linkItem}
                    onPress={() => handleLinkPress(member.linkedinUrl)}
                  >
                    <Icon name="logo-linkedin" size={24} color="#0A66C2" />
                    <Text style={styles.linkText}>{member.name}</Text>
                    <Icon name="chevron-forward-outline" size={22} color="#c7c7c7" />
                  </TouchableOpacity>
                  {index < teamMembers.length - 1 && <View style={styles.separator} />}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* === NEW: Security & Data Section === */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security & Data</Text>
            <View style={styles.card}>
              <View style={styles.infoItem}>
                <Icon name="shield-checkmark-outline" size={28} color="#34c759" />
                <Text style={styles.infoText}>
                  This app securely fetches your data directly from the CyberVidya portal. We do not store or share your information.
                </Text>
              </View>
            </View>
          </View>

          {/* === Source Code Section === */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project</Text>
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.linkItem}
                onPress={() => handleLinkPress('https://github.com/Somesh520/Kietkt')}
              >
                <Icon name="logo-github" size={24} color="#333" />
                <Text style={styles.linkText}>View Source Code</Text>
                <Icon name="chevron-forward-outline" size={22} color="#c7c7c7" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  container: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#1c1c1e',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6e6e73',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  linkText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 17,
    color: '#1c1c1e',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e5ea',
    marginLeft: 56,
  },
  // New styles for the info box
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align icon to the top of the text
    padding: 16,
  },
  infoText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    color: '#6e6e73', // Using a secondary text color
    lineHeight: 22, // Improves readability
  },
});

export default ProfileScreen;

