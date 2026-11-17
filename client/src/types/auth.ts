export interface UserSettings {
  language: 'vi' | 'en';
  theme: 'light' | 'dark' | 'system';
  weekStartsOn: 0 | 1;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  settings: UserSettings;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthResponseData {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
