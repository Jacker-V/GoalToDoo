import React from 'react';
import { Sun, Moon, LogOut, Menu } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../services/auth.service';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuthStore();

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
      // fallback local toggle
      document.documentElement.classList.toggle('dark');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const isDark =
    user?.settings?.theme === 'dark' ||
    (user?.settings?.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
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
            {getGreeting()}, <span className="text-indigo-600 dark:text-indigo-400">{user?.name}</span>!
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
            Hôm nay: {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Theme toggle */}
        <button
          onClick={handleToggleTheme}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
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
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 p-2">
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline ml-1.5">Đăng xuất</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
