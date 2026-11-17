import React, { useState } from 'react';
import {
  Sun,
  Moon,
  LogOut,
  Menu,
  Languages,
  Keyboard,
  Bell,
  Download,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../services/auth.service';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { useI18n } from '../../i18n';
import { ShortcutsModal } from '../common/ShortcutsModal';
import { ExportModal } from '../common/ExportModal';
import { NotificationModal } from '../common/NotificationModal';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuthStore();
  const { language, setLanguage, t } = useI18n();

  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const handleLogout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    await authService.logout(refreshToken || undefined);
    logout();
    navigate('/login');
  };

  const handleToggleTheme = async () => {
    const currentTheme = user?.settings?.theme || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    try {
      const updated = await authService.updateSettings({ theme: nextTheme });
      updateUser(updated);
    } catch {
      document.documentElement.classList.toggle('dark');
    }
  };

  const handleToggleLanguage = async () => {
    const nextLang = language === 'vi' ? 'en' : 'vi';
    await setLanguage(nextLang);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('header.morningGreeting');
    if (hour < 18) return t('header.afternoonGreeting');
    return t('header.eveningGreeting');
  };

  const isDark =
    user?.settings?.theme === 'dark' ||
    (user?.settings?.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const todayFormatted = new Date().toLocaleDateString(locale, {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <>
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center space-x-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
              title="Đóng / mở thanh điều hướng"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {getGreeting()},{' '}
              <span className="text-indigo-600 dark:text-indigo-400">{user?.name}</span>!
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
              {t('header.todayLabel')}: {todayFormatted}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Language Switch Button (VI / EN) */}
          <button
            onClick={handleToggleLanguage}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-indigo-400 transition-all shadow-2xs"
            title={language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          >
            <Languages className="w-3.5 h-3.5 text-indigo-500" />
            <span>{language === 'vi' ? 'VI 🇻🇳' : 'EN 🇬🇧'}</span>
          </button>

          {/* Export Data Button */}
          <button
            onClick={() => setIsExportOpen(true)}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t('header.exportData')}
          >
            <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>

          {/* Browser Notifications Button */}
          <button
            onClick={() => setIsNotificationOpen(true)}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t('header.notifications')}
          >
            <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>

          {/* Keyboard Shortcuts Button */}
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t('header.shortcuts')}
          >
            <Keyboard className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={handleToggleTheme}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDark ? t('header.toggleThemeLight') : t('header.toggleThemeDark')}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </button>

          {/* User initials & Logout */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'GC'}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 p-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline ml-1.5">{t('header.logout')}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Auxiliary Modals */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
    </>
  );
};
