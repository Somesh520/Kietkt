import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Animated,
  Easing,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Keyboard,
  LayoutAnimation,
  Platform,
  UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { getExamSchedule, ExamSchedule, getExamScore, ExamScoreResponse, ExamScoreSemester } from '../api';
import { useTheme } from '../ThemeContext';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// --- Skeleton Component ---
const SkeletonCard = () => {
  const { colors, isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <View style={[styles.skeletonCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor: colors.border }]}>
      <Animated.View style={[styles.skeleton, { opacity, height: 18, width: '60%', marginBottom: 12, backgroundColor: isDark ? '#374151' : '#F3F4F6' }]} />
      <Animated.View style={[styles.skeleton, { opacity, height: 14, width: '40%', marginBottom: 0, backgroundColor: isDark ? '#374151' : '#F3F4F6' }]} />
    </View>
  );
};

// --- Animated Empty State Component ---
const EmptyExamState = ({ message = "No Exams Scheduled!", subMessage = "Relax and enjoy your time off. 🎮☕" }) => {
  const { colors } = useTheme();
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [floatAnim]);

  return (
    <View style={styles.centerContainer}>
      <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
        <Icon name="file-tray-outline" size={64} color={colors.subText} />
      </Animated.View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{message}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.subText }]}>{subMessage}</Text>
    </View>
  );
};

// --- Minimalist Result Item ---
const SemesterResultCard = ({ semester }: { semester: ExamScoreSemester }) => {
  const { colors, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={[styles.minimalCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor: isDark ? '#374151' : '#E5E7EB' }]}>
      <TouchableOpacity
        style={styles.minimalHeader}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
          <View>
            <Text style={[styles.minimalTitle, { color: colors.text }]}>{semester.semesterName}</Text>
            <Text style={{ fontSize: 12, color: colors.subText }}>
              {semester.studentMarksDetailsDTO.length} Subjects
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.minimalSGPA, { color: colors.text }]}>{semester.sgpa.toFixed(2)}</Text>
            <Text style={{ fontSize: 10, color: colors.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>SGPA</Text>
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#F3F4F6' }}>
          {semester.studentMarksDetailsDTO.map((subject, index) => {
            const theoryComp = subject.courseCompDTOList.find(c => c.courseCompName === 'THEORY') || subject.courseCompDTOList[0];
            const grade = theoryComp?.compSessionLevelMarks[0]?.grade || '-';
            const result = theoryComp?.compSessionLevelMarks[0]?.result || '-';
            const isFail = result === 'FAIL' || grade === 'F';

            return (
              <View key={index} style={styles.minimalRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.minimalSubject, { color: colors.text }]} numberOfLines={1}>
                    {subject.courseName}
                  </Text>
                  <Text style={[styles.minimalCode, { color: colors.subText }]}>
                    {subject.courseCode}
                  </Text>
                </View>
                <View style={styles.gradeBadge}>
                  <Text style={{
                    color: isFail ? '#EF4444' : colors.text,
                    fontWeight: isFail ? 'bold' : '500',
                    fontSize: 14
                  }}>
                    {grade}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

// --- Main Screen ---
const ExamScheduleScreen = () => {
  const [activeTab, setActiveTab] = useState<'Schedule' | 'Results'>('Schedule');

  // Data State
  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [results, setResults] = useState<ExamScoreResponse | null>(null);

  // Loading State
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsLoaded, setResultsLoaded] = useState(false);

  // UI State
  const [refreshing, setRefreshing] = useState(false);

  // Calculator State
  const [targetCGPA, setTargetCGPA] = useState('');
  const [predictionMessage, setPredictionMessage] = useState<string | null>(null);

  const { colors, isDark } = useTheme();

  // --- API Calls ---
  const fetchExams = async () => {
    try {
      setLoadingSchedule(true);
      let data = await getExamSchedule();
      if (Array.isArray(data)) {
        data.sort((a, b) => {
          const dA = a.strExamDate.split('/').reverse().join('-');
          const dB = b.strExamDate.split('/').reverse().join('-');
          return new Date(dA).getTime() - new Date(dB).getTime();
        });
        setExams(data);
      } else {
        setExams([]);
      }
    } catch (err: any) {
      setExams([]);
    } finally {
      setLoadingSchedule(false);
      setRefreshing(false);
    }
  };

  const fetchResults = async () => {
    try {
      setLoadingResults(true);
      const data = await getExamScore();
      if (data) setResults(data);
      setResultsLoaded(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingResults(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchExams(); }, []);

  useEffect(() => {
    if (activeTab === 'Results' && !resultsLoaded) fetchResults();
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    activeTab === 'Schedule' ? fetchExams() : fetchResults();
  };

  // --- Calculator Logic ---
  const calculateGoal = () => {
    if (!results || !targetCGPA) return;
    Keyboard.dismiss();
    const target = parseFloat(targetCGPA);
    if (isNaN(target) || target < 0 || target > 10) {
      setPredictionMessage("Target must be between 0 and 10.");
      return;
    }
    const completed = results.studentSemesterWiseMarksDetailsList?.length || 0;
    const remaining = 8 - completed;

    if (remaining <= 0) {
      setPredictionMessage("Course completed. Final CGPA locked.");
      return;
    }

    const reqTotal = target * 8;
    const currentTotal = results.cgpa * completed;
    const reqRemaining = reqTotal - currentTotal;
    const reqSGPA = reqRemaining / remaining;

    const nextSemesters = [];
    for (let i = 1; i <= remaining; i++) {
      nextSemesters.push(`Sem ${completed + i}`);
    }
    const semesterText = nextSemesters.join(', ');

    if (reqSGPA > 10) setPredictionMessage(`Impossible. Requires ${reqSGPA.toFixed(2)} SGPA in ${semesterText}.`);
    else if (reqSGPA <= 0) setPredictionMessage(`Goal achieved! You're cruising.`);
    else setPredictionMessage(`Target: Need **${reqSGPA.toFixed(2)} SGPA** in **${semesterText}** to reach ${target} CGPA.`);
  };

  // --- Render Schedule ---
  const renderSchedule = () => {
    if (loadingSchedule && !refreshing) return <View style={{ padding: 16 }}><SkeletonCard /><SkeletonCard /></View>;

    const parseDetails = (d: string) => {
      const p = d.split('-');
      return { name: p[0] || 'Unknown', code: p[1] || '', type: p.slice(2).join(' ') };
    };

    return (
      <FlatList
        data={exams}
        keyExtractor={(item, index) => `${index}-${item.strExamDate}`}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<EmptyExamState />}
        renderItem={({ item }) => {
          const details = item.courseDetails ? parseDetails(item.courseDetails) : { name: item.courseName, code: item.courseCode, type: item.evalLevelComponentName };
          return (
            <View style={[styles.minimalCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor: isDark ? '#374151' : '#E5E7EB' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={[styles.minimalTitle, { color: colors.text }]}>{details.name}</Text>
                <Text style={[styles.minimalCode, { color: colors.primary, fontWeight: '600' }]}>{details.code}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="time-outline" size={14} color={colors.subText} style={{ marginRight: 6 }} />
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>{item.strExamDate}</Text>
                <View style={{ width: 1, height: 12, backgroundColor: colors.border, marginHorizontal: 10 }} />
                <Text style={{ color: colors.subText, fontSize: 13 }}>{details.type}</Text>
              </View>
            </View>
          );
        }}
      />
    );
  };

  // --- Render Results ---
  const renderResults = () => {
    if (loadingResults && !refreshing) return <View style={{ padding: 16 }}><SkeletonCard /><SkeletonCard /></View>;

    const hasResults = (results?.studentSemesterWiseMarksDetailsList?.length || 0) > 0;

    return (
      <FlatList
        data={hasResults ? results!.studentSemesterWiseMarksDetailsList : []}
        keyExtractor={(item) => item.semesterName}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={!hasResults ? <EmptyExamState message="No Results Yet" /> : null}
        ListHeaderComponent={hasResults ? (
          <View style={{ marginBottom: 24 }}>
            {/* Overall CGPA - Clean Minimal */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 56, fontWeight: '200', color: colors.text, letterSpacing: -1 }}>
                {results!.cgpa.toFixed(2)}
              </Text>
              <Text style={{ fontSize: 12, color: colors.subText, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: -5 }}>
                Current CGPA
              </Text>
            </View>

            {/* Modern Calculator Card */}
            <View style={{
              marginTop: 10,
              marginBottom: 20,
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: isDark ? '#374151' : '#E5E7EB',
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ backgroundColor: isDark ? '#374151' : '#F3F4F6', padding: 8, borderRadius: 10, marginRight: 12 }}>
                  <Text style={{ fontSize: 20 }}>🎯</Text>
                </View>
                <View>
                  <Text style={[styles.sectionHeader, { color: colors.text, marginBottom: 2 }]}>Future Predicter</Text>
                  <Text style={{ fontSize: 12, color: colors.subText }}>
                    {8 - (results?.studentSemesterWiseMarksDetailsList?.length || 0)} Semesters Remaining
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 11, color: colors.subText, marginBottom: 4, marginLeft: 2 }}>TARGET CGPA</Text>
                  <TextInput
                    placeholder="8.5"
                    placeholderTextColor={colors.subText}
                    style={[styles.minimalInput, {
                      color: colors.text,
                      borderBottomColor: colors.primary,
                      borderBottomWidth: 2,
                      fontSize: 20,
                      fontWeight: 'bold',
                      height: 40,
                      paddingVertical: 0
                    }]}
                    keyboardType="numeric"
                    value={targetCGPA}
                    onChangeText={setTargetCGPA}
                    returnKeyType="done"
                  />
                </View>
                <TouchableOpacity
                  onPress={calculateGoal}
                  style={{
                    backgroundColor: colors.primary,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 100,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 4
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Predict</Text>
                </TouchableOpacity>
              </View>

              {predictionMessage && (
                <View style={{
                  marginTop: 16,
                  padding: 12,
                  backgroundColor: isDark ? '#111827' : '#F9FAFB',
                  borderRadius: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: predictionMessage.includes('Impossible') ? '#EF4444' : (predictionMessage.includes('achieved') ? '#10B981' : colors.primary)
                }}>
                  <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>
                    {predictionMessage.split('**').map((part, i) =>
                      i % 2 === 1 ? <Text key={i} style={{ fontWeight: '900', color: colors.primary, fontSize: 15 }}>{part}</Text> : part
                    )}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.sectionHeader, { color: colors.text, marginTop: 10, marginBottom: 12, paddingHorizontal: 4 }]}>Semester History</Text>
          </View>
        ) : null}
        renderItem={({ item }) => <SemesterResultCard semester={item} />}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 }}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Exams</Text>
      </View>

      {/* Modern Segmented Tab Switcher */}
      <View style={styles.tabWrapper}>
        <View style={[styles.tabContainer, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Schedule' && styles.activeTab]}
            onPress={() => setActiveTab('Schedule')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'Schedule' ? '#000' : '#6B7280', fontWeight: activeTab === 'Schedule' ? '600' : '400' }]}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Results' && styles.activeTab]}
            onPress={() => setActiveTab('Results')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'Results' ? '#000' : '#6B7280', fontWeight: activeTab === 'Results' ? '600' : '400' }]}>Results</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'Schedule' ? renderSchedule() : renderResults()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tabWrapper: {
    paddingHorizontal: 16,
    marginBottom: 8
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 100, // Pill shape
    padding: 4,
    height: 44
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
  },
  // Minimalist Card Styles
  minimalCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  minimalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  minimalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  minimalCode: {
    fontSize: 13,
  },
  minimalSGPA: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.7
  },
  minimalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  minimalSubject: {
    fontSize: 14,
    fontWeight: '400'
  },
  gradeBadge: {
    minWidth: 24,
    alignItems: 'flex-end'
  },
  minimalInput: {
    flex: 1,
    fontSize: 16,
    borderBottomWidth: 1,
    paddingVertical: 8,
    height: 40
  },
  // Skeleton
  skeletonCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    opacity: 0.5
  },
  skeleton: {
    borderRadius: 4
  },
  // Empty State
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14
  }
});

export default ExamScheduleScreen;