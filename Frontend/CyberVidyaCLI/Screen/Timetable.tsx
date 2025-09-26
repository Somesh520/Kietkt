import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Animated,
  ScrollView,
} from 'react-native';
// ✅ YEH ASLI FIX HAI: SafeAreaView ko 'react-native-safe-area-context' se import karna hai
import { SafeAreaView } from 'react-native-safe-area-context';
import { getWeeklySchedule, TimetableEvent } from '../api';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

// --- Helper Functions ---
const getTodayDateKey = (): string => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

const parseCustomDate = (dateString: string): Date => {
  const [datePart, timePart] = dateString.split(' ');
  const [day, month, year] = datePart.split('/');
  const [hours, minutes, seconds] = timePart.split(':');
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds));
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const formatSectionHeaderDate = (dateString: string): string => {
  const [day, month, year] = dateString.split('/');
  const date = new Date(Number(year), Number(month) - 1, Number(day), 12);
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
};


// --- Skeleton Loader Components ---
const Shimmer = () => {
  const shimmerValue = useRef(new Animated.Value(-1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
  }, [shimmerValue]);

  const translateX = shimmerValue.interpolate({
    inputRange: [-1, 1],
    outputRange: [-400, 400],
  });

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Animated.View style={{ flex: 1, transform: [{ translateX }] }}>
        <LinearGradient
          colors={['#E0E0E0', '#F5F5F5', '#E0E0E0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
};

const SkeletonCard = () => (
  <View style={[itemStyles.card, { backgroundColor: '#E0E0E0', overflow: 'hidden' }]}>
    <View style={itemStyles.timelineContainer}>
      <View style={[itemStyles.iconContainer, {backgroundColor: '#BDBDBD'}]} />
    </View>
    <View style={itemStyles.detailsContainer}>
      <View style={{ height: 14, width: '40%', backgroundColor: '#BDBDBD', borderRadius: 4 }} />
      <View style={{ height: 18, width: '80%', backgroundColor: '#BDBDBD', borderRadius: 4, marginTop: 10 }} />
      <View style={{ height: 14, width: '60%', backgroundColor: '#BDBDBD', borderRadius: 4, marginTop: 10 }} />
    </View>
    <Shimmer />
  </View>
);


// --- Redesigned Card Components ---
const ClassCard = ({ item }: { item: TimetableEvent }) => {
  const startTime = formatTime(parseCustomDate(item.start));
  const endTime = formatTime(parseCustomDate(item.end));
  return (
    <View style={itemStyles.card}>
      <View style={itemStyles.timelineContainer}>
        <View style={[itemStyles.iconContainer, { backgroundColor: '#dbeafe' }]}>
          <Icon name="book-outline" size={20} color="#2563eb" />
        </View>
        <View style={itemStyles.timelineLine} />
      </View>
      <View style={itemStyles.detailsContainer}>
        <Text style={itemStyles.timeText}>{startTime} - {endTime}</Text>
        <Text style={itemStyles.courseName}>{item.courseName}</Text>
        <Text style={itemStyles.facultyName}>{item.facultyName}</Text>
        <View style={itemStyles.footerContainer}>
          <Icon name="location-outline" size={16} color="#7f8c8d" />
          <Text style={itemStyles.footerText}>{item.classRoom || 'N/A'}</Text>
        </View>
      </View>
    </View>
  );
};

const HolidayCard = ({ item }: { item: TimetableEvent }) => (
  <View style={itemStyles.card}>
    <View style={itemStyles.timelineContainer}>
      <View style={[itemStyles.iconContainer, { backgroundColor: '#ffedd5' }]}>
        <Icon name="cafe-outline" size={20} color="#f97316" />
      </View>
      <View style={itemStyles.timelineLine} />
    </View>
    <View style={itemStyles.detailsContainer}>
      <Text style={itemStyles.holidayTitle}>{item.title}</Text>
      <Text style={itemStyles.holidayContent}>{item.content}</Text>
    </View>
  </View>
);

// --- Main Screen Component ---
function TimetableScreen(): React.JSX.Element {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndGroupData = async () => {
      try {
        const weeklyEvents = await getWeeklySchedule();
        const todayKey = getTodayDateKey();
        const todaysEvents = weeklyEvents.filter(event => event.start.startsWith(todayKey));
        todaysEvents.sort((a, b) => parseCustomDate(a.start).getTime() - parseCustomDate(b.start).getTime());

        if (todaysEvents.length > 0) {
          const sectionsArray = [{ title: todayKey, data: todaysEvents }];
          setSections(sectionsArray);
        } else {
          setSections([]);
        }
      } catch (e: any) {
        setError(e.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    };
    fetchAndGroupData();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.mainTitle}>Today's Schedule</Text>
        <ScrollView contentContainerStyle={styles.listContentContainer} showsVerticalScrollIndicator={false}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SectionList
        sections={sections}
        ListHeaderComponent={<Text style={styles.mainTitle}>Today's Schedule</Text>}
        keyExtractor={(item, index) => item.start + index}
        renderItem={({ item }) => {
          if (item.type === 'CLASS') return <ClassCard item={item} />;
          if (item.type === 'HOLIDAY') return <HolidayCard item={item} />;
          return null;
        }}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{formatSectionHeaderDate(title)}</Text>
        )}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No schedule found for today.</Text>
          </View>
        }
        contentContainerStyle={styles.listContentContainer}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: '#c0392b', fontSize: 16, textAlign: 'center' },
  emptyText: { fontSize: 16, color: '#7f8c8d' },
  mainTitle: { fontSize: 32, fontWeight: 'bold', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, color: '#2c3e50' },
  sectionHeader: { fontSize: 18, fontWeight: '600', paddingVertical: 12, color: '#7f8c8d', backgroundColor: '#f4f6f8' },
  listContentContainer: { paddingHorizontal: 20, paddingBottom: 20 },
});

const itemStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'stretch' }, // Use stretch
  timelineContainer: { alignItems: 'center', marginRight: 15 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 1, backgroundColor: 'white' },
  timelineLine: { flex: 1, width: 2, backgroundColor: '#e0e0e0', marginTop: -10, marginBottom: -10 },
  detailsContainer: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 15, elevation: 2, shadowColor: '#95a5a6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, marginBottom: 15 },
  timeText: { fontSize: 14, color: '#2980b9', fontWeight: '600', marginBottom: 6 },
  courseName: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 4 },
  facultyName: { fontSize: 15, color: '#7f8c8d' },
  footerContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  footerText: { marginLeft: 6, fontSize: 14, color: '#7f8c8d' },
  holidayTitle: { fontSize: 18, fontWeight: 'bold', color: '#f97316' },
  holidayContent: { fontSize: 15, color: '#7f8c8d', marginTop: 4 },
});

export default TimetableScreen;

