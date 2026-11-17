import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  CheckSquare,
  AlertTriangle,
  Flame,
  ArrowRight,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, isSameDay } from 'date-fns';
import { vi as dfVi } from 'date-fns/locale';

import { useAuthStore } from '../store/useAuthStore';
import { useI18n } from '../i18n';
import { taskService } from '../services/task.service';
import { goalService } from '../services/goal.service';
import { calendarService } from '../services/calendar.service';
import { statsService } from '../services/stats.service';
import type { Task, Subtask } from '../types/task';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ProgressRing } from '../components/ui/ProgressRing';
import { TaskItem } from '../components/tasks/TaskItem';
import { MiniCalendar } from '../components/calendar/MiniCalendar';
import { ActivityWeeklyBarChart } from '../components/charts/ActivityWeeklyBarChart';
import { CardSkeleton, Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { toast } from '../store/useToastStore';
import { getTodayLocalDateString } from '../utils/date';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { language, t } = useI18n();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const todayStr = getTodayLocalDateString();

  // Listen to keyboard shortcut T (jump to today)
  useEffect(() => {
    const handleJumpToday = () => {
      setSelectedDate(new Date());
    };
    window.addEventListener('gc-jump-today', handleJumpToday);
    return () => window.removeEventListener('gc-jump-today', handleJumpToday);
  }, []);

  // Queries
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskService.getTasks(),
  });

  const { data: goals = [], isLoading: isGoalsLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalService.getGoals(),
  });

  const { data: todayCalendar } = useQuery({
    queryKey: ['calendarToday', todayStr],
    queryFn: () => calendarService.getCalendarData(todayStr, todayStr),
  });

  // 3 Periods Progress Ring Queries
  const { data: weekStats } = useQuery({
    queryKey: ['statsSummary', 'week'],
    queryFn: () => statsService.getSummary('week'),
  });

  const { data: monthStats } = useQuery({
    queryKey: ['statsSummary', 'month'],
    queryFn: () => statsService.getSummary('month'),
  });

  const { data: yearStats } = useQuery({
    queryKey: ['statsSummary', 'year'],
    queryFn: () => statsService.getSummary('year'),
  });

  // Heatmap for recent activity chart
  const currentYear = new Date().getFullYear();
  const { data: heatmapData } = useQuery({
    queryKey: ['statsHeatmap', currentYear],
    queryFn: () => statsService.getHeatmap(currentYear),
  });

  // Optimistic Toggle Task Completion Mutation
  const toggleTaskMutation = useMutation({
    mutationFn: (task: Task) => taskService.toggleTask(task._id),
    onMutate: async (task: Task) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      queryClient.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.map((t) =>
          t._id === task._id
            ? {
                ...t,
                isCompleted: !t.isCompleted,
                completedAt: !t.isCompleted ? new Date().toISOString() : null,
              }
            : t
        )
      );

      return { previousTasks };
    },
    onError: (_err, _task, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
      toast.error('Không thể cập nhật trạng thái công việc');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['statsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['statsHeatmap'] });
    },
  });

  // Optimistic Toggle Recurring Task Mutation
  const toggleRecurringMutation = useMutation({
    mutationFn: async (task: Task) => {
      if (task.isCompletedToday) {
        return taskService.uncompleteRecurring(task._id, todayStr);
      } else {
        return taskService.completeRecurring(task._id, todayStr);
      }
    },
    onMutate: async (task: Task) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      queryClient.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.map((t) =>
          t._id === task._id
            ? {
                ...t,
                isCompletedToday: !t.isCompletedToday,
              }
            : t
        )
      );

      return { previousTasks };
    },
    onError: (_err, _task, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
      toast.error('Không thể cập nhật thói quen');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['statsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['statsHeatmap'] });
    },
  });

  // Update Subtasks Checklist
  const updateSubtasksMutation = useMutation({
    mutationFn: ({ task, subtasks }: { task: Task; subtasks: Subtask[] }) =>
      taskService.updateTask(task._id, { subtasks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  // Real-time Greeting
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? t('header.morningGreeting')
      : currentHour < 18
      ? t('header.afternoonGreeting')
      : t('header.eveningGreeting');

  // Filter Tasks for Today
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const endOfToday = new Date(todayDate);
  endOfToday.setHours(23, 59, 59, 999);

  const todayTasks = tasks.filter((t) => {
    const isRecurring = t.recurrence && t.recurrence.type !== 'none';
    const d = t.dueDate ? new Date(t.dueDate) : null;
    const isDueToday = d && d.getTime() >= todayDate.getTime() && d.getTime() <= endOfToday.getTime();
    return isDueToday || isRecurring;
  });

  const completedTodayCount = todayTasks.filter(
    (t) => t.isCompleted || (t.recurrence?.type !== 'none' && t.isCompletedToday)
  ).length;

  const todayCompletionRate =
    todayTasks.length > 0 ? Math.round((completedTodayCount / todayTasks.length) * 100) : 0;

  // Filter Tasks for Selected Date on Mini Calendar
  const selectedDateTasks = useMemo(() => {
    const isSelectedToday = isSameDay(selectedDate, new Date());
    if (isSelectedToday) return todayTasks;

    const startSel = new Date(selectedDate);
    startSel.setHours(0, 0, 0, 0);
    const endSel = new Date(selectedDate);
    endSel.setHours(23, 59, 59, 999);

    return tasks.filter((t) => {
      const isRecurring = t.recurrence && t.recurrence.type !== 'none';
      const d = t.dueDate ? new Date(t.dueDate) : null;
      const isDueOnDay = d && d.getTime() >= startSel.getTime() && d.getTime() <= endSel.getTime();
      return isDueOnDay || isRecurring;
    });
  }, [selectedDate, tasks, todayTasks]);

  // Mini Calendar Task Dots
  const taskDots = useMemo(() => {
    const map: Record<string, { hasTasks: boolean; allCompleted?: boolean; count?: number }> = {};
    for (const t of tasks) {
      if (t.dueDate) {
        const dStr = format(new Date(t.dueDate), 'yyyy-MM-dd');
        if (!map[dStr]) {
          map[dStr] = { hasTasks: true, allCompleted: true, count: 0 };
        }
        map[dStr].count = (map[dStr].count || 0) + 1;
        if (!t.isCompleted) {
          map[dStr].allCompleted = false;
        }
      }
    }
    return map;
  }, [tasks]);

  // Upcoming events today
  const todayEvents = todayCalendar?.events || [];

  // Active Goals
  const activeGoals = goals.filter(
    (g) => g.status !== 'completed' && g.status !== 'cancelled' && g.progressCache < 100
  );

  const atRiskOrOverdueGoals = goals.filter((g) => g.atRisk || g.isOverdue);

  // Best streak
  const bestStreak =
    monthStats?.longestStreak || tasks.reduce((max, t) => Math.max(max, t.streak || 0), 0);

  // 7-day Activity Data
  const last7DaysActivity = useMemo(() => {
    const countsMap = heatmapData?.dailyCounts || {};
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const isToday = isSameDay(d, new Date());
      const dayLabel = isToday
        ? t('common.today')
        : format(d, 'EEE', { locale: language === 'vi' ? dfVi : undefined });
      const count = countsMap[dateStr] || 0;
      return { date: dateStr, dayLabel, count, isToday };
    });
  }, [heatmapData, language, t]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-100 border border-white/20 mb-2">
            ✨ {t('dashboard.bannerTitle')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {greeting}, {user?.name || 'User'}! 👋
          </h1>
          <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
            {t('dashboard.bannerSubtitle', {
              tasks: todayTasks.length,
              events: todayEvents.length,
            })}{' '}
            {todayCompletionRate === 100 && todayTasks.length > 0
              ? t('dashboard.bannerDone')
              : t('dashboard.bannerInProgress', { rate: todayCompletionRate })}
          </p>
        </div>

        {/* Abstract Background Decor */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. 3 Big Progress Rings: Tuần này - Tháng này - Năm nay */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <span>{t('dashboard.cycleGoalsTitle')}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('dashboard.cycleGoalsDesc')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/insights')}
            className="text-xs"
          >
            {t('dashboard.viewDetailedStats')}
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Ring 1: Tuần này */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
            <ProgressRing
              percent={weekStats?.completionRate ?? 0}
              size={135}
              strokeWidth={11}
              label={t('dashboard.thisWeek')}
            />
            <div className="mt-4">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {t('goals.tabs.week')}
              </span>
              <div className="text-xs text-slate-500 mt-1">
                {weekStats?.delta !== undefined && (
                  <span
                    className={`font-semibold ${
                      weekStats.delta >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-500'
                    }`}
                  >
                    {weekStats.delta >= 0 ? `+${weekStats.delta}%` : `${weekStats.delta}%`}{' '}
                    {t('dashboard.vsPreviousPeriod', {
                      delta: '',
                      prevLabel: t('dashboard.prevWeek'),
                    })}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {t('dashboard.completedGoalsCount', {
                  completed: weekStats?.completedGoals ?? 0,
                  total: weekStats?.totalGoals ?? 0,
                })}
              </div>
            </div>
          </div>

          {/* Ring 2: Tháng này */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
            <ProgressRing
              percent={monthStats?.completionRate ?? 0}
              size={135}
              strokeWidth={11}
              label={t('dashboard.thisMonth')}
            />
            <div className="mt-4">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {t('goals.tabs.month')}
              </span>
              <div className="text-xs text-slate-500 mt-1">
                {monthStats?.delta !== undefined && (
                  <span
                    className={`font-semibold ${
                      monthStats.delta >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-500'
                    }`}
                  >
                    {monthStats.delta >= 0 ? `+${monthStats.delta}%` : `${monthStats.delta}%`}{' '}
                    {t('dashboard.vsPreviousPeriod', {
                      delta: '',
                      prevLabel: t('dashboard.prevMonth'),
                    })}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {t('dashboard.completedGoalsCount', {
                  completed: monthStats?.completedGoals ?? 0,
                  total: monthStats?.totalGoals ?? 0,
                })}
              </div>
            </div>
          </div>

          {/* Ring 3: Năm nay */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
            <ProgressRing
              percent={yearStats?.completionRate ?? 0}
              size={135}
              strokeWidth={11}
              label={t('dashboard.thisYear')}
            />
            <div className="mt-4">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {t('goals.tabs.year')}
              </span>
              <div className="text-xs text-slate-500 mt-1">
                {yearStats?.delta !== undefined && (
                  <span
                    className={`font-semibold ${
                      yearStats.delta >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-500'
                    }`}
                  >
                    {yearStats.delta >= 0 ? `+${yearStats.delta}%` : `${yearStats.delta}%`}{' '}
                    {t('dashboard.vsPreviousPeriod', {
                      delta: '',
                      prevLabel: t('dashboard.prevYear'),
                    })}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {t('dashboard.completedGoalsCount', {
                  completed: yearStats?.completedGoals ?? 0,
                  total: yearStats?.totalGoals ?? 0,
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Tasks */}
        <div
          onClick={() => navigate('/tasks')}
          className="cursor-pointer group p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('dashboard.todayTasksCard')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {completedTodayCount}/{todayTasks.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">{t('dashboard.completedTasksCount')}</span>
          </div>
          <div className="mt-3">
            <ProgressBar value={todayCompletionRate} size="sm" />
          </div>
        </div>

        {/* Card 2: Active Goals */}
        <div
          onClick={() => navigate('/goals')}
          className="cursor-pointer group p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('dashboard.activeGoalsCard')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {activeGoals.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">{t('dashboard.activeGoalsCount')}</span>
          </div>
          <div className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center">
            <span>{t('dashboard.viewGoalTree')}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Best Streak */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('dashboard.bestStreakCard')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Flame className="w-4 h-4 fill-amber-500" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {bestStreak}
            </span>
            <span className="text-xs text-slate-500 font-medium">{t('dashboard.streakDays')}</span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            {t('dashboard.streakQuote')}
          </div>
        </div>

        {/* Card 4: Warnings & Risks */}
        <div
          onClick={() => navigate('/goals')}
          className={`cursor-pointer p-5 rounded-2xl border shadow-sm transition-all ${
            atRiskOrOverdueGoals.length > 0
              ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 hover:border-rose-300'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('dashboard.warningsCard')}
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                atRiskOrOverdueGoals.length > 0
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300'
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}
            >
              {atRiskOrOverdueGoals.length > 0 ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span
              className={`text-2xl font-extrabold ${
                atRiskOrOverdueGoals.length > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {atRiskOrOverdueGoals.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {atRiskOrOverdueGoals.length > 0
                ? t('dashboard.atRiskGoalsCount')
                : t('dashboard.safeGoalsCount')}
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500 truncate">
            {atRiskOrOverdueGoals.length > 0
              ? t('dashboard.atRiskDesc')
              : t('dashboard.safeDesc')}
          </div>
        </div>
      </div>

      {/* 4. Active Goals Running Horizontal Progress */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {t('dashboard.activeGoalsSection', { count: activeGoals.length })}
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/goals')}
            className="text-xs"
          >
            {t('dashboard.manageGoals')}
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {isGoalsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <CardSkeleton key={n} />
            ))}
          </div>
        ) : activeGoals.length === 0 ? (
          <EmptyState
            title={t('dashboard.noActiveGoals')}
            description={t('goals.emptyDesc')}
            actionLabel={t('dashboard.createNewGoalNow')}
            onAction={() => navigate('/goals?create=true')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGoals.slice(0, 6).map((g) => (
              <div
                key={g._id}
                onClick={() => navigate('/goals')}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: g.color || '#6366f1' }}
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                      {g.title}
                    </span>
                  </div>
                  <span className="font-extrabold text-slate-900 dark:text-white ml-2">
                    {g.progressCache}%
                  </span>
                </div>

                <ProgressBar value={g.progressCache} size="sm" />

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                  <span className="uppercase">{g.type}</span>
                  {g.atRisk && (
                    <span className="text-amber-500 font-semibold flex items-center">
                      {t('goals.atRiskBadge')}
                    </span>
                  )}
                  {g.isOverdue && (
                    <span className="text-rose-500 font-semibold flex items-center">
                      {t('goals.overdueBadge')}
                    </span>
                  )}
                  {!g.atRisk && !g.isOverdue && (
                    <span className="text-emerald-500 font-semibold">{t('goals.inProgressBadge')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Middle Grid: Today's Tasks + Interactive Mini Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Tasks Widget (7 cols on lg) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {t('dashboard.todayTasksSection', {
                    date: isSameDay(selectedDate, new Date())
                      ? t('common.today')
                      : format(selectedDate, 'dd/MM/yyyy'),
                    count: selectedDateTasks.length,
                  })}
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/tasks')}
                className="text-xs"
              >
                {t('dashboard.viewAllTasks')}
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            {isTasksLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <Skeleton key={n} className="h-16 w-full" />
                ))}
              </div>
            ) : selectedDateTasks.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title={t('dashboard.noTasksOnDate')}
                description={t('tasks.emptyToday')}
                actionLabel={t('dashboard.addNewTask')}
                onAction={() => navigate('/tasks?create=true')}
              />
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {selectedDateTasks.slice(0, 6).map((t) => (
                  <TaskItem
                    key={t._id}
                    task={t}
                    goals={goals}
                    onToggleComplete={(task) => toggleTaskMutation.mutate(task)}
                    onToggleRecurringToday={(task) => toggleRecurringMutation.mutate(task)}
                    onUpdateSubtasks={(task, subtasks) =>
                      updateSubtasksMutation.mutate({ task, subtasks })
                    }
                    onEdit={() => navigate('/tasks')}
                    onDelete={() => navigate('/tasks')}
                  />
                ))}
              </div>
            )}
          </div>

          {selectedDateTasks.length > 6 && (
            <div className="pt-3 text-center border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
              {t('dashboard.andMoreTasks', { count: selectedDateTasks.length - 6 })}
            </div>
          )}
        </div>

        {/* Right: Interactive Mini Calendar (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <MiniCalendar
            selectedDate={selectedDate}
            onSelectDate={(d) => setSelectedDate(d)}
            taskDots={taskDots}
          />

          {/* Today's upcoming events mini preview */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('dashboard.todayEvents', { count: todayEvents.length })}</span>
              </span>
              <button
                onClick={() => navigate('/calendar')}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {t('dashboard.openCalendar')}
              </button>
            </div>
            {todayEvents.length === 0 ? (
              <p className="text-xs text-slate-400 py-1">{t('dashboard.noEventsToday')}</p>
            ) : (
              <div className="space-y-2 mt-2">
                {todayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev._id}
                    onClick={() => navigate('/calendar')}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 cursor-pointer text-xs transition-colors"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ev.color || '#6366f1' }}
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {ev.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {ev.isAllDay ? t('calendar.allDay') : `${ev.startTime || ''}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Recent 7-Day Activity Chart */}
      <ActivityWeeklyBarChart data={last7DaysActivity} />
    </div>
  );
};
