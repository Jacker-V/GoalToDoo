import { api } from './api';
import type { ApiResponse, AuthResponseData, User, UserSettings } from '../types/auth';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  settings?: Partial<UserSettings>;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateSettingsPayload {
  name?: string;
  language?: 'vi' | 'en';
  theme?: 'light' | 'dark' | 'system';
  weekStartsOn?: 0 | 1;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponseData> {
    const res = await api.post<ApiResponse<AuthResponseData>>('/auth/register', payload);
    return res.data.data;
  },

  async login(payload: LoginPayload): Promise<AuthResponseData> {
    const res = await api.post<ApiResponse<AuthResponseData>>('/auth/login', payload);
    return res.data.data;
  },

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', {
      refreshToken,
    });
    return res.data.data;
  },

  async logout(refreshToken?: string): Promise<void> {
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore network errors on logout
    }
  },

  async getMe(): Promise<User> {
    const res = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    return res.data.data.user;
  },

  async updateSettings(payload: UpdateSettingsPayload): Promise<User> {
    const res = await api.patch<ApiResponse<{ user: User }>>('/auth/settings', payload);
    return res.data.data.user;
  },
};
