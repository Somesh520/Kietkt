import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { useTheme } from '../ThemeContext';
import Icon from 'react-native-vector-icons/Ionicons';
import AttendanceScheduler from '../services/AttendanceScheduler';
import NotificationService from '../services/NotificationService';

const NotificationSettings = () => {
    const { colors, isDark, isBrutalist, typography, spacing } = useTheme();
    const [pendingIds, setPendingIds] = useState<string[]>([]);
    const [isForegroundServiceOn, setIsForegroundServiceOn] = useState(true); // Default assume ON
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        fetchPending();
        setLogs(AttendanceScheduler.getLogs());

        const interval = setInterval(() => {
            // Refresh logs every 2 seconds
            setLogs([...AttendanceScheduler.getLogs()]);
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const fetchPending = async () => {
        const ids = await notifee.getTriggerNotificationIds();
        setPendingIds(ids);
    };


    const toggleForegroundService = async (value: boolean) => {
        setIsForegroundServiceOn(value);
        if (value) {
            await NotificationService.startForegroundService();
            Alert.alert("Service Started", "Attendance Monitor is active.");
        } else {
            await NotificationService.stopForegroundService();
            Alert.alert("Service Stopped", "Attendance Monitor is paused. App may be killed by system.");
        }
    };

    const runImmediateCheck = async () => {
        Alert.alert("Testing...", "Running immediate attendance check...");
        await AttendanceScheduler.scheduleNotifications();
        fetchPending();
        setLogs([...AttendanceScheduler.getLogs()]);
        Alert.alert("Done", "Check Log below for results.");
    };

    const sendTestNotification = async () => {
        // Create High Importance Channel explicitly
        await notifee.createChannel({
            id: 'attendance_alert',
            name: 'Attendance Alerts',
            importance: AndroidImportance.HIGH,
            sound: 'default',
        });

        Alert.alert("Test Sent", "Check your status bar now!");

        await notifee.displayNotification({
            title: '🔔 Test Notification',
            body: 'This proves notifications work on your device!',
            android: {
                channelId: 'attendance_alert',
                pressAction: { id: 'default' },
                importance: AndroidImportance.HIGH,
            },
        });
    };

    return (
        <ScrollView style={[
            styles.container,
            { backgroundColor: colors.background },
            isBrutalist && styles.brutalistContainer,
            isBrutalist && { backgroundColor: colors.background }
        ]}>

            {/* 1. Master Control */}
            <View style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
                isBrutalist && styles.brutalistCard,
                isBrutalist && { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.border }
            ]}>
                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.title, { color: colors.text }, isBrutalist && styles.brutalistText]}>Attendance Monitor</Text>
                        <Text style={[styles.subtitle, { color: colors.subText }, isBrutalist && styles.brutalistSubText]}>
                            Keep app running in background to track attendance.
                        </Text>
                    </View>
                    <Switch
                        value={isForegroundServiceOn}
                        onValueChange={toggleForegroundService}
                        trackColor={{ false: "#767577", true: colors.primary }}
                        thumbColor={isForegroundServiceOn ? "#f4f3f4" : "#f4f3f4"}
                    />
                </View>
            </View>

            {/* 2. Actions */}
            <View style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
                isBrutalist && styles.brutalistCard,
                isBrutalist && { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.border }
            ]}>
                <Text style={[styles.sectionHeader, { color: colors.text }, isBrutalist && styles.brutalistText]}>Actions</Text>

                <TouchableOpacity style={[
                    styles.button,
                    { backgroundColor: colors.primary },
                    isBrutalist && styles.brutalistButton,
                    isBrutalist && { borderColor: colors.border }
                ]} onPress={runImmediateCheck}>
                    <Icon name="play-circle-outline" size={20} color="#fff" />
                    <Text style={[styles.buttonText, isBrutalist && styles.brutalistText]}>Run Sync Now</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[
                    styles.button,
                    { backgroundColor: '#f59e0b', marginTop: 12 },
                    isBrutalist && styles.brutalistButton,
                    isBrutalist && { borderColor: colors.border }
                ]} onPress={sendTestNotification}>
                    <Icon name="notifications-outline" size={20} color={isBrutalist ? '#000' : '#fff'} />
                    <Text style={[styles.buttonText, isBrutalist && styles.brutalistText]}>Test Notification (Immediate)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.button,
                        { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginTop: 12 },
                        isBrutalist && styles.brutalistButton,
                        isBrutalist && { borderColor: colors.border }
                    ]}
                    onPress={() => notifee.openNotificationSettings('fg_silent_v2')}>
                    <Icon name="eye-off-outline" size={20} color={isBrutalist ? '#000' : colors.text} />
                    <Text style={[styles.buttonText, { color: colors.text }, isBrutalist && styles.brutalistText]}>Hide Status Notification</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.button,
                        { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginTop: 12 },
                        isBrutalist && styles.brutalistButton,
                        isBrutalist && { borderColor: colors.border }
                    ]}
                    onPress={fetchPending}>
                    <Icon name="refresh-outline" size={20} color={isBrutalist ? '#000' : colors.text} />
                    <Text style={[styles.buttonText, { color: colors.text }, isBrutalist && styles.brutalistText]}>Refresh Data</Text>
                </TouchableOpacity>
            </View>


            {/* 3. Pending Triggers */}
            <View style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
                isBrutalist && styles.brutalistCard,
                isBrutalist && { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.border }
            ]}>
                <Text style={[styles.sectionHeader, { color: colors.text }, isBrutalist && styles.brutalistText]}>
                    Scheduled Alerts ({pendingIds.length})
                </Text>
                {pendingIds.length === 0 ? (
                    <Text style={[{ color: colors.subText, fontStyle: 'italic' }, isBrutalist && styles.brutalistSubText]}>No upcoming alerts scheduled.</Text>
                ) : (
                    pendingIds.map((id, index) => (
                        <View key={index} style={[
                            styles.logRow,
                            { borderBottomColor: colors.border },
                            isBrutalist && styles.brutalistDivider,
                            isBrutalist && { borderColor: colors.border }
                        ]}>
                            <Icon name="alarm-outline" size={16} color={isBrutalist ? colors.text : colors.primary} />
                            <Text style={[styles.logText, { color: colors.text }, isBrutalist && styles.brutalistText]}>ID: {id}</Text>
                        </View>
                    ))
                )}
            </View>

            {/* 4. Live Logs */}
            <View style={[
                styles.card,
                { backgroundColor: '#000', borderColor: isBrutalist ? colors.border : 'rgba(255,255,255,0.1)' },
                isBrutalist && styles.brutalistCard,
                isBrutalist && { backgroundColor: '#000', borderColor: colors.border, shadowColor: colors.border }
            ]}>
                <Text style={[styles.sectionHeader, { color: '#0f0' }, isBrutalist && { color: '#10B981', fontWeight: '900', textTransform: 'uppercase' }]}> {'>'} System Logs</Text>
                {logs.length === 0 ? (
                    <Text style={{ color: '#888' }}>Waiting for activity...</Text>
                ) : (
                    logs.map((log, index) => (
                        <Text key={index} style={{ color: '#0f0', fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: 2 }}>
                            {log}
                        </Text>
                    ))
                )}
            </View>

            <View style={{ height: 50 }} />

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    card: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)'
    },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
    subtitle: { fontSize: 13, marginTop: 6, fontWeight: '500' },
    sectionHeader: { fontSize: 16, fontWeight: '700', marginBottom: 12, letterSpacing: -0.3 },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 16,
    },
    buttonText: { color: '#fff', fontWeight: '700', marginLeft: 8 },
    logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 12 },
    logText: { fontSize: 13, fontWeight: '500' },

    // --- NEO-BRUTALISM OVERRIDES ---
    brutalistContainer: {},
    brutalistCard: { 
      borderRadius: 0, 
      borderWidth: 4, 
      shadowOffset: { width: 8, height: 8 }, 
      shadowOpacity: 1, 
      shadowRadius: 0,
      elevation: 0,
      marginBottom: 24,
    },
    brutalistButton: { borderRadius: 0, borderWidth: 3, shadowOpacity: 0, elevation: 0 },
    brutalistText: { fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
    brutalistSubText: { fontWeight: '900', textTransform: 'uppercase' },
    brutalistDivider: { borderBottomWidth: 3 }
});

export default NotificationSettings;
