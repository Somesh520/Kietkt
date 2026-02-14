import messaging from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform, Alert } from 'react-native';

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
        if (Platform.OS === 'android' && Platform.Version >= 33) {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );
            console.log('🔵 Android 13+ Permission Result:', granted);
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                console.log('✅ Android 13+ Notification Permission Granted');
                return true;
            } else {
                console.log('❌ Android 13+ Notification Permission Denied');
                return false;
            }
        } else {
            // For iOS and older Android versions
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
}

export default new NotificationService();
