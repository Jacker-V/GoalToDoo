import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Target, AlertCircle, Languages } from 'lucide-react';
import { registerSchema, type RegisterFormValues } from '../features/auth/schemas';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/useAuthStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useI18n } from '../i18n';

export const RegisterPage: React.FC = () => {
  const { t, language, setLanguage } = useI18n();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      language: (language as 'vi' | 'en') || 'vi',
      weekStartsOn: 1,
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      const data = await authService.register({
        name: values.name,
        email: values.email,
        password: values.password,
        settings: {
          language: values.language,
          theme: 'light',
          weekStartsOn: Number(values.weekStartsOn) as 0 | 1,
        },
      });

      setAuth(data.user, data.accessToken, data.refreshToken);
      await setLanguage(values.language as 'vi' | 'en');
      navigate('/', { replace: true });
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        (language === 'vi'
          ? 'Đăng ký tài khoản không thành công. Vui lòng thử lại.'
          : 'Registration failed. Please try again.');
      setServerError(message);
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

      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-8 space-y-6">
        {/* App Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 mb-1">
            <div className="flex items-center space-x-1">
              <Calendar className="w-6 h-6" />
              <Target className="w-4 h-4 -ml-2 -mt-2 text-rose-500" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {t('auth.registerTitle')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('auth.registerSubtitle')}
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
            label={t('auth.fullName')}
            type="text"
            placeholder={t('auth.fullNamePlaceholder')}
            autoComplete="name"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label={t('auth.email')}
            type="email"
            placeholder={t('auth.emailPlaceholder')}
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('auth.password')}
              type="password"
              placeholder={t('auth.passwordPlaceholder')}
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />

            <Input
              label={t('auth.confirmPassword')}
              type="password"
              placeholder={t('auth.passwordPlaceholder')}
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('header.language')}
              </label>
              <select
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                {...register('language')}
              >
                <option value="vi">Tiếng Việt 🇻🇳</option>
                <option value="en">English 🇬🇧</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {language === 'vi' ? 'Ngày đầu tuần' : 'Week Starts On'}
              </label>
              <select
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                {...register('weekStartsOn', { valueAsNumber: true })}
              >
                <option value={1}>{language === 'vi' ? 'Thứ Hai (Monday)' : 'Monday'}</option>
                <option value={0}>{language === 'vi' ? 'Chủ Nhật (Sunday)' : 'Sunday'}</option>
              </select>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full mt-3 font-bold"
            size="lg"
            isLoading={isSubmitting}
          >
            {t('auth.registerButton')}
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link
            to="/login"
            className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            {t('auth.loginNow')}
          </Link>
        </div>
      </div>
    </div>
  );
};
