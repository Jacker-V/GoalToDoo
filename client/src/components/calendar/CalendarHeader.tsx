import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../ui/Button';
import type { CalendarViewMode, CalendarFilterState } from '../../types/calendar';
import type { Category } from '../../types/category';
import { MONTH_NAMES_VI } from '../../utils/calendar';
import { useI18n } from '../../i18n';

interface CalendarHeaderProps {
  currentDate: Date;
  onDateChange?: (date: Date) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  filters: CalendarFilterState;
  onFiltersChange?: (filters: CalendarFilterState) => void;
  onFilterChange?: (filters: CalendarFilterState) => void;
  categories: Category[];
  onOpenCreateEvent?: () => void;
  onOpenCreateTask?: () => void;
  onAddEvent?: () => void;
  onAddTask?: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  onDateChange,
  onPrev,
  onNext,
  onToday,
  viewMode,
  onViewModeChange,
  filters,
  onFiltersChange,
  onFilterChange,
  categories,
  onOpenCreateEvent,
  onOpenCreateTask,
  onAddEvent,
  onAddTask,
}) => {
  const { t, language } = useI18n();
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const setFilterState = (next: CalendarFilterState) => {
    if (onFilterChange) onFilterChange(next);
    if (onFiltersChange) onFiltersChange(next);
  };

  const openEvent = onAddEvent || onOpenCreateEvent || (() => {});
  const openTask = onAddTask || onOpenCreateTask || (() => {});

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handleToday = () => {
    if (onToday) {
      onToday();
    } else if (onDateChange) {
      onDateChange(new Date());
    }
  };

  const handlePrev = () => {
    if (onPrev) {
      onPrev();
      return;
    }
    if (!onDateChange) return;

    if (viewMode === 'month') {
      const targetYear = currentDate.getFullYear();
      const targetMonth = currentDate.getMonth() - 1;
      const lastDayOfTarget = new Date(targetYear, targetMonth + 1, 0).getDate();
      const safeDay = Math.min(currentDate.getDate(), lastDayOfTarget);
      onDateChange(new Date(targetYear, targetMonth, safeDay, 12, 0, 0));
    } else if (viewMode === 'week') {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() - 7);
      onDateChange(nextDate);
    } else if (viewMode === 'day') {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() - 1);
      onDateChange(nextDate);
    } else {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() - 14);
      onDateChange(nextDate);
    }
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
      return;
    }
    if (!onDateChange) return;

    if (viewMode === 'month') {
      const targetYear = currentDate.getFullYear();
      const targetMonth = currentDate.getMonth() + 1;
      const lastDayOfTarget = new Date(targetYear, targetMonth + 1, 0).getDate();
      const safeDay = Math.min(currentDate.getDate(), lastDayOfTarget);
      onDateChange(new Date(targetYear, targetMonth, safeDay, 12, 0, 0));
    } else if (viewMode === 'week') {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 7);
      onDateChange(nextDate);
    } else if (viewMode === 'day') {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      onDateChange(nextDate);
    } else {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 14);
      onDateChange(nextDate);
    }
  };

  const handleYearChange = (newYear: number) => {
    if (!onDateChange) return;
    const lastDayOfTarget = new Date(newYear, month + 1, 0).getDate();
    const safeDay = Math.min(currentDate.getDate(), lastDayOfTarget);
    onDateChange(new Date(newYear, month, safeDay, 12, 0, 0));
  };

  const handleMonthChange = (newMonth: number) => {
    if (!onDateChange) return;
    const lastDayOfTarget = new Date(year, newMonth + 1, 0).getDate();
    const safeDay = Math.min(currentDate.getDate(), lastDayOfTarget);
    onDateChange(new Date(year, newMonth, safeDay, 12, 0, 0));
  };

  const MONTH_NAMES_EN = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthNames = language === 'vi' ? MONTH_NAMES_VI : MONTH_NAMES_EN;

  const getHeaderTitle = () => {
    if (viewMode === 'day') {
      return `${currentDate.getDate()} ${monthNames[month]}, ${year}`;
    }
    return `${monthNames[month]}, ${year}`;
  };

  const viewModes: { id: CalendarViewMode; label: string }[] = [
    { id: 'month', label: t('calendar.views.month') },
    { id: 'week', label: t('calendar.views.week') },
    { id: 'day', label: t('calendar.views.day') },
    { id: 'agenda', label: t('calendar.views.agenda') },
  ];

  return (
    <div className="space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
      {/* Top Bar: Nav, Title, View Switcher, Add New Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Date navigation */}
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleToday} className="text-xs">
            {t('calendar.today')}
          </Button>

          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Month / Year Title with Quick Selector */}
          <div className="relative">
            <button
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-base sm:text-lg font-bold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span>{getHeaderTitle()}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {isDatePickerOpen && (
              <div
                className="absolute top-full left-0 mt-1 z-30 w-64 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {language === 'vi' ? 'Chọn nhanh Năm' : 'Select Year'}
                  </span>
                  <select
                    value={year}
                    onChange={(e) => handleYearChange(parseInt(e.target.value))}
                    className="px-2 py-0.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    {Array.from({ length: 11 }, (_, i) => year - 5 + i).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {monthNames.map((mName, idx) => (
                    <button
                      key={mName}
                      onClick={() => {
                        handleMonthChange(idx);
                        setIsDatePickerOpen(false);
                      }}
                      className={`px-2 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                        idx === month
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {mName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* View Switcher & Add Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 4 View switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            {viewModes.map((m) => (
              <button
                key={m.id}
                onClick={() => onViewModeChange(m.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === m.id
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Add New dropdown button */}
          <div className="relative">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              className="flex items-center space-x-1 text-xs"
            >
              <Plus className="w-4 h-4 mr-0.5" />
              <span>{t('calendar.addEvent')}</span>
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            </Button>

            {isAddMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsAddMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 z-30 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1">
                  <button
                    onClick={() => {
                      setIsAddMenuOpen(false);
                      openEvent();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2 cursor-pointer"
                  >
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>{t('calendar.modal.createTitle')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsAddMenuOpen(false);
                      openTask();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2 cursor-pointer"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{t('tasks.modal.createTitle')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar: Multi-layered Display Filters & Category Selector */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Layer Checkboxes */}
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1 text-slate-400" />
            {t('common.filter')}:
          </span>

          <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700 dark:text-slate-300 select-none">
            <input
              type="checkbox"
              checked={filters.showEvents}
              onChange={(e) =>
                setFilterState({ ...filters, showEvents: e.target.checked })
              }
              className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800"
            />
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>{t('calendar.filterEvents')}</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700 dark:text-slate-300 select-none">
            <input
              type="checkbox"
              checked={filters.showTasks}
              onChange={(e) =>
                setFilterState({ ...filters, showTasks: e.target.checked })
              }
              className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800"
            />
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>{t('calendar.filterTasks')}</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700 dark:text-slate-300 select-none">
            <input
              type="checkbox"
              checked={filters.showGoals}
              onChange={(e) =>
                setFilterState({ ...filters, showGoals: e.target.checked })
              }
              className="rounded text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800"
            />
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>{t('calendar.filterGoals')}</span>
          </label>
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-500 dark:text-slate-400">{t('goals.modal.category')}:</span>
          <select
            value={filters.categoryId || 'all'}
            onChange={(e) =>
              setFilterState({
                ...filters,
                categoryId: e.target.value === 'all' ? null : e.target.value,
              })
            }
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">{t('calendar.allCategories')}</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
