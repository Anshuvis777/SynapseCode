import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 seconds
});

// Interceptor to automatically add JWT auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const storedUser = localStorage.getItem('devassist_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
        // Support both new 'geminiApiKey' and old 'huggingfaceApiKey' localStorage key names
        const geminiKey = user.geminiApiKey || user.huggingfaceApiKey;
        // If user provided a Gemini key — use Gemini for both LLM and embeddings
        if (geminiKey) {
          config.headers['X-Embedding-API-Key'] = geminiKey;
          config.headers['X-LLM-Provider'] = 'gemini';
          config.headers['X-LLM-API-Key'] = geminiKey;
        }
      } catch (e) {
        console.error('Error parsing stored user for auth token', e);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor for response error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Customize global error messaging here
    const status = error.response?.status;
    let message = 'An unexpected error occurred';

    if (status === 401) {
      message = 'Session expired. Please log in again.';
      // Optionally trigger logout
      localStorage.removeItem('devassist_user');
    } else if (status === 403) {
      message = 'You do not have permission to perform this action.';
    } else if (status === 404) {
      message = 'Resource not found.';
    } else if (status === 500) {
      message = 'Internal server error. Please try again later.';
    } else if (error.message === 'Network Error') {
      message = 'Network error. Please check your connection.';
    }

    // Attach custom message to error
    const customError = new Error(message);
    (customError as any).status = status;
    (customError as any).originalError = error;

    return Promise.reject(customError);
  }
);
