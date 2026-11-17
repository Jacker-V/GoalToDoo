import React, { useState, useMemo } from 'react';
import {
  format,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  getDay,
  parseISO,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import { useI18n } from '../../i18n';

interface ContributionHeatmapProps {
  year: number;
  dailyCounts: Record<string, number>;
  onYearChange?: (year: number) => void;
  className?: string;
}

export const ContributionHeatmap: React.FC<ContributionHeatmapProps> = ({
  year,
  dailyCounts,
  onYearChange,
  className = '',
}) => {
  const { t, language } = useI18n();
  const [hoveredCell, setHoveredCell] = useState<{
    dateStr: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear, currentYear - 1, currentYear - 2];

  const totalCompleted = useMemo(() => {
    return Object.entries(dailyCounts).reduce((sum, [date, count]) => {
      if (date.startsWith(String(year))) {
        return sum + count;
      }
      return sum;
    }, 0);
  }, [dailyCounts, year]);

  const { weeks, monthLabels } = useMemo(() => {
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 11, 31));
    const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd });

    const weeksList: Array<Array<{ date: Date; dateStr: string; count: number } | null>> = [];
    let currentWeek: Array<{ date: Date; dateStr: string; count: number } | null> = [];

    const firstDayOfWeek = (getDay(allDays[0]) + 6) % 7;
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }

    const months: Array<{ name: string; weekIndex: number }> = [];
    let lastMonth = -1;

    allDays.forEach((day) => {
      const dayOfWeek = (getDay(day) + 6) % 7;
      const dateStr = format(day, 'yyyy-MM-dd');
      const count = dailyCounts[dateStr] || 0;

      const m = day.getMonth();
      if (m !== lastMonth) {
        months.push({
          name: format(day, 'MMM', { locale: language === 'vi' ? vi : undefined }),
          weekIndex: weeksList.length,
        });
        lastMonth = m;
      }

      currentWeek.push({ date: day, dateStr, count });

      if (dayOfWeek === 6) {
        weeksList.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeksList.push(currentWeek);
    }

    return { weeks: weeksList, monthLabels: months };
  }, [year, dailyCounts, language]);

  const getColorClass = (count: number) => {
    if (count <= 0) return 'bg-slate-100 dark:bg-slate-800 border-slate-200/40 dark:border-slate-700/40';
    if (count <= 2) return 'bg-emerald-200 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800';
    if (count <= 4) return 'bg-emerald-400 dark:bg-emerald-700 border-emerald-500 dark:border-emerald-600';
    if (count <= 6) return 'bg-emerald-500 dark:bg-emerald-600 border-emerald-600 dark:border-emerald-500';
    return 'bg-emerald-700 dark:bg-emerald-400 border-emerald-800 dark:border-emerald-300';
  };

  const dayRowLabels = [
    { label: language === 'vi' ? 'T2' : 'M', index: 0 },
    { label: '', index: 1 },
    { label: language === 'vi' ? 'T4' : 'W', index: 2 },
    { label: '', index: 3 },
    { label: language === 'vi' ? 'T6' : 'F', index: 4 },
    { label: '', index: 5 },
    { label: language === 'vi' ? 'CN' : 'S', index: 6 },
  ];

  return (
    <div className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {t('insights.heatmapTitle')}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t('insights.heatmapSubtitle', { count: totalCompleted, year })}
          </p>
        </div>

        {/* Year Selector */}
        {onYearChange && (
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {availableYears.map((y) => (
              <button
                key={y}
                onClick={() => onYearChange(y)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  y === year
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Heatmap Grid Overflow Container */}
      <div className="relative overflow-x-auto pb-4 pt-1">
        {/* Floating Tooltip */}
        {hoveredCell && (
          <div
            className="fixed pointer-events-none z-50 bg-slate-900 dark:bg-slate-950 text-white text-xs px-3 py-1.5 rounded-lg shadow-xl border border-slate-700 -translate-x-1/2 -translate-y-full mb-2"
            style={{
              left: `${hoveredCell.x}px`,
              top: `${hoveredCell.y - 8}px`,
            }}
          >
            <div className="font-bold">
              {hoveredCell.count > 0
                ? `${hoveredCell.count} ${language === 'vi' ? 'công việc hoàn thành' : 'completed items'}`
                : language === 'vi' ? 'Không có công việc nào' : 'No activity'}
            </div>
            <div className="text-[11px] text-slate-400">
              {format(parseISO(hoveredCell.dateStr), 'EEEE, dd/MM/yyyy', {
                locale: language === 'vi' ? vi : undefined,
              })}
            </div>
          </div>
        )}

        <div className="min-w-[760px] inline-block">
          {/* Months header */}
          <div className="relative h-4 ml-6 text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-2">
            {monthLabels.map((m, idx) => (
              <span
                key={`${m.name}-${idx}`}
                style={{
                  position: 'absolute',
                  left: `${m.weekIndex * 15}px`,
                }}
                className="capitalize select-none truncate"
              >
                {m.name}
              </span>
            ))}
          </div>

          <div className="flex">
            {/* Day of week labels */}
            <div className="flex flex-col gap-[3px] mr-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {dayRowLabels.map((d, i) => (
                <div key={i} className="h-3 flex items-center justify-end w-4">
                  {d.label}
                </div>
              ))}
            </div>

            {/* Weeks columns */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3px]">
                  {week.map((day, dIdx) => {
                    if (!day) {
                      return (
                        <div
                          key={`empty-${dIdx}`}
                          className="w-3 h-3 rounded-[3px] bg-transparent"
                        />
                      );
                    }

                    return (
                      <div
                        key={day.dateStr}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredCell({
                            dateStr: day.dateStr,
                            count: day.count,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`w-3 h-3 rounded-[3px] border cursor-pointer transition-transform hover:scale-125 hover:z-10 ${getColorClass(
                          day.count
                        )}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend & Footnote */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
        <span>{language === 'vi' ? 'Mỗi ô vuông đại diện cho 1 ngày trong năm.' : 'Each square represents one day of the year.'}</span>
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px]">{t('insights.less')}</span>
          <div className="w-2.5 h-2.5 rounded-[2px] bg-slate-100 dark:bg-slate-800 border border-slate-200/40 dark:border-slate-700/40" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-200 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 dark:bg-emerald-700 border border-emerald-500 dark:border-emerald-600" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500 dark:bg-emerald-600 border border-emerald-600 dark:border-emerald-500" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-700 dark:bg-emerald-400 border border-emerald-800 dark:border-emerald-300" />
          <span className="text-[11px]">{t('insights.more')}</span>
        </div>
      </div>
    </div>
  );
};
