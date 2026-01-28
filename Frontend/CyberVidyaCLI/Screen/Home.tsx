import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  FlatList,
  RefreshControl,
  Button,
  Platform,
  UIManager,
  ActivityIndicator,
  Image,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import RNBlobUtil from 'react-native-blob-util';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAttendanceAndDetails,
  UserDetails,
  getDashboardAttendance,
  DashboardAttendance,
  getRegisteredCourses,
  RegisteredCourse,
  getLectureWiseAttendance,
  getWeeklySchedule,
  getStudentProfileInfo,
} from '../api';
import { CircularProgress } from 'react-native-circular-progress';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';

// LiveTracker removed

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Helper Functions ---
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good Morning,";
  if (hour >= 12 && hour < 17) return "Good Afternoon,";
  if (hour >= 17 && hour < 20) return "Good Evening,";
  return "Good Night,";
};

const getAttendanceInfo = (present: number, total: number) => {
  if (total === 0) return { status: 'safe', message: 'No classes have been held yet.' };
  const currentPercentage = (present / total) * 100;
  let status: 'safe' | 'warning' | 'danger' = 'safe';
  if (currentPercentage < 75 && currentPercentage >= 65) status = 'warning';
  else if (currentPercentage < 65) status = 'danger';

  if (currentPercentage >= 75) {
    const canMiss = Math.floor(present / 0.75 - total);
    return { status, message: canMiss > 0 ? `You can miss ${canMiss} more classes.` : 'Do not miss any more classes to maintain 75%.' };
  } else {
    const mustAttend = Math.ceil(3 * total - 4 * present);
    return { status, message: `You must attend the next ${mustAttend} classes for 75%.` };
  }
};

const SmartSummary = ({ present, total }: { present: number, total: number }) => {
  const { status, message } = getAttendanceInfo(present, total);

  if (total === 0) {
    return (
      <View style={styles.summaryBox}>
        <Icon name="hourglass-outline" size={30} color="#348b9f" />
        <View style={styles.summaryContent}>
          <Text style={styles.summaryStatusText}>Classes Haven't Started</Text>
          <Text style={styles.summaryDetailText}>{message}</Text>
        </View>
      </View>
    );
  }

  if (status === 'safe') {
    const canMiss = Math.floor(present / 0.75 - total);
    return (
      <View style={styles.summaryBox}>
        <Icon name="shield-checkmark" size={40} color="#27ae60" />
        <View style={styles.summaryContent}>
          <Text style={styles.summaryStatusText}>Attendance is Safe</Text>
          {canMiss > 0 ? (
            <Text style={styles.canMissText}>You can miss {canMiss} more classes.</Text>
          ) : (
            <Text style={styles.summaryDetailText}>Don't miss any classes to stay above 75%.</Text>
          )}
        </View>
      </View>
    );
  } else {
    return (
      <View style={[styles.summaryBox, styles.summaryBoxWarning]}>
        <Icon name="warning" size={40} color={status === 'danger' ? '#c0392b' : '#f39c12'} />
        <View style={styles.summaryContent}>
          <Text style={styles.summaryStatusText}>Action Required!</Text>
          <Text style={styles.summaryDetailText}>{message}</Text>
        </View>
      </View>
    );
  }
};

const AnimatedAttendanceCard = ({ item, index, todayStatus }: { item: RegisteredCourse, index: number, todayStatus?: string }) => {
  const navigation = useNavigation<any>();
  const { courseName, courseId, studentId, studentCourseCompDetails } = item;
  const details = studentCourseCompDetails?.[0];

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    opacity.value = withDelay(index * 100, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(index * 100, withTiming(0, { duration: 400 }));
  }, [index, opacity, translateY]);

  if (!details) return null;

  const { courseCompId, presentLecture, totalLecture } = details;
  const present = presentLecture || 0;
  const total = totalLecture || 0;
  const percentage = total > 0 ? (present / total) * 100 : 0;
  const { status } = getAttendanceInfo(present, total);
  const progressColor = status === 'safe' ? '#27ae60' : status === 'warning' ? '#f39c12' : '#c0392b';

  const handlePress = () => {
    navigation.navigate('CourseDetails', { studentId, courseId, courseCompId, courseName });
  };

  const renderTodayBadge = () => {
    if (!todayStatus) return null;

    let badgeColor = '#7f8c8d';
    let badgeBg = '#f4f6f8';
    let badgeText = '';
    let badgeIcon = '';

    if (todayStatus === 'PRESENT') {
      badgeColor = '#27ae60';
      badgeBg = '#e8f5e9';
      badgeText = 'Present Today';
      badgeIcon = 'checkmark-circle';
    } else if (todayStatus === 'ABSENT') {
      badgeColor = '#c0392b';
      badgeBg = '#ffebee';
      badgeText = 'Absent Today';
      badgeIcon = 'alert-circle';
    } else if (todayStatus === 'PENDING') {
      badgeColor = '#f39c12';
      badgeBg = '#fff3e0';
      badgeText = 'Not Marked Yet';
      badgeIcon = 'time';
    } else if (todayStatus === 'SCHEDULED') {
      // ✅ New Status for Future Classes
      badgeColor = '#2980b9';
      badgeBg = '#eaf2f8';
      badgeText = 'Upcoming';
      badgeIcon = 'calendar';
    } else {
      return null;
    }

    return (
      <View style={[styles.todayBadge, { backgroundColor: badgeBg, borderColor: badgeColor + '40' }]}>
        <Icon name={badgeIcon} size={14} color={badgeColor} />
        <Text style={[styles.todayBadgeText, { color: badgeColor }]}>{badgeText}</Text>
      </View>
    );
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.courseName} numberOfLines={2}>{courseName}</Text>
          <View style={styles.percentageContainer}>
            <Text style={[styles.percentageText, { color: progressColor }]}>{percentage.toFixed(1)}%</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          {/* ✅ FIX: Removed extra brace causing the syntax error */}
          <Text style={styles.attendedText}>{present} of {total} Attended</Text>
          {renderTodayBadge()}
        </View>

        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: progressColor }]} />
        </View>
        <SmartSummary present={present} total={total} />
        <View style={styles.footerSeparator} />
        <Pressable onPress={handlePress} style={({ pressed }) => [styles.cardFooterAction, pressed && styles.pressed]}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Icon name="arrow-forward-circle" size={22} color="#2980b9" />
        </Pressable>
      </TouchableOpacity>
    </Animated.View>
  );
};

const SkeletonPlaceholderComponent = () => (
  <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
    <View style={styles.header}>
      <View>
        <ShimmerPlaceholder style={{ width: 150, height: 20, borderRadius: 5, marginBottom: 8 }} />
        <ShimmerPlaceholder style={{ width: 120, height: 30, borderRadius: 5 }} />
      </View>
      <ShimmerPlaceholder style={{ width: 80, height: 38, borderRadius: 20 }} />
    </View>

    <View style={[styles.detailCard, { padding: 10 }]}>
      <ShimmerPlaceholder style={{ width: '90%', height: 20, borderRadius: 5, marginVertical: 12 }} />
      <ShimmerPlaceholder style={{ width: '80%', height: 20, borderRadius: 5, marginVertical: 12 }} />
      <ShimmerPlaceholder style={{ width: '85%', height: 20, borderRadius: 5, marginVertical: 12 }} />
    </View>

    <View style={[styles.card, { padding: 20 }]}>
      <ShimmerPlaceholder style={[styles.listHeader, { width: '70%', height: 22, marginBottom: 20 }]} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ShimmerPlaceholder style={{ width: 120, height: 120, borderRadius: 60 }} />
        <View style={{ flex: 1, marginLeft: 20 }}>
          <ShimmerPlaceholder style={{ width: '90%', height: 20, borderRadius: 5 }} />
          <ShimmerPlaceholder style={{ width: '70%', height: 16, borderRadius: 5, marginTop: 10 }} />
        </View>
      </View>
    </View>
  </View>
);

function HomeScreen({ onLogout }: { onLogout: () => void }): React.JSX.Element {
  const [userData, setUserData] = useState<UserDetails | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardAttendance | null>(null);
  const [courses, setCourses] = useState<RegisteredCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

  const [todayAttendanceMap, setTodayAttendanceMap] = useState<{ [key: number]: string }>({});

  // Fetch profile photo
  const fetchProfilePhoto = async () => {
    try {
      const profileInfo = await getStudentProfileInfo();

      if (profileInfo.profilePhoto) {
        const token = await AsyncStorage.getItem('authToken');

        if (token) {
          const response = await RNBlobUtil.fetch(
            'GET',
            profileInfo.profilePhoto,
            { 'Authorization': token }
          );

          const base64Data = await response.base64();
          setProfilePhoto(`data:image/jpeg;base64,${base64Data}`);
        }
      }
    } catch (error) {
      console.log('Profile photo fetch failed:', error);
    }
  };

  const fetchAllData = useCallback(async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      setError(null);
      const [details, dashboard, registeredCourses] = await Promise.all([
        getAttendanceAndDetails(),
        getDashboardAttendance(),
        getRegisteredCourses(),
      ]);
      setUserData(details);
      setDashboardData(dashboard);
      setCourses(registeredCourses);

      // Fetch profile photo
      fetchProfilePhoto();

      fetchTodayStatuses(registeredCourses); // Call fetch statuses without passing component list

    } catch (err: any) {
      setError(err.message || 'Could not fetch data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  const fetchTodayStatuses = async (courseList: RegisteredCourse[]) => {
    const today = new Date();

    // 🛑 1. Weekend Guard
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      setTodayAttendanceMap({});
      return;
    }

    // 2. Fetch Schedule
    let scheduledCourses: { code: string; isLab: boolean; name: string; startTime: Date | null; endTime: Date | null }[] = [];

    try {
      const schedule = await getWeeklySchedule();
      const isScheduleToday = (dateStr: string) => {
        if (!dateStr) return false;
        let d = new Date();
        if (dateStr.match(/^\d{2}[/-]\d{2}[/-]\d{4}/)) {
          const [datePart] = dateStr.split(' ');
          const [dNum, mNum, yNum] = datePart.split(/[/-]/).map(Number);
          d = new Date(yNum, mNum - 1, dNum);
        } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          d = new Date(dateStr.replace(' ', 'T'));
        } else {
          d = new Date(dateStr);
        }
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      };

      const todayClasses = schedule.filter(s => isScheduleToday(s.start) && s.type !== 'HOLIDAY');

      todayClasses.forEach(s => {
        const nameLower = s.courseName?.toLowerCase() || '';
        const isPractical = nameLower.includes('lab') || nameLower.includes('practical') || nameLower.includes('project');

        // ✅ TIME PARSING LOGIC
        let startTime: Date | null = null;
        let endTime: Date | null = null;

        try {
          if (s.start && s.start.includes(' ')) {
            const [datePart, timePart] = s.start.split(' ');
            const [dNum, mNum, yNum] = datePart.split(/[/-]/).map(Number);
            startTime = new Date(yNum, mNum - 1, dNum);

            if (timePart) {
              const [h, m] = timePart.split(':').map(Number);
              startTime.setHours(h, m, 0, 0);
            }
          }

          // ✅ End Time Parse
          if (s.end && s.end.includes(' ')) {
            const [datePart, timePart] = s.end.split(' ');
            const [dNum, mNum, yNum] = datePart.split(/[/-]/).map(Number);
            endTime = new Date(yNum, mNum - 1, dNum);

            if (timePart) {
              const [h, m] = timePart.split(':').map(Number);
              endTime.setHours(h, m, 0, 0);
            }
          }
        } catch (e) { console.log('Time parse error', e); }

        if (s.courseCode) {
          scheduledCourses.push({
            code: s.courseCode.trim(),
            isLab: isPractical,
            name: nameLower.split('-')[0].trim(),
            startTime: startTime,
            endTime: endTime
          });
        }
      });

    } catch (e) {
      return;
    }

    if (scheduledCourses.length === 0) {
      setTodayAttendanceMap({});
      return;
    }

    const statusMap: { [key: number]: string } = {};

    const isAttendanceDateMatch = (dateStr: string) => {
      if (!dateStr) return false;
      let d = new Date();
      if (dateStr.includes('/')) {
        const [datePart] = dateStr.split(' ');
        const [dNum, mNum, yNum] = datePart.split('/').map(Number);
        d = new Date(yNum, mNum - 1, dNum);
      } else {
        d = new Date(dateStr);
      }
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    };

    await Promise.all(courseList.map(async (course) => {
      const courseCode = course.courseCode.trim();
      const courseNameLower = course.courseName.toLowerCase();

      const isTheory = !courseNameLower.includes('lab') && !courseNameLower.includes('practical') && !courseNameLower.includes('project');

      // Find matching schedule entry for this course 
      const scheduledEntry = scheduledCourses.find(sch => sch.code === courseCode);

      if (!scheduledEntry) return;

      // Skip if schedule says Lab but this is theory, or vice-versa
      if (isTheory && scheduledEntry.isLab) return;
      if (!isTheory && !scheduledEntry.isLab) return;

      // 🛑 STRICT CHECK: If Lecture hasn't ended yet, DO NOT CHECK ATTENDANCE
      let effectiveEndTime = scheduledEntry.endTime;
      if (!effectiveEndTime && scheduledEntry.startTime) {
        // Fallback: Assume class is 60 mins long if end time missing
        effectiveEndTime = new Date(scheduledEntry.startTime.getTime() + 60 * 60 * 1000);
      }

      const now = new Date();

      // Agar abhi time EndTime se kam hai (Lecture chal raha hai ya hone wala hai)
      if (effectiveEndTime && now < effectiveEndTime) {
        statusMap[course.courseId] = 'SCHEDULED';
        return; // Stop here, don't check API
      }

      // 🎯 If Lecture is OVER, then check API for status
      const componentsToCheck = course.studentCourseCompDetails || [];
      let foundMarkedAttendance = false;

      for (const detail of componentsToCheck) {
        try {
          const lectures = await getLectureWiseAttendance({
            studentId: course.studentId,
            courseId: course.courseId,
            courseCompId: detail.courseCompId
          });

          const todayRecord = lectures.find(l => isAttendanceDateMatch(l.planLecDate));

          if (todayRecord && (todayRecord.attendance === 'PRESENT' || todayRecord.attendance === 'ABSENT')) {
            statusMap[course.courseId] = todayRecord.attendance;
            foundMarkedAttendance = true;
            return;
          }
        } catch (e) {
          // Ignore API failure
        }
      }

      // If lecture is over but no record found
      if (!foundMarkedAttendance) {
        statusMap[course.courseId] = 'PENDING';
      }
    }));

    setTodayAttendanceMap(statusMap);
  };

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
  }, [fetchAllData]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <SkeletonPlaceholderComponent />
      </SafeAreaView>
    );
  }

  if (error && !loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Try Again" onPress={fetchAllData} color="#2980b9" />
        <View style={{ marginTop: 10 }} />
        <Button title="Logout" onPress={onLogout} color="#c0392b" />
      </SafeAreaView>
    );
  }

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {profilePhoto && (
            <TouchableOpacity onPress={() => setPhotoModalVisible(true)}>
              <Image
                source={{ uri: profilePhoto }}
                style={styles.profilePhoto}
              />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.title}>{userData?.fullName?.split(' ')[0]}!</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* LiveTracker removed */}

      <View style={styles.detailCard}>
        <View style={styles.detailRow}><Icon name="person-outline" size={20} color="#34495e" style={styles.iconStyle} /><Text style={styles.detailLabel}>Roll No.</Text><Text style={styles.detailValue}>{userData?.rollNumber?.trim()}</Text></View>
        <View style={styles.detailRow}><Icon name="school-outline" size={20} color="#34495e" style={styles.iconStyle} /><Text style={styles.detailLabel}>Branch</Text><Text style={styles.detailValue}>{userData?.branchShortName}</Text></View>
        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}><Icon name="library-outline" size={20} color="#34495e" style={styles.iconStyle} /><Text style={styles.detailLabel}>Semester</Text><Text style={styles.detailValue}>{userData?.semesterName}</Text></View>
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
            {(fill: number) => (<Text style={styles.progressText}>{fill.toFixed(1)}%</Text>)}
          </CircularProgress>
          <View style={styles.summaryTextContainer}>
            <Text style={styles.summaryTitle}>Total Attendance</Text>
            <Text style={styles.summarySubtitle}>Your official attendance summary from the dashboard.</Text>
          </View>
        </View>
      </View>
      <Text style={styles.listHeader}>Subject-wise Breakdown</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#e7f2f8" />
      <LinearGradient colors={['#e7f2f8', '#f4f6f8', '#f4f6f8']} style={{ flex: 1 }}>
        <FlatList
          data={courses}
          renderItem={({ item, index }) => (
            <AnimatedAttendanceCard
              item={item}
              index={index}
              todayStatus={todayAttendanceMap[item.courseId]}
            />
          )}
          keyExtractor={(item) => item.courseId.toString()}
          ListHeaderComponent={ListHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2980b9"]} />}
        />
      </LinearGradient>

      {/* Full-Screen Photo Modal */}
      <Modal
        visible={photoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPhotoModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {profilePhoto && (
              <Image
                source={{ uri: profilePhoto }}
                style={styles.fullPhoto}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setPhotoModalVisible(false)}
            >
              <Icon name="close-circle" size={40} color="#fff" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#e7f2f8' },
  headerContainer: {},
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f8', padding: 20 },
  errorText: { color: '#c0392b', textAlign: 'center', marginBottom: 20, fontSize: 16 },
  header: { paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profilePhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#e0e7ff'
  },
  greeting: { fontSize: 20, color: '#7f8c8d' },
  title: { fontSize: 30, fontWeight: 'bold', color: '#2c3e50' },
  logoutButton: { backgroundColor: 'rgba(236, 240, 241, 0.8)', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  logoutButtonText: { color: '#34495e', fontWeight: '600', fontSize: 14 },
  listHeader: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 16 },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 20, marginBottom: 16, padding: 20, elevation: 4, shadowColor: '#95a5a6', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.15, shadowRadius: 10, borderWidth: 1, borderColor: '#fff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  courseName: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', flex: 1, marginRight: 10, lineHeight: 24 },
  percentageContainer: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.05)' },
  percentageText: { fontSize: 20, fontWeight: 'bold' },
  attendedText: { fontSize: 15, color: '#7f8c8d', marginTop: 0 },
  progressBarBackground: { height: 8, backgroundColor: '#ecf0f1', borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 4 },
  summaryBox: { flexDirection: 'row', marginTop: 15, backgroundColor: 'rgba(232, 245, 233, 0.8)', borderRadius: 12, padding: 15, alignItems: 'center' },
  summaryBoxWarning: { backgroundColor: 'rgba(255, 243, 224, 0.8)' },
  summaryContent: { flex: 1, marginLeft: 15 },
  summaryStatusText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  summaryDetailText: { fontSize: 14, color: '#555', marginTop: 2, lineHeight: 20 },
  canMissText: { fontSize: 18, fontWeight: 'bold', color: '#27ae60', marginTop: 2 },
  detailCard: { backgroundColor: 'white', borderRadius: 15, padding: 10, marginBottom: 16, elevation: 3, borderWidth: 1, borderColor: '#fff' },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ecf0f1' },
  iconStyle: { marginRight: 15, marginLeft: 5 },
  detailLabel: { fontSize: 16, color: '#34495e', flex: 1 },
  detailValue: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  summaryContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  summaryTextContainer: { flex: 1, marginLeft: 20, justifyContent: 'center' },
  summaryTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', marginBottom: 4 },
  summarySubtitle: { fontSize: 15, color: '#7f8c8d', lineHeight: 22 },
  progressText: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50' },
  footerSeparator: { height: 1, backgroundColor: '#ecf0f1', marginTop: 15 },
  cardFooterAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 15 },
  viewDetailsText: { color: '#2980b9', fontSize: 16, fontWeight: '600', marginRight: 8 },
  pressed: { opacity: 0.7 },

  // ✅ Styles for Today's Badge
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  todayBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  todayBadgeText: { fontSize: 11, fontWeight: '700', marginLeft: 4 },

  // 📸 Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  fullPhoto: {
    width: '90%',
    height: '70%'
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10
  },
});

export default HomeScreen;