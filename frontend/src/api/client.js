import axios from 'axios';

// Pulls from Vite's environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. REQUEST INTERCEPTOR: Automatically attach the JWT token if it exists
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. RESPONSE INTERCEPTOR: Catch 401 Unauthorized errors globally
apiClient.interceptors.response.use(
  (response) => {
    // If the request succeeds, just return the response normally
    return response;
  },
  (error) => {
    // If the backend says the token is expired or invalid
    if (error.response && error.response.status === 401) {
      console.warn("Session expired. Redirecting to login...");
      localStorage.removeItem('access_token');
      window.location.href = '/login'; // Hard redirect to wipe React state
    }
    return Promise.reject(error);
  }
);