import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getWeeklySchedule, getRegisteredCourses, TimetableEvent, RegisteredCourse } from '../api';
import { useTheme } from '../ThemeContext';

const { width } = Dimensions.get('window');

// --- Helper Functions ---
const parseCustomDate = (dateString: string): Date => {
  const [datePart, timePart] = dateString.split(' ');
  const [day, month, year] = datePart.split('/');
  const [hours, minutes, seconds] = timePart.split(':');
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds));
};

const getNext14Days = (): Date[] => {
  const days: Date[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
};

const isSameDay = (d1: Date, d2: Date | null): boolean => {
  if (!d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const isBetweenDays = (d: Date, start: Date | null, end: Date | null): boolean => {
  if (!start || !end) return false;
  return d > start && d < end;
};

export default function TripPlannerScreen() {
  const { colors, isDark, isBrutalist } = useTheme();
  const navigation = useNavigation();

  const [loading, setLoading] = useState<boolean>(true);
  const [timetable, setTimetable] = useState<TimetableEvent[]>([]);
  const [courses, setCourses] = useState<RegisteredCourse[]>([]);
  
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(null);

  const dateList = getNext14Days();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sched, rCourses] = await Promise.all([
          getWeeklySchedule(),
          getRegisteredCourses(),
        ]);
        setTimetable(sched);
        setCourses(rCourses);
      } catch (err) {
        console.error('Error fetching simulator data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Default select today and tomorrow
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(today.getDate() + 1);
    setSelectedStart(today);
    setSelectedEnd(tomorrow);
  }, []);

  const handleDatePress = (date: Date) => {
    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(date);
      setSelectedEnd(null);
    } else {
      if (date >= selectedStart) {
        setSelectedEnd(date);
      } else {
        setSelectedStart(date);
        setSelectedEnd(null);
      }
    }
  };

  // Build weekday-based schedule map from the fetched weekly timetable
  const getScheduleMap = () => {
    const map: Record<number, Record<string, number>> = {};
    timetable.forEach((event) => {
      // type can be CLASS
      if (event.courseCode) {
        try {
          const date = parseCustomDate(event.start);
          const dayOfWeek = date.getDay(); // 0 Sunday, 1 Monday, etc.
          if (!map[dayOfWeek]) map[dayOfWeek] = {};
          
          const code = event.courseCode.trim().toUpperCase();
          map[dayOfWeek][code] = (map[dayOfWeek][code] || 0) + 1;
        } catch (e) {
          // Fallback parsing if needed
        }
      }
    });
    return map;
  };

  const calculateMissedLectures = () => {
    const map = getScheduleMap();
    const missed: Record<string, number> = {};

    if (!selectedStart) return missed;

    const current = new Date(selectedStart);
    const end = selectedEnd ? new Date(selectedEnd) : new Date(selectedStart);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      const daySchedule = map[dayOfWeek];
      if (daySchedule) {
        Object.keys(daySchedule).forEach((code) => {
          missed[code] = (missed[code] || 0) + daySchedule[code];
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return missed;
  };

  const getSimulationResults = () => {
    const missed = calculateMissedLectures();
    return courses.map((course) => {
      // Find matching missed lectures
      const code = course.courseCode.trim().toUpperCase();
      let missedCount = missed[code] || 0;

      // Fallback matching by name if code doesn't map cleanly
      if (missedCount === 0) {
        const namePart = course.courseName.toLowerCase();
        Object.keys(missed).forEach((mCode) => {
          const matchingEvent = timetable.find(e => e.courseCode === mCode);
          if (matchingEvent && matchingEvent.courseName && namePart.includes(matchingEvent.courseName.toLowerCase())) {
            missedCount = missed[mCode];
          }
        });
      }

      // Retrieve present and total lectures from the primary component (comp[0])
      const details = course.studentCourseCompDetails?.[0];
      const present = details?.presentLecture || 0;
      const total = details?.totalLecture || 0;

      const currentPerc = total > 0 ? (present / total) * 100 : 100;
      const projectedTotal = total + missedCount;
      const projectedPerc = projectedTotal > 0 ? (present / projectedTotal) * 100 : 100;

      return {
        courseCode: course.courseCode,
        courseName: course.courseName,
        currentPresent: present,
        currentTotal: total,
        currentPerc,
        projectedTotal,
        projectedPerc,
        missedCount,
      };
    });
  };

  const simulationResults = getSimulationResults();
  
  // Create recommendations/suggestions
  const getSuggestions = () => {
    const dangerCourses = simulationResults.filter(r => r.projectedPerc < 75);
    const warningCourses = simulationResults.filter(r => r.projectedPerc >= 75 && r.projectedPerc < 80);

    if (dangerCourses.length > 0) {
      const names = dangerCourses.map(c => c.courseName.split(' ')[0]).join(', ');
      return {
        text: `Bunking these dates will drop your attendance below 75% in: ${names}. Consider attending some lectures during these dates.`,
        type: 'danger',
        icon: 'warning-outline',
      };
    } else if (warningCourses.length > 0) {
      return {
        text: `Your attendance will stay above 75% in all subjects, but will drop close to warning thresholds in some classes. Safe to go, but be careful!`,
        type: 'warning',
        icon: 'alert-circle-outline',
      };
    } else {
      return {
        text: `Great! You can take this trip safely. Your attendance in all subjects will remain comfortably above 75%. Enjoy your trip!`,
        type: 'success',
        icon: 'checkmark-circle-outline',
      };
    }
  };

  const suggestion = getSuggestions();

  const renderDateItem = ({ item }: { item: Date }) => {
    const isStart = isSameDay(item, selectedStart);
    const isEnd = isSameDay(item, selectedEnd);
    const isBetween = isBetweenDays(item, selectedStart, selectedEnd);

    const dayName = item.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = item.getDate();
    const monthName = item.toLocaleDateString('en-US', { month: 'short' });

    let bgStyle = { backgroundColor: colors.card };
    let borderStyle = {};
    let textStyle = { color: colors.text };
    let subTextStyle = { color: colors.subText };

    if (isStart || isEnd) {
      bgStyle = { backgroundColor: colors.primary };
      textStyle = { color: '#fff' };
      subTextStyle = { color: '#e0e7ff' };
      if (isBrutalist) {
        borderStyle = { borderWidth: 2, borderColor: colors.border };
      }
    } else if (isBetween) {
      bgStyle = { backgroundColor: isDark ? 'rgba(79, 70, 229, 0.2)' : 'rgba(79, 70, 229, 0.1)' };
      textStyle = { color: colors.primary };
      subTextStyle = { color: colors.primary };
    }

    return (
      <TouchableOpacity
        onPress={() => handleDatePress(item)}
        style={[
          styles.dateCard,
          bgStyle,
          borderStyle,
          isBrutalist && styles.brutalistDateCard,
          isBrutalist && (isStart || isEnd) && { backgroundColor: colors.primary }
        ]}
      >
        <Text style={[styles.dateMonth, subTextStyle]}>{monthName}</Text>
        <Text style={[styles.dateNum, textStyle]}>{dayNum}</Text>
        <Text style={[styles.dateDay, subTextStyle]}>{dayName}</Text>
        {isStart && <View style={styles.startBadge}><Text style={styles.badgeText}>Start</Text></View>}
        {isEnd && <View style={styles.endBadge}><Text style={styles.badgeText}>End</Text></View>}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Analyzing timetable & schedule...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <View style={[styles.header, { borderBottomColor: isBrutalist ? colors.border : colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Trip Simulator</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Date Selector Header */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose Bunk Dates</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.subText }]}>
          Select your trip start date and end date from the timeline:
        </Text>

        <FlatList
          data={dateList}
          renderItem={renderDateItem}
          keyExtractor={(item) => item.toISOString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateListContainer}
        />

        {/* Selected Summary Card */}
        {selectedStart && (
          <View style={[
            styles.summaryCard, 
            { backgroundColor: colors.card },
            isBrutalist && styles.brutalistCard
          ]}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryDateBox}>
                <Text style={styles.summaryLabel}>TRIP START</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {selectedStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}
                </Text>
              </View>
              <Icon name="arrow-forward-outline" size={24} color={colors.subText} style={{ marginHorizontal: 15 }} />
              <View style={styles.summaryDateBox}>
                <Text style={styles.summaryLabel}>TRIP END</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {selectedEnd 
                    ? selectedEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })
                    : 'Select End Date'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Dynamic Recommendation Card */}
        <View style={[
          styles.suggestionCard,
          suggestion.type === 'danger' && { backgroundColor: isDark ? '#7f1d1d' : '#fee2e2', borderColor: '#ef4444' },
          suggestion.type === 'warning' && { backgroundColor: isDark ? '#78350f' : '#fef3c7', borderColor: '#f59e0b' },
          suggestion.type === 'success' && { backgroundColor: isDark ? '#064e3b' : '#d1fae5', borderColor: '#10b981' },
          styles.borderedCard,
        ]}>
          <Icon 
            name={suggestion.icon} 
            size={24} 
            color={suggestion.type === 'danger' ? '#ef4444' : suggestion.type === 'warning' ? '#f59e0b' : '#10b981'} 
          />
          <Text style={[
            styles.suggestionText,
            { color: suggestion.type === 'danger' ? (isDark ? '#fca5a5' : '#b91c1c') : suggestion.type === 'warning' ? (isDark ? '#fde047' : '#b45309') : (isDark ? '#86efac' : '#047857') }
          ]}>
            {suggestion.text}
          </Text>
        </View>

        {/* Simulator Results List */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 25 }]}>Projected Attendance</Text>
        
        {simulationResults.map((result) => {
          const drop = result.currentPerc - result.projectedPerc;
          const isDanger = result.projectedPerc < 75;
          const isWarning = result.projectedPerc >= 75 && result.projectedPerc < 80;

          return (
            <View 
              key={result.courseCode} 
              style={[
                styles.resultCard, 
                { backgroundColor: colors.card },
                isBrutalist && styles.brutalistCard
              ]}
            >
              <View style={styles.resultHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.courseCodeText, { color: colors.subText }]}>{result.courseCode}</Text>
                  <Text style={[styles.courseNameText, { color: colors.text }]} numberOfLines={1}>{result.courseName}</Text>
                </View>
                {result.missedCount > 0 ? (
                  <View style={[styles.missedBadge, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2' }]}>
                    <Text style={styles.missedBadgeText}>-{result.missedCount} Classes</Text>
                  </View>
                ) : (
                  <View style={[styles.missedBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5' }]}>
                    <Text style={[styles.missedBadgeText, { color: '#10b981' }]}>0 Missed</Text>
                  </View>
                )}
              </View>

              {/* Progress and Drops */}
              <View style={styles.resultDetails}>
                <View style={styles.detailsCol}>
                  <Text style={styles.detailsLabel}>Current Attendance</Text>
                  <Text style={[styles.detailsVal, { color: colors.text }]}>
                    {result.currentPresent}/{result.currentTotal} ({result.currentPerc.toFixed(1)}%)
                  </Text>
                </View>
                
                <Icon name="chevron-forward" size={18} color={colors.subText} style={{ marginHorizontal: 5 }} />

                <View style={styles.detailsCol}>
                  <Text style={styles.detailsLabel}>Projected Attendance</Text>
                  <Text style={[
                    styles.detailsVal, 
                    { fontWeight: 'bold' },
                    isDanger ? { color: '#ef4444' } : isWarning ? { color: '#f59e0b' } : { color: '#10b981' }
                  ]}>
                    {result.currentPresent}/{result.projectedTotal} ({result.projectedPerc.toFixed(1)}%)
                  </Text>
                </View>
              </View>

              {drop > 0 && (
                <Text style={styles.dropLabel}>
                  Will drop by <Text style={{ fontWeight: 'bold', color: '#ef4444' }}>-{drop.toFixed(1)}%</Text> if you bunk
                </Text>
              )}
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 15, fontSize: 16, fontWeight: '500' },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 5 },
  sectionSubtitle: { fontSize: 14, marginBottom: 15, lineHeight: 20 },
  dateListContainer: { paddingVertical: 10, paddingRight: 20 },
  dateCard: {
    width: 70,
    height: 90,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    position: 'relative',
  },
  brutalistDateCard: {
    borderRadius: 0,
    borderWidth: 2,
  },
  dateMonth: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  dateNum: { fontSize: 22, fontWeight: '700', marginVertical: 2 },
  dateDay: { fontSize: 12, fontWeight: '500' },
  startBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  endBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  summaryCard: {
    borderRadius: 18,
    padding: 16,
    marginVertical: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  brutalistCard: {
    borderRadius: 0,
    borderWidth: 3,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  summaryDateBox: { alignItems: 'center', flex: 1 },
  summaryLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '700' },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginVertical: 5,
  },
  borderedCard: {
    borderWidth: 1,
  },
  suggestionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  resultCard: {
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  courseCodeText: { fontSize: 12, fontWeight: '600' },
  courseNameText: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  missedBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  missedBadgeText: { color: '#ef4444', fontSize: 11, fontWeight: '700' },
  resultDetails: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  detailsCol: { flex: 1 },
  detailsLabel: { fontSize: 11, color: '#94a3b8', marginBottom: 4 },
  detailsVal: { fontSize: 13, fontWeight: '600' },
  dropLabel: { fontSize: 12, color: '#94a3b8', marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e2e8f0', paddingTop: 8 },
});
