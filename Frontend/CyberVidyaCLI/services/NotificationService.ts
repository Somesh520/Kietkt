import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';

class NotificationService {

    constructor() {
        this.createChannel();
    }

    createChannel() {
        if (Platform.OS === 'android') {
            messaging().setBackgroundMessageHandler(async remoteMessage => {
                console.log('Message handled in the background!', remoteMessage);
            });

            // Create the channel
            /*
             Note: @react-native-firebase/messaging automatically creates a default channel.
             However, to be safe and match our manifest, we can't easily create a channel 
             programmatically without a library like 'react-native-push-notification' or 'notifee'.
             
             BUT, Firebase Messaging handles this if we send the 'channelId' in the payload.
             For now, let's rely on Firebase's default behavior but ensure we log initialization.
            */
            console.log('🔵 Notification Service Initialized');
        }
    }

    // 1. Request User Permission
    async requestUserPermission() {
        console.log('🔵 Checking Notification Permission...');

        if (Platform.OS === 'android') {
            // Android 13+ (API Level 33+) logic
            if (Platform.Version >= 33) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                );
                console.log('🔵 Android 13+ Permission Result:', granted);

                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    console.log('✅ Android 13+ Notification Permission Granted');
                    return true;
                } else {
                    console.log('❌ Android 13+ Notification Permission Denied');
                    // Alert user to enable manually if they denied it
                    Alert.alert(
                        'Notifications Permission',
                        'To receive attendance alerts, please enable notifications in settings.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open Settings', onPress: () => Linking.openSettings() } // Import Linking needs to be added
                        ]
                    );
                    return false;
                }
            } else {
                // Android < 13: Permission is granted by default at install time
                console.log('✅ Android < 13: Permission auto-granted');
                return true;
            }
        } else {
            // iOS Logic
            console.log('🔵 Requesting permission via messaging()...');
            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            console.log('🔵 Authorization Status:', authStatus);
            if (enabled) {
                console.log('✅ Authorization status:', authStatus);
                return true;
            } else {
                console.log('❌ Notification permission denied');
                return false;
            }
        }
    }

    // 2. Get FCM Token & Subscribe to Topic
    async getFCMToken() {
        console.log('🔵 Attempting to fetch FCM Token...');
        try {
            const fcmToken = await messaging().getToken();
            if (fcmToken) {
                console.log('🔥 FCM Token:', fcmToken);

                // Subscribe to 'students' topic for broadcast notifications
                await messaging().subscribeToTopic('students');
                console.log('✅ Subscribed to "students" topic');
            } else {
                console.log('⚠️ No FCM token received');
            }
        } catch (error) {
            console.log('❌ Error fetching FCM token:', error);
        }
    }

    // 3. Listen for Foreground Messages
    listen() {
        // Foreground State
        const unsubscribe = messaging().onMessage(async remoteMessage => {
            console.log('🔔 A new FCM message arrived (Foreground)!', JSON.stringify(remoteMessage));

            Alert.alert(
                remoteMessage.notification?.title || 'New Notification',
                remoteMessage.notification?.body || ''
            );
        });

        // Background & Quit State (Notification Open)
        messaging().onNotificationOpenedApp(remoteMessage => {
            console.log('📩 Notification caused app to open from background state:', remoteMessage.notification);
        });

        // Check if app was opened from a quit state
        messaging()
            .getInitialNotification()
            .then(remoteMessage => {
                if (remoteMessage) {
                    console.log('🚀 Notification caused app to open from quit state:', remoteMessage.notification);
                }
            });

        return unsubscribe;
    }
    async startForegroundService() {
        if (Platform.OS !== 'android') return;

        console.log('🚀 Starting Foreground Service...');

        // Create a channel for the foreground service
        await notifee.createChannel({
            id: 'fg_silent_v2',
            name: 'Background Sync',
            importance: AndroidImportance.MIN,
            visibility: AndroidVisibility.SECRET,
        });

        // Display the notification which promotes the app to a Foreground Service
        await notifee.displayNotification({
            id: 'foreground_notification',
            title: 'Attendance Monitor Active',
            body: 'Keeping your attendance data in sync.',
            android: {
                channelId: 'fg_silent_v2',
                asForegroundService: true,
                ongoing: true,
                // 1 corresponds to FOREGROUND_SERVICE_TYPE_DATA_SYNC in Android 14+
                foregroundServiceTypes: [1],
                pressAction: {
                    id: 'default',
                },
            },
        });
    }

    async stopForegroundService() {
        if (Platform.OS !== 'android') return;
        await notifee.stopForegroundService();
    }
}

export default new NotificationService();
