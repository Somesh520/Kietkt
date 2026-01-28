import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  // SafeAreaView removed from here
  RefreshControl,
  Animated,
  Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { getExamSchedule, ExamSchedule } from '../api';

// --- Skeleton Component ---
const SkeletonCard = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.skeleton, { opacity, height: 20, width: '70%', marginBottom: 10 }]} />
      <Animated.View style={[styles.skeleton, { opacity, height: 16, width: '30%', marginBottom: 15 }]} />
      <View style={styles.separator} />
      <Animated.View style={[styles.skeleton, { opacity, height: 20, width: '90%', marginTop: 10 }]} />
    </View>
  );
};

// --- Animated Empty State Component ---
const EmptyExamState = () => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(floatAnim, { toValue: -20, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(floatAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ])
    ).start();
  }, [floatAnim, scaleAnim]);

  return (
    <View style={styles.centerContainer}>
      <Animated.View style={{ transform: [{ translateY: floatAnim }, { scale: scaleAnim }] }}>
        <Icon name="cafe" size={90} color="#F39C12" />
      </Animated.View>
      <Text style={styles.emptyTitle}>No Exams Scheduled!</Text>
      <Text style={styles.emptySubtitle}>Relax and enjoy your time off. 🎮☕</Text>
    </View>
  );
};

// --- Main Screen Component ---
const ExamScheduleScreen = () => {
  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const parseCourseDetails = (details: string) => {
    const parts = details.split('-');
    return {
      courseCode: parts[0] || 'N/A',
      courseName: parts[0] || 'Unknown Subject',
      examType: parts.slice(2).join('-') || 'N/A',
    };
  };

  const parseDate = (dateString: string): Date => {
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  // ✅ THIS FUNCTION IS FIXED TO HANDLE YOUR SPECIFIC ERROR
  const fetchExams = async () => {
    try {
      setError(null);
      let data = await getExamSchedule();

      if (Array.isArray(data)) {
        data.sort((a, b) => {
          const dateA_str = a.strExamDate.split('-')[0];
          const dateB_str = b.strExamDate.split('-')[0];
          return parseDate(dateA_str).getTime() - parseDate(dateB_str).getTime();
        });
        setExams(data);
      } else {
        setExams([]);
      }

    } catch (err: any) {
      // --- ROBUST ERROR CHECKING ---
      // Hum error ko string mein convert karke check karenge
      const errorString = JSON.stringify(err);
      const errorMessage = err.message || '';
      const apiReason = err?.response?.data?.data?.error?.reason || '';

      // Agar "Exams are not scheduled yet" kahin bhi likha hai, toh ye empty state hai
      if (
        errorMessage.includes("Exams are not scheduled yet") ||
        apiReason.includes("Exams are not scheduled yet") ||
        errorString.includes("Exams are not scheduled yet") ||
        errorString.includes("400 BAD_REQUEST0001")
      ) {
        // ✅ Ye Error nahi hai, bas list khali hai
        setExams([]);
        setError(null);
      } else {
        // ❌ Ye asli error hai
        console.log("Real Error Caught:", err);
        setError(apiReason || errorMessage || 'Failed to fetch exam schedule.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExams();
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.headerTitle}>Exam Schedule</Text>
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  // Error screen sirf tab dikhega jab actual error ho (Network etc.)
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="alert-circle-outline" size={50} color="#D93025" />
        <Text style={[styles.errorText, { marginTop: 10 }]}>Something went wrong</Text>
        <Text style={{ color: '#777', textAlign: 'center', marginTop: 5 }}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Exam Schedule</Text>
      <FlatList
        data={exams}
        keyExtractor={(item, index) => `${index}-${item.strExamDate}`}
        renderItem={({ item }) => {
          const courseDetailsString = (item as any).courseDetails;

          const details = (courseDetailsString && typeof courseDetailsString === 'string')
            ? parseCourseDetails(courseDetailsString)
            : {
              courseName: (item as any).courseName || 'N/A',
              courseCode: (item as any).courseCode || 'N/A',
              examType: (item as any).evalLevelComponentName || 'N/A'
            };

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.courseName}>{details.courseName} ({details.courseCode})</Text>
                <View style={styles.examTypeBadge}>
                  <Text style={styles.examTypeText}>{details.examType}</Text>
                </View>
              </View>
              <View style={styles.separator} />
              <View style={styles.cardBody}>
                <View style={styles.detailRow}>
                  <Icon name="calendar-outline" size={20} color="#555" style={styles.icon} />
                  <Text style={styles.detailText}>{item.strExamDate}</Text>
                </View>
              </View>
            </View>
          );
        }}
        // ✅ Empty Component ab sahi se trigger hoga
        ListEmptyComponent={<EmptyExamState />}

        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4a90e2']} tintColor={'#4a90e2'} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, flexGrow: 1 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A2533',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    color: '#D93025',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#485B73',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2533',
    flex: 1,
    marginRight: 10,
  },
  examTypeBadge: {
    backgroundColor: '#E7F3FF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  examTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4a90e2',
  },
  separator: {
    height: 1,
    backgroundColor: '#EAEFF4',
    marginVertical: 12,
  },
  cardBody: {},
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  icon: {
    marginRight: 12,
  },
  detailText: {
    fontSize: 15,
    color: '#334150',
    fontWeight: '500',
  },
  skeleton: {
    backgroundColor: '#EAEFF4',
    borderRadius: 4,
  },
});

export default ExamScheduleScreen;