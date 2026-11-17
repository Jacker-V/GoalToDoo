import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Flame,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { statsService } from '../services/stats.service';
import { goalService } from '../services/goal.service';
import type { StatsPeriod } from '../types/stats';
import { ContributionHeatmap } from '../components/charts/ContributionHeatmap';
import { StatsBarChart } from '../components/charts/StatsBarChart';
import { TrendLineChart } from '../components/charts/TrendLineChart';
import { CategoryDonutChart } from '../components/charts/CategoryDonutChart';
import { ProgressRing } from '../components/ui/ProgressRing';
import { useI18n } from '../i18n';

export const InsightsPage: React.FC = () => {
  const { t, language } = useI18n();
  const [period, setPeriod] = useState<StatsPeriod>('month');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');

  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return format(d, 'yyyy-MM-dd');
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return format(new Date(), 'yyyy-MM-dd');
  });

  // 1. Stats Summary Query
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['statsSummary', period, customStartDate, customEndDate],
    queryFn: () =>
      statsService.getSummary(
        period,
        undefined,
        period === 'custom' ? customStartDate : undefined,
        period === 'custom' ? customEndDate : undefined
      ),
  });

  // 2. Heatmap Query
  const { data: heatmap, isLoading: isHeatmapLoading } = useQuery({
    queryKey: ['statsHeatmap', year],
    queryFn: () => statsService.getHeatmap(year),
  });

  // 3. Goals list for Trend Line Selector
  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalService.getGoals(),
  });

  // Set default selected goal
  useEffect(() => {
    if (goals.length > 0 && !selectedGoalId) {
      const active = goals.find((g) => g.status !== 'completed' && g.status !== 'cancelled');
      setSelectedGoalId(active ? active._id : goals[0]._id);
    }
  }, [goals, selectedGoalId]);

  // 4. Stats Trend Query
  const { data: trend, isLoading: isTrendLoading } = useQuery({
    queryKey: ['statsTrend', selectedGoalId],
    queryFn: () => statsService.getTrend(selectedGoalId),
    enabled: !!selectedGoalId,
  });

  // 5. Category Stats Query
  const { data: byCategory, isLoading: isCategoryLoading } = useQuery({
    queryKey: ['statsByCategory'],
    queryFn: () => statsService.getByCategory(),
  });

  const periodLabels: Record<StatsPeriod, { title: string; prevLabel: string }> = {
    week: { title: t('insights.periodTabs.week'), prevLabel: t('dashboard.prevWeek') },
    month: { title: t('insights.periodTabs.month'), prevLabel: t('dashboard.prevMonth') },
    year: { title: t('insights.periodTabs.year'), prevLabel: t('dashboard.prevYear') },
    custom: { title: t('insights.periodTabs.custom'), prevLabel: language === 'vi' ? 'kỳ trước' : 'previous period' },
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. Header & Period Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              {t('insights.title')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {t('insights.subtitle')}
          </p>
        </div>

        {/* Period Selector Tabs & Custom Date Range Picker */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {period === 'custom' && (
            <div className="flex items-center space-x-2 text-xs bg-white dark:bg-slate-800 p-1.5 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-slate-400 font-medium">{t('insights.customFrom')}</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-transparent border-0 text-slate-800 dark:text-slate-100 font-semibold focus:outline-none cursor-pointer"
              />
              <span className="text-slate-400 font-medium">{t('insights.customTo')}</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-transparent border-0 text-slate-800 dark:text-slate-100 font-semibold focus:outline-none cursor-pointer"
              />
            </div>
          )}

          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
            {(['week', 'month', 'year', 'custom'] as StatsPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  period === p
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {periodLabels[p].title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Overview Banner with Progress Ring & Delta */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-900/40">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 backdrop-blur-md text-xs font-semibold text-indigo-300 border border-indigo-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {periodLabels[period].title}
                {period === 'custom' && ` (${customStartDate} ➔ ${customEndDate})`}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t('insights.overviewHeading', { rate: summary?.completionRate ?? 0 })}
            </h2>

            <p className="text-indigo-200 text-sm leading-relaxed">
              {summary?.delta !== undefined && (
                <span className="font-semibold inline-block">
                  {summary.delta > 0 ? (
                    <span className="text-emerald-400">
                      ↗ +{summary.delta}% vs {periodLabels[period].prevLabel} ({summary.previousCompletionRate}%)
                    </span>
                  ) : summary.delta < 0 ? (
                    <span className="text-rose-400">
                      ↘ {summary.delta}% vs {periodLabels[period].prevLabel} ({summary.previousCompletionRate}%)
                    </span>
                  ) : (
                    <span className="text-indigo-200">
                      ↔ ~{periodLabels[period].prevLabel} ({summary.previousCompletionRate}%)
                    </span>
                  )}
                </span>
              )}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1 text-xs text-indigo-300">
              <span>{t('insights.summaryFollow', {
                total: summary?.totalGoals ?? 0,
                completed: summary?.completedGoals ?? 0,
              })}</span>
            </div>
          </div>

          <div className="flex-shrink-0 bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-inner">
            <ProgressRing
              percent={summary?.completionRate ?? 0}
              size={140}
              strokeWidth={12}
              label={periodLabels[period].title}
            />
          </div>
        </div>

        {/* Glow Decors */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 3. 4 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Completed Tasks */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('dashboard.todayTasksCard')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {summary?.completedTasks ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">{t('dashboard.completedTasksCount')}</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {periodLabels[period].title}
          </p>
        </div>

        {/* Card 2: On-time Completion Rate */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {language === 'vi' ? 'Tỉ lệ đúng hạn' : 'On-time Rate'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {summary?.onTimeRate ?? 100}%
            </span>
            <span className="text-xs text-slate-500 font-medium">on-time</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {language === 'vi' ? 'Hoàn thành trước hoặc đúng hạn' : 'Completed before or on deadline'}
          </p>
        </div>

        {/* Card 3: Streak Metrics */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
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
              {summary?.longestStreak ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">{t('dashboard.streakDays')}</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {language === 'vi' ? 'Hiện tại:' : 'Current:'} <b>{summary?.currentStreak ?? 0}</b> {language === 'vi' ? 'ngày liên tục' : 'consecutive days'}
          </p>
        </div>

        {/* Card 4: At Risk Goals */}
        <div
          className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between transition-all ${
            (summary?.atRiskCount ?? 0) > 0
              ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('dashboard.warningsCard')}
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                (summary?.atRiskCount ?? 0) > 0
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300'
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}
            >
              {(summary?.atRiskCount ?? 0) > 0 ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span
              className={`text-2xl font-extrabold ${
                (summary?.atRiskCount ?? 0) > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {summary?.atRiskCount ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {(summary?.atRiskCount ?? 0) > 0 ? t('dashboard.atRiskGoalsCount') : t('dashboard.safeGoalsCount')}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500 truncate">
            {(summary?.atRiskCount ?? 0) > 0
              ? t('dashboard.atRiskDesc')
              : t('dashboard.safeDesc')}
          </p>
        </div>
      </div>

      {/* 4. GitHub Contribution Heatmap */}
      <ContributionHeatmap
        year={year}
        dailyCounts={heatmap?.dailyCounts || {}}
        onYearChange={(y) => setYear(y)}
      />

      {/* 5. Bar Chart: Tasks by Day of Week or Month */}
      <StatsBarChart dailyCounts={heatmap?.dailyCounts || {}} year={year} />

      {/* 6. Trend Line Chart: Actual vs Ideal Trajectory */}
      <div className="space-y-4">
        {/* Goal Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {t('insights.trendPickerTitle')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('insights.trendPickerDesc')}
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <select
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 pr-9 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {goals.length === 0 && <option value="">{t('insights.noGoalsForTrend')}</option>}
              {goals.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.title} ({g.progressCache}%)
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <TrendLineChart trend={trend || null} isLoading={isTrendLoading} />
      </div>

      {/* 7. Donut / Pie Chart: Distribution by Category */}
      <CategoryDonutChart
        categories={byCategory?.categories || []}
        totalTasks={byCategory?.totalTasks || 0}
        totalGoals={byCategory?.totalGoals || 0}
      />
    </div>
  );
};
