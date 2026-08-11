import { create } from 'zustand';
import { apiClient } from '../api/client';
import type { User } from '../types';

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  updateProfile: (name: string, email: string, llmProvider?: 'groq' | 'openai', groqApiKey?: string, openaiApiKey?: string) => void;
  registerUser: (email: string, name: string, password?: string) => Promise<boolean>;
}

export const useUserStore = create<UserState>((set, get) => {
  // Load initial state from localStorage
  const storedUser = localStorage.getItem('devassist_user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  return {
    user,
    isAuthenticated: !!user,
    isLoading: false,
    error: null,

    login: async (email: string, password = 'password123') => {
      set({ isLoading: true, error: null });
      try {
        // 1. Authenticate the user and retrieve the access token
        const loginRes = await apiClient.post('/auth/login', {
          email,
          password,
        });
        const accessToken = loginRes.data.access_token;

        // 2. Fetch the authenticated user profile details from /auth/me
        const meRes = await apiClient.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const meData = meRes.data;

        const newUser: User = {
          id: meData.id,
          email: meData.email,
          name: meData.name,
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(meData.email)}`,
          token: accessToken,
        };

        localStorage.setItem('devassist_user', JSON.stringify(newUser));
        set({ user: newUser, isAuthenticated: true, isLoading: false });
        return true;
      } catch (err: any) {
        console.error('Authentication error:', err);
        const errMsg = err.response?.data?.detail || err.message || 'Failed to authenticate user';
        set({ error: errMsg, isLoading: false });
        return false;
      }
    },

    registerUser: async (email: string, name: string, password = 'password123') => {
      set({ isLoading: true, error: null });
      try {
        await apiClient.post('/auth/register', {
          email,
          name,
          password,
        });
        // Log in immediately on successful registration
        return await get().login(email, password);
      } catch (err: any) {
        console.error('Registration error:', err);
        const errMsg = err.response?.data?.detail || err.message || 'Registration failed';
        set({ error: errMsg, isLoading: false });
        return false;
      }
    },

    logout: () => {
      localStorage.removeItem('devassist_user');
      set({ user: null, isAuthenticated: false });
    },

    updateProfile: (name: string, email: string, llmProvider?: 'groq' | 'openai', groqApiKey?: string, openaiApiKey?: string) => {
      set((state) => {
        if (!state.user) return state;
        const updatedUser = {
          ...state.user,
          name,
          email,
          llmProvider,
          groqApiKey,
          openaiApiKey,
          apiKey: llmProvider === 'openai' ? openaiApiKey : groqApiKey,
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(email)}`,
        };
        localStorage.setItem('devassist_user', JSON.stringify(updatedUser));
        return { user: updatedUser };
      });
    },

    clearError: () => set({ error: null }),
  };
});
