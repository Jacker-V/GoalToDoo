import React from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckSquare,
  Square,
  Target,
  Plus,
} from 'lucide-react';
import type { CalendarEvent } from '../../types/event';
import type { Task } from '../../types/task';
import type { Goal } from '../../types/goal';
import type { CalendarFilterState } from '../../types/calendar';
import type { CalendarSelectedItem } from './CalendarItemDetailModal';
import { formatLocalDate } from '../../utils/date';
import { formatTimeHHmm, getItemDateStr } from '../../utils/calendar';

interface AgendaViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  tasks: Task[];
  goals: Goal[];
  filters: CalendarFilterState;
  onSelectItem: (item: CalendarSelectedItem) => void;
  onQuickAdd: (dateStr: string) => void;
  onToggleTask: (taskId: string) => void;
  onMoveItem?: (type: 'task' | 'event', id: string, targetDateStr: string, targetTimeStr?: string) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  currentDate,
  events,
  tasks,
  goals,
  filters,
  onSelectItem,
  onQuickAdd,
  onToggleTask,
}) => {
  const todayStr = formatLocalDate(new Date());

  // Group all items by date string (YYYY-MM-DD)
  // Look forward 30 days from currentDate
  const daysAgenda = React.useMemo(() => {
    const datesMap = new Map<
      string,
      {
        date: Date;
        events: CalendarEvent[];
        tasks: Task[];
        goals: Goal[];
      }
    >();

    // Generate 30 days range
    for (let i = 0; i < 30; i++) {
      const d = new Date(currentDate);
      d.setDate(currentDate.getDate() + i);
      const dStr = formatLocalDate(d);
      datesMap.set(dStr, {
        date: d,
        events: [],
        tasks: [],
        goals: [],
      });
    }

    // Distribute events
    if (filters.showEvents) {
      for (const e of events) {
        const sDate = getItemDateStr(e.start);
        if (datesMap.has(sDate)) {
          datesMap.get(sDate)!.events.push(e);
        }
      }
    }

    // Distribute tasks
    if (filters.showTasks) {
      for (const t of tasks) {
        if (t.dueDate) {
          const dDate = getItemDateStr(t.dueDate);
          if (datesMap.has(dDate)) {
            datesMap.get(dDate)!.tasks.push(t);
          }
        }
      }
    }

    // Distribute goals
    if (filters.showGoals) {
      for (const g of goals) {
        const gStart = getItemDateStr(g.startDate);
        const gEnd = getItemDateStr(g.endDate);
        datesMap.forEach((entry, dStr) => {
          if (dStr >= gStart && dStr <= gEnd) {
            entry.goals.push(g);
          }
        });
      }
    }

    // Filter out empty days, or keep days with items
    const result: Array<{
      dateStr: string;
      date: Date;
      events: CalendarEvent[];
      tasks: Task[];
      goals: Goal[];
    }> = [];

    datesMap.forEach((entry, dStr) => {
      if (entry.events.length > 0 || entry.tasks.length > 0 || entry.goals.length > 0) {
        result.push({
          dateStr: dStr,
          ...entry,
        });
      }
    });

    return result;
  }, [currentDate, events, tasks, goals, filters]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 space-y-4">
      {daysAgenda.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <CalendarIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">
            Không có lịch trình nào trong 30 ngày tới
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Hãy bắt đầu lên kế hoạch bằng cách tạo các sự kiện hoặc công việc mới.
          </p>
          <button
            onClick={() => onQuickAdd(formatLocalDate(currentDate))}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo sự kiện hoặc công việc</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {daysAgenda.map((dayGroup) => {
            const isToday = dayGroup.dateStr === todayStr;

            return (
              <div
                key={dayGroup.dateStr}
                className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800/80 last:border-b-0"
              >
                {/* Date Header */}
                <div className="flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs py-1 z-10">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-sm font-bold ${
                        isToday
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {dayGroup.date.toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                    {isToday && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        Hôm nay
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onQuickAdd(dayGroup.dateStr)}
                    className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Thêm mục vào ngày này"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Goals */}
                {dayGroup.goals.length > 0 && (
                  <div className="flex flex-wrap gap-2 pl-2">
                    {dayGroup.goals.map((g) => (
                      <div
                        key={g._id}
                        onClick={() => onSelectItem({ type: 'goal', item: g })}
                        className="text-xs px-2.5 py-1 rounded-lg text-white font-semibold cursor-pointer hover:opacity-90 flex items-center space-x-1.5 shadow-xs"
                        style={{ backgroundColor: g.color || '#8b5cf6' }}
                      >
                        <Target className="w-3.5 h-3.5" />
                        <span>Mục tiêu: {g.title}</span>
                        <span className="opacity-80">({g.progressCache || 0}%)</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Events list */}
                {dayGroup.events.length > 0 && (
                  <div className="space-y-1.5 pl-2">
                    {dayGroup.events.map((e) => {
                      const s = new Date(e.start);
                      const end = new Date(e.end);

                      return (
                        <div
                          key={e.instanceId || e._id}
                          onClick={() => onSelectItem({ type: 'event', item: e })}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors flex items-start space-x-3"
                        >
                          <div
                            className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                            style={{ backgroundColor: e.color || '#6366f1' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {e.title}
                              </h5>
                              <div className="flex items-center space-x-1 text-xs text-slate-500 flex-shrink-0">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {e.allDay
                                    ? 'Cả ngày'
                                    : `${formatTimeHHmm(s)} - ${formatTimeHHmm(end)}`}
                                </span>
                              </div>
                            </div>
                            {e.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {e.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tasks list */}
                {dayGroup.tasks.length > 0 && (
                  <div className="space-y-1.5 pl-2">
                    {dayGroup.tasks.map((t) => {
                      const isDone = Boolean(t.isCompleted);

                      return (
                        <div
                          key={t._id}
                          className={`p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-start space-x-3 transition-colors ${
                            isDone ? 'opacity-50' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => onToggleTask(t._id)}
                            className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors flex-shrink-0"
                          >
                            {isDone ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>

                          <div
                            onClick={() => onSelectItem({ type: 'task', item: t })}
                            className="flex-1 min-w-0 cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <h5
                                className={`text-sm font-semibold truncate ${
                                  isDone
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {t.title}
                              </h5>
                              {t.dueTime && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex-shrink-0">
                                  {t.dueTime}
                                </span>
                              )}
                            </div>
                            {t.subtasks && t.subtasks.length > 0 && (
                              <div className="text-xs text-slate-400 mt-0.5">
                                {t.subtasks.filter((st) => st.done).length}/
                                {t.subtasks.length} mục đã làm
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
