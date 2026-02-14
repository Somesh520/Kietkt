import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { useTheme } from '../ThemeContext';
import Icon from 'react-native-vector-icons/Ionicons';
import AttendanceScheduler from '../services/AttendanceScheduler';
import NotificationService from '../services/NotificationService';

const NotificationSettings = () => {
    const { colors, isDark } = useTheme();
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
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>

            {/* 1. Master Control */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.title, { color: colors.text }]}>Attendance Monitor</Text>
                        <Text style={[styles.subtitle, { color: colors.subText }]}>
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
            <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.sectionHeader, { color: colors.text }]}>Actions</Text>

                <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={runImmediateCheck}>
                    <Icon name="play-circle-outline" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Run Sync Now</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, { backgroundColor: '#f59e0b', marginTop: 10 }]} onPress={sendTestNotification}>
                    <Icon name="notifications-outline" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Test Notification (Immediate)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginTop: 10 }]}
                    onPress={() => notifee.openNotificationSettings('fg_silent_v2')}>
                    <Icon name="eye-off-outline" size={20} color={colors.text} />
                    <Text style={[styles.buttonText, { color: colors.text }]}>Hide Status Notification</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginTop: 10 }]}
                    onPress={fetchPending}>
                    <Icon name="refresh-outline" size={20} color={colors.text} />
                    <Text style={[styles.buttonText, { color: colors.text }]}>Refresh Data</Text>
                </TouchableOpacity>
            </View>


            {/* 3. Pending Triggers */}
            <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.sectionHeader, { color: colors.text }]}>
                    Scheduled Alerts ({pendingIds.length})
                </Text>
                {pendingIds.length === 0 ? (
                    <Text style={{ color: colors.subText, fontStyle: 'italic' }}>No upcoming alerts scheduled.</Text>
                ) : (
                    pendingIds.map((id, index) => (
                        <View key={index} style={[styles.logRow, { borderBottomColor: colors.border }]}>
                            <Icon name="alarm-outline" size={16} color={colors.primary} />
                            <Text style={[styles.logText, { color: colors.text }]}>ID: {id}</Text>
                        </View>
                    ))
                )}
            </View>

            {/* 4. Live Logs */}
            <View style={[styles.card, { backgroundColor: '#000' }]}>
                <Text style={[styles.sectionHeader, { color: '#0f0' }]}> {'>'} System Logs</Text>
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
    container: { flex: 1, padding: 15 },
    card: {
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 18, fontWeight: 'bold' },
    subtitle: { fontSize: 12, marginTop: 5 },
    sectionHeader: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
    },
    buttonText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
    logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, gap: 10 },
    logText: { fontSize: 12 },
});

export default NotificationSettings;
