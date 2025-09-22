// Screen/TimetableScreen.tsx (FINAL CLEAN CODE)

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SectionList,
  SafeAreaView,
} from 'react-native';
import { getWeeklySchedule, TimetableEvent } from '../api';

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

// --- Card Components ---

const ClassCard = ({ item }: { item: TimetableEvent }) => {
  const startTime = formatTime(parseCustomDate(item.start));
  const endTime = formatTime(parseCustomDate(item.end));
  return (
    <View style={styles.card}>
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>{startTime}</Text>
        <Text style={styles.timeTextEnd}>{endTime}</Text>
      </View>
      <View style={styles.detailsContainer}>
        <Text style={styles.courseName}>{item.courseName}</Text>
        <Text style={styles.facultyName}>{item.facultyName}</Text>
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>{item.courseCode}</Text>
          <Text style={styles.footerText}>Room: {item.classRoom || 'N/A'}</Text>
        </View>
      </View>
    </View>
  );
};

const HolidayCard = ({ item }: { item: TimetableEvent }) => (
  <View style={[styles.card, styles.holidayCard]}>
    <View style={styles.detailsContainer}>
      <Text style={styles.holidayTitle}>{item.title}</Text>
      <Text style={styles.holidayContent}>{item.content}</Text>
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

        // Classes ko start time ke hisaab se sort karein
        todaysEvents.sort((a, b) => parseCustomDate(a.start).getTime() - parseCustomDate(b.start).getTime());

        if (todaysEvents.length > 0) {
          const sectionsArray = [{ title: todayKey, data: todaysEvents }];
          setSections(sectionsArray);
        } else {
          setSections([]);
        }
      } catch (e: any) {
        setError(e.message || 'Ek error aayi hai.');
      } finally {
        setLoading(false);
      }
    };
    fetchAndGroupData();
  }, []);

  if (loading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#007aff" /></View>;
  }

  if (error) {
    return <View style={styles.centerContainer}><Text style={styles.errorText}>{error}</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.mainTitle}>Today's Schedule</Text>
      {sections.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item.start + index}
          renderItem={({ item }) => {
            if (item.type === 'CLASS') return <ClassCard item={item} />;
            if (item.type === 'HOLIDAY') return <HolidayCard item={item} />;
            return null;
          }}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{formatSectionHeaderDate(title)}</Text>
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        />
      ) : (
        <View style={styles.centerContainer}><Text>Aaj ke liye koi schedule nahi hai.</Text></View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f4f8' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    errorText: { color: 'red', fontSize: 16, textAlign: 'center' },
    mainTitle: { fontSize: 28, fontWeight: 'bold', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10, backgroundColor: '#f4f4f8' },
    sectionHeader: { fontSize: 20, fontWeight: 'bold', paddingVertical: 12, backgroundColor: '#f4f4f8' },
    card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    timeContainer: { alignItems: 'center', marginRight: 16, paddingRight: 16, borderRightWidth: 1, borderRightColor: '#eee', justifyContent: 'center', width: 90 },
    timeText: { fontSize: 16, fontWeight: 'bold', color: '#007aff' },
    timeTextEnd: { fontSize: 14, color: 'gray', marginTop: 4 },
    detailsContainer: { flex: 1 },
    courseName: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
    facultyName: { fontSize: 16, color: '#555', marginBottom: 10 },
    footerContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    footerText: { fontSize: 14, color: 'gray' },
    holidayCard: { backgroundColor: '#eef7ff', borderColor: '#d0e8ff', borderWidth: 1 },
    holidayTitle: { fontSize: 18, fontWeight: 'bold', color: '#005a9e' },
    holidayContent: { fontSize: 16, color: '#005a9e', marginTop: 4 },
});

// ✅ Sahi component ko export kiya gaya hai
export default TimetableScreen;