import { create } from 'zustand';
import type { User } from '../types/auth';
import { authService } from '../services/auth.service';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  initializeAuth: () => Promise<void>;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  setInitializing: (val: boolean) => void;
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'gc_access_token',
  REFRESH_TOKEN: 'gc_refresh_token',
  USER: 'gc_user',
};

export const useAuthStore = create<AuthState>((set, get) => {
  // Read initial stored values safely
  const initialAccessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const initialRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  let initialUser: User | null = null;
  try {
    const rawUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (rawUser) {
      initialUser = JSON.parse(rawUser);
    }
  } catch {
    initialUser = null;
  }

  const hasStoredCredentials = Boolean(initialAccessToken || initialRefreshToken);

  return {
    user: initialUser,
    accessToken: initialAccessToken,
    refreshToken: initialRefreshToken,
    isAuthenticated: Boolean(initialAccessToken && initialUser),
    isInitializing: hasStoredCredentials,

    initializeAuth: async () => {
      const state = get();
      if (!state.accessToken && !state.refreshToken) {
        set({ isInitializing: false, isAuthenticated: false });
        return;
      }

      set({ isInitializing: true });
      try {
        const user = await authService.getMe();
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        set({
          user,
          isAuthenticated: true,
          isInitializing: false,
        });
      } catch {
        // Both initial getMe and auto-refresh failed
        get().logout();
        set({ isInitializing: false });
      }
    },

    setAuth: (user, accessToken, refreshToken) => {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
      });
    },

    setTokens: (accessToken, refreshToken) => {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
      set({
        accessToken,
        refreshToken: refreshToken || get().refreshToken,
        isAuthenticated: Boolean(accessToken && get().user),
      });
    },

    updateUser: (updatedFields) => {
      const currentUser = get().user;
      if (!currentUser) return;
      const newUser = { ...currentUser, ...updatedFields };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
      set({ user: newUser });
    },

    logout: () => {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
    },

    setInitializing: (val) => set({ isInitializing: val }),
  };
});
