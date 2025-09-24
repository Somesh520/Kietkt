import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, StatusBar } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { getLectureWiseAttendance, Lecture } from '../api';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
// ✅ Import Shimmer Placeholder
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

// --- UI Component for single Lecture Item ---
const LectureItem = ({ item }: { item: Lecture }) => {
  const isPresent = item.attendance === 'PRESENT';
  
  const [year, month, day] = item.planLecDate.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);

  const formattedDate = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <View style={itemStyles.card}>
      <View style={itemStyles.leftContent}>
        <Text style={itemStyles.dateText}>{formattedDate}</Text>
        {item.topicCovered && (
          <Text style={itemStyles.topicText} numberOfLines={2}>
            {item.topicCovered}
          </Text>
        )}
      </View>
      <View style={[itemStyles.statusBadge, { backgroundColor: isPresent ? '#27ae60' : '#c0392b' }]}>
        <Icon name={isPresent ? "checkmark-circle-outline" : "close-circle-outline"} size={18} color="white" />
        <Text style={itemStyles.statusText}>{item.attendance}</Text>
      </View>
    </View>
  );
};

// ✅ --- NEW: Skeleton Loader Component ---
const SkeletonLectureItem = () => (
  <View style={[itemStyles.card, { borderColor: 'transparent' }]}>
    <View style={itemStyles.leftContent}>
      <ShimmerPlaceholder style={{ width: 120, height: 16, borderRadius: 4 }} />
      <ShimmerPlaceholder style={{ width: '90%', height: 20, borderRadius: 4, marginTop: 8 }} />
    </View>
    <ShimmerPlaceholder style={{ width: 95, height: 32, borderRadius: 20 }} />
  </View>
);

const SkeletonLoader = () => (
  <View style={styles.listContentContainer}>
    {[...Array(6)].map((_, index) => <SkeletonLectureItem key={index} />)}
  </View>
);


// --- Main Screen Component ---
function CourseDetailsScreen(): React.JSX.Element {
  const route = useRoute<any>();
  const { studentId, courseId, courseCompId, courseName } = route.params;

  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLectures = async () => {
      try {
        const data = await getLectureWiseAttendance({ studentId, courseId, courseCompId });
        data.sort((a: Lecture, b: Lecture) => new Date(b.planLecDate).getTime() - new Date(a.planLecDate).getTime());
        setLectures(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLectures();
  }, [studentId, courseId, courseCompId]);

  // ✅ Modified to show the skeleton loader
  const renderContent = () => {
    if (loading) {
      return <SkeletonLoader />;
    }
    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }
    if (lectures.length === 0) {
      return <Text style={styles.infoText}>No lecture data found for this subject.</Text>;
    }
    
    return (
      <FlatList
        data={lectures}
        renderItem={({ item }) => <LectureItem item={item} />}
        keyExtractor={(item, index) => `${item.planLecDate}-${index}`}
        contentContainerStyle={styles.listContentContainer}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f6f8" />
      <LinearGradient colors={['#e7f2f8', '#f4f6f8']} style={styles.backgroundGradient}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>{courseName}</Text>
        </View>
        {renderContent()}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  backgroundGradient: { flex: 1 },
  header: {
    paddingVertical: 25,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eceff1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2c3e50',
    lineHeight: 32,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#c0392b',
    fontSize: 16,
    paddingHorizontal: 20,
  },
  infoText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#7f8c8d',
    fontSize: 16,
    paddingHorizontal: 20,
  },
  listContentContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
    paddingTop: 5, // Add some top padding for the skeleton
  },
});

const itemStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 10,
    shadowColor: '#95a5a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  leftContent: { flex: 1, marginRight: 15 },
  dateText: { fontSize: 15, color: '#7f8c8d', fontWeight: 'bold' },
  topicText: { fontSize: 17, color: '#2c3e50', marginTop: 5, lineHeight: 22 },
  statusBadge: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 90,
    justifyContent: 'center',
  },
  statusText: { color: 'white', fontSize: 13, fontWeight: 'bold', marginLeft: 5, textTransform: 'uppercase' },
});

export default CourseDetailsScreen;
