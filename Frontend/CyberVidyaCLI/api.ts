import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { InternalAxiosRequestConfig, AxiosHeaderValue } from 'axios';
import RNBlobUtil from 'react-native-blob-util'; // ✅ Required for PDF Download
import { Platform } from 'react-native';

// Base URL ab seedhe Cyber Vidhya ka hai
const API_BASE_URL = "https://kiet.cybervidya.net/api";
const AUTH_TOKEN_KEY = 'authToken';
const USER_CREDENTIALS_KEY = 'userCredentials';

// Rate Limiting Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 5;
const LOGIN_ATTEMPTS_KEY = 'loginAttempts';
const LOCKOUT_TIMESTAMP_KEY = 'lockoutTimestamp';


// --- Interfaces ---
export interface UserDetails {
  fullName: string;
  registrationNumber: string;
  rollNumber: string;
  branchShortName: string;
  degreeName: string;
  semesterName: string;
  admissionBatchName: string;
  studentId?: number; // Added optional studentId if available in login response
  attendanceCourseComponentInfoList: any[];
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
    message?: string;
}

interface LoginApiResponse {
    success: boolean;
    data: {
        token: string;
        studentId?: number; // Capturing studentId from login if available
    };
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
}

// ✅ NEW INTERFACES FOR HALL TICKET
export interface ExamSession {
  sessionId: number;
  sessionName: string;
}

export interface HallTicketOption {
  id: number; // This is the hallTicketId needed for download
  title: string;
}


// --- API Client and Interceptors ---
export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers['Authorization'] = token as AxiosHeaderValue;
    }
    console.log(`[API Request] --> ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error: any) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        console.log('[Token Refresh] Token expired. Trying to refresh...');
        try {
          const credsString = await AsyncStorage.getItem(USER_CREDENTIALS_KEY);
          if (!credsString) {
            console.error('[Token Refresh] No saved credentials found.');
            return Promise.reject(error);
          }

          const { username, password } = JSON.parse(credsString);

          const { data } = await axios.post<LoginApiResponse>(`${API_BASE_URL}/auth/login`, {
              userName: username,
              password: password,
          });

          if (data.data?.token) {
            console.log('[Token Refresh] Successfully got new token.');
            const newToken = `GlobalEducation ${data.data.token}`;
            await AsyncStorage.setItem(AUTH_TOKEN_KEY, newToken);
            
            apiClient.defaults.headers.common['Authorization'] = newToken;
            originalRequest.headers['Authorization'] = newToken;
           
            return apiClient(originalRequest);
          } else {
            throw new Error(data.message || 'Token refresh failed.');
          }
        } catch (refreshError: any) {
          console.error('[Token Refresh] CRITICAL: Failed to refresh token.', refreshError.message);
          await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_CREDENTIALS_KEY]);
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
  }
);

// Helper function to handle errors
const handleError = (error: any, functionName: string): Error => {
    if (axios.isAxiosError(error)) {
        console.error(`❌ [API Error] in ${functionName}:`, {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url,
        });

        let userMessage = 'An API error occurred.';
        if (error.response?.data) {
            const errorData = error.response.data;
            if (errorData.error && typeof errorData.error.reason === 'string') {
                userMessage = errorData.error.reason;
            } else if (typeof errorData.message === 'string') {
                userMessage = errorData.message;
            } else {
                 userMessage = `Request failed with status ${error.response.status}`;
            }
        } else {
            userMessage = error.message;
        }
        return new Error(userMessage);
    } else {
        console.error(`❌ [Non-API Error] in ${functionName}:`, error.message);
        return new Error(error.message || 'An unexpected error occurred.');
    }
};


// --- API Functions ---

export const login = async (username: string, password: string): Promise<any> => {
    const lockoutTimestampStr = await AsyncStorage.getItem(LOCKOUT_TIMESTAMP_KEY);
    if (lockoutTimestampStr) {
        const lockoutTimestamp = parseInt(lockoutTimestampStr, 10);
        const now = Date.now();
        if (now < lockoutTimestamp) {
            const remainingMinutes = Math.ceil((lockoutTimestamp - now) / (60 * 1000));
            throw new Error(`Too many failed attempts. Please try again in ${remainingMinutes} minutes.`);
        } else {
            await AsyncStorage.removeItem(LOCKOUT_TIMESTAMP_KEY);
            await AsyncStorage.removeItem(LOGIN_ATTEMPTS_KEY);
        }
    }

    try {
        const { data } = await axios.post<LoginApiResponse>(`${API_BASE_URL}/auth/login`, {
            userName: username,
            password: password
        });

        if (data.data?.token) {
            await AsyncStorage.removeItem(LOGIN_ATTEMPTS_KEY);
            
            const authorizationHeader = `GlobalEducation ${data.data.token}`;
            await AsyncStorage.setItem(AUTH_TOKEN_KEY, authorizationHeader);
            await AsyncStorage.setItem(USER_CREDENTIALS_KEY, JSON.stringify({ username, password }));
            
            // Store Student ID if available (often needed for Hall Ticket)
            if (data.data.studentId) {
                await AsyncStorage.setItem('studentId', data.data.studentId.toString());
            }

            apiClient.defaults.headers.common['Authorization'] = authorizationHeader;
            return data.data; // Return full data object to get studentId
        }
        
        const errMsg = (axios.isAxiosError(data) && data.response?.data?.error?.reason) 
                     ? data.response.data.error.reason 
                     : (data.message || 'Login failed due to an unknown error.');
        throw new Error(errMsg);
    } catch (err: any) {
         if (axios.isAxiosError(err)) {
            const attemptsStr = await AsyncStorage.getItem(LOGIN_ATTEMPTS_KEY);
            const currentAttempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
            const newAttempts = currentAttempts + 1;

            if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
                const lockoutUntil = Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000;
                await AsyncStorage.setItem(LOCKOUT_TIMESTAMP_KEY, lockoutUntil.toString());
                await AsyncStorage.removeItem(LOGIN_ATTEMPTS_KEY);
                throw new Error(`Too many failed attempts. You are locked out for ${LOCKOUT_DURATION_MINUTES} minutes.`);
            } else {
                await AsyncStorage.setItem(LOGIN_ATTEMPTS_KEY, newAttempts.toString());
            }
        }
        throw handleError(err, 'login');
    }
};

export const logout = async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem('studentId');
    delete apiClient.defaults.headers.common['Authorization'];
};

const getFormattedDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getWeeklySchedule = async (): Promise<TimetableEvent[]> => {
    try {
        const startDateObj = new Date();
        const endDateObj = new Date();
        endDateObj.setDate(startDateObj.getDate() + 6);

        const weekStartDate = getFormattedDate(startDateObj);
        const weekEndDate = getFormattedDate(endDateObj);

        const url = `/student/schedule/class?weekEndDate=${weekEndDate}&weekStartDate=${weekStartDate}`;
        const response = await apiClient.get<ApiResponse<TimetableEvent[]>>(url);
        
        if (response.data?.data) {
              return response.data.data;
        } else {
            throw new Error(response.data.message || "Failed to get weekly schedule.");
        }
    } catch (err) {
        throw handleError(err, 'getWeeklySchedule');
    }
};

export const getDashboardAttendance = async (): Promise<DashboardAttendance> => {
    try {
        const response = await apiClient.get<ApiResponse<DashboardAttendance>>('/student/dashboard/attendance');
        if (response.data?.data) {
            return response.data.data;
        } else {
            throw new Error(response.data.message || "Failed to get dashboard attendance.");
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
            throw new Error(response.data.message || "Failed to get registered courses.");
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
            console.log('[Debug] "getAttendanceAndDetails" received a response without a data payload:', response.data);
            throw new Error(response.data.message || "No attendance details found in the API response.");
        }
    } catch (err) {
        throw handleError(err, 'getAttendanceAndDetails');
    }
};

export const getLectureWiseAttendance = async (params: { studentId: number; courseId: number; courseCompId: number }): Promise<Lecture[]> => {
    try {
        interface LectureApiResponse {
          data: LectureWiseAttendance[];
          message?: string;
        }
        const response = await apiClient.post<LectureApiResponse>(
            '/attendance/schedule/student/course/attendance/percentage', 
            params
        );
        
        if (response.data?.data?.[0]?.lectureList) {
            return response.data.data[0].lectureList;
        } else {
            return [];
        }
    } catch (err) {
        throw handleError(err, 'getLectureWiseAttendance');
    }
};

export const getExamSchedule = async (): Promise<ExamSchedule[]> => {
    try {
         interface ExamApiResponse {
            data: ExamSchedule[];
            message?: string;
         }
        const response = await apiClient.get<ExamApiResponse>('/exam/schedule/student/exams');
        if (response.data?.data) {
            return response.data.data;
        } else {
             return [];
        }
    } catch (err: any) {
        // Updated generic check for Exam schedule to return empty array on 400
        const errorString = JSON.stringify(err);
        if (errorString.includes("Exams are not scheduled yet") || errorString.includes("400 BAD_REQUEST0001")) {
            return [];
        }
        throw handleError(err, 'getExamSchedule');
    }
};

// ==========================================
// ✅ HALL TICKET DOWNLOAD FUNCTIONS (NEW)
// ==========================================

// 1. Get Exam Session ID
export const getExamSession = async (studentId: string | number): Promise<ExamSession[]> => {
    try {
        interface SessionApiResponse {
            data: ExamSession[];
        }
        const response = await apiClient.get<SessionApiResponse>(`/exam/form/session/config/getById/student/${studentId}`);
        
        // ✅ Ab hum poora array return karenge, sirf pehla item nahi
        if (response.data?.data) {
            return response.data.data; 
        }
        return [];
    } catch (err) {
        throw handleError(err, 'getExamSession');
    }
};

// 2. Get Hall Ticket Options (e.g., MSE2 HALL TICKET)
export const getHallTicketOptions = async (sessionId: number): Promise<HallTicketOption[]> => {
    try {
        interface OptionsApiResponse {
            data: HallTicketOption[];
        }
        // URL from your prompt: /exam/hall-ticket/student/download/options/6
        const response = await apiClient.get<OptionsApiResponse>(`/exam/hall-ticket/student/download/options/${sessionId}`);
        
        if (response.data?.data) {
            return response.data.data;
        }
        return [];
    } catch (err) {
        throw handleError(err, 'getHallTicketOptions');
    }
};

// 3. Download the actual PDF
// Note: Returns the PATH where the file is saved
export const downloadHallTicketPDF = async (hallTicketId: number, title: string): Promise<string> => {
    try {
        // 1. Get Token manually for BlobUtil
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) throw new Error("User not authenticated");

        // 2. Prepare Path
        const { dirs } = RNBlobUtil.fs;
        const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_'); // Remove spaces/special chars
        const fileName = `${cleanTitle}.pdf`;
        const filePath = Platform.OS === 'ios' 
            ? `${dirs.DocumentDir}/${fileName}` 
            : `${dirs.DownloadDir}/${fileName}`;

        // 3. Prepare URL
        const url = `${API_BASE_URL}/report/pdf/exam/student/hall-ticket/download/${hallTicketId}`;

        console.log(`[Download] Starting download: ${url}`);

        // 4. Use RNBlobUtil to download (Axios alone is bad for file saving)
        const res = await RNBlobUtil.config({
            fileCache: true,
            addAndroidDownloads: {
                useDownloadManager: true, // Show in Android notification bar
                notification: true,
                path: filePath,
                description: 'Downloading Hall Ticket...',
                mime: 'application/pdf',
                mediaScannable: true,
            },
            path: filePath, // iOS path
        }).fetch('GET', url, {
            'Authorization': token, // Pass the auth token header
        });

        console.log(`[Download] Success. Path: ${res.path()}`);
        return res.path();

    } catch (err: any) {
        console.error("Download Error:", err);
        throw new Error(err.message || "Failed to download Hall Ticket PDF");
    }
};