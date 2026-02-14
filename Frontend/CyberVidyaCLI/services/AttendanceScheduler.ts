import notifee, { TriggerType, AndroidImportance, TimestampTrigger } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWeeklySchedule, getRegisteredCourses, TimetableEvent, RegisteredCourse } from '../api';

class AttendanceScheduler {

    // Initialize Channels
    async init() {
        await notifee.requestPermission();
        await notifee.createChannel({
            id: 'attendance_alert',
            name: 'Attendance Alerts',
            importance: AndroidImportance.HIGH,
            sound: 'default',
        });
    }

    // Main Scheduling Function
    async scheduleNotifications() {
        console.log("🔄 Starting Attendance Scheduling...");
        try {
            await this.init();

            // 1. Fetch Data
            const timetable = await getWeeklySchedule();
            // User requested to use "Home Page" data source for better accuracy
            const registeredCourses = await getRegisteredCourses();

            if (!timetable || timetable.length === 0) {
                console.log("⚠️ No timetable found.");
                return;
            }

            // 2. Clear Existing Notifications to avoid duplicates
            await notifee.cancelAllNotifications();

            // 3. Group Classes by Date for Morning Summary
            const classesByDate: { [date: string]: { courses: string[], events: TimetableEvent[] } } = {};
            const processedCourses = new Set<number>();

            for (const event of timetable) {
                if (event.type !== 'CLASS') continue;

                const courseName = event.courseName || "Unknown Course";
                // New Helper using RegisteredCourses
                const courseDetail = this.findCourseDetail(registeredCourses, courseName);

                if (!courseDetail) continue;

                const { courseId, currentAttendance } = courseDetail;
                const targetStr = await AsyncStorage.getItem(`TARGET_ATTENDANCE_${courseId}`);
                const target = targetStr ? parseInt(targetStr) : 75;

                // Only log if not already logged in this session to reduce noise
                if (!processedCourses.has(courseId)) {
                    console.log(`Checking: ${courseName} | Current: ${currentAttendance.toFixed(1)}% | Target: ${target}%`);
                    processedCourses.add(courseId);
                }

                // Notify if attendance is BELOW or EQUAL to target (Risk Zone)
                if (currentAttendance <= target) {
                    const dateKey = this.getDateKey(event.start);
                    if (!classesByDate[dateKey]) {
                        classesByDate[dateKey] = { courses: [], events: [] };
                    }
                    // Avoid duplicate course names in summary
                    if (!classesByDate[dateKey].courses.includes(`${courseName} (${currentAttendance.toFixed(0)}% / ${target}%)`)) {
                        classesByDate[dateKey].courses.push(`${courseName} (${currentAttendance.toFixed(0)}% / ${target}%)`);
                    }
                    classesByDate[dateKey].events.push(event);
                }
            }

            // 4. Schedule Notifications
            for (const [dateStr, data] of Object.entries(classesByDate)) {

                // A. Single Morning Summary (7:00 AM)
                // dateStr format is dd/MM/yyyy based on helper, but we need to parse it back
                const [day, month, year] = dateStr.split('/').map(Number);
                const morningTrigger = new Date(year, month - 1, day, 7, 0, 0);
                const now = new Date();

                if (morningTrigger > now) {
                    const subjectList = data.courses.join(', ');
                    await this.createTriggerNotification(
                        `⚠️ Low Attendance Warning Today!`,
                        `Don't miss classes for: ${subjectList}. Maintain your target!`,
                        morningTrigger.getTime()
                    );
                }

                // B. Individual Class Reminders (10 mins before)
                for (const event of data.events) {
                    const classDate = this.parseDate(event.start);
                    const tenMinBefore = new Date(classDate.getTime() - 10 * 60 * 1000);
                    const courseName = event.courseName || "Class";

                    // Re-fetch stats for individual notification body
                    const detail = this.findCourseDetail(registeredCourses, courseName);
                    let bodyText = `Starts in 10 mins! Don't miss it!`;

                    if (detail) {
                        const { courseId, currentAttendance } = detail;
                        const targetStr = await AsyncStorage.getItem(`TARGET_ATTENDANCE_${courseId}`);
                        const target = targetStr ? parseInt(targetStr) : 75;
                        bodyText = `Attendance: ${currentAttendance.toFixed(1)}% < ${target}%. Ends in disaster if missed! 😅`;
                    }

                    if (tenMinBefore > now) {
                        await this.createTriggerNotification(
                            `Class Starting Soon: ${courseName}`,
                            bodyText,
                            tenMinBefore.getTime()
                        );
                    } else if (classDate > now) {
                        // Fallback: Class hasn't started yet, but < 10 mins left (e.g. user opened app at 1:19 for 1:20 class)
                        // Trigger IMMEDIATE notification
                        const minutesLeft = Math.ceil((classDate.getTime() - now.getTime()) / 60000);

                        // Only notify if we haven't already passed the class time
                        await this.createTriggerNotification(
                            `Hurry Up! ${courseName}`,
                            `Class starts in ${minutesLeft} mins! ${bodyText}`,
                            now.getTime() + 1000 // 1 sec delay to ensure it triggers
                        );
                    }
                }
            }

            console.log("✅ Attendance Notifications Scheduled Successfully");

        } catch (error) {
            console.error("❌ Error scheduling attendance notifications:", error);
        }
    }

    getDateKey(dateString: string): string {
        return dateString.split(' ')[0]; // Returns "dd/MM/yyyy"
    }

    // Helper to find Course Details from RegisteredCourses list
    findCourseDetail(courses: RegisteredCourse[], courseName: string): { courseId: number, currentAttendance: number } | null {
        // Fuzzy match course name
        const course = courses.find((c) =>
            c.courseName.toLowerCase().includes(courseName.toLowerCase()) ||
            courseName.toLowerCase().includes(c.courseName.toLowerCase())
        );

        if (!course) return null;

        // Calculate Attendance using the structure from HomeScreen (RegisteredCourse -> studentCourseCompDetails)
        const details = course.studentCourseCompDetails?.[0];
        // If details missing, return 0 attendance (safe default)
        if (!details) return { courseId: course.courseId, currentAttendance: 0 };

        const total = details.totalLecture || 0;
        const present = details.presentLecture || 0;
        const currentAttendance = total === 0 ? 0 : (present / total) * 100;

        return { courseId: course.courseId, currentAttendance };
    }



    async createTriggerNotification(title: string, body: string, timestamp: number) {
        const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: timestamp,
        };

        await notifee.createTriggerNotification(
            {
                title: title,
                body: body,
                android: {
                    channelId: 'attendance_alert',
                    pressAction: {
                        id: 'default',
                    },
                },
            },
            trigger,
        );
        console.log(`⏰ Scheduled: "${title}" at ${new Date(timestamp).toLocaleString()}`);
    }

    parseDate(dateString: string): Date {
        // Format: "dd/MM/yyyy HH:mm:ss" -> "24/04/2024 10:10:00"
        const [datePart, timePart] = dateString.split(' ');
        const [day, month, year] = datePart.split('/');
        const [hours, minutes, seconds] = timePart.split(':');
        return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds));
    }

    formatTime(date: Date): string {
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
}

export default new AttendanceScheduler();
