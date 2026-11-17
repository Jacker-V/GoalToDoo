import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Target, AlertCircle, Sparkles, Languages } from 'lucide-react';
import { loginSchema, type LoginFormValues } from '../features/auth/schemas';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/useAuthStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useI18n } from '../i18n';

export const LoginPage: React.FC = () => {
  const { t, language, setLanguage } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const data = await authService.login(values);
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate(from, { replace: true });
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        (language === 'vi'
          ? 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.'
          : 'Login failed. Please check your credentials.');
      setServerError(message);
    }
  };

  const handleQuickDemoLogin = async () => {
    setValue('email', 'demo@goalcalendar.com');
    setValue('password', 'password123');
    setServerError(null);
    setIsDemoLoading(true);
    try {
      const data = await authService.login({
        email: 'demo@goalcalendar.com',
        password: 'password123',
      });
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate(from, { replace: true });
    } catch (err: any) {
      setServerError(
        language === 'vi'
          ? 'Tài khoản demo chưa được tạo. Hãy chạy "npm run seed" trong terminal.'
          : 'Demo account not initialized. Please run "npm run seed" in terminal.'
      );
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 relative">
      {/* Language Switcher in corner */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs hover:border-indigo-400 transition-all cursor-pointer"
        >
          <Languages className="w-3.5 h-3.5 text-indigo-500" />
          <span>{language === 'vi' ? 'VI 🇻🇳' : 'EN 🇬🇧'}</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-8 space-y-6">
        {/* App Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 mb-1">
            <div className="flex items-center space-x-1">
              <Calendar className="w-6 h-6" />
              <Target className="w-4 h-4 -ml-2 -mt-2 text-rose-500" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            GoalCalendar
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start space-x-2.5 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label={t('auth.email')}
            type="email"
            placeholder={t('auth.emailPlaceholder')}
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label={t('auth.password')}
            type="password"
            placeholder={t('auth.passwordPlaceholder')}
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          <Button
            type="submit"
            className="w-full mt-2 font-bold"
            size="lg"
            isLoading={isSubmitting}
          >
            {t('auth.loginButton')}
          </Button>
        </form>

        {/* Demo Account Quick Access */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-center text-[11px] text-slate-400 mb-2">
            {t('auth.orQuickDemo')}
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center space-x-1.5 border-dashed border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50"
            onClick={handleQuickDemoLogin}
            isLoading={isDemoLoading}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>{t('auth.demoButton')}</span>
          </Button>
        </div>

        {/* Switch to Register */}
        <div className="text-center text-xs text-slate-500">
          {t('auth.noAccount')}{' '}
          <Link
            to="/register"
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {t('auth.registerNow')}
          </Link>
        </div>
      </div>
    </div>
  );
};
