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
  Alert,
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
import { useTheme } from '../ThemeContext';

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
  const { colors, isDark, isBrutalist } = useTheme();

  if (total === 0) {
    return (
      <View style={[
        styles.summaryBox,
        { backgroundColor: isDark ? 'rgba(52, 139, 159, 0.2)' : 'rgba(232, 245, 233, 0.8)' },
        isBrutalist && styles.brutalistSummaryBox,
        isBrutalist && { backgroundColor: colors.primary, borderColor: colors.border, shadowColor: colors.border }
      ]}>
        <Icon name="hourglass-outline" size={30} color={isBrutalist ? '#000' : colors.primary} />
        <View style={styles.summaryContent}>
          <Text style={[styles.summaryStatusText, { color: colors.text }, isBrutalist && styles.brutalistText, isBrutalist && { color: '#000' }]}>Classes Haven't Started</Text>
          <Text style={[styles.summaryDetailText, { color: colors.subText }, isBrutalist && styles.brutalistSubText, isBrutalist && { color: '#000' }]}>{message}</Text>
        </View>
      </View>
    );
  }

  if (status === 'safe') {
    const canMiss = Math.floor(present / 0.75 - total);
    return (
      <View style={[
        styles.summaryBox,
        { backgroundColor: isDark ? 'rgba(39, 174, 96, 0.2)' : 'rgba(232, 245, 233, 0.8)' },
        isBrutalist && styles.brutalistSummaryBox,
        isBrutalist && { backgroundColor: colors.success, borderColor: colors.border, shadowColor: colors.border }
      ]}>
        <Icon name="shield-checkmark" size={40} color={isBrutalist ? '#000' : colors.success} />
        <View style={styles.summaryContent}>
          <Text style={[styles.summaryStatusText, { color: colors.text }, isBrutalist && styles.brutalistText, isBrutalist && { color: '#000' }]}>Attendance is Safe</Text>
          {canMiss > 0 ? (
            <Text style={[styles.canMissText, { color: colors.success }, isBrutalist && styles.brutalistText, isBrutalist && { color: '#000' }]}>You can miss {canMiss} more classes.</Text>
          ) : (
            <Text style={[styles.summaryDetailText, { color: colors.subText }, isBrutalist && styles.brutalistSubText, isBrutalist && { color: '#000' }]}>Don't miss any classes to stay above 75%.</Text>
          )}
        </View>
      </View>
    );
  } else {
    return (
      <View style={[
        styles.summaryBox,
        styles.summaryBoxWarning,
        { backgroundColor: isDark ? 'rgba(243, 156, 18, 0.2)' : 'rgba(255, 243, 224, 0.8)' },
        isBrutalist && styles.brutalistSummaryBox,
        isBrutalist && { backgroundColor: colors.warning, borderColor: colors.border, shadowColor: colors.border }
      ]}>
        <Icon name="warning" size={40} color={isBrutalist ? '#000' : (status === 'danger' ? colors.danger : colors.warning)} />
        <View style={styles.summaryContent}>
          <Text style={[styles.summaryStatusText, { color: colors.text }, isBrutalist && styles.brutalistText, isBrutalist && { color: '#000' }]}>Action Required!</Text>
          <Text style={[styles.summaryDetailText, { color: colors.subText }, isBrutalist && styles.brutalistSubText, isBrutalist && { color: '#000' }]}>{message}</Text>
        </View>
      </View>
    );
  }
};

const AnimatedAttendanceCard = ({ item, index, todayStatus }: { item: RegisteredCourse, index: number, todayStatus?: string }) => {
  const navigation = useNavigation<any>();
  const { colors, isDark, isBrutalist } = useTheme();
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
      <View style={[
        styles.todayBadge,
        {
          backgroundColor: isDark ? badgeColor + '20' : badgeBg,
          borderColor: badgeColor + '40'
        }
      ]}>
        <Icon name={badgeIcon} size={14} color={badgeColor} />
        <Text style={[styles.todayBadgeText, { color: badgeColor }]}>{badgeText}</Text>
      </View>
    );
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.9}
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
          isBrutalist && styles.brutalistCard,
          isBrutalist && { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.border }
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.courseName, { color: colors.text }, isBrutalist && styles.brutalistText]} numberOfLines={2}>{courseName}</Text>
          <View style={[
            styles.percentageContainer,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
            isBrutalist && styles.brutalistBadge,
            isBrutalist && { borderColor: colors.border, backgroundColor: colors.card }
          ]}>
            <Text style={[styles.percentageText, { color: isBrutalist ? colors.text : progressColor }, isBrutalist && styles.brutalistText]}>{percentage.toFixed(1)}%</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          {/* ✅ FIX: Removed extra brace causing the syntax error */}
          <Text style={[styles.attendedText, { color: colors.subText }, isBrutalist && styles.brutalistSubText]}>{present} of {total} Attended</Text>
          {renderTodayBadge()}
        </View>

        <View style={[
          styles.progressBarBackground,
          { backgroundColor: isDark ? '#333' : '#ecf0f1' },
          isBrutalist && styles.brutalistProgressBarBackground,
          isBrutalist && { borderColor: colors.border, backgroundColor: colors.card }
        ]}>
          <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: progressColor }, isBrutalist && styles.brutalistProgressBar]} />
        </View>
        <SmartSummary present={present} total={total} />
        <View style={[
          styles.footerSeparator,
          { backgroundColor: colors.border },
          isBrutalist && styles.brutalistDivider,
          isBrutalist && { backgroundColor: colors.border }
        ]} />
        <Pressable onPress={handlePress} style={({ pressed }) => [styles.cardFooterAction, pressed && styles.pressed]}>
          <Text style={[styles.viewDetailsText, { color: colors.primary }, isBrutalist && styles.brutalistText]}>View Details</Text>
          <Icon name="arrow-forward-circle" size={22} color={isBrutalist ? colors.text : colors.primary} />
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
  const { colors, isDark, toggleTheme, isBrutalist, typography, spacing } = useTheme();
  const navigation = useNavigation<any>();

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: 'destructive', onPress: onLogout }
      ]
    );
  };

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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <SkeletonPlaceholderComponent />
      </SafeAreaView>
    );
  }

  if (error && !loading) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        <Button title="Try Again" onPress={fetchAllData} color={colors.primary} />
        <View style={{ marginTop: 10 }} />
        <Button title="Logout" onPress={handleLogout} color={colors.danger} />
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
                style={[styles.profilePhoto, { borderColor: colors.headerBg, backgroundColor: isDark ? '#333' : '#e0e7ff' }]}
              />
            </TouchableOpacity>
          )}
          <View>
            <Text style={[styles.greeting, { color: colors.subText }]}>{getGreeting()}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{userData?.fullName?.split(' ')[0]}!</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={[styles.logoutButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(236, 240, 241, 0.8)' }]}>
          <Text style={[styles.logoutButtonText, { color: colors.subText }]}>Logout</Text>
        </TouchableOpacity>

        {/* 🌗 Theme Toggle Button */}
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.logoutButton, { marginLeft: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(236, 240, 241, 0.8)' }]}
        >
          <Icon name={isDark ? "sunny" : "moon"} size={20} color={isDark ? "#f1c40f" : "#34495e"} />
        </TouchableOpacity>
      </View>

      {/* LiveTracker removed */}

      <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
          <Icon name="person-outline" size={20} color={colors.subText} style={styles.iconStyle} />
          <Text style={[styles.detailLabel, { color: colors.subText }]}>Roll No.</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{userData?.rollNumber?.trim()}</Text>
        </View>
        <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
          <Icon name="school-outline" size={20} color={colors.subText} style={styles.iconStyle} />
          <Text style={[styles.detailLabel, { color: colors.subText }]}>Branch</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{userData?.branchShortName}</Text>
        </View>
        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
          <Icon name="library-outline" size={20} color={colors.subText} style={styles.iconStyle} />
          <Text style={[styles.detailLabel, { color: colors.subText }]}>Semester</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{userData?.semesterName}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate('TripPlanner')}
        style={[
          styles.simulatorCard,
          { 
            backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF',
            borderColor: isDark ? '#312E81' : '#C7D2FE'
          },
          isBrutalist ? styles.brutalistCard : undefined,
          isBrutalist ? { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.border } : undefined
        ]}
      >
        <View style={styles.simulatorContent}>
          <Icon name="airplane-outline" size={24} color={isBrutalist ? colors.text : colors.primary} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.simulatorTitle, { color: colors.text }, isBrutalist ? styles.brutalistText : undefined]}>Trip Simulator</Text>
            <Text style={[styles.simulatorSubtitle, { color: colors.subText }, isBrutalist ? styles.brutalistSubText : undefined]}>Simulate attendance drops for future bunks</Text>
          </View>
          <Icon name="chevron-forward" size={18} color={isBrutalist ? colors.text : colors.primary} />
        </View>
      </TouchableOpacity>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.listHeader, { color: colors.text }]}>Overall Summary</Text>
        <View style={styles.summaryContainer}>
          <CircularProgress
            fill={dashboardData?.presentPerc || 0}
            size={120}
            width={12}
            tintColor={(dashboardData?.presentPerc || 0) >= 75 ? colors.success : colors.danger}
            backgroundColor={isDark ? '#333' : '#ecf0f1'}
            rotation={0}
            lineCap="round"
          >
            {(fill: number) => (<Text style={[styles.progressText, { color: colors.text }]}>{fill.toFixed(1)}%</Text>)}
          </CircularProgress>
          <View style={styles.summaryTextContainer}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Total Attendance</Text>
            <Text style={[styles.summarySubtitle, { color: colors.subText }]}>Your official attendance summary from the dashboard.</Text>
          </View>
        </View>
      </View>
      <Text style={[styles.listHeader, { color: colors.text }]}>Subject-wise Breakdown</Text>
    </View >
  );

  return (
    <SafeAreaView style={[
      styles.safeArea,
      { backgroundColor: colors.background },
      isBrutalist && styles.brutalistMain,
      isBrutalist && { backgroundColor: colors.background }
    ]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isBrutalist ? colors.background : colors.gradientWait[0]} />
      <LinearGradient colors={isBrutalist ? [colors.background, colors.background] : colors.gradientWait} style={{ flex: 1 }}>
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
          <View style={[styles.modalContent, { backgroundColor: isDark ? 'rgba(0,0,0,0.9)' : 'white' }]}>
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
  title: { fontSize: 32, fontWeight: '700', color: '#2c3e50', letterSpacing: -0.5 },
  logoutButton: { backgroundColor: 'rgba(255, 255, 255, 0.9)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  logoutButtonText: { color: '#34495e', fontWeight: '700', fontSize: 14 },
  listHeader: { fontSize: 24, fontWeight: '700', color: '#2c3e50', marginBottom: 16, letterSpacing: -0.5 },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 24, marginBottom: 20, padding: 20, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  courseName: { fontSize: 20, fontWeight: '700', color: '#2c3e50', flex: 1, marginRight: 10, lineHeight: 26, letterSpacing: -0.3 },
  percentageContainer: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.05)' },
  percentageText: { fontSize: 20, fontWeight: '800' },
  attendedText: { fontSize: 15, color: '#7f8c8d', marginTop: 0, fontWeight: '500' },
  progressBarBackground: { height: 10, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 5, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 5 },
  summaryBox: { flexDirection: 'row', marginTop: 15, backgroundColor: 'rgba(232, 245, 233, 0.6)', borderRadius: 16, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
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

  // --- NEO-BRUTALISM OVERRIDES ---
  brutalistMain: {}, 
  brutalistText: { fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  brutalistSubText: { fontWeight: '900', textTransform: 'uppercase' },
  brutalistCard: { 
    borderRadius: 0, 
    borderWidth: 4, 
    shadowOffset: { width: 8, height: 8 }, 
    shadowOpacity: 1, 
    shadowRadius: 0,
    elevation: 0,
    marginHorizontal: 0,
    marginBottom: 24,
  },
  brutalistSummaryBox: {
    borderRadius: 0,
    borderWidth: 4,
    shadowOffset: { width: 6, height: 6 }, 
    shadowOpacity: 1, 
    shadowRadius: 0,
  },
  brutalistSummaryBoxWarning: {},
  brutalistBadge: { borderRadius: 0, borderWidth: 2 },
  brutalistDivider: { height: 3, marginLeft: 0 },
  brutalistProgressBarBackground: {
    borderRadius: 0,
    borderWidth: 2,
    height: 12
  },
  brutalistProgressBar: {
    borderRadius: 0,
  },
  simulatorCard: {
    borderRadius: 20,
    marginBottom: 20,
    padding: 16,
    borderWidth: 1,
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowColor: '#000',
  },
  simulatorContent: { flexDirection: 'row', alignItems: 'center' },
  simulatorTitle: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  simulatorSubtitle: { fontSize: 13, lineHeight: 18 },
});

export default HomeScreen;