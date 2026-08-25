
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  StatusBar,
  Pressable,
  Image,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import Icon from 'react-native-vector-icons/Ionicons';
import { getStudentProfileInfo, StudentProfile } from '../api';

// ... Types & Interfaces ...
interface TeamMember {
  name: string;
  role: string;
  linkedinUrl: string;
  imageUrl?: string;
}

interface SimpleIconProps {
  name: string;
  size?: number;
  color?: string;
}

interface ScaleButtonProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

type UpdateStatus = 'checking' | 'available' | 'latest' | 'error';

interface StatusConfigItem {
  icon: string;
  color: string;
  bg: string;
  text: string;
}

// ... Constants ...
const CURRENT_APP_VERSION = "v1.1.6";
const UPDATE_MANIFEST_URL = "https://raw.githubusercontent.com/Somesh520/Kietkt/main/update.json";

// ... Data ...
const teamMembers: TeamMember[] = [
  // ... (same as before) ...
  {
    name: 'Somesh Tiwari',
    role: 'Lead Developer',
    linkedinUrl: 'https://www.linkedin.com/in/somesh-tiwari-236555322/',
    imageUrl: 'https://api.dicebear.com/9.x/adventurer/png?seed=Somesh&backgroundColor=b6e3f4'
  },
  {
    name: 'Aviral Rajput',
    role: 'UI/UX Designer',
    linkedinUrl: 'https://www.linkedin.com/in/aviral-rajput-077a37309/',
    imageUrl: 'https://api.dicebear.com/9.x/adventurer/png?seed=Aviral&backgroundColor=c0aede'
  },
  {
    name: 'Sujal Kumar',
    role: 'Contributor',
    linkedinUrl: 'https://www.linkedin.com/in/sujal-kumar-8a31bb320/',
    imageUrl: 'https://api.dicebear.com/9.x/adventurer/png?seed=Sujal&backgroundColor=d1d4f9'
  },
  {
    name: 'Pushkar Garg',
    role: 'Contributor',
    linkedinUrl: 'https://www.linkedin.com/in/pushkar-garg-836542328/',
    imageUrl: 'https://api.dicebear.com/9.x/adventurer/png?seed=Pushkar&backgroundColor=ffdfbf'
  },
];

// ... Components ...
const SimpleIcon = ({ name, size = 20, color = '#333' }: SimpleIconProps) => {
  let iconChar = '•';
  switch (name) {
    case 'refresh': iconChar = '🔄'; break;
    case 'check': iconChar = '✨'; break;
    case 'download': iconChar = '⬇️'; break;
    case 'alert': iconChar = '⚠️'; break;
    case 'linkedin': iconChar = '🔗'; break;
    case 'shield': iconChar = '🛡️'; break;
    case 'github': iconChar = '🐙'; break;
    case 'arrow-right': iconChar = '→'; break;
    case 'person': iconChar = '👤'; break;
    case 'simulator': iconChar = '✈️'; break;
    default: iconChar = '•';
  }
  return <Text style={{ fontSize: size, color: color }}>{iconChar}</Text>;
};

const ScaleButton = ({ onPress, style, children }: ScaleButtonProps) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleValue, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleValue, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[style, { transform: [{ scale: scaleValue }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const ProfileScreen = ({ onLogout }: { onLogout: () => void }) => {
  const { colors, isDark, isBrutalist, toggleBrutalist } = useTheme();
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('checking');
  const [latestVersion, setLatestVersion] = useState<string>(CURRENT_APP_VERSION);
  const [downloadLink, setDownloadLink] = useState<string>('');

  const headerAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;



  // ✅ Fixed Update Logic: Agar version MATCH NAHI KAREGA toh update dikhayega
  const checkUpdates = async () => {
    try {
      setUpdateStatus('checking');
      const response = await axios.get(`${UPDATE_MANIFEST_URL}?t = ${new Date().getTime()} `);
      const manifest = response.data;
      const latest = manifest.version || CURRENT_APP_VERSION;
      setLatestVersion(latest);
      setDownloadLink(manifest.downloadUrl || '');

      const normalize = (v: string) => v.toLowerCase().startsWith('v') ? v.substring(1) : v;

      const compareVersions = (v1: string, v2: string) => {
        const parts1 = normalize(v1).split('.').map(Number);
        const parts2 = normalize(v2).split('.').map(Number);

        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
          const p1 = parts1[i] || 0;
          const p2 = parts2[i] || 0;
          if (p1 > p2) return 1;
          if (p1 < p2) return -1;
        }
        return 0; // Versions match exactly
      };

      // Check: If versions are NOT EQUAL (!== 0), show update available
      if (compareVersions(latest, CURRENT_APP_VERSION) !== 0) {
        setUpdateStatus('available');
      } else {
        setUpdateStatus('latest');
      }
    } catch (error) {
      console.error("Check failed", error);
      setUpdateStatus('error');
    }
  };

  useEffect(() => {
    getStudentProfileInfo().then(setProfile).catch(err => console.log("Profile fetch failed", err));
    checkUpdates();
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(headerAnim, { toValue: 1, tension: 10, friction: 5, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 20, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLinkPress = (url: string) => Linking.openURL(url).catch(err => console.error("Error", err));

  const handleUpdatePress = () => {
    if (updateStatus === 'available' && downloadLink) Linking.openURL(downloadLink);
    else if (updateStatus === 'error') checkUpdates();
    else if (updateStatus === 'latest') Alert.alert("Up to Date", `Version ${CURRENT_APP_VERSION} `);
  };

  // ... Render functions ...
  const renderUpdateCard = () => {
    const statusMap: Record<UpdateStatus, StatusConfigItem> = {
      checking: { icon: 'refresh', color: '#6366f1', bg: isDark ? '#1e1b4b' : '#e0e7ff', text: 'Checking...' },
      latest: { icon: 'check', color: '#10b981', bg: isDark ? '#064e3b' : '#d1fae5', text: 'You are up to date' },
      available: { icon: 'download', color: '#f59e0b', bg: isDark ? '#78350f' : '#fef3c7', text: 'Update Available' },
      error: { icon: 'alert', color: '#ef4444', bg: isDark ? '#7f1d1d' : '#fee2e2', text: 'Retry Check' },
    };

    const config = statusMap[updateStatus];

    return (
      <ScaleButton onPress={handleUpdatePress} style={[
        styles.card,
        { backgroundColor: colors.card },
        isBrutalist ? styles.brutalistCard : undefined,
        isBrutalist ? { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.border } : undefined
      ]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }, isBrutalist ? styles.brutalistText : undefined]}>App Version</Text>
          <View style={[
            styles.badge,
            { backgroundColor: isDark ? '#333' : '#f3f4f6' },
            isBrutalist ? styles.brutalistBadge : undefined,
            isBrutalist ? { backgroundColor: colors.card, borderColor: colors.border } : undefined
          ]}>
            <Text style={[styles.badgeText, { color: colors.subText }, isBrutalist ? styles.brutalistText : undefined]}>{CURRENT_APP_VERSION}</Text>
          </View>
        </View>




        <View style={[styles.statusRow, { backgroundColor: config.bg }]}>
          {updateStatus === 'checking' ? (
            <ActivityIndicator size="small" color={config.color} />
          ) : (
            <SimpleIcon name={config.icon} color={config.color} />
          )}
          <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
        </View>
        {updateStatus === 'available' && <Text style={styles.newVersionText}>New: {latestVersion}</Text>}
      </ScaleButton>
    );
  };

  return (
    <View style={[
      styles.mainContainer,
      { backgroundColor: colors.background },
      isBrutalist ? styles.brutalistMain : undefined,
      isBrutalist ? { backgroundColor: colors.background } : undefined
    ]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isBrutalist ? colors.background : "#4f46e5"} />

      <View style={[
        styles.headerContainer,
        {
          backgroundColor: isBrutalist ? colors.primary : '#4f46e5',
          borderColor: isBrutalist ? colors.border : '#eee'
        },
        isBrutalist ? styles.brutalistHeader : undefined,
      ]}>
        <Animated.View style={[styles.blob, { display: isBrutalist ? 'none' : 'flex' }, {
          backgroundColor: '#6366f1', top: -50, right: -50, width: 200, height: 200,
          opacity: 0.5,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-100, 0] }) }]
        }]} />
        <Animated.View style={[styles.blob, { display: isBrutalist ? 'none' : 'flex' }, {
          backgroundColor: '#818cf8', bottom: -80, left: -50, width: 250, height: 250,
          opacity: 0.5,
          transform: [{ scale: headerAnim }]
        }]} />

        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, isBrutalist ? styles.brutalistText : undefined, { color: isBrutalist ? '#000' : '#fff' }]}>About App</Text>
          <Text style={[styles.headerSubtitle, isBrutalist ? styles.brutalistSubText : undefined, { color: isBrutalist ? '#000' : '#e0e7ff' }]}>Built for Students, by Students.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }] }}>

          {renderUpdateCard()}

          <Text style={[styles.sectionLabel, { color: colors.subText }, isBrutalist ? styles.brutalistText : undefined]}>THE CREATORS</Text>
          <View style={[
            styles.card,
            { backgroundColor: colors.card },
            isBrutalist ? styles.brutalistCard : undefined,
            isBrutalist ? { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.border } : undefined
          ]}>
            {teamMembers.map((member, index) => (
              <View key={member.name}>
                <ScaleButton onPress={() => handleLinkPress(member.linkedinUrl)}>
                  <View style={styles.row}>
                    {member.imageUrl ? (
                      <Image
                        source={{ uri: member.imageUrl }}
                        style={[
                          styles.avatarImage,
                          { backgroundColor: isDark ? '#333' : '#eee' },
                          isBrutalist ? styles.brutalistAvatar : undefined,
                          isBrutalist ? { borderColor: colors.border } : undefined
                        ]}
                      />
                    ) : (
                      <View style={[
                        styles.iconBox,
                        { backgroundColor: '#c7d2fe' },
                        isBrutalist ? styles.brutalistIconBox : undefined,
                        isBrutalist ? { borderColor: colors.border } : undefined
                      ]}>
                        <SimpleIcon name="person" color={isBrutalist ? '#000' : '#fff'} />
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: colors.text }, isBrutalist ? styles.brutalistText : undefined]}>{member.name}</Text>
                      <Text style={[styles.rowSub, { color: colors.subText }, isBrutalist ? styles.brutalistSubText : undefined]}>{member.role}</Text>
                    </View>
                    <SimpleIcon name="linkedin" color="#0077b5" />
                  </View>
                </ScaleButton>
                {index < teamMembers.length - 1 && <View style={[
                  styles.divider,
                  { backgroundColor: colors.border },
                  isBrutalist ? styles.brutalistDivider : undefined,
                  isBrutalist ? { backgroundColor: colors.border } : undefined
                ]} />}
              </View>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.subText }, isBrutalist ? styles.brutalistText : undefined]}>INFORMATION</Text>
          <View style={[
            styles.card,
            { backgroundColor: colors.card },
            isBrutalist ? styles.brutalistCard : undefined,
            isBrutalist ? { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.border } : undefined
          ]}>
            <View style={styles.row}>
              <View style={[
                styles.iconBox,
                { backgroundColor: isDark ? '#064e3b' : '#d1fae5' },
                isBrutalist ? styles.brutalistIconBox : undefined,
                isBrutalist ? { borderColor: colors.border } : undefined
              ]}>
                <SimpleIcon name="shield" color={isBrutalist ? '#000' : '#10b981'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.text }, isBrutalist ? styles.brutalistText : undefined]}>100% Secure</Text>
                <Text style={[styles.rowSub, { color: colors.subText }, isBrutalist ? styles.brutalistSubText : undefined]}>Data is fetched directly from CyberVidya.</Text>
              </View>
            </View>
            <View style={[
              styles.divider,
              { backgroundColor: colors.border },
              isBrutalist ? styles.brutalistDivider : undefined,
              isBrutalist ? { backgroundColor: colors.border } : undefined
            ]} />
            <ScaleButton onPress={() => handleLinkPress('https://github.com/Somesh520/Kietkt')}>
              <View style={styles.row}>
                <View style={[
                  styles.iconBox,
                  { backgroundColor: isDark ? '#374151' : '#e5e7eb' },
                  isBrutalist ? styles.brutalistIconBox : undefined,
                  isBrutalist ? { borderColor: colors.border } : undefined
                ]}>
                  <SimpleIcon name="github" color={isBrutalist ? '#000' : (isDark ? '#fff' : '#1f2937')} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text }, isBrutalist ? styles.brutalistText : undefined]}>Open Source</Text>
                  <Text style={[styles.rowSub, { color: colors.subText }, isBrutalist ? styles.brutalistSubText : undefined]}>View code on GitHub</Text>
                </View>
                <SimpleIcon name="arrow-right" color={isBrutalist ? '#000' : colors.subText} />
              </View>
            </ScaleButton>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.subText }, isBrutalist ? styles.brutalistText : undefined]}>APPEARANCE</Text>
          <View style={[
            styles.card,
            { backgroundColor: colors.card },
            isBrutalist ? styles.brutalistCard : undefined,
            isBrutalist ? { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.border } : undefined
          ]}>
            <ScaleButton onPress={toggleBrutalist}>
              <View style={styles.row}>
                <View style={[
                  styles.iconBox,
                  { backgroundColor: isBrutalist ? '#2980b9' : (isDark ? '#374151' : '#e5e7eb') },
                  isBrutalist ? styles.brutalistIconBox : undefined,
                  isBrutalist ? { borderColor: colors.border } : undefined
                ]}>
                  <Icon name="color-palette" size={20} color={isBrutalist ? '#fff' : (isDark ? '#fff' : '#1f2937')} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text }, isBrutalist ? styles.brutalistText : undefined]}>Neo-Brutalism Mode</Text>
                  <Text style={[styles.rowSub, { color: colors.subText }, isBrutalist ? styles.brutalistSubText : undefined]}>{isBrutalist ? 'Enabled' : 'Disabled'}</Text>
                </View>
                <View style={[
                  styles.toggleSwitch,
                  { backgroundColor: isDark ? '#334155' : '#e5e7eb' },
                  isBrutalist ? styles.toggleSwitchActive : undefined,
                  isBrutalist ? styles.brutalistToggleSwitch : undefined,
                  isBrutalist ? { borderColor: colors.border, backgroundColor: colors.primary } : undefined
                ]}>
                  <View style={[
                    styles.toggleThumb,
                    isBrutalist ? styles.toggleThumbActive : undefined,
                    isBrutalist ? styles.brutalistToggleThumb : undefined,
                    isBrutalist ? { borderColor: colors.border, backgroundColor: colors.card } : undefined
                  ]} />
                </View>
              </View>
            </ScaleButton>
          </View>

          <Text style={[styles.footer, { color: colors.subText }, isBrutalist ? styles.brutalistText : undefined]}>Made with ❤️ by Someshxd</Text>
          <View style={{ height: 50 }} />

        </Animated.View>
      </ScrollView>
    </View>
  );
}

export default ProfileScreen;

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#f3f4f6' },
  headerContainer: {
    height: 240,
    backgroundColor: '#4f46e5',
    overflow: 'hidden',
    justifyContent: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: '#eee',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 15,
  },
  blob: { position: 'absolute', borderRadius: 999, opacity: 0.5 },
  headerContent: { marginTop: 20, zIndex: 10, paddingHorizontal: 24 },
  headerTitle: { fontSize: 36, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 16, color: '#e0e7ff', marginTop: 5, fontWeight: '500' },
  scrollContent: { padding: 20, paddingTop: 30 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#9ca3af', marginBottom: 12, marginLeft: 8, marginTop: 20, letterSpacing: 1 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 8, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  badge: { backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#4b5563' },
  statusRow: { flexDirection: 'row', alignItems: 'center', padding: 16, margin: 10, borderRadius: 16 },
  statusText: { marginLeft: 10, fontWeight: '600', fontSize: 14 },
  newVersionText: { textAlign: 'center', color: '#f59e0b', marginBottom: 10, fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarImage: { width: 40, height: 40, borderRadius: 20, marginRight: 15, backgroundColor: '#eee' },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  rowSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 70 },
  footer: { textAlign: 'center', color: '#9ca3af', marginTop: 30 },
  toggleSwitch: { width: 50, height: 26, borderRadius: 13, backgroundColor: '#e5e7eb', justifyContent: 'center', padding: 2 },
  toggleSwitchActive: { backgroundColor: '#2980b9' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', transform: [{ translateX: 0 }] },
  toggleThumbActive: { transform: [{ translateX: 24 }] },

  // --- NEO-BRUTALISM OVERRIDES ---
  brutalistMain: {},
  brutalistHeader: { backgroundColor: '#EF476F', borderBottomWidth: 4, borderRadius: 0 },
  brutalistText: { fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  brutalistSubText: { fontWeight: '900', textTransform: 'uppercase' },
  brutalistCard: { 
    borderRadius: 0, 
    borderWidth: 4, 
    shadowOffset: { width: 8, height: 8 }, 
    shadowOpacity: 1, 
    shadowRadius: 0,
    elevation: 0,
    marginHorizontal: 10,
    marginBottom: 20,
    overflow: 'hidden',
  },
  brutalistIconBox: { borderRadius: 0, borderWidth: 3 },
  brutalistAvatar: { borderRadius: 0, borderWidth: 3 },
  brutalistDivider: { height: 4, marginLeft: 0 },
  brutalistBadge: { borderRadius: 0, borderWidth: 3 },
  brutalistToggleSwitch: { borderRadius: 0, borderWidth: 3, padding: 0 },
  brutalistToggleThumb: { borderRadius: 0, borderWidth: 2, width: 20, height: 20 },
});