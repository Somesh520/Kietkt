import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Button
} from 'react-native';
import { getAttendanceAndDetails, UserDetails } from '../api';

interface HomeScreenProps {
  onLogout: () => void;
}

function HomeScreen({ onLogout }: HomeScreenProps): React.JSX.Element {
  const [userData, setUserData] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const details = await getAttendanceAndDetails();
        setUserData(details);
      } catch (err: any) {
        setError(err.message || 'Data fetch nahi ho saka.');
        console.error("Fetch Data Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={{ marginTop: 10 }}>Details load ho rahi hain...</Text>
      </View>
    );
  }

  if (error) { // Sirf error par check karein
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: 'red', textAlign: 'center', marginBottom: 20 }}>
          {error}
        </Text>
        <Button title="Logout" onPress={onLogout} color="#c0392b" />
      </View>
    );
  }

  // ✅ YEH UI AB CRASH NAHI HOGA
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Namaste,</Text>
            {/* ✅ SAHI TAREEKA: Optional chaining ka istemal */}
            <Text style={styles.title}>{userData?.fullName?.split(' ')[0]}!</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.cardTitle}>Aapki Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Roll No:</Text>
            <Text style={styles.detailValue}>{userData?.rollNumber?.trim()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Registration No:</Text>
            <Text style={styles.detailValue}>{userData?.registrationNumber}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Branch:</Text>
            <Text style={styles.detailValue}>{userData?.branchShortName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Semester:</Text>
            <Text style={styles.detailValue}>{userData?.semesterName}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>Batch:</Text>
            <Text style={styles.detailValue}>{userData?.admissionBatchName}</Text>
          </View>
        </View>
        
        <Text style={styles.listHeader}>Subjects Attendance</Text>
        {/* ✅ Yahan bhi optional chaining lagaya gaya hai */}
        {userData?.attendanceCourseComponentInfoList?.map((item) => (
            <View key={item.courseId} style={styles.courseItem}>
                <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.courseName}>{item.courseName}</Text>
                    <Text style={styles.courseCode}>{item.courseCode}</Text>
                </View>
                <Text style={styles.coursePercentage}>
                    {item.attendanceCourseComponentNameInfoList[0]?.presentPercentageWith || 'N/A'}
                </Text>
            </View>
        ))}
        
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles... (same as before)
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f0f2f5' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    greeting: { fontSize: 20, color: 'gray' },
    title: { fontSize: 28, fontWeight: 'bold' },
    logoutButton: { backgroundColor: '#e6e6e6', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    logoutButtonText: { color: '#333', fontWeight: '600' },
    detailCard: { backgroundColor: 'white', borderRadius: 15, marginHorizontal: 20, padding: 20, marginTop: 10, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    detailLabel: { fontSize: 16, color: 'gray' },
    detailValue: { fontSize: 16, fontWeight: '600' },
    listHeader: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, paddingHorizontal: 20 },
    courseItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white', borderRadius: 15, marginBottom: 10, marginHorizontal: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41 },
    courseName: { fontSize: 16, fontWeight: '600' },
    courseCode: { fontSize: 14, color: 'gray', marginTop: 4 },
    coursePercentage: { fontSize: 20, fontWeight: 'bold', color: '#007aff' },
  });
  
export default HomeScreen;