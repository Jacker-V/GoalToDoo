import React, { useState } from 'react';
import { PieChart } from 'lucide-react';
import type { CategoryStatItem } from '../../types/stats';
import { useI18n } from '../../i18n';

interface CategoryDonutChartProps {
  categories: CategoryStatItem[];
  totalTasks?: number;
  totalGoals?: number;
  className?: string;
}

type DonutMetric = 'tasks' | 'allTasks' | 'goals';

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  categories = [],
  totalTasks = 0,
  totalGoals = 0,
  className = '',
}) => {
  const { t } = useI18n();
  const [metric, setMetric] = useState<DonutMetric>('tasks');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Filter categories that have positive count for current metric
  const items = categories
    .map((c) => ({
      ...c,
      count:
        metric === 'tasks'
          ? c.completedTasks
          : metric === 'allTasks'
          ? c.totalTasks
          : c.totalGoals,
      share: metric === 'tasks' ? c.taskShare : c.goalShare,
    }))
    .filter((c) => c.count > 0);

  const totalMetricCount = items.reduce((sum, c) => sum + c.count, 0);

  // SVG parameters
  const size = 220;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute stroke-dasharray and stroke-dashoffset for each slice
  let accumulatedPercent = 0;
  const slices = items.map((item) => {
    const percent = totalMetricCount > 0 ? (item.count / totalMetricCount) * 100 : 0;
    const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += percent;

    return {
      ...item,
      percent: Math.round(percent * 10) / 10,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeItem = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div
      className={`p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <PieChart className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {t('insights.donutDistribution')}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t('insights.donutDesc')}
          </p>
        </div>

        {/* Toggle metric */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setMetric('tasks')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              metric === 'tasks'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('insights.donutMetricDone')}
          </button>
          <button
            onClick={() => setMetric('allTasks')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              metric === 'allTasks'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('insights.donutMetricAll')}
          </button>
          <button
            onClick={() => setMetric('goals')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              metric === 'goals'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t('insights.donutMetricGoals')}
          </button>
        </div>
      </div>

      {totalMetricCount === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          {t('insights.donutEmpty')}
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center justify-around gap-6">
          {/* Donut Circle */}
          <div className="relative select-none flex-shrink-0" style={{ width: size, height: size }}>
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90 origin-center drop-shadow-sm"
            >
              {/* Empty background track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-slate-100 dark:text-slate-800"
              />

              {/* Slices */}
              {slices.map((slice, i) => {
                const isHovered = hoveredIdx === i;
                return (
                  <circle
                    key={slice.categoryName}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={slice.color || '#6366f1'}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    className="cursor-pointer transition-all duration-300"
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })}
            </svg>

            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {activeItem ? activeItem.count : totalMetricCount}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 truncate max-w-[120px]">
                {activeItem
                  ? `${activeItem.categoryName} (${activeItem.percent}%)`
                  : metric === 'tasks'
                  ? t('insights.donutCenterCompleted')
                  : metric === 'allTasks'
                  ? t('insights.donutCenterTotal')
                  : t('insights.donutCenterGoals')}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2.5 w-full max-w-sm">
            {slices.map((item, i) => {
              const isHovered = hoveredIdx === i;
              return (
                <div
                  key={item.categoryName}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                    isHovered
                      ? 'bg-slate-100 dark:bg-slate-800/80 scale-[1.02]'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color || '#6366f1' }}
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.categoryName}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs flex-shrink-0">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {item.count} {metric === 'goals' ? t('insights.donutGoalsUnit') : t('insights.donutTasksUnit')}
                    </span>
                    <span className="text-slate-400 font-medium w-12 text-right">
                      {item.percent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
