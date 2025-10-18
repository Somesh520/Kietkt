import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, RefreshControl, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getExamSchedule, ExamSchedule } from '../api'; // Path ko apne project ke hisab se theek karein

// --- Skeleton Component ---
const SkeletonCard = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 500,
          useNativeDriver: true,
        }),
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


// --- Main Screen Component ---
const ExamScheduleScreen = () => {
  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // courseDetails string ko parse karne ke liye function
  const parseCourseDetails = (details: string) => {
    const parts = details.split('-');
    return {
      courseCode: parts[0] || 'N/A',
      courseName: parts[0] || 'Unknown Subject',
      examType: parts.slice(2).join('-') || 'N/A',
    };
  };

  // Date string (DD/MM/YYYY) ko JavaScript Date object mein convert karne ke liye function
  const parseDate = (dateString: string): Date => {
      const [day, month, year] = dateString.split('/').map(Number);
      // Month is 0-indexed in JavaScript Date
      return new Date(year, month - 1, day);
  };


  const fetchExams = async () => {
    try {
      setError(null);
      let data = await getExamSchedule();
      
      // Data ko date ke anusaar sort karein
      data.sort((a, b) => {
        // Date range (e.g., "10/11/2025-14/11/2025") se start date nikalein
        const dateA_str = a.strExamDate.split('-')[0];
        const dateB_str = b.strExamDate.split('-')[0];

        const dateA = parseDate(dateA_str);
        const dateB = parseDate(dateB_str);

        return dateA.getTime() - dateB.getTime(); // Chronological order
      });
      
      setExams(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch exam schedule.');
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
        <View style={{paddingHorizontal: 16}}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>⚠️ Error: {error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Exam Schedule</Text>
      <FlatList
        data={exams}
        keyExtractor={(item, index) => `${(item as any).courseDetails || (item as any).courseCode || index}-${index}`}
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
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.infoText}>No exams scheduled right now. 📅</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4a90e2']} tintColor={'#4a90e2'} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
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
    marginTop: 50,
  },
  infoText: {
    marginTop: 15,
    fontSize: 16,
    color: '#5A6A7D',
  },
  errorText: {
    color: '#D93025',
    fontSize: 16,
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
    fontSize: 18,
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

