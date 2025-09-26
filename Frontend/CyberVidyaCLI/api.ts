// api.ts (Fully updated to English)

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { InternalAxiosRequestConfig, AxiosHeaderValue } from 'axios';

const API_BASE_URL = "https://kietkt.onrender.com/api";
const AUTH_TOKEN_KEY = 'authToken';
const USER_CREDENTIALS_KEY = 'userCredentials';

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
}
interface LoginResponse {
    success: boolean;
    authorization: string;
    error?: string;
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
  planLecDate: string; // "2025-09-15"
  topicCovered: string | null;
  attendance: 'PRESENT' | 'ABSENT' | string;
  timeSlot: string; // "10:00 AM - 10:50 AM"
}

// Interface for the lecture-wise attendance API response
export interface LectureWiseAttendance {
  presentCount: number;
  lectureCount: number;
  percent: number;
  lectureList: Lecture[];
}

// --- API Client and Interceptors ---
export const apiClient = axios.create({ baseURL: API_BASE_URL });

// Request Interceptor: Attaches the auth token to every request
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      // Set the Authorization header
      config.headers['Authorization'] = token as AxiosHeaderValue;
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

// Response Interceptor: Handles token expiration and refresh
apiClient.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
      const originalRequest = error.config;
      // If the token is expired (status 401) and we haven't retried yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          // Get saved user credentials
          const credsString = await AsyncStorage.getItem(USER_CREDENTIALS_KEY);
          if (!credsString) return Promise.reject(error);

          const { username, password } = JSON.parse(credsString);

          // Request a new session token
          const { data } = await axios.post<LoginResponse>(`${API_BASE_URL}/get-session`, { username, password });
          if (data.success && data.authorization) {
            const newToken = data.authorization;
            await AsyncStorage.setItem(AUTH_TOKEN_KEY, newToken);
            
            // Update the default headers and the original request's header
            apiClient.defaults.headers['Authorization'] = newToken as AxiosHeaderValue;
            if (originalRequest.headers) {
                originalRequest.headers['Authorization'] = newToken as AxiosHeaderValue;
            }
            // Retry the original request with the new token
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          // If token refresh fails, clear storage and reject
          await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_CREDENTIALS_KEY]);
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
  }
);

// --- API Functions ---
export const login = async (username: string, password: string) => {
    const { data } = await axios.post<LoginResponse>(`${API_BASE_URL}/get-session`, { username, password });
    if (data.success && data.authorization) {
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.authorization);
        await AsyncStorage.setItem(USER_CREDENTIALS_KEY, JSON.stringify({ username, password }));
        
        // Set the token in the default headers for subsequent requests
        apiClient.defaults.headers['Authorization'] = data.authorization as AxiosHeaderValue;
        return data.authorization;
    }
    throw new Error(data.error || 'Login failed due to an unknown error.');
};

export const logout = async () => {
    // FIX: This now only removes the auth token, preserving credentials for easier login next time.
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    delete apiClient.defaults.headers['Authorization'];
};

export const getAttendanceAndDetails = async (): Promise<UserDetails> => {
    try {
        const response = await apiClient.post<ApiResponse<{ data: UserDetails }>>('/get-detailed-attendance');
        if (response.data && response.data.success) {
            return response.data.data.data;
        } else {
            throw new Error(response.data.error || "Failed to fetch details. Please refresh.");
        }
    } catch (err: any) {
        throw new Error(err.response?.data?.error || err.message || 'A server error occurred.');
    }
};

export const getWeeklySchedule = async (): Promise<TimetableEvent[]> => {
    try {
        // Calling the new backend route for the weekly schedule
        const response = await apiClient.post<ApiResponse<{ data: TimetableEvent[] }>>('/get-weekly-schedule');
        
        if (response.data && response.data.success && response.data.data) {
              // The API response is nested within a 'data' key
              return response.data.data.data;
        } else {
            throw new Error(response.data.error || "Invalid weekly schedule data format.");
        }
    } catch (err: any) {
        throw new Error(err.response?.data?.error || err.message || 'Could not fetch weekly schedule.');
    }
};

export const getDashboardAttendance = async (): Promise<DashboardAttendance> => {
    try {
        const response = await apiClient.post<ApiResponse<{ data: DashboardAttendance }>>('/get-dashboard-attendance');
        
        if (response.data && response.data.success && response.data.data && response.data.data.data) {
            return response.data.data.data;
        } else {
            throw new Error(response.data.error || "Invalid dashboard attendance data format.");
        }
    } catch (err: any) {
        throw new Error(err.response?.data?.error || err.message || 'Could not fetch dashboard attendance.');
    }
};

export const getRegisteredCourses = async (): Promise<RegisteredCourse[]> => {
    try {
        const response = await apiClient.post<ApiResponse<{ data: RegisteredCourse[] }>>('/get-registered-courses');
        if (response.data?.success && response.data?.data?.data) {
            return response.data.data.data;
        } else {
            throw new Error(response.data.error || "Invalid registered courses data format.");
        }
    } catch (err: any) {
        throw new Error(err.response?.data?.error || err.message || 'Could not fetch registered courses.');
    }
};

// Fetches the lecture-wise attendance for a specific course component
export const getLectureWiseAttendance = async (params: { studentId: number; courseId: number; courseCompId: number }): Promise<Lecture[]> => {
    try {
        const response = await apiClient.post<ApiResponse<{ data: LectureWiseAttendance[] }>>('/get-lecture-wise-attendance', params);
        
        // Check if the nested data and the lectureList array exist
        if (response.data?.success && response.data?.data?.data?.[0]?.lectureList) {
            // FIX: Return the 'lectureList' array directly from the first element of the response data
            return response.data.data.data[0].lectureList;
        } else {
            // If no lectures are found, return an empty array to prevent the app from crashing
            console.log("No lecture list found for this course, returning empty array.");
            return [];
        }
    } catch (err: any) {
        console.error("Error fetching lecture-wise attendance:", err.message);
        throw new Error(err.response?.data?.error || err.message || 'API Error: Could not fetch lecture-wise attendance.');
    }
};