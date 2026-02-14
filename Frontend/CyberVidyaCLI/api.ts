import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { InternalAxiosRequestConfig, AxiosHeaderValue } from 'axios';
import RNBlobUtil from 'react-native-blob-util';
import { Platform } from 'react-native';

const API_BASE_URL = "https://kiet.cybervidya.net/api";
const AUTH_TOKEN_KEY = 'authToken';

// --- Interfaces ---

// Simple Event Emitter for Auth Errors
type AuthEventListener = () => void;
let authErrorListeners: AuthEventListener[] = [];

export const onAuthError = (listener: AuthEventListener) => {
    authErrorListeners.push(listener);
    return () => {
        authErrorListeners = authErrorListeners.filter(l => l !== listener);
    };
};

const emitAuthError = () => {
    authErrorListeners.forEach(l => l());
};

export interface UserDetails {
    fullName: string;
    registrationNumber: string;
    rollNumber: string;
    branchShortName: string;
    degreeName: string;
    semesterName: string;
    admissionBatchName: string;
    studentId?: number;
    attendanceCourseComponentInfoList: any[];
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
    message?: string;
}

export interface TimetableEvent {
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

export interface DashboardAttendance {
    presentPerc: number;
    absentPerc: number;
}

export interface CourseComponentDetail {
    courseCompId: number;
    courseCompFacultyName: string;
    presentLecture: number;
    totalLecture: number;
}

export interface RegisteredCourse {
    studentId: number;
    courseId: number;
    courseCode: string;
    courseName: string;
    studentCourseCompDetails: CourseComponentDetail[];
}

export interface Lecture {
    planLecDate: string;
    topicCovered: string | null;
    attendance: 'PRESENT' | 'ABSENT' | string;
    timeSlot: string;
}

export interface LectureWiseAttendance {
    presentCount: number;
    lectureCount: number;
    percent: number;
    lectureList: Lecture[];
}

export interface ExamSchedule {
    strExamDate: string;
    courseName: string;
    evalLevelComponentName: string;
    courseCode: string;
    strExamTime: string | null;
    examMode: string;
    examVenueName: string;
    courseComponentName: string;
    courseDetails?: string;
}

export interface ExamSession {
    sessionId: number;
    sessionName: string;
}

export interface HallTicketOption {
    id: number;
    title: string;
}

// --- EXAM SCORE / RESULT ---

export interface ExamScoreComponent {
    courseCompName: string; // e.g., "THEORY", "PRACTICAL"
    compSessionLevelMarks: {
        grade: string;
        result: string;
        compEgp: number;
        compCredits: number;
    }[];
}

export interface ExamScoreSubject {
    courseCode: string;
    courseName: string;
    courseCompDTOList: ExamScoreComponent[];
    resultSort: string; // "PASS"
}

export interface ExamScoreSemester {
    semesterName: string;
    sgpa: number;
    studentMarksDetailsDTO: ExamScoreSubject[];
}

export interface ExamScoreResponse {
    studentSemesterWiseMarksDetailsList: ExamScoreSemester[];
    cgpa: number;
    fullName: string;
    enrollmentNo?: string;
}

// --- API Client and Interceptors ---
export const apiClient = axios.create({ baseURL: API_BASE_URL });

// 1. Request Interceptor: Attach Token
apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
            // We use Authorization header because we found a JWT in LocalStorage
            config.headers['Authorization'] = token as AxiosHeaderValue;
        }
        console.log(`[API Request] --> ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        return config;
    },
    (error: any) => Promise.reject(error)
);

// 2. Response Interceptor: Mock Data on 401/Failure
apiClient.interceptors.response.use(
    (response: any) => response,
    async (error: any) => {
        const url = error.config?.url || "";

        // If unauthorized (401) or Forbidden (403), try to serve from Heist Cache
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.log(`⚠️ API Failed (${url}) with ${error.response.status}. Checking Heist Cache...`);

            // Helper to create a fake successful response
            const mockResponse = (data: any) => ({
                data: { success: true, data: data },
                status: 200,
                statusText: "OK",
                headers: {},
                config: error.config
            });

            try {
                // A. Dashboard Attendance
                if (url.includes('dashboard/attendance')) {
                    const cached = await AsyncStorage.getItem('CACHE_DASHBOARD');
                    if (cached) {
                        console.log("✅ Serving Cached Dashboard!");
                        return mockResponse(JSON.parse(cached));
                    }
                }

                // B. Registered Courses
                if (url.includes('registered-courses')) {
                    const cached = await AsyncStorage.getItem('CACHE_COURSES');
                    if (cached) {
                        console.log("✅ Serving Cached Courses!");
                        return mockResponse(JSON.parse(cached));
                    }
                }

                // C. User Profile
                if (url.includes('attendance/course/component/student')) {
                    const cached = await AsyncStorage.getItem('CACHE_PROFILE');
                    if (cached) {
                        console.log("✅ Serving Cached Profile!");
                        return mockResponse(JSON.parse(cached));
                    }
                }
            } catch (e) {
                console.error("Cache retrieval failed", e);
            }
            // If cache failed, EMIT AUTH ERROR so app can logout
            console.log("❌ No cache found for 401/403. Emitting Auth Error.");
            emitAuthError();
        }

        // If no cache or different error, reject
        return Promise.reject(error);
    }
);

// Helper function to handle errors
const handleError = (error: any, functionName: string): Error => {
    if (axios.isAxiosError(error)) {
        console.error(`❌ [API Error] in ${functionName}:`, {
            status: error.response?.status,
            url: error.config?.url,
        });
        return new Error(error.message || 'An API error occurred.');
    } else {
        return new Error(error.message || 'An unexpected error occurred.');
    }
};

// --- AUTH FUNCTIONS ---

// Simplified Login: Just stores the token provided by WebView
export const login = async (token: string): Promise<string> => {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    return token;
};

export const logout = async () => {
    try {
        await AsyncStorage.multiRemove([
            AUTH_TOKEN_KEY,
            'studentId',
            'CACHE_DASHBOARD',
            'CACHE_COURSES',
            'CACHE_PROFILE'
        ]);

        // Also clear cookies via CookieManager if possible (best effort)
        // Note: This might not work perfectly on your specific Android setup but good to have
        // You might need to import CookieManager here if not already imported
        // await CookieManager.clearAll(); 

        delete apiClient.defaults.headers.common['Authorization'];
    } catch (e) {
        console.error("Logout Error:", e);
    }
};

const getFormattedDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- DATA FUNCTIONS ---

export const getWeeklySchedule = async (): Promise<TimetableEvent[]> => {
    try {
        const startDateObj = new Date();
        const endDateObj = new Date();
        endDateObj.setDate(startDateObj.getDate() + 6);

        const weekStartDate = getFormattedDate(startDateObj);
        const weekEndDate = getFormattedDate(endDateObj);

        const url = `/student/schedule/class?weekEndDate=${weekEndDate}&weekStartDate=${weekStartDate}`;
        const response = await apiClient.get<ApiResponse<TimetableEvent[]>>(url);

        return response.data?.data || [];
    } catch (err) {
        // Schedule is not critical, return empty if fails
        return [];
    }
};

export const getDashboardAttendance = async (): Promise<DashboardAttendance> => {
    try {
        const response = await apiClient.get<ApiResponse<DashboardAttendance>>('/student/dashboard/attendance');
        if (response.data?.data) {
            return response.data.data;
        } else {
            throw new Error("Failed to get dashboard attendance.");
        }
    } catch (err) {
        throw handleError(err, 'getDashboardAttendance');
    }
};

export const getRegisteredCourses = async (): Promise<RegisteredCourse[]> => {
    try {
        const response = await apiClient.get<ApiResponse<RegisteredCourse[]>>('/student/dashboard/registered-courses');
        if (response.data?.data) {
            return response.data.data;
        } else {
            throw new Error("Failed to get registered courses.");
        }
    } catch (err) {
        throw handleError(err, 'getRegisteredCourses');
    }
};

export const getAttendanceAndDetails = async (): Promise<UserDetails> => {
    try {
        const response = await apiClient.get<ApiResponse<UserDetails>>('/attendance/course/component/student');
        if (response.data?.data) {
            return response.data.data;
        } else {
            throw new Error("No attendance details found.");
        }
    } catch (err) {
        throw handleError(err, 'getAttendanceAndDetails');
    }
};

// 📸 Get Student Profile Info (including profile photo)
export interface StudentProfile {
    fullName: string;
    registrationNumber: string;
    profilePhoto?: string;
    [key: string]: any;
}

export const getStudentProfileInfo = async (): Promise<StudentProfile> => {
    try {
        const response = await apiClient.get('/info/student/fetch');
        if (response.data?.data) {
            return response.data.data;
        } else {
            throw new Error("No profile info found.");
        }
    } catch (err) {
        throw handleError(err, 'getStudentProfileInfo');
    }
};

export const getLectureWiseAttendance = async (params: { studentId: number; courseId: number; courseCompId: number }): Promise<Lecture[]> => {
    try {
        // NOTE: This POST request might still fail if session is invalid, 
        // as we haven't cached lecture-wise data during login (it's too heavy).
        interface LectureApiResponse {
            data: LectureWiseAttendance[];
        }
        const response = await apiClient.post<LectureApiResponse>(
            '/attendance/schedule/student/course/attendance/percentage',
            params
        );

        return response.data?.data?.[0]?.lectureList || [];
    } catch (err) {
        console.log("Lecture detail fetch failed (likely session expired)");
        return [];
    }
};

export const getExamSchedule = async (): Promise<ExamSchedule[]> => {
    try {
        interface ExamApiResponse {
            data: ExamSchedule[];
        }
        const response = await apiClient.get<ExamApiResponse>('/exam/schedule/student/exams');
        return response.data?.data || [];
    } catch (err: any) {
        return [];
    }
};

// --- HALL TICKET ---

export const getExamSession = async (studentId: string | number): Promise<ExamSession[]> => {
    try {
        interface SessionApiResponse {
            data: ExamSession[];
        }
        const response = await apiClient.get<SessionApiResponse>(`/exam/form/session/config/getById/student/${studentId}`);
        return response.data?.data || [];
    } catch (err) {
        return [];
    }
};

export const getHallTicketOptions = async (sessionId: number): Promise<HallTicketOption[]> => {
    try {
        interface OptionsApiResponse {
            data: HallTicketOption[];
        }
        const response = await apiClient.get<OptionsApiResponse>(`/exam/hall-ticket/student/download/options/${sessionId}`);
        return response.data?.data || [];
    } catch (err) {
        return [];
    }
};

export const downloadHallTicketPDF = async (hallTicketId: number, title: string): Promise<string> => {
    try {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) throw new Error("User not authenticated");

        const { dirs } = RNBlobUtil.fs;
        const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${cleanTitle}.pdf`;
        const filePath = Platform.OS === 'ios'
            ? `${dirs.DocumentDir}/${fileName}`
            : `${dirs.DownloadDir}/${fileName}`;

        const url = `${API_BASE_URL}/report/pdf/exam/student/hall-ticket/download/${hallTicketId}`;

        console.log(`[Download] Starting download: ${url}`);

        const res = await RNBlobUtil.config({
            fileCache: true,
            addAndroidDownloads: {
                useDownloadManager: true,
                notification: true,
                path: filePath,
                description: 'Downloading Hall Ticket...',
                mime: 'application/pdf',
                mediaScannable: true,
            },
            path: filePath,
        }).fetch('GET', url, {
            'Authorization': token, // Attempt with Authorization Header
        });

        console.log(`[Download] Success. Path: ${res.path()}`);
        return res.path();

    } catch (err: any) {
        console.error("Download Error:", err);
        throw new Error(err.message || "Failed to download Hall Ticket PDF");
    }
};

export const getExamScore = async (): Promise<ExamScoreResponse | null> => {
    try {
        const response = await apiClient.get<ApiResponse<ExamScoreResponse>>('/exam/score/get/score');
        return response.data?.data || null;
    } catch (err) {
        console.error("Failed to fetch exam score:", err);
        return null;
    }
};