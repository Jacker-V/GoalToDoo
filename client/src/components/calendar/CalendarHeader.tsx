import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Filter,
  Check,
  CheckSquare,
  Clock,
  Target,
  List,
  Columns,
  Square,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../ui/Button';
import type { CalendarViewMode, CalendarFilterState } from '../../types/calendar';
import type { Category } from '../../types/category';
import { MONTH_NAMES_VI } from '../../utils/calendar';

interface CalendarHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  filters: CalendarFilterState;
  onFiltersChange: (filters: CalendarFilterState) => void;
  categories: Category[];
  onOpenCreateEvent: () => void;
  onOpenCreateTask: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  filters,
  onFiltersChange,
  categories,
  onOpenCreateEvent,
  onOpenCreateTask,
}) => {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handleToday = () => {
    onDateChange(new Date());
  };

  const handlePrev = () => {
    const nextDate = new Date(currentDate);
    if (viewMode === 'month') {
      nextDate.setMonth(nextDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      nextDate.setDate(nextDate.getDate() - 7);
    } else if (viewMode === 'day') {
      nextDate.setDate(nextDate.getDate() - 1);
    } else {
      nextDate.setDate(nextDate.getDate() - 14);
    }
    onDateChange(nextDate);
  };

  const handleNext = () => {
    const nextDate = new Date(currentDate);
    if (viewMode === 'month') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (viewMode === 'day') {
      nextDate.setDate(nextDate.getDate() + 1);
    } else {
      nextDate.setDate(nextDate.getDate() + 14);
    }
    onDateChange(nextDate);
  };

  const handleYearChange = (newYear: number) => {
    const d = new Date(currentDate);
    d.setFullYear(newYear);
    onDateChange(d);
  };

  const handleMonthChange = (newMonth: number) => {
    const d = new Date(currentDate);
    d.setMonth(newMonth);
    onDateChange(d);
  };

  // Title string depending on view
  const getHeaderTitle = () => {
    if (viewMode === 'day') {
      return `${currentDate.getDate()} ${MONTH_NAMES_VI[month]}, ${year}`;
    }
    return `${MONTH_NAMES_VI[month]}, ${year}`;
  };

  const viewModes: { id: CalendarViewMode; label: string }[] = [
    { id: 'month', label: 'Tháng' },
    { id: 'week', label: 'Tuần' },
    { id: 'day', label: 'Ngày' },
    { id: 'agenda', label: 'Lịch trình' },
  ];

  return (
    <div className="space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
      {/* Top Bar: Nav, Title, View Switcher, Add New Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Date navigation */}
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Hôm nay
          </Button>

          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Trước"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Sau"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Month / Year Title with Quick Selector */}
          <div className="relative">
            <button
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-lg font-bold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
                    Chọn nhanh Năm
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
                  {MONTH_NAMES_VI.map((mName, idx) => (
                    <button
                      key={mName}
                      onClick={() => {
                        handleMonthChange(idx);
                        setIsDatePickerOpen(false);
                      }}
                      className={`px-2 py-1.5 text-xs rounded-lg font-medium transition-colors ${
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
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
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
              className="flex items-center space-x-1"
            >
              <Plus className="w-4 h-4 mr-0.5" />
              <span>Thêm mới</span>
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
                      onOpenCreateEvent();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>Thêm Sự kiện</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsAddMenuOpen(false);
                      onOpenCreateTask();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Thêm Công việc</span>
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
            Hiển thị:
          </span>

          <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700 dark:text-slate-300 select-none">
            <input
              type="checkbox"
              checked={filters.showEvents}
              onChange={(e) =>
                onFiltersChange({ ...filters, showEvents: e.target.checked })
              }
              className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800"
            />
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>Sự kiện (Events)</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700 dark:text-slate-300 select-none">
            <input
              type="checkbox"
              checked={filters.showTasks}
              onChange={(e) =>
                onFiltersChange({ ...filters, showTasks: e.target.checked })
              }
              className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800"
            />
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Công việc (Tasks)</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700 dark:text-slate-300 select-none">
            <input
              type="checkbox"
              checked={filters.showGoals}
              onChange={(e) =>
                onFiltersChange({ ...filters, showGoals: e.target.checked })
              }
              className="rounded text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800"
            />
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>Mục tiêu (Goals)</span>
          </label>
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-500 dark:text-slate-400">Danh mục:</span>
          <select
            value={filters.categoryId || 'all'}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                categoryId: e.target.value === 'all' ? null : e.target.value,
              })
            }
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Tất cả danh mục</option>
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
