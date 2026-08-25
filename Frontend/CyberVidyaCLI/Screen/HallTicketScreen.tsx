import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { getExamSession, getHallTicketOptions, downloadHallTicketPDF, getRegisteredCourses } from '../api';
import { useTheme } from '../ThemeContext';

const HallTicketScreen = () => {
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);

  // ✅ New States for Dropdown
  const [sessionList, setSessionList] = useState<any[]>([]); // Saare sessions
  const [selectedSession, setSelectedSession] = useState<any>(null); // Jo user ne select kiya
  const [modalVisible, setModalVisible] = useState(false); // Dropdown khulne ke liye

  useEffect(() => {
    const init = async () => {
      let id = await AsyncStorage.getItem('studentId');

      // --- Auto-Fix ID Logic ---
      if (!id) {
        try {
          const courses = await getRegisteredCourses();
          if (courses && courses.length > 0) {
            id = courses[0].studentId.toString();
            await AsyncStorage.setItem('studentId', id);
          }
        } catch (e) { console.log("Auto-recovery failed", e); }
      }
      // ------------------------

      if (id) {
        setStudentId(id);
        fetchSessions(id);
      } else {
        Alert.alert("Session Error", "Please login again.");
      }
    };
    init();
  }, []);

  // 1. Saare Sessions Fetch karein
  const fetchSessions = async (id: string) => {
    try {
      setLoading(true);
      const sessions = await getExamSession(id);

      if (sessions && sessions.length > 0) {
        setSessionList(sessions);
        setSelectedSession(sessions[0]); // By default pehla select karein
        loadTickets(sessions[0].sessionId); // Aur uske tickets layein
      } else {
        setSessionList([]);
      }
    } catch (error: any) {
      console.log("Session Error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. User jab Session change kare
  const handleSessionChange = (session: any) => {
    setSelectedSession(session);
    setModalVisible(false); // Modal band karein
    loadTickets(session.sessionId); // Naye session ke tickets layein
  };

  // 3. Tickets Load karein
  const loadTickets = async (sessionId: number) => {
    try {
      setLoading(true);
      setTickets([]); // Purana data saaf karein
      const options = await getHallTicketOptions(sessionId);
      setTickets(options);
    } catch (error: any) {
      console.log("Hall Ticket Error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (item: any) => {
    try {
      setLoading(true);
      const path = await downloadHallTicketPDF(item.id, item.title);
      Alert.alert("Download Complete", `File saved to:\n${path}`);
    } catch (error) {
      Alert.alert("Error", "Download failed.");
    } finally {
      setLoading(false);
    }
  };

  const { colors, isDark, isBrutalist, typography, spacing } = useTheme();

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: colors.background },
      isBrutalist && styles.brutalistContainer,
      isBrutalist && { backgroundColor: colors.background }
    ]}>

      {/* ✅ SESSION SELECTOR DROPDOWN */}
      <View style={[
        styles.selectorContainer,
        { backgroundColor: colors.card },
        isBrutalist && styles.brutalistSelector,
        isBrutalist && { borderColor: colors.border }
      ]}>
        <Text style={[styles.label, { color: colors.subText }, isBrutalist && styles.brutalistSubText]}>Select Academic Session:</Text>
        <TouchableOpacity
          style={[
            styles.dropdown,
            { borderColor: colors.border, backgroundColor: isDark ? colors.background : '#fafafa' },
            isBrutalist && styles.brutalistDropdown,
            isBrutalist && { backgroundColor: colors.card, borderColor: colors.border }
          ]}
          onPress={() => setSessionList.length > 0 && setModalVisible(true)}
        >
          <Text style={[styles.dropdownText, { color: colors.text }, isBrutalist && styles.brutalistText]}>
            {selectedSession ? selectedSession.sessionName : "Select Session"}
          </Text>
          <Icon name="chevron-down" size={20} color={isBrutalist ? colors.text : colors.subText} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon name="documents-outline" size={60} color={colors.subText} />
              <Text style={[styles.emptyText, { color: colors.subText }]}>No Hall Tickets Found</Text>
              <Text style={[styles.subEmptyText, { color: colors.subText }]}>
                for {selectedSession?.sessionName || 'this session'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
              isBrutalist && styles.brutalistCard,
              isBrutalist && { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.border }
            ]}>
              <View style={[
                styles.iconContainer,
                { backgroundColor: isDark ? '#1e3a8a' : '#eff6ff' },
                isBrutalist && styles.brutalistIconContainer,
                isBrutalist && { backgroundColor: colors.card, borderColor: colors.border }
              ]}>
                <Icon name="document-text" size={30} color={isBrutalist ? colors.text : (isDark ? '#60a5fa' : '#2980b9')} />
              </View>
              <View style={styles.info}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.cardSub, { color: colors.subText }]}>PDF Available</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.downloadBtn,
                  { backgroundColor: colors.primary },
                  isBrutalist && styles.brutalistDownloadBtn,
                  isBrutalist && { borderColor: colors.border }
                ]}
                onPress={() => handleDownload(item)}
              >
                <Icon name="download-outline" size={24} color={isBrutalist ? '#000' : '#fff'} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* ✅ POPUP MODAL FOR SELECTION */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={[
            styles.modalContent,
            { backgroundColor: colors.card },
            isBrutalist && styles.brutalistModalContent,
            isBrutalist && { borderColor: colors.border }
          ]}>
            <View style={[
              styles.modalHeader,
              { borderColor: colors.border },
              isBrutalist && styles.brutalistModalHeader,
              isBrutalist && { borderColor: colors.border }
            ]}>
              <Text style={[styles.modalTitle, { color: colors.text }, isBrutalist && styles.brutalistText]}>Choose Session</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={sessionList}
              keyExtractor={(item) => item.sessionId.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    { borderColor: colors.border },
                    selectedSession?.sessionId === item.sessionId && { backgroundColor: isDark ? '#1e3a8a' : '#eff6ff' }
                  ]}
                  onPress={() => handleSessionChange(item)}
                >
                  <Text style={[
                    styles.modalItemText,
                    { color: colors.text },
                    selectedSession?.sessionId === item.sessionId && { color: colors.primary, fontWeight: 'bold' },
                    isBrutalist && styles.brutalistText
                  ]}>
                    {item.sessionName}
                  </Text>
                  {selectedSession?.sessionId === item.sessionId && (
                    <Icon name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },

  // Selector Styles
  selectorContainer: { padding: 24, backgroundColor: '#fff', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, zIndex: 10 },
  label: { fontSize: 13, color: '#666', marginBottom: 8, fontWeight: '700', letterSpacing: 0.5 },
  dropdown: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 16, padding: 16, backgroundColor: '#fafafa'
  },
  dropdownText: { fontSize: 16, color: '#333', fontWeight: '600' },

  // List Styles
  emptyText: { marginTop: 10, color: '#6b7280', fontSize: 18, fontWeight: '700' },
  subEmptyText: { color: '#9ca3af', fontSize: 14, marginTop: 6 },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16,
    alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)'
  },
  iconContainer: {
    width: 56, height: 56, backgroundColor: '#eff6ff', borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginRight: 16
  },
  info: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#666', fontWeight: '500' },
  downloadBtn: {
    backgroundColor: '#2980b9', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#2980b9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4
  },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, borderBottomWidth: 1, borderColor: '#eee' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  modalItemActive: { backgroundColor: '#eff6ff' },
  modalItemText: { fontSize: 16, color: '#333' },
  modalItemTextActive: { color: '#2980b9', fontWeight: '700' },
  
  // --- NEO-BRUTALISM OVERRIDES ---
  brutalistContainer: {},
  brutalistSelector: { shadowOpacity: 0, elevation: 0, borderBottomWidth: 4, borderRadius: 0 },
  brutalistDropdown: { borderRadius: 0, borderWidth: 3 },
  brutalistCard: { 
    borderRadius: 0, 
    borderWidth: 4, 
    shadowOffset: { width: 8, height: 8 }, 
    shadowOpacity: 1, 
    shadowRadius: 0,
    elevation: 0,
    marginBottom: 24,
  },
  brutalistIconContainer: { borderRadius: 0, borderWidth: 3 },
  brutalistDownloadBtn: { borderRadius: 0, borderWidth: 3, shadowOpacity: 0, elevation: 0 },
  brutalistModalContent: { borderRadius: 0, borderWidth: 4 },
  brutalistModalHeader: { borderBottomWidth: 4 },
  brutalistText: { fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  brutalistSubText: { fontWeight: '900', textTransform: 'uppercase' },
});

export default HallTicketScreen;