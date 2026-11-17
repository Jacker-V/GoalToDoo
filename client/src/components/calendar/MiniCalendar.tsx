import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { vi } from 'date-fns/locale';

interface MiniCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  // Map of YYYY-MM-DD -> { hasTasks: boolean, allCompleted: boolean, count: number }
  taskDots?: Record<string, { hasTasks: boolean; allCompleted?: boolean; count?: number }>;
  className?: string;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  selectedDate,
  onSelectDate,
  taskDots = {},
  className = '',
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  const today = new Date();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  // Start on Monday (weekStartsOn: 1)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <div
      className={`p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${className}`}
    >
      {/* Month Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="w-4 h-4 text-indigo-500" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: vi })}
          </h4>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onSelectDate(today)}
            className="text-[11px] font-semibold px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
          >
            Hôm nay
          </button>
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            title="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            title="Tháng sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekDayLabels.map((lbl) => (
          <span
            key={lbl}
            className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 py-1"
          >
            {lbl}
          </span>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentDay = isSameDay(day, today);
          const isMonthDay = isSameMonth(day, monthStart);
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayDot = taskDots[dateStr];

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={`relative flex flex-col items-center justify-center h-8 rounded-lg text-xs transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : isCurrentDay
                  ? 'border border-indigo-500 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                  : isMonthDay
                  ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span>{format(day, 'd')}</span>

              {/* Status indicator dot */}
              {dayDot && dayDot.hasTasks && (
                <span
                  className={`w-1 h-1 rounded-full absolute bottom-1 ${
                    isSelected
                      ? 'bg-white'
                      : dayDot.allCompleted
                      ? 'bg-emerald-500'
                      : 'bg-indigo-500'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
