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

  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ✅ SESSION SELECTOR DROPDOWN */}
      <View style={[styles.selectorContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.label, { color: colors.subText }]}>Select Academic Session:</Text>
        <TouchableOpacity
          style={[styles.dropdown, { borderColor: colors.border, backgroundColor: isDark ? colors.background : '#fafafa' }]}
          onPress={() => setSessionList.length > 0 && setModalVisible(true)}
        >
          <Text style={[styles.dropdownText, { color: colors.text }]}>
            {selectedSession ? selectedSession.sessionName : "Select Session"}
          </Text>
          <Icon name="chevron-down" size={20} color={colors.subText} />
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
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={[styles.iconContainer, { backgroundColor: isDark ? '#1e3a8a' : '#eff6ff' }]}>
                <Icon name="document-text" size={30} color={isDark ? '#60a5fa' : '#2980b9'} />
              </View>
              <View style={styles.info}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.cardSub, { color: colors.subText }]}>PDF Available</Text>
              </View>
              <TouchableOpacity
                style={[styles.downloadBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleDownload(item)}
              >
                <Icon name="download-outline" size={24} color="#fff" />
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
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Session</Text>
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
                    selectedSession?.sessionId === item.sessionId && { color: colors.primary, fontWeight: 'bold' }
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
  selectorContainer: { padding: 15, backgroundColor: '#fff', elevation: 2 },
  label: { fontSize: 12, color: '#666', marginBottom: 5, fontWeight: '600' },
  dropdown: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, backgroundColor: '#fafafa'
  },
  dropdownText: { fontSize: 14, color: '#333', fontWeight: '500' },

  // List Styles
  emptyText: { marginTop: 10, color: '#6b7280', fontSize: 16, fontWeight: 'bold' },
  subEmptyText: { color: '#9ca3af', fontSize: 13, marginTop: 5 },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15,
    alignItems: 'center', elevation: 2
  },
  iconContainer: {
    width: 50, height: 50, backgroundColor: '#eff6ff', borderRadius: 25,
    justifyContent: 'center', alignItems: 'center', marginRight: 15
  },
  info: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  cardSub: { fontSize: 12, color: '#666', marginTop: 2 },
  downloadBtn: {
    backgroundColor: '#2980b9', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center'
  },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '50%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  modalItemActive: { backgroundColor: '#eff6ff' },
  modalItemText: { fontSize: 16, color: '#333' },
  modalItemTextActive: { color: '#2980b9', fontWeight: 'bold' }
});

export default HallTicketScreen;