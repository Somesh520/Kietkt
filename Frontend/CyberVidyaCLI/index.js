/**
 * @format
 */
import 'react-native-gesture-handler';
// ⏱️ Capture App Start Time immediately
global.appStartTime = Date.now();

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

import messaging from '@react-native-firebase/messaging';

// Register background handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Message handled in the background!', remoteMessage);
});

// Background Fetch Headless Task
import BackgroundFetch from 'react-native-background-fetch';
import AttendanceScheduler from './services/AttendanceScheduler';
import notifee from '@notifee/react-native';

const HeadlessTask = async (event) => {
    const taskId = event.taskId;
    console.log('[BackgroundFetch HeadlessTask] start: ', taskId);

    // Sync Logic
    await AttendanceScheduler.scheduleNotifications();

    // Finish
    BackgroundFetch.finish(taskId);
};

// Register BackgroundFetch
BackgroundFetch.registerHeadlessTask(HeadlessTask);

// Register Notifee Foreground Service (Keeps App Alive)
notifee.registerForegroundService((notification) => {
    return new Promise(() => {
        console.log('foreground service started');

        // Initial Sync
        AttendanceScheduler.scheduleNotifications();

        // Periodic Sync every 15 minutes
        const intervalId = setInterval(async () => {
            console.log('🔄 Foreground Service: Syncing Attendance...');
            await AttendanceScheduler.scheduleNotifications();
        }, 15 * 60 * 1000);

        // Optional: Listen for stop event if needed, but for now we keep it running.
    });
});

AppRegistry.registerComponent(appName, () => App);