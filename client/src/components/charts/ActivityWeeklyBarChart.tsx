import React, { useState } from 'react';
import { useI18n } from '../../i18n';

export interface DayActivityData {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "T2", "T3", "Hôm nay"
  count: number;
  isToday?: boolean;
}

interface ActivityWeeklyBarChartProps {
  data: DayActivityData[];
  title?: string;
  className?: string;
}

export const ActivityWeeklyBarChart: React.FC<ActivityWeeklyBarChartProps> = ({
  data,
  title,
  className = '',
}) => {
  const { t } = useI18n();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const displayTitle = title || t('insights.activityTitle');
  const maxCount = Math.max(...data.map((d) => d.count), 5);
  const totalCompleted = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div
      className={`p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{displayTitle}</h4>
          <p className="text-xs text-slate-500">
            {t('insights.activityCompletedTotal', { count: totalCompleted })}
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
          {t('insights.activityLast7Days')}
        </span>
      </div>

      {/* Bar Chart Container */}
      <div className="relative pt-6 pb-2">
        {/* Tooltip */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            className="absolute -top-1 pointer-events-none transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2.5 py-1 rounded-lg shadow-lg z-10 transition-all duration-150"
            style={{
              left: `${((hoveredIndex + 0.5) / data.length) * 100}%`,
            }}
          >
            <div className="font-semibold">{t('insights.activityDoneTooltip', { count: data[hoveredIndex].count })}</div>
            <div className="text-[10px] text-slate-400">{data[hoveredIndex].date}</div>
          </div>
        )}

        <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-36">
          {data.map((day, idx) => {
            const heightPercent = Math.max(Math.round((day.count / maxCount) * 100), 6);
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={day.date}
                className="flex flex-col items-center h-full justify-end cursor-pointer group"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Count badge above bar */}
                <span
                  className={`text-[10px] font-bold mb-1 transition-opacity ${
                    isHovered || day.count > 0
                      ? 'text-slate-700 dark:text-slate-300 opacity-100'
                      : 'text-slate-400 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {day.count}
                </span>

                {/* Bar */}
                <div className="w-full max-w-[28px] bg-slate-100 dark:bg-slate-800/80 rounded-t-lg h-24 flex items-end overflow-hidden p-0.5">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ease-out ${
                      day.isToday
                        ? 'bg-gradient-to-t from-indigo-600 to-purple-500 shadow-sm'
                        : day.count > 0
                        ? 'bg-gradient-to-t from-indigo-500 to-indigo-400'
                        : 'bg-slate-200 dark:bg-slate-700'
                    } ${isHovered ? 'brightness-110' : ''}`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                {/* Day label */}
                <span
                  className={`mt-2 text-[11px] truncate ${
                    day.isToday
                      ? 'font-bold text-indigo-600 dark:text-indigo-400'
                      : 'font-medium text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {day.dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
