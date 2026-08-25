import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, StatusBar, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { getLectureWiseAttendance, Lecture } from '../api';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import { useTheme } from '../ThemeContext';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

// --- UI Component for single Lecture Item ---
const LectureItem = ({ item }: { item: Lecture }) => {
  const { colors, isDark, isBrutalist } = useTheme();
  const isPresent = item.attendance === 'PRESENT';

  const [year, month, day] = item.planLecDate.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);

  const formattedDate = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // Dynamic color assignments
  const badgeColor = isBrutalist 
    ? '#000' 
    : (isPresent ? (isDark ? '#34D399' : '#059669') : (isDark ? '#F87171' : '#DC2626'));
  
  const badgeBg = isBrutalist 
    ? (isPresent ? '#06D6A0' : '#EF476F') 
    : (isPresent ? (isDark ? 'rgba(52, 211, 153, 0.12)' : 'rgba(16, 185, 129, 0.08)') : (isDark ? 'rgba(248, 113, 113, 0.12)' : 'rgba(239, 68, 68, 0.08)'));
  
  const badgeBorder = isBrutalist 
    ? colors.border 
    : (isPresent ? (isDark ? 'rgba(52, 211, 153, 0.25)' : 'rgba(16, 185, 129, 0.15)') : (isDark ? 'rgba(248, 113, 113, 0.25)' : 'rgba(239, 68, 68, 0.15)'));

  return (
    <View style={[
      itemStyles.card, 
      { 
        backgroundColor: colors.card, 
        borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
        shadowOpacity: isDark ? 0.25 : 0.03
      }, 
      isBrutalist && itemStyles.brutalistCard,
      isBrutalist && { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.border }
    ]}>
      <View style={itemStyles.leftContent}>
        <Text style={[itemStyles.dateText, { color: colors.subText }, isBrutalist && itemStyles.brutalistSubText]}>{formattedDate}</Text>
        {item.topicCovered && (
          <Text style={[itemStyles.topicText, { color: colors.text }, isBrutalist && itemStyles.brutalistText]} numberOfLines={2}>
            {item.topicCovered}
          </Text>
        )}
      </View>
      <View style={[
        itemStyles.statusBadge, 
        { 
          backgroundColor: badgeBg,
          borderColor: badgeBorder,
          borderWidth: 1.5
        },
        isBrutalist && itemStyles.brutalistBadge
      ]}>
        <Icon 
          name={isPresent ? "checkmark-circle-outline" : "close-circle-outline"} 
          size={15} 
          color={badgeColor} 
          style={{ marginRight: 6 }}
        />
        <Text style={[
          itemStyles.statusText, 
          { color: badgeColor },
          isBrutalist && { fontWeight: '900' }
        ]}>
          {item.attendance}
        </Text>
      </View>
    </View>
  );
};

// --- Skeleton Loader Component ---
const SkeletonLectureItem = () => {
  const { colors, isDark } = useTheme();
  const shimmerColors = isDark ? ['#333', '#444', '#333'] : ['#ebebeb', '#c5c5c5', '#ebebeb'];
  return (
    <View style={[itemStyles.card, { borderColor: 'transparent', backgroundColor: colors.card }]}>
      <View style={itemStyles.leftContent}>
        <ShimmerPlaceholder shimmerColors={shimmerColors} style={{ width: 120, height: 16, borderRadius: 4 }} />
        <ShimmerPlaceholder shimmerColors={shimmerColors} style={{ width: '95%', height: 20, borderRadius: 4, marginTop: 8 }} />
      </View>
      <ShimmerPlaceholder shimmerColors={shimmerColors} style={{ width: 95, height: 32, borderRadius: 20 }} />
    </View>
  );
};

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

  const [targetAttendance, setTargetAttendance] = useState<string>('75');
  const [isEditingTarget, setIsEditingTarget] = useState(false);

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

    const fetchTarget = async () => {
      try {
        const savedTarget = await AsyncStorage.getItem(`TARGET_ATTENDANCE_${courseId}`);
        if (savedTarget) setTargetAttendance(savedTarget);
      } catch (e) {
        console.log('Error fetching target attendance', e);
      }
    };

    fetchLectures();
    fetchTarget();
  }, [studentId, courseId, courseCompId]);

  const saveTargetAttendance = async () => {
    try {
      if (parseInt(targetAttendance) > 100 || parseInt(targetAttendance) < 0) {
        Alert.alert("Invalid Target", "Please enter a value between 0 and 100.");
        return;
      }
      await AsyncStorage.setItem(`TARGET_ATTENDANCE_${courseId}`, targetAttendance);
      setIsEditingTarget(false);
      Alert.alert("Success", `Target attendance set to ${targetAttendance}% for this subject. You will be notified if you fall below this.`);
    } catch (e) {
      console.error("Failed to save target", e);
    }
  };

  const { colors, isDark, isBrutalist } = useTheme();

  const renderContent = () => {
    if (loading) {
      return <SkeletonLoader />;
    }
    if (error) {
      return <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>;
    }
    if (lectures.length === 0) {
      return <Text style={[styles.infoText, { color: colors.subText }]}>No lecture data found for this subject.</Text>;
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
    <SafeAreaView style={[
      styles.container, 
      { backgroundColor: colors.background }, 
      isBrutalist && styles.brutalistContainer,
      isBrutalist && { backgroundColor: colors.background }
    ]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <LinearGradient
        colors={isDark ? [colors.background, colors.background] : ['#EFF6FF', '#F9FAFB']}
        style={styles.backgroundGradient}
      >
        <View style={[
          styles.header, 
          { 
            backgroundColor: colors.card, 
            borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
            shadowOpacity: isDark ? 0.15 : 0.02
          }, 
          isBrutalist && styles.brutalistHeader,
          isBrutalist && { borderColor: colors.border }
        ]}>
          <Text style={[styles.title, { color: colors.text }, isBrutalist && styles.brutalistTitle]} numberOfLines={2}>{courseName}</Text>

          {/* ✅ Target Attendance UI */}
          <View style={[
            styles.targetWidget,
            { 
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(37, 99, 235, 0.05)',
              borderColor: isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(37, 99, 235, 0.1)'
            },
            isBrutalist && styles.brutalistTargetBadge,
            isBrutalist && { backgroundColor: colors.card, borderColor: colors.border }
          ]}>
            <Icon name="alarm-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={{ color: colors.text, marginRight: 8, fontWeight: '600' }}>Target:</Text>
            {isEditingTarget ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  value={targetAttendance}
                  onChangeText={setTargetAttendance}
                  keyboardType="numeric"
                  style={{
                    backgroundColor: isDark ? '#444' : 'white',
                    color: colors.text,
                    padding: 4,
                    borderRadius: 6,
                    width: 42,
                    textAlign: 'center',
                    marginRight: 8,
                    fontWeight: 'bold',
                    fontSize: 14
                  }}
                  maxLength={3}
                />
                <TouchableOpacity onPress={saveTargetAttendance}>
                  <Icon name="checkmark-circle" size={24} color="#27ae60" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setIsEditingTarget(true)}>
                <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16, marginRight: 8 }}>{targetAttendance}%</Text>
                <Icon name="pencil" size={14} color={colors.subText} />
              </TouchableOpacity>
            )}
          </View>

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
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#2c3e50',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  targetWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    alignSelf: 'flex-start',
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
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
  },
  
  // --- NEO-BRUTALISM OVERRIDES FOR SCREEN ---
  brutalistContainer: {},
  brutalistHeader: { backgroundColor: '#FFD166', borderBottomWidth: 4, borderRadius: 0, shadowOpacity: 0, elevation: 0, shadowRadius: 0 },
  brutalistTitle: { fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  brutalistTargetBadge: { borderRadius: 0, borderWidth: 3 }
});

const itemStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  leftContent: { flex: 1, marginRight: 15 },
  dateText: { fontSize: 13, color: '#7f8c8d', fontWeight: '600' },
  topicText: { fontSize: 17, color: '#2c3e50', marginTop: 6, lineHeight: 22, fontWeight: '700', letterSpacing: -0.3 },
  statusBadge: {
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  // --- NEO-BRUTALISM OVERRIDES FOR ITEMS ---
  brutalistCard: { 
    borderRadius: 0, 
    borderWidth: 4, 
    shadowOffset: { width: 6, height: 6 }, 
    shadowOpacity: 1, 
    shadowRadius: 0,
    elevation: 0,
    marginBottom: 16,
  },
  brutalistText: { fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  brutalistSubText: { fontWeight: '900', textTransform: 'uppercase' },
  brutalistBadge: { borderRadius: 0, borderWidth: 3 }
});

export default CourseDetailsScreen;
