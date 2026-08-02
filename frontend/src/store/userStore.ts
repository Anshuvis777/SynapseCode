import { create } from 'zustand';
import { apiClient } from '../api/client';
import type { User } from '../types';

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, name: string, password?: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useUserStore = create<UserState>((set) => {
  // Load initial state from localStorage
  const storedUser = localStorage.getItem('devassist_user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  return {
    user,
    isAuthenticated: !!user,
    isLoading: false,
    error: null,

    login: async (email: string, name: string, password = 'password123') => {
      set({ isLoading: true, error: null });
      try {
        // 1. Try to register the user. If they already exist (409 Conflict), ignore and proceed to login.
        try {
          await apiClient.post('/auth/register', {
            email,
            name,
            password,
          });
        } catch (regErr: any) {
          // If the status is not 409, it might be another issue (e.g. database down, validation error),
          // but we still try to proceed to login in case the credentials are valid.
          if (regErr.status !== 409 && regErr.originalError?.response?.status !== 409) {
            console.warn('Registration warning:', regErr);
          }
        }

        // 2. Authenticate the user and retrieve the access token
        const loginRes = await apiClient.post('/auth/login', {
          email,
          password,
        });
        const accessToken = loginRes.data.access_token;

        // 3. Fetch the authenticated user profile details from /auth/me
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
        const errMsg = err.message || 'Failed to authenticate user';
        set({ error: errMsg, isLoading: false });
        return false;
      }
    },

    logout: () => {
      localStorage.removeItem('devassist_user');
      set({ user: null, isAuthenticated: false });
    },

    clearError: () => set({ error: null }),
  };
});
