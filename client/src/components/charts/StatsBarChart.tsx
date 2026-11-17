import React, { useState, useMemo } from 'react';
import { BarChart3, ChevronDown } from 'lucide-react';
import { parseISO, getDay } from 'date-fns';
import { useI18n } from '../../i18n';

interface StatsBarChartProps {
  dailyCounts: Record<string, number>;
  year: number;
  className?: string;
}

type GroupByMode = 'dayOfWeek' | 'weekOfMonth' | 'month';

export const StatsBarChart: React.FC<StatsBarChartProps> = ({
  dailyCounts,
  year,
  className = '',
}) => {
  const { t, language } = useI18n();
  const [mode, setMode] = useState<GroupByMode>('dayOfWeek');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const dayOfWeekLabels =
    language === 'vi'
      ? ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật']
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const shortDayLabels =
    language === 'vi'
      ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const monthLabels =
    language === 'vi'
      ? [
          'Thg 1', 'Thg 2', 'Thg 3', 'Thg 4', 'Thg 5', 'Thg 6',
          'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11', 'Thg 12',
        ]
      : [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
        ];

  const chartData = useMemo(() => {
    if (mode === 'dayOfWeek') {
      const counts = [0, 0, 0, 0, 0, 0, 0];
      for (const [dateStr, count] of Object.entries(dailyCounts)) {
        if (!dateStr.startsWith(String(year))) continue;
        try {
          const d = parseISO(dateStr);
          const dayIdx = (getDay(d) + 6) % 7;
          counts[dayIdx] += count;
        } catch {
          // ignore invalid date
        }
      }
      return counts.map((count, i) => ({
        label: dayOfWeekLabels[i],
        shortLabel: shortDayLabels[i],
        count,
      }));
    } else if (mode === 'weekOfMonth') {
      const counts = [0, 0, 0, 0, 0];
      const monthPrefix = `${year}-${String(selectedMonth + 1).padStart(2, '0')}`;
      for (const [dateStr, count] of Object.entries(dailyCounts)) {
        if (!dateStr.startsWith(monthPrefix)) continue;
        try {
          const d = parseISO(dateStr);
          const dayNum = d.getDate();
          const wIdx = Math.min(Math.floor((dayNum - 1) / 7), 4);
          counts[wIdx] += count;
        } catch {
          // ignore
        }
      }
      const weekRanges = ['01 - 07', '08 - 14', '15 - 21', '22 - 28', '29+'];
      return counts.map((count, i) => ({
        label: `${language === 'vi' ? 'Tuần' : 'Week'} ${i + 1} (${weekRanges[i]} ${monthLabels[selectedMonth]})`,
        shortLabel: `${language === 'vi' ? 'Tuần' : 'Wk'} ${i + 1}`,
        count,
      }));
    } else {
      const counts = Array(12).fill(0);
      for (const [dateStr, count] of Object.entries(dailyCounts)) {
        if (!dateStr.startsWith(String(year))) continue;
        try {
          const d = parseISO(dateStr);
          const m = d.getMonth();
          if (m >= 0 && m < 12) {
            counts[m] += count;
          }
        } catch {
          // ignore
        }
      }
      return counts.map((count, i) => ({
        label: monthLabels[i],
        shortLabel: monthLabels[i],
        count,
      }));
    }
  }, [mode, selectedMonth, dailyCounts, year, language, dayOfWeekLabels, shortDayLabels, monthLabels]);

  const maxVal = Math.max(...chartData.map((d) => d.count), 5);
  const totalCount = chartData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div
      className={`p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${className}`}
    >
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {t('insights.barChartTitle')}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t('insights.barChartSubtitle')}
          </p>
        </div>

        {/* Controls: Mode toggle + optional month selector */}
        <div className="flex flex-wrap items-center gap-2">
          {mode === 'weekOfMonth' && (
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 pr-8 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {monthLabels.map((lbl, idx) => (
                  <option key={lbl} value={idx}>
                    {lbl}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setMode('dayOfWeek')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === 'dayOfWeek'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'vi' ? 'Theo thứ trong tuần' : 'By Day of Week'}
            </button>
            <button
              onClick={() => setMode('weekOfMonth')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === 'weekOfMonth'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'vi' ? 'Theo tuần' : 'By Week'}
            </button>
            <button
              onClick={() => setMode('month')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === 'month'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {language === 'vi' ? 'Theo tháng' : 'By Month'}
            </button>
          </div>
        </div>
      </div>

      {/* Bar Chart Area */}
      <div className="relative pt-6 pb-2">
        {/* Floating Tooltip */}
        {hoveredIdx !== null && chartData[hoveredIdx] && (
          <div
            className="absolute -top-1 pointer-events-none transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2.5 py-1 rounded-lg shadow-lg z-20 transition-all duration-150"
            style={{
              left: `${((hoveredIdx + 0.5) / chartData.length) * 100}%`,
            }}
          >
            <div className="font-bold">
              {chartData[hoveredIdx].count} {language === 'vi' ? 'việc hoàn thành' : 'completed'}
            </div>
            <div className="text-[10px] text-slate-400">{chartData[hoveredIdx].label}</div>
          </div>
        )}

        <div
          className="grid gap-2 items-end h-48"
          style={{ gridTemplateColumns: `repeat(${chartData.length}, minmax(0, 1fr))` }}
        >
          {chartData.map((item, idx) => {
            const heightPercent = Math.max(Math.round((item.count / maxVal) * 100), 5);
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={item.label}
                className="flex flex-col items-center h-full justify-end cursor-pointer group"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Count badge */}
                <span
                  className={`text-[10px] font-bold mb-1 transition-opacity ${
                    isHovered || item.count > 0
                      ? 'text-slate-700 dark:text-slate-300 opacity-100'
                      : 'text-slate-400 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {item.count}
                </span>

                {/* Bar */}
                <div className="w-full max-w-[36px] bg-slate-100 dark:bg-slate-800 rounded-t-lg h-36 flex items-end overflow-hidden p-0.5">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ease-out ${
                      item.count > 0
                        ? 'bg-gradient-to-t from-indigo-600 via-indigo-500 to-indigo-400 shadow-sm'
                        : 'bg-slate-200 dark:bg-slate-700'
                    } ${isHovered ? 'brightness-110' : ''}`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                {/* Label */}
                <span className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-full">
                  {item.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
