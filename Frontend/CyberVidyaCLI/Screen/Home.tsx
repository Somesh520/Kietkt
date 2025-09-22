import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Button,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { 
  getAttendanceAndDetails, 
  UserDetails, 
  getDashboardAttendance, 
  DashboardAttendance, 
  getRegisteredCourses, 
  RegisteredCourse 
} from '../api';
import { CircularProgress } from 'react-native-circular-progress';
import Icon from 'react-native-vector-icons/Ionicons';

// --- TypeScript Interfaces ---
interface HomeScreenProps {
  onLogout: () => void;
}

interface AttendanceInfo {
  status: 'safe' | 'warning' | 'danger';
  message: string;
}

// --- Helper Function: Attendance Calculation ---
const getAttendanceInfo = (present: number, total: number): AttendanceInfo => {
  if (total === 0) {
    return { status: 'safe', message: 'No classes have been held yet.' };
  }
  const currentPercentage = (present / total) * 100;
  let status: 'safe' | 'warning' | 'danger' = 'safe';
  if (currentPercentage < 75 && currentPercentage >= 65) {
    status = 'warning';
  } else if (currentPercentage < 65) {
    status = 'danger';
  }
  if (currentPercentage >= 75) {
    const canMiss = Math.floor(present / 0.75 - total);
    if (canMiss > 0) {
      return { status, message: `You can miss ${canMiss} more classes.` };
    }
    return { status, message: 'Do not miss any more classes to maintain 75%.' };
  } else {
    const mustAttend = Math.ceil(3 * total - 4 * present);
    return { status, message: `You must attend the next ${mustAttend} classes for 75%.` };
  }
};

// --- UI Components ---
const AttendanceCard = ({ item }: { item: RegisteredCourse }) => {
  const navigation = useNavigation<any>();
  const { courseName, courseCode, studentId, courseId, studentCourseCompDetails } = item;
  const details = studentCourseCompDetails?.[0];

  if (!details) return null;

  const { courseCompId } = details;
  const present = details.presentLecture || 0;
  const total = details.totalLecture || 0;
  const percentage = total > 0 ? (present / total) * 100 : 0;
  const { status, message } = getAttendanceInfo(present, total);
  const progressColor = status === 'safe' ? '#27ae60' : status === 'warning' ? '#f39c12' : '#c0392b';

  const handlePress = () => {
    navigation.navigate('CourseDetails', { studentId, courseId, courseCompId, courseName });
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.courseName} numberOfLines={1}>{courseName}</Text>
        <Text style={styles.courseCode}>{courseCode}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.percentageText, { color: progressColor }]}>{percentage.toFixed(1)}%</Text>
        <Text style={styles.attendedText}>{present} of {total} Attended</Text>
      </View>
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: progressColor }]} />
      </View>
      <View style={styles.cardFooter}>
        <Text style={[styles.infoText, { color: progressColor }]}>{message}</Text>
      </View>
    </TouchableOpacity>
  );
};

// --- Main Screen Component ---
function HomeScreen({ onLogout }: HomeScreenProps): React.JSX.Element {
  const [userData, setUserData] = useState<UserDetails | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardAttendance | null>(null);
  const [courses, setCourses] = useState<RegisteredCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [details, dashboard, registeredCourses] = await Promise.all([
        getAttendanceAndDetails(),
        getDashboardAttendance(),
        getRegisteredCourses(),
      ]);
      setUserData(details);
      setDashboardData(dashboard);
      setCourses(registeredCourses);
    } catch (err: any) {
      setError(err.message || 'Could not fetch data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllData();
  }, [fetchAllData]);

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2980b9" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Refresh" onPress={fetchAllData} color="#2980b9" />
        <View style={{marginTop: 10}} />
        <Button title="Logout" onPress={onLogout} color="#c0392b" />
      </View>
    );
  }
  
  const ListHeader = () => (
    <>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome,</Text>
          <Text style={styles.title}>{userData?.fullName?.split(' ')[0]}!</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.detailCard}>
        <View style={styles.detailRow}><Icon name="person-outline" size={20} color="#34495e" style={styles.icon} /><Text style={styles.detailLabel}>Roll No.</Text><Text style={styles.detailValue}>{userData?.rollNumber?.trim()}</Text></View>
        <View style={styles.detailRow}><Icon name="school-outline" size={20} color="#34495e" style={styles.icon} /><Text style={styles.detailLabel}>Branch</Text><Text style={styles.detailValue}>{userData?.branchShortName}</Text></View>
        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}><Icon name="library-outline" size={20} color="#34495e" style={styles.icon} /><Text style={styles.detailLabel}>Semester</Text><Text style={styles.detailValue}>{userData?.semesterName}</Text></View>
      </View>
      <View style={styles.card}>
        <Text style={styles.listHeader}>Overall Summary</Text>
        <View style={styles.summaryContainer}>
          <CircularProgress
            fill={dashboardData?.presentPerc || 0}
            size={120}
            width={12}
            tintColor={(dashboardData?.presentPerc || 0) >= 75 ? '#27ae60' : '#c0392b'}
            backgroundColor="#ecf0f1"
            rotation={0}
            lineCap="round"
          >
            {(fill: number) => (
              <Text style={styles.progressText}>
                {fill.toFixed(1)}%
              </Text>
            )}
          </CircularProgress>
          <View style={styles.summaryTextContainer}>
            <Text style={styles.summaryTitle}>Total Attendance</Text>
            <Text style={styles.summarySubtitle}>
              Your official attendance summary from the dashboard.
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.listHeader}>Subject-wise Attendance</Text>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={courses}
        renderItem={({ item }) => <AttendanceCard item={item} />}
        keyExtractor={(item) => item.courseId.toString()}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2980b9"]} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f6f8' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f8' },
  errorText: { color: '#c0392b', textAlign: 'center', marginBottom: 20, fontSize: 16 },
  header: { paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 20, color: '#7f8c8d' },
  title: { fontSize: 30, fontWeight: 'bold', color: '#2c3e50' },
  logoutButton: { backgroundColor: '#ecf0f1', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  logoutButtonText: { color: '#34495e', fontWeight: '600', fontSize: 14 },
  detailCard: { backgroundColor: 'white', borderRadius: 15, padding: 10, marginVertical: 20, elevation: 3, shadowColor: '#95a5a6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ecf0f1' },
  icon: { marginRight: 15, marginLeft: 5 },
  detailLabel: { fontSize: 16, color: '#34495e', flex: 1 },
  detailValue: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  listHeader: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, color: '#2c3e50' },
  card: { backgroundColor: 'white', borderRadius: 15, marginBottom: 16, padding: 16, elevation: 3, shadowColor: '#95a5a6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  courseName: { fontSize: 17, fontWeight: '600', color: '#2c3e50', flex: 1, marginRight: 8 },
  courseCode: { fontSize: 14, color: '#7f8c8d' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  percentageText: { fontSize: 32, fontWeight: 'bold' },
  attendedText: { fontSize: 15, color: '#7f8c8d' },
  progressBarBackground: { height: 10, backgroundColor: '#ecf0f1', borderRadius: 5, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 5 },
  cardFooter: { marginTop: 12 },
  infoText: { fontSize: 14, fontWeight: '500' },
  summaryContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  summaryTextContainer: { flex: 1, marginLeft: 20, justifyContent: 'center' },
  summaryTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', marginBottom: 4 },
  summarySubtitle: { fontSize: 15, color: '#7f8c8d', lineHeight: 22 },
  progressText: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50' },
});

export default HomeScreen;