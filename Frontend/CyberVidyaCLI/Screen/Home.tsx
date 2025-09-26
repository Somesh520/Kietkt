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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import LinearGradient from 'react-native-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Helper Functions (No changes) ---
const getGreeting = (): string => {
  const hour = new Date().getHours(); // Yeh 0 se 23 tak ka number dega

  if (hour >= 5 && hour < 12) {
    // Subah 5 baje se 11:59 AM tak
    return "Good Morning,";
  }
  if (hour >= 12 && hour < 18) {
    // Dopehar 12 baje se 5:59 PM tak
    return "Good Afternoon,";
  }
  if (hour >= 18 && hour < 22) {
    // Shaam 6 baje se 9:59 PM tak
    return "Good Evening,";
  }
  // Baaki saara samay (Raat 10 baje se subah 4:59 AM tak)
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

// --- UI Components ---
const SmartSummary = ({ present, total }: { present: number, total: number }) => {
    // ✅ FIX: getAttendanceInfo ko pehle call kiya taaki 'message' variable available ho
    const { status, message } = getAttendanceInfo(present, total);

    if (total === 0) {
      return (
        <View style={styles.summaryBox}>
          <Icon name="hourglass-outline" size={30} color="#3498db" />
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

const AnimatedAttendanceCard = ({ item, index }: { item: RegisteredCourse, index: number }) => {
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

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.courseName} numberOfLines={2}>{courseName}</Text>
          <View style={styles.percentageContainer}>
            <Text style={[styles.percentageText, { color: progressColor }]}>{percentage.toFixed(1)}%</Text>
          </View>
        </View>
        <Text style={styles.attendedText}>{present} of {total} Attended</Text>
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
      {/* Header Skeleton */}
      <View style={styles.header}>
          <View>
              <ShimmerPlaceholder style={{ width: 150, height: 20, borderRadius: 5, marginBottom: 8 }} />
              <ShimmerPlaceholder style={{ width: 120, height: 30, borderRadius: 5 }} />
          </View>
          <ShimmerPlaceholder style={{ width: 80, height: 38, borderRadius: 20 }} />
      </View>
      
      {/* Details Card Skeleton */}
      <View style={[styles.detailCard, {padding: 10}]}>
          <ShimmerPlaceholder style={{width: '90%', height: 20, borderRadius: 5, marginVertical: 12}} />
          <ShimmerPlaceholder style={{width: '80%', height: 20, borderRadius: 5, marginVertical: 12}} />
          <ShimmerPlaceholder style={{width: '85%', height: 20, borderRadius: 5, marginVertical: 12}} />
      </View>

      {/* Overall Summary Skeleton */}
      <View style={[styles.card, { padding: 20 }]}>
          <ShimmerPlaceholder style={[styles.listHeader, { width: '70%', height: 22, marginBottom: 20 }]} />
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <ShimmerPlaceholder style={{ width: 120, height: 120, borderRadius: 60 }} />
              <View style={{flex: 1, marginLeft: 20}}>
                  <ShimmerPlaceholder style={{ width: '90%', height: 20, borderRadius: 5 }} />
                  <ShimmerPlaceholder style={{ width: '70%', height: 16, borderRadius: 5, marginTop: 10 }} />
              </View>
          </View>
      </View>

      {/* Subject Breakdown Skeleton */}
      <ShimmerPlaceholder style={[styles.listHeader, { width: '80%', height: 22 }]} />
      <View style={[styles.card, { padding: 20 }]}>
          <ShimmerPlaceholder style={{width: '60%', height: 18, borderRadius: 5}}/>
          <ShimmerPlaceholder style={{width: '40%', height: 15, borderRadius: 5, marginTop: 8}}/>
          <ShimmerPlaceholder style={{width: '100%', height: 8, borderRadius: 4, marginTop: 15}}/>
      </View>
    </View>
);

// --- Main Screen Component ---
function HomeScreen({ onLogout }: { onLogout: () => void }): React.JSX.Element {
  const [userData, setUserData] = useState<UserDetails | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardAttendance | null>(null);
  const [courses, setCourses] = useState<RegisteredCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
    } catch (err: any) {
      setError(err.message || 'Could not fetch data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

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
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.title}>{userData?.fullName?.split(' ')[0]}!</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
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
      <LinearGradient colors={['#e7f2f8', '#f4f6f8', '#f4f6f8']} style={{ flex: 1 }}>
        <FlatList
          data={courses}
          renderItem={({ item, index }) => <AnimatedAttendanceCard item={item} index={index} />}
          keyExtractor={(item) => item.courseId.toString()}
          ListHeaderComponent={ListHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2980b9"]} />}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#e7f2f8' },
    headerContainer: { /* paddingTop: 10 --- Isko hata diya */ },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f8', padding: 20 },
    errorText: { color: '#c0392b', textAlign: 'center', marginBottom: 20, fontSize: 16 },
    header: { paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
    attendedText: { fontSize: 15, color: '#7f8c8d', marginTop: 4, marginBottom: 12 },
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
  });

export default HomeScreen;

