import { create } from 'zustand';
import { vi } from './vi';
import { en } from './en';
import { useAuthStore } from '../store/useAuthStore';
import { authService } from '../services/auth.service';

export type Language = 'vi' | 'en';

const dictionaries = { vi, en };

const LANG_STORAGE_KEY = 'goalcalendar_language';

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const getNestedValue = (obj: any, path: string): string | undefined => {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
};

export const useI18n = create<I18nState>((set, get) => {
  // Read initial language: localStorage -> user setting -> 'vi'
  let initialLang: Language = 'vi';
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY) as Language;
    if (saved === 'vi' || saved === 'en') {
      initialLang = saved;
    } else {
      const user = useAuthStore.getState().user;
      if (user?.settings?.language === 'en') {
        initialLang = 'en';
      }
    }
  } catch {
    initialLang = 'vi';
  }

  return {
    language: initialLang,

    setLanguage: async (lang: Language) => {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
      set({ language: lang });

      // Synchronize with server if logged in
      const user = useAuthStore.getState().user;
      if (user) {
        try {
          const updated = await authService.updateSettings({ language: lang });
          useAuthStore.getState().updateUser(updated);
        } catch (e) {
          console.warn('[i18n] Failed to persist language to user settings on server', e);
        }
      }
    },

    t: (key: string, params?: Record<string, string | number>): string => {
      const currentLang = get().language;
      const dict = dictionaries[currentLang] || dictionaries.vi;

      let value = getNestedValue(dict, key);
      // Fallback to vi if not found in en
      if (value === undefined && currentLang !== 'vi') {
        value = getNestedValue(dictionaries.vi, key);
      }
      // Fallback to key itself
      if (value === undefined) {
        return key;
      }

      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }

      return value;
    },
  };
});
