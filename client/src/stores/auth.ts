import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types/api';
import { api } from '../lib/api';

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setSession: (token: string, user: AuthUser) => void;
  clearSession: () => void;
  login: (matricule: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setSession: (token, user) => {
        localStorage.setItem('freehall_token', token);
        localStorage.setItem('freehall_user', JSON.stringify(user));
        set({ token, user, isAuthenticated: true });
      },

      clearSession: () => {
        localStorage.removeItem('freehall_token');
        localStorage.removeItem('freehall_user');
        set({ token: null, user: null, isAuthenticated: false });
      },

      login: async (matricule, password) => {
        const { data } = await api.post<{ token: string; user: AuthUser }>(
          '/api/auth/login',
          { matricule, password }
        );
        localStorage.setItem('freehall_token', data.token);
        localStorage.setItem('freehall_user', JSON.stringify(data.user));
        set({ token: data.token, user: data.user, isAuthenticated: true });
        return data.user;
      },

      logout: () => {
        localStorage.removeItem('freehall_token');
        localStorage.removeItem('freehall_user');
        set({ token: null, user: null, isAuthenticated: false });
      },

      refreshMe: async () => {
        const { data } = await api.get<{ user: AuthUser }>('/api/auth/me');
        localStorage.setItem('freehall_user', JSON.stringify(data.user));
        set({ user: data.user, isAuthenticated: true });
      },
    }),
    {
      name: 'freehall_auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);