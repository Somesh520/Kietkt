// api.ts (Poora Updated Code)

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { InternalAxiosRequestConfig, AxiosHeaderValue } from 'axios'; // AxiosHeaderValue import karein

const API_BASE_URL = "http://10.0.2.2:3000/api";
const AUTH_TOKEN_KEY = 'authToken';
const USER_CREDENTIALS_KEY = 'userCredentials';

// Interfaces... (Koi badlav nahi)
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

export const apiClient = axios.create({ baseURL: API_BASE_URL });

// Interceptors...
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      // ✅ Yahan badlav kiya gaya hai
      config.headers['Authorization'] = token as AxiosHeaderValue;
    }
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
        try {
          const credsString = await AsyncStorage.getItem(USER_CREDENTIALS_KEY);
          if (!credsString) return Promise.reject(error);
          const { username, password } = JSON.parse(credsString);
          const { data } = await axios.post<LoginResponse>(`${API_BASE_URL}/get-session`, { username, password });
          if (data.success && data.authorization) {
            const newToken = data.authorization;
            await AsyncStorage.setItem(AUTH_TOKEN_KEY, newToken);
            // ✅ Yahan badlav kiya gaya hai
            apiClient.defaults.headers['Authorization'] = newToken as AxiosHeaderValue;
            if (originalRequest.headers) {
                originalRequest.headers['Authorization'] = newToken as AxiosHeaderValue;
            }
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
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
        // ✅ Yahan badlav kiya gaya hai
        apiClient.defaults.headers['Authorization'] = data.authorization as AxiosHeaderValue;
        return data.authorization;
    }
    throw new Error(data.error || 'Login failed');
};

export const logout = async () => {
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_CREDENTIALS_KEY]);
    // ✅ Yahan badlav kiya gaya hai (Line 94)
    delete apiClient.defaults.headers['Authorization'];
};

export const getAttendanceAndDetails = async (): Promise<UserDetails> => {
    try {
        const response = await apiClient.post<ApiResponse<{ data: UserDetails }>>('/get-detailed-attendance');
        if (response.data && response.data.success) {
            return response.data.data.data;
        } else {
            throw new Error(response.data.error || "Data fetch nahi ho saka.");
        }
    } catch (err: any) {
        throw new Error(err.response?.data?.error || err.message || 'API se data fetch karne mein error aaya.');
    }
};

// export const getUpcomingClasses = async (): Promise<TimetableEvent[]> => {
//     try {
//         // Aapke backend ka response structure hai: { success: true, data: { data: [...] } }
//         // Isliye humein response.data.data.data se array nikalna hoga.
//         const response = await apiClient.post<ApiResponse<{ data: TimetableEvent[] }>>('/get-upcoming-classes');
        
//         if (response.data && response.data.success && response.data.data.data) {
//             return response.data.data.data;
//         } else {
//             // Agar data.data property nahi milti hai to fallback
//             throw new Error(response.data.error || "Timetable data ka format galat hai.");
//         }
//     } catch (err: any) {
//         throw new Error(err.response?.data?.error || err.message || 'API se timetable fetch karne mein error aaya.');
//     }
// };

export const getWeeklySchedule = async (): Promise<TimetableEvent[]> => {
    try {
        // ✅ Naye backend route ko call kiya ja raha hai
        const response = await apiClient.post<ApiResponse<{ data: TimetableEvent[] }>>('/get-weekly-schedule');
        
        if (response.data && response.data.success && response.data.data) {
            // Cybervidya ka response 'data' key ke andar hai
              return response.data.data.data;
        } else {
            throw new Error(response.data.error || "Weekly schedule ka format galat hai.");
        }
    } catch (err: any) {
        throw new Error(err.response?.data?.error || err.message || 'API se weekly schedule fetch karne mein error aaya.');
    }
};