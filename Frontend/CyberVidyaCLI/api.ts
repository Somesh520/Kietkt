import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { InternalAxiosRequestConfig, AxiosHeaderValue } from 'axios';

// Base URL ab seedhe Cyber Vidhya ka hai
const API_BASE_URL = "https://kiet.cybervidya.net/api";
const AUTH_TOKEN_KEY = 'authToken';
const USER_CREDENTIALS_KEY = 'userCredentials';

// Rate Limiting Constants
const MAX_LOGIN_ATTEMPTS = 5; // CyberVidhya 5 attempts deta hai, so keeping it 5
const LOCKOUT_DURATION_MINUTES = 5; // Standard lockout time
const LOGIN_ATTEMPTS_KEY = 'loginAttempts';
const LOCKOUT_TIMESTAMP_KEY = 'lockoutTimestamp';


// --- Interfaces (No changes needed) ---
export interface UserDetails {
  fullName: string;
  registrationNumber: string;
  rollNumber: string;
  branchShortName: string;
  degreeName: string;
  semesterName: string;
  admissionBatchName: string;
  attendanceCourseComponentInfoList: any[];
}
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
    message?: string; // CyberVidhya 'error' ke bajaye 'message' bhej sakta hai
}
interface LoginApiResponse {
    success: boolean;
    data: {
        token: string;
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
  strExamDate: string;           // Exam ki date ya date range
  courseName: string;            // Subject ka naam
  evalLevelComponentName: string; // Exam ka type (jaise "CA2", "MSE", "Main")
  courseCode: string;            // Subject code
  strExamTime: string | null;    // Exam ka time (e.g., "09:00 AM - 12:00 PM")
  examMode: string;              // "Offline" ya "Online"
  examVenueName: string;         // Exam center
  courseComponentName: string;   // "THEORY", "PRACTICAL", etc.
}
// --- API Client and Interceptors ---
export const apiClient = axios.create({ baseURL: API_BASE_URL });

// Request Interceptor: Debugging ke liye request ko log karta hai
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers['Authorization'] = token as AxiosHeaderValue;
    }
    // Debugging ke liye: Har request ka URL log karein
    console.log(`[API Request] --> ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error: any) => Promise.reject(error)
);

// Response Interceptor: Token expire hone par automatically naya token fetch karta hai
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

          if (data.data?.token) { // Check for token directly
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

// Helper function to handle and log errors consistently
const handleError = (error: any, functionName: string): Error => {
    if (axios.isAxiosError(error)) {
        // Log the full error object for debugging
        console.error(`❌ [API Error] in ${functionName}:`, {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url,
        });

        // Extract a user-friendly error message string to prevent [object Object]
        let userMessage = 'An API error occurred.';
        if (error.response?.data) {
            const errorData = error.response.data;
            // Specific path for CyberVidhya login attempt errors
            if (errorData.error && typeof errorData.error.reason === 'string') {
                userMessage = errorData.error.reason;
            } 
            // Generic fallback for other messages
            else if (typeof errorData.message === 'string') {
                userMessage = errorData.message;
            }
            else {
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


// --- API Functions (Updated with Rate Limiting) ---

export const login = async (username: string, password: string): Promise<string> => {
    // 1. Check if user is currently locked out
    const lockoutTimestampStr = await AsyncStorage.getItem(LOCKOUT_TIMESTAMP_KEY);
    if (lockoutTimestampStr) {
        const lockoutTimestamp = parseInt(lockoutTimestampStr, 10);
        const now = Date.now();
        if (now < lockoutTimestamp) {
            const remainingMinutes = Math.ceil((lockoutTimestamp - now) / (60 * 1000));
            throw new Error(`Too many failed attempts. Please try again in ${remainingMinutes} minutes.`);
        } else {
            // Lockout has expired, clear the stored values
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
            // On successful login, reset the attempt counter
            await AsyncStorage.removeItem(LOGIN_ATTEMPTS_KEY);
            
            const authorizationHeader = `GlobalEducation ${data.data.token}`;
            await AsyncStorage.setItem(AUTH_TOKEN_KEY, authorizationHeader);
            await AsyncStorage.setItem(USER_CREDENTIALS_KEY, JSON.stringify({ username, password }));
            
            apiClient.defaults.headers.common['Authorization'] = authorizationHeader;
            return authorizationHeader;
        }
        // Throw error for login failure which will be caught below
        // Use the 'reason' field if available for attempt count messages
        const errMsg = (axios.isAxiosError(data) && data.response?.data?.error?.reason) 
                     ? data.response.data.error.reason 
                     : (data.message || 'Login failed due to an unknown error.');
        throw new Error(errMsg);
    } catch (err: any) {
        // 2. Handle failed login attempt IF it's an Axios error (network/status code error)
         if (axios.isAxiosError(err)) {
            const attemptsStr = await AsyncStorage.getItem(LOGIN_ATTEMPTS_KEY);
            const currentAttempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
            const newAttempts = currentAttempts + 1;

            if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
                // Lock the user out
                const lockoutUntil = Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000;
                await AsyncStorage.setItem(LOCKOUT_TIMESTAMP_KEY, lockoutUntil.toString());
                await AsyncStorage.removeItem(LOGIN_ATTEMPTS_KEY); // Clear attempts on lockout
                throw new Error(`Too many failed attempts. You are locked out for ${LOCKOUT_DURATION_MINUTES} minutes.`);
            } else {
                // Save the new attempt count
                await AsyncStorage.setItem(LOGIN_ATTEMPTS_KEY, newAttempts.toString());
            }
        }
        
        // Let the generic handler process and throw the final error
        throw handleError(err, 'login');
    }
};

export const logout = async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
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
        
        // Check if the API call was successful but there's no data payload
        if (response.data?.data) {
            return response.data.data;
        } else {
            // Log the entire response data for debugging "no data" scenarios
            console.log('[Debug] "getAttendanceAndDetails" received a response without a data payload:', response.data);
            // Throw an error with the message from the API, or a default one
            throw new Error(response.data.message || "No attendance details found in the API response.");
        }
    } catch (err) {
        // The handleError function will catch and log Axios errors or the error thrown above
        throw handleError(err, 'getAttendanceAndDetails');
    }
};

// ******** MODIFIED FUNCTION ********
export const getLectureWiseAttendance = async (params: { studentId: number; courseId: number; courseCompId: number }): Promise<Lecture[]> => {
    try {
        // Define the expected response structure directly based on the JSON payload provided
        // It's an object containing a 'data' array, where the first element holds the 'lectureList'
        interface LectureApiResponse {
          data: LectureWiseAttendance[]; // Array containing lecture details including lectureList
          message?: string; // Optional message field
          // No 'success' flag here
        }

        // Make the API call expecting the LectureApiResponse structure
        const response = await apiClient.post<LectureApiResponse>(
            '/attendance/schedule/student/course/attendance/percentage', 
            params
        );
        
        // Check if the nested lectureList array exists within the first element of the 'data' array
        if (response.data?.data?.[0]?.lectureList) {
            console.log(`[Debug] Found ${response.data.data[0].lectureList.length} lectures for courseCompId: ${params.courseCompId}`);
            return response.data.data[0].lectureList;
        } else {
            // Log for debugging if the structure is not what we expect or lectureList is empty/missing
            console.log('[Debug] "getLectureWiseAttendance" did not find lectureList in the expected location within the response:', JSON.stringify(response.data, null, 2));
            return []; // Return empty array if no lectures are found or data structure is wrong
        }
    } catch (err) {
        // Let the generic handler log the error details and throw a user-friendly error
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
            console.log(`[Debug] Found ${response.data.data.length} exam schedule entries.`);
            return response.data.data;
        } else {
             console.log('[Debug] "getExamSchedule" did not find data array in the response:', JSON.stringify(response.data, null, 2));
             return [];
        }
    } catch (err) {
        throw handleError(err, 'getExamSchedule');
    }
};