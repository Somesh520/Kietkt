// Location: ./Screen/LiveTracker.tsx
// ✅ Fixed 12:00 AM Issue: Shows absolute time for future classes

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Easing, AppState, AppStateStatus, LayoutChangeEvent, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import { getRegisteredCourses, getLectureWiseAttendance, RegisteredCourse } from '../api';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

interface TimetableEvent {
  type: 'CLASS' | 'HOLIDAY' | string;
  start: string;
  end: string;
  courseName: string | null;
  facultyName: string | null;
  classRoom: string | null;
  courseCode: string | null;
  title: string;
  content: string;
}

const LiveTracker = () => {
  const [fullSchedule, setFullSchedule] = useState<TimetableEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<TimetableEvent | null>(null);
  const [nextEvent, setNextEvent] = useState<TimetableEvent | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("Loading...");
  const [progress, setProgress] = useState(0); 
  const [status, setStatus] = useState<'CLASS' | 'FREE' | 'DONE' | 'LOADING'>('LOADING');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBeforeStart, setIsBeforeStart] = useState(false); // ✅ New state for "Before College"

  const [attStatus, setAttStatus] = useState<'loading' | 'present' | 'absent' | 'pending' | 'unknown'>('unknown');
  const [registeredCourses, setRegisteredCourses] = useState<RegisteredCourse[]>([]);

  // Animations
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const progressShimmer = useRef(new Animated.Value(0)).current;
  
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
    loadRegisteredCourses();
  }, []);

  const loadRegisteredCourses = async () => {
    try {
      const courses = await getRegisteredCourses();
      setRegisteredCourses(courses);
    } catch (e) {
      console.log("Could not load registered courses for matching");
    }
  };

  const checkAttendanceForEvent = async (event: TimetableEvent) => {
    if (!event || !event.courseName || registeredCourses.length === 0) {
      setAttStatus('unknown');
      return;
    }
    setAttStatus('loading');
    try {
      const targetName = event.courseName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const course = registeredCourses.find(c => {
        const cName = c.courseName.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cName.includes(targetName) || targetName.includes(cName);
      });

      if (!course) {
        setAttStatus('unknown');
        return;
      }

      const comp = course.studentCourseCompDetails?.[0]; 
      if (!comp) {
        setAttStatus('unknown');
        return;
      }

      const lectures = await getLectureWiseAttendance({
        studentId: course.studentId,
        courseId: course.courseId,
        courseCompId: comp.courseCompId
      });

      const eventDate = parseApiDate(event.start);
      const dateKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
      const todaysRecord = lectures.find(l => l.planLecDate.startsWith(dateKey));

      if (todaysRecord) {
        if (todaysRecord.attendance === 'PRESENT') setAttStatus('present');
        else if (todaysRecord.attendance === 'ABSENT') setAttStatus('absent');
        else setAttStatus('pending');
      } else {
        setAttStatus('pending');
      }
    } catch (e) {
      setAttStatus('unknown');
    }
  };

  useEffect(() => {
    if (status === 'CLASS' && currentEvent) {
      checkAttendanceForEvent(currentEvent);
    } else {
      setAttStatus('unknown');
    }
  }, [currentEvent?.title, status, registeredCourses.length]);

  useEffect(() => {
    if (status === 'CLASS') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.timing(progressShimmer, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true })
      ).start();
    } else {
      pulseAnim.setValue(1);
      progressShimmer.setValue(0);
    }
  }, [status]);

  useEffect(() => {
    if (isRefreshing) {
      Animated.loop(
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true })
      ).start();
    } else {
      shimmerAnim.setValue(0);
    }
  }, [isRefreshing]);

  const getProgressColors = () => {
    if (status !== 'CLASS') return ['#e74c3c', '#c0392b'];
    if (progress < 0.5) return ['#e74c3c', '#c0392b'];
    if (progress < 0.85) return ['#f39c12', '#d35400'];
    return ['#2ecc71', '#27ae60'];
  };

  const parseApiDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    try {
      if (dateStr.match(/^\d{2}[/-]\d{2}[/-]\d{4}/)) {
        const separator = dateStr.includes('/') ? '/' : '-';
        const parts = dateStr.split(' ');
        const dateParts = parts[0].split(separator).map(Number);
        const timeParts = parts[1] ? parts[1].split(':').map(Number) : [0, 0, 0];
        return new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0], timeParts[1], timeParts[2] || 0);
      }
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/)) {
        return new Date(dateStr.replace(' ', 'T'));
      }
      return new Date(dateStr);
    } catch (error) { return new Date(); }
  };

  // ✅ Force API Reload (Essential for Date Changes)
  const loadSchedule = async () => {
    setIsRefreshing(true);
    try {
      // Import directly here to avoid circular dependencies if any
      const { getWeeklySchedule: fetchSched } = require('../api');
      const data = await fetchSched();
      if (data && Array.isArray(data)) {
        setFullSchedule(data);
        setStatus(data.length > 0 ? 'FREE' : 'DONE');
      } else {
        setFullSchedule([]);
        setStatus('DONE');
      }
    } catch (e) {
      // silent fail
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateLiveStatus = useCallback(() => {
    const now = new Date();
    
    // Filter for TODAY
    const todayEvents = fullSchedule.filter(item => {
        const start = parseApiDate(item.start);
        return (
            start.getDate() === now.getDate() &&
            start.getMonth() === now.getMonth() &&
            start.getFullYear() === now.getFullYear()
        );
    });

    todayEvents.sort((a, b) => parseApiDate(a.start).getTime() - parseApiDate(b.start).getTime());

    if (todayEvents.length === 0) {
        setStatus('DONE');
        setTimeRemaining("No classes scheduled today");
        setProgress(1);
        animatedWidth.setValue(containerWidth || 100);
        return;
    }

    let foundActiveOrNext = false;

    for (let i = 0; i < todayEvents.length; i++) {
      const event = todayEvents[i];
      const start = parseApiDate(event.start);
      const end = parseApiDate(event.end);

      // CASE A: CLASS IS LIVE
      if (now >= start && now <= end) {
        foundActiveOrNext = true;
        setCurrentEvent(event);
        setStatus('CLASS');
        setNextEvent(todayEvents[i + 1] || null);
        setIsBeforeStart(false);

        const totalDuration = end.getTime() - start.getTime();
        const elapsed = now.getTime() - start.getTime();
        const perc = elapsed / totalDuration;
        
        setProgress(perc);
        const toValue = containerWidth ? containerWidth * perc : perc * 200;
        Animated.timing(animatedWidth, {
            toValue: toValue,
            duration: 1000,
            useNativeDriver: false,
            easing: Easing.linear
        }).start();

        const diffMs = end.getTime() - now.getTime();
        const minutes = Math.floor((diffMs / 1000) / 60);
        const seconds = Math.floor((diffMs / 1000) % 60);
        setTimeRemaining(`${minutes}m ${seconds}s left`);
        break;
      } 
      
      // CASE B: UPCOMING CLASS (Free Time)
      if (now < start) {
        foundActiveOrNext = true;
        setStatus('FREE');
        setCurrentEvent(null);
        setNextEvent(event);
        
        // ✅ Check if this is the FIRST class of the day
        if (i === 0) setIsBeforeStart(true);
        else setIsBeforeStart(false);
        
        const diffMs = start.getTime() - now.getTime();
        const hours = Math.floor((diffMs / (1000 * 60 * 60)));
        const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
        const seconds = Math.floor((diffMs / 1000) % 60);
        
        // ✅ LOGIC FIX: If more than 1 hour away, show exact time instead of countdown
        if(hours >= 1) {
            // Format: 10:00 AM
            const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setTimeRemaining(`Starts at ${timeStr}`);
        } else {
            // Show countdown if less than 1 hour (Urgent)
            setTimeRemaining(`Starts in ${minutes}m ${seconds}s`);
        }

        setProgress(0);
        animatedWidth.setValue(0);
        break;
      }
    }

    // CASE C: DAY OVER
    if (!foundActiveOrNext) {
      setStatus('DONE');
      setTimeRemaining("All classes done");
      setProgress(1);
      animatedWidth.setValue(containerWidth || 100);
    }
  }, [fullSchedule, animatedWidth, containerWidth]);

  useEffect(() => {
    loadSchedule();
  }, []);

  useEffect(() => {
    updateLiveStatus();
    const timer = setInterval(updateLiveStatus, 1000);
    
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        loadSchedule();
      }
    });

    return () => {
        clearInterval(timer);
        subscription.remove();
    };
  }, [updateLiveStatus]);

  const getStatusColor = () => {
    if (status === 'CLASS') return progress > 0.85 ? '#27ae60' : '#e74c3c';
    if (status === 'FREE') return '#27ae60';
    if (status === 'LOADING') return '#95a5a6';
    return '#2980b9';
  };

  const getGradientColors = () => {
    if (status === 'CLASS') return ['#e74c3c', '#c0392b'];
    if (status === 'FREE') return ['#27ae60', '#229954'];
    return ['#3498db', '#2980b9'];
  };

  // ✅ RENDER ATTENDANCE BADGE
  const renderAttStatus = () => {
    if (status !== 'CLASS' || attStatus === 'unknown') return null;

    if (attStatus === 'loading') {
        return (
            <View style={[styles.attBadge, { backgroundColor: '#f0f0f0' }]}>
                <ActivityIndicator size={10} color="#7f8c8d" />
                <Text style={[styles.attText, { color: '#7f8c8d', marginLeft: 4 }]}>Checking...</Text>
            </View>
        );
    }

    const config = {
        present: { color: '#27ae60', bg: '#e8f5e9', text: 'Marked Present ✅' },
        absent: { color: '#c0392b', bg: '#fbe9e7', text: 'Marked Absent ❌' },
        pending: { color: '#f39c12', bg: '#fef9e7', text: 'Not Marked Yet ⏳' },
    };

    const st = config[attStatus] || config.pending;

    return (
        <View style={[styles.attBadge, { backgroundColor: st.bg }]}>
            <Text style={[styles.attText, { color: st.color }]}>{st.text}</Text>
        </View>
    );
  };

  if (status === 'LOADING' && !isRefreshing && fullSchedule.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, { borderLeftColor: '#e0e0e0' }]}>
          <View style={styles.header}>
            <ShimmerPlaceholder style={{ width: 80, height: 26, borderRadius: 20 }} />
            <ShimmerPlaceholder style={{ width: 60, height: 26, borderRadius: 12 }} />
          </View>
          <View style={styles.contentContainer}>
            <ShimmerPlaceholder style={{ width: '85%', height: 26, borderRadius: 4, marginBottom: 12 }} />
            <ShimmerPlaceholder style={{ width: '40%', height: 16, borderRadius: 4, marginBottom: 16 }} />
            <ShimmerPlaceholder style={{ width: '100%', height: 10, borderRadius: 10, marginBottom: 6 }} />
          </View>
        </View>
      </View>
    );
  }

  const shimmerTranslate = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-300, 300] });
  const progressShimmerTranslate = progressShimmer.interpolate({ inputRange: [0, 1], outputRange: [-200, 400] });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity activeOpacity={0.92} onPress={loadSchedule} style={styles.touchWrapper}>
        <LinearGradient colors={['#ffffff', '#f8f9fa']} style={[styles.card, { borderLeftColor: getStatusColor() }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.statusContainer}>
              <Animated.View style={{ transform: [{ scale: status === 'CLASS' ? pulseAnim : 1 }] }}>
                <LinearGradient colors={getGradientColors()} style={styles.statusBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Icon name={status === 'CLASS' ? "radio-button-on" : status === 'FREE' ? "cafe" : "checkmark-circle"} size={16} color="#fff" />
                  <Text style={styles.statusText}>
                    {status === 'CLASS' ? '● LIVE' : 
                     status === 'FREE' ? (isBeforeStart ? 'UPCOMING' : 'BREAK') : // ✅ Context Aware Text
                     'DONE'}
                  </Text>
                </LinearGradient>
              </Animated.View>
            </View>
            <View style={styles.timerContainer}>
              <Icon name="time-outline" size={16} color={getStatusColor()} />
              <Text style={[styles.timer, { color: getStatusColor() }]}>{timeRemaining}</Text>
            </View>
          </View>

          {/* Content */}
          {status === 'CLASS' && currentEvent ? (
            <View style={styles.contentContainer}>
              <Text style={styles.subject} numberOfLines={2}>{currentEvent.title}</Text>
              
              <View style={styles.metaRow}>
                  <View style={styles.facultyRow}>
                    <Icon name="person" size={14} color="#7f8c8d" />
                    <Text style={styles.prof}>{currentEvent.facultyName || 'Faculty'}</Text>
                  </View>
                  {renderAttStatus()}
              </View>
              
              <View style={styles.progressContainer} onLayout={(e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width)}>
                <View style={styles.progressTrack}>
                  <Animated.View style={[styles.progressBar, { width: animatedWidth }]}>
                    <LinearGradient colors={getProgressColors()} style={styles.progressGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Animated.View style={[styles.progressShimmerOverlay, { transform: [{ translateX: progressShimmerTranslate }] }]} />
                    </LinearGradient>
                  </Animated.View>
                </View>
                <Text style={[styles.progressHint, { color: progress > 0.85 ? '#27ae60' : '#95a5a6' }]}>
                  {Math.floor(progress * 100)}% complete {progress > 0.85 ? '🚀' : ''}
                </Text>
              </View>
            </View>
          ) : status === 'FREE' && nextEvent ? (
            <View style={styles.contentContainer}>
              <View style={styles.freeTimeHeader}>
                {/* ✅ Change Icon and Text based on time of day */}
                <Icon name={isBeforeStart ? "sunny" : "cafe"} size={24} color={isBeforeStart ? "#f39c12" : "#27ae60"} />
                <Text style={[styles.freeTitle, isBeforeStart && { color: "#f39c12" }]}>
                    {isBeforeStart ? "Good Morning!" : "Break Time!"}
                </Text>
              </View>
              <View style={styles.nextInfoRow}>
                <Icon name="arrow-forward-circle" size={16} color="#7f8c8d" />
                <Text style={styles.subText} numberOfLines={1}>Next: {nextEvent.title}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.contentContainer}>
              <View style={styles.freeTimeHeader}>
                <Icon name="checkmark-circle" size={24} color="#3498db" />
                <Text style={[styles.freeTitle, { color: '#3498db' }]}>All Done!</Text>
              </View>
              <Text style={styles.subText}>Enjoy your day 🎉</Text>
            </View>
          )}

          {/* Footer */}
          {(status === 'CLASS' || status === 'FREE') && nextEvent && (
            <View style={styles.footer}>
              <View style={styles.nextContainer}>
                <Text style={styles.nextLabel}>UP NEXT</Text>
                <View style={styles.nextContent}>
                  <Text style={styles.nextTitle} numberOfLines={1}>{nextEvent.title}</Text>
                  {nextEvent.classRoom && (
                    <View style={styles.locationBadge}>
                      <Icon name="location" size={10} color="#fff" />
                      <Text style={styles.locationText}>{nextEvent.classRoom}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {isRefreshing && (
            <View style={styles.shimmerContainer}>
              <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerTranslate }] }]} />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16, marginHorizontal: 4 },
  touchWrapper: { borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  card: { borderRadius: 20, padding: 20, borderLeftWidth: 5, overflow: 'hidden', backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  statusText: { fontWeight: '700', fontSize: 11, color: '#fff', letterSpacing: 1 },
  timerContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  timer: { fontWeight: '700', fontSize: 13 },
  contentContainer: { marginBottom: 12 },
  subject: { fontSize: 20, fontWeight: '800', color: '#2c3e50', marginBottom: 8, lineHeight: 26 },
  
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  facultyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prof: { fontSize: 13, color: '#7f8c8d', fontWeight: '600' },
  
  attBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  attText: { fontSize: 11, fontWeight: '700' },

  progressContainer: { gap: 6 },
  progressTrack: { height: 10, backgroundColor: '#ecf0f1', borderRadius: 10, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 10, overflow: 'hidden' },
  progressGradient: { flex: 1 },
  progressShimmerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.4)', width: '50%', transform: [{ skewX: '-20deg' }] },
  progressHint: { fontSize: 10, color: '#95a5a6', textAlign: 'right', fontWeight: '600' },
  freeTimeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  freeTitle: { fontSize: 20, fontWeight: '800', color: '#27ae60' },
  nextInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subText: { fontSize: 13, color: '#7f8c8d', fontWeight: '500', flex: 1 },
  footer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#ecf0f1' },
  nextContainer: { gap: 8 },
  nextLabel: { fontSize: 9, fontWeight: '800', color: '#95a5a6', letterSpacing: 1.5 },
  nextContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextTitle: { fontSize: 14, fontWeight: '700', color: '#2c3e50', flex: 1, marginRight: 8 },
  locationBadge: { backgroundColor: '#34495e', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  shimmerContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(52, 152, 219, 0.2)', overflow: 'hidden' },
  shimmer: { width: 100, height: '100%', backgroundColor: 'rgba(52, 152, 219, 0.8)' },
});

export default LiveTracker;