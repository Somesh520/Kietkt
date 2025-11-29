import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Animated,
  ScrollView,
  Dimensions,
  Easing,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getWeeklySchedule, TimetableEvent } from '../api';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

// --- Helper Functions ---
const formatDateKey = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const getNext7Days = () => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
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
    month: 'long',
  });
};

const getDayName = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'short' });
const getDayNumber = (date: Date) => date.getDate();

// --- Skeleton Loader ---
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
    <View style={itemStyles.detailsContainer}>
      <View style={{ height: 14, width: '40%', backgroundColor: '#BDBDBD', borderRadius: 4 }} />
      <View style={{ height: 18, width: '80%', backgroundColor: '#BDBDBD', borderRadius: 4, marginTop: 10 }} />
    </View>
    <Shimmer />
  </View>
);

// --- Class Card ---
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

// --- 🔥 UPDATED COOL HOLIDAY CARD 🔥 ---
const HolidayCard = ({ item }: { item: TimetableEvent }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Floating Effect (Up and Down)
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6, // Moves up
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0, // Moves down
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 2. Rotating Icon Effect
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={itemStyles.card}>
      <View style={itemStyles.timelineContainer}>
        <View style={[itemStyles.iconContainer, { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#ffedd5' }]}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Icon name="sunny" size={22} color="#f97316" />
          </Animated.View>
        </View>
        {/* Dashed Line for Holiday */}
        <View style={[itemStyles.timelineLine, { backgroundColor: 'transparent', borderStyle: 'dashed', borderWidth: 1, borderColor: '#fed7aa' }]} />
      </View>

      <Animated.View style={{ flex: 1, transform: [{ translateY: floatAnim }] }}>
        <LinearGradient
          colors={['#fff7ed', '#fed7aa']} // Soft Orange Gradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={itemStyles.holidayGradientCard}
        >
          <View style={{ zIndex: 2 }}>
            <Text style={itemStyles.holidayLabel}>Relax & Chill</Text>
            <Text style={itemStyles.holidayTitle}>{item.title}</Text>
            <Text style={itemStyles.holidayContent}>{item.content || 'Public Holiday'}</Text>
          </View>

          {/* Background Watermark Icon */}
          <View style={{ position: 'absolute', right: -10, bottom: -15, opacity: 0.15, zIndex: 1 }}>
            <Icon name="happy" size={90} color="#c2410c" />
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

// --- Empty Schedule State ---
const EmptyScheduleState = () => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -15, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [floatAnim]);

  return (
    <View style={styles.centerContainer}>
      <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
        <Icon name="bed-outline" size={100} color="#BDC3C7" />
      </Animated.View>
      <Text style={styles.emptyTextTitle}>No Schedule Found</Text>
      <Text style={styles.emptyTextSubtitle}>Select another date or enjoy your day!</Text>
    </View>
  );
};

// --- Main Screen ---
function TimetableScreen(): React.JSX.Element {
  const [allEvents, setAllEvents] = useState<TimetableEvent[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(formatDateKey(new Date()));

  useEffect(() => {
    setCalendarDays(getNext7Days());
    const fetchData = async () => {
      try {
        const weeklyEvents = await getWeeklySchedule();
        setAllEvents(weeklyEvents);
      } catch (e: any) {
        setError(e.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (allEvents.length === 0) return;

    const filteredEvents = allEvents.filter(event => event.start.startsWith(selectedDateKey));
    filteredEvents.sort((a, b) => parseCustomDate(a.start).getTime() - parseCustomDate(b.start).getTime());

    if (filteredEvents.length > 0) {
      setSections([{ title: selectedDateKey, data: filteredEvents }]);
    } else {
      setSections([]);
    }
  }, [selectedDateKey, allEvents]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
            <Text style={styles.mainTitle}>Schedule</Text>
        </View>
        <ScrollView contentContainerStyle={styles.listContentContainer} showsVerticalScrollIndicator={false}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.mainTitle}>Schedule</Text>
        <Text style={styles.dateSubtitle}>{formatSectionHeaderDate(selectedDateKey)}</Text>
      </View>

      <View style={styles.calendarContainer}>
        <FlatList
          data={calendarDays}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.toString()}
          contentContainerStyle={{ paddingHorizontal: 15 }}
          renderItem={({ item }) => {
            const dateKey = formatDateKey(item);
            const isSelected = selectedDateKey === dateKey;
            
            return (
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => setSelectedDateKey(dateKey)}
                style={[styles.dateItem, isSelected && styles.dateItemSelected]}
              >
                <Text style={[styles.dayText, isSelected && styles.textSelected]}>{getDayName(item)}</Text>
                <Text style={[styles.dateNumText, isSelected && styles.textSelected]}>{getDayNumber(item)}</Text>
                {isSelected && <View style={styles.activeDot} />}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <SectionList
        style={{ flex: 1 }} 
        sections={sections}
        keyExtractor={(item, index) => item.start + index}
        renderItem={({ item }) => {
          if (item.type === 'CLASS') return <ClassCard item={item} />;
          if (item.type === 'HOLIDAY') return <HolidayCard item={item} />;
          return null;
        }}
        renderSectionHeader={() => <View style={{height: 10}} />} 
        ListEmptyComponent={<EmptyScheduleState />}
        contentContainerStyle={[
            styles.listContentContainer, 
            sections.length === 0 && styles.centerEmptyContent 
        ]}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  
  headerContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 5 },
  mainTitle: { fontSize: 30, fontWeight: 'bold', color: '#2c3e50' },
  dateSubtitle: { fontSize: 16, color: '#7f8c8d', fontWeight: '500', marginTop: 2 },

  // Calendar Styles
  calendarContainer: { marginVertical: 15, height: 75 },
  dateItem: {
    width: 60,
    height: 70,
    borderRadius: 16,
    backgroundColor: 'white',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dateItemSelected: {
    backgroundColor: '#2563eb', // Active Blue
    transform: [{ scale: 1.05 }],
  },
  dayText: { fontSize: 13, color: '#95a5a6', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  dateNumText: { fontSize: 18, color: '#2c3e50', fontWeight: 'bold' },
  textSelected: { color: 'white' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'white', marginTop: 4 },

  centerContainer: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  centerEmptyContent: { flexGrow: 1, justifyContent: 'center' },
  
  errorText: { color: '#c0392b', fontSize: 16, textAlign: 'center', marginTop: 10 },
  
  emptyTextTitle: { fontSize: 20, fontWeight: 'bold', color: '#7f8c8d', marginTop: 20 },
  emptyTextSubtitle: { fontSize: 15, color: '#bdc3c7', marginTop: 5 },

  sectionHeader: { fontSize: 18, fontWeight: '600', paddingVertical: 12, color: '#7f8c8d', backgroundColor: '#f4f6f8' },
  listContentContainer: { paddingHorizontal: 20, paddingBottom: 20, flexGrow: 1 },
});

const itemStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 2 },
  timelineContainer: { alignItems: 'center', marginRight: 15 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 1, backgroundColor: 'white' },
  timelineLine: { flex: 1, width: 2, backgroundColor: '#e0e0e0', marginTop: -10, marginBottom: -10 },
  detailsContainer: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 15, elevation: 2, shadowColor: '#95a5a6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, marginBottom: 15 },
  
  timeText: { fontSize: 14, color: '#2980b9', fontWeight: '600', marginBottom: 6 },
  courseName: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 4 },
  facultyName: { fontSize: 15, color: '#7f8c8d' },
  footerContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  footerText: { marginLeft: 6, fontSize: 14, color: '#7f8c8d' },

  // 🔥 NEW STYLES FOR HOLIDAY CARD 🔥
  holidayGradientCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
    overflow: 'hidden', // Required for watermark
    marginBottom: 10
  },
  holidayLabel: {
    fontSize: 11,
    color: '#c2410c',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
    opacity: 0.8
  },
  holidayTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#9a3412',
    marginBottom: 4,
  },
  holidayContent: {
    fontSize: 14,
    color: '#c2410c',
    opacity: 0.9,
    fontWeight: '500'
  },
});

export default TimetableScreen;