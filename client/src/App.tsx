import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { TasksPage } from './pages/TasksPage';
import { GoalsPage } from './pages/GoalsPage';
import { CalendarPage } from './pages/CalendarPage';
import { InsightsPage } from './pages/InsightsPage';
import { LearnDecksPage } from './features/learn/pages/LearnDecksPage';
import { LearnCardsPage } from './features/learn/pages/LearnCardsPage';
import { LearnReviewPage } from './features/learn/pages/LearnReviewPage';
import { LearnChatPage } from './features/learn/pages/LearnChatPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { PublicRoute } from './components/common/PublicRoute';
import { AppLayout } from './components/layout/AppLayout';
import { useAuthStore } from './store/useAuthStore';
import { useI18n } from './i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  const { user } = useAuthStore();

  useEffect(() => {
    // Run authentication initialization and session synchronization on app mount
    useAuthStore.getState().initializeAuth();
  }, []);

  useEffect(() => {
    // Synchronize language setting from user profile if not customized in localStorage
    const savedLang = localStorage.getItem('goalcalendar_language');
    if (!savedLang && user?.settings?.language) {
      useI18n.getState().setLanguage(user.settings.language as 'vi' | 'en');
    }
  }, [user?.settings?.language]);

  useEffect(() => {
    // Apply user theme preference (light, dark, or system)
    const applyTheme = () => {
      const theme = user?.settings?.theme || 'light';
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    if (user?.settings?.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [user?.settings?.theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes (redirect to / if already logged in) */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected Routes inside AppLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/learn" element={<Navigate to="/learn/decks" replace />} />
              <Route path="/learn/decks" element={<LearnDecksPage />} />
              <Route path="/learn/cards" element={<LearnCardsPage />} />
              <Route path="/learn/review" element={<LearnReviewPage />} />
              <Route path="/learn/review/:deckId" element={<LearnReviewPage />} />
              <Route path="/learn/chat" element={<LearnChatPage />} />
              <Route path="/chat" element={<Navigate to="/learn/chat" replace />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
