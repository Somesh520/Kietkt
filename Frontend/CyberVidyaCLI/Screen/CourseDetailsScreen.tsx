import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { getLectureWiseAttendance, Lecture } from '../api';
import Icon from 'react-native-vector-icons/Ionicons';

// ✅ This component is now fixed
const LectureItem = ({ item }: { item: Lecture }) => {
  const isPresent = item.attendance === 'PRESENT';
  
  // Parse the date string 'YYYY-MM-DD' safely
  const [year, month, day] = item.planLecDate.split('-').map(Number);
  // Create date at noon (12 PM) to avoid timezone boundary issues. Month is 0-indexed.
  const date = new Date(year, month - 1, day, 12);

  const formattedDate = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <View style={styles.itemContainer}>
      <View style={styles.dateAndTopic}>
        <Text style={styles.dateText}>{formattedDate}</Text>
        <Text style={styles.topicText} numberOfLines={1}>
          {item.topicCovered || 'Topic not specified'}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: isPresent ? '#27ae60' : '#c0392b' }]}>
        <Icon name={isPresent ? "checkmark-circle" : "close-circle"} size={16} color="white" />
        <Text style={styles.statusText}>{item.attendance}</Text>
      </View>
    </View>
  );
};

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

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#2980b9" style={{ marginTop: 50 }} />;
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
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{courseName}</Text>
      </View>
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  errorText: { textAlign: 'center', marginTop: 50, color: '#c0392b', fontSize: 16, paddingHorizontal: 20 },
  infoText: { textAlign: 'center', marginTop: 50, color: 'gray', fontSize: 16 },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  dateAndTopic: { flex: 1, marginRight: 10 },
  dateText: { fontSize: 16, color: '#34495e', fontWeight: '500' },
  topicText: { fontSize: 14, color: '#7f8c8d', marginTop: 2 },
  statusBadge: {
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: { color: 'white', fontSize: 12, fontWeight: 'bold', marginLeft: 5, textTransform: 'uppercase' },
});

export default CourseDetailsScreen;