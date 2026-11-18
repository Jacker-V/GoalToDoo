import React, { useState } from 'react';
import {
  Plus,
  CheckSquare,
  Square,
  Repeat,
  Target,
} from 'lucide-react';
import type { CalendarDayInfo } from '../../utils/calendar';
import { WEEKDAY_LABELS_VI, formatTimeHHmm, getItemDateStr } from '../../utils/calendar';
import type { CalendarEvent } from '../../types/event';
import type { Task } from '../../types/task';
import type { Goal } from '../../types/goal';
import type { CalendarFilterState } from '../../types/calendar';
import type { CalendarSelectedItem } from './CalendarItemDetailModal';

interface MonthViewProps {
  currentDate?: Date;
  days: CalendarDayInfo[];
  events: CalendarEvent[];
  tasks: Task[];
  goals: Goal[];
  filters: CalendarFilterState;
  onSelectItem: (item: CalendarSelectedItem) => void;
  onQuickAdd: (dateStr: string, timeStr?: string) => void;
  onToggleTask: (taskId: string) => void;
  onMoveItem: (type: 'task' | 'event', id: string, targetDateStr: string, targetTimeStr?: string) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  days,
  events,
  tasks,
  goals,
  filters,
  onSelectItem,
  onQuickAdd,
  onToggleTask,
  onMoveItem,
}) => {
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Group events by day (YYYY-MM-DD)
  // An event can fall on a day if its start date matches, or multi-day
  const eventsByDay = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    if (!filters.showEvents) return map;

    for (const ev of events) {
      const sDate = getItemDateStr(ev.start);
      if (!map.has(sDate)) map.set(sDate, []);
      map.get(sDate)!.push(ev);
    }
    return map;
  }, [events, filters.showEvents]);

  // Group tasks by dueDate (YYYY-MM-DD)
  const tasksByDay = React.useMemo(() => {
    const map = new Map<string, Task[]>();
    if (!filters.showTasks) return map;

    for (const t of tasks) {
      if (t.dueDate) {
        const dDate = getItemDateStr(t.dueDate);
        if (!map.has(dDate)) map.set(dDate, []);
        map.get(dDate)!.push(t);
      }
    }
    return map;
  }, [tasks, filters.showTasks]);

  // Goals spanning each day
  const goalsByDay = React.useMemo(() => {
    const map = new Map<string, Goal[]>();
    if (!filters.showGoals) return map;

    for (const g of goals) {
      const gStart = getItemDateStr(g.startDate);
      const gEnd = getItemDateStr(g.endDate);
      for (const day of days) {
        if (day.dateStr >= gStart && day.dateStr <= gEnd) {
          if (!map.has(day.dateStr)) map.set(day.dateStr, []);
          map.get(day.dateStr)!.push(g);
        }
      }
    }
    return map;
  }, [goals, days, filters.showGoals]);

  // Drag handlers
  const handleDragStart = (
    e: React.DragEvent,
    type: 'event' | 'task',
    id: string
  ) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ type, id })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDate !== dateStr) {
      setDragOverDate(dateStr);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDate(null);
  };

  const handleDrop = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    setDragOverDate(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type && data.id) {
        onMoveItem(data.type, data.id, targetDateStr);
      }
    } catch (err) {
      console.error('Drag drop parse error:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* 7-Day Header (T2 - CN) */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-center py-2.5">
        {WEEKDAY_LABELS_VI.map((label, idx) => (
          <div
            key={label}
            className={`text-xs font-bold uppercase tracking-wider ${
              idx >= 5
                ? 'text-rose-500 dark:text-rose-400'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grid of Day Cells */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/60">
        {days.map((day) => {
          const dayEvents = eventsByDay.get(day.dateStr) || [];
          const dayTasks = tasksByDay.get(day.dateStr) || [];
          const dayGoals = goalsByDay.get(day.dateStr) || [];

          const completedTasksCount = dayTasks.filter((t) => t.isCompleted).length;
          const totalTasksCount = dayTasks.length;
          const isOver = dragOverDate === day.dateStr;

          return (
            <div
              key={day.dateStr}
              onDragOver={(e) => handleDragOver(e, day.dateStr)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day.dateStr)}
              className={`min-h-[110px] sm:min-h-[130px] p-1.5 sm:p-2 transition-colors flex flex-col group relative ${
                !day.isCurrentMonth
                  ? 'bg-slate-50/50 dark:bg-slate-950/30 text-slate-400 dark:text-slate-600'
                  : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
              } ${isOver ? 'ring-2 ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30' : ''}`}
            >
              {/* Day Cell Header: Number + Mini Task Progress + Quick Add Button */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1.5">
                  <span
                    className={`inline-flex items-center justify-center text-xs font-bold rounded-full w-6 h-6 ${
                      day.isToday
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : day.isCurrentMonth
                        ? 'text-slate-700 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  {/* Mini Task Progress Badge */}
                  {totalTasksCount > 0 && (
                    <span
                      title={`${completedTasksCount}/${totalTasksCount} công việc hoàn thành`}
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                        completedTasksCount === totalTasksCount
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {completedTasksCount}/{totalTasksCount}
                    </span>
                  )}
                </div>

                {/* Quick Add Button on Hover */}
                <button
                  type="button"
                  onClick={() => onQuickAdd(day.dateStr)}
                  title="Thêm nhanh tại ngày này"
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Items Container */}
              <div className="flex-1 space-y-1 overflow-hidden">
                {/* 1. Multi-day Goal Bars (up to 2) */}
                {dayGoals.slice(0, 2).map((goal) => (
                  <div
                    key={goal._id}
                    onClick={() => onSelectItem({ type: 'goal', item: goal })}
                    className="truncate text-[10px] font-semibold px-1.5 py-0.5 rounded text-white cursor-pointer shadow-xs transition-opacity hover:opacity-90 flex items-center space-x-1"
                    style={{ backgroundColor: goal.color || '#8b5cf6' }}
                    title={`Mục tiêu: ${goal.title} (${goal.progressCache || 0}%)`}
                  >
                    <Target className="w-2.5 h-2.5 flex-shrink-0" />
                    <span className="truncate">{goal.title}</span>
                  </div>
                ))}

                {/* 2. Events & Tasks up to MAX_REMAINING */}
                {(() => {
                  const renderedGoalsCount = Math.min(dayGoals.length, 2);
                  const maxEventsAndTasks = Math.max(1, 4 - renderedGoalsCount);
                  const combinedItems: Array<
                    | { kind: 'event'; item: CalendarEvent }
                    | { kind: 'task'; item: Task }
                  > = [
                    ...dayEvents.map((e) => ({ kind: 'event' as const, item: e })),
                    ...dayTasks.map((t) => ({ kind: 'task' as const, item: t })),
                  ];
                  const displayed = combinedItems.slice(0, maxEventsAndTasks);
                  const totalItems = dayGoals.length + dayEvents.length + dayTasks.length;
                  const totalDisplayed = renderedGoalsCount + displayed.length;
                  const remainingCount = totalItems - totalDisplayed;

                  return (
                    <>
                      {displayed.map((entry) => {
                        if (entry.kind === 'event') {
                          const event = entry.item;
                          const s = new Date(event.start);
                          const timeStr = event.allDay ? 'Cả ngày' : formatTimeHHmm(s);

                          return (
                            <div
                              key={event.instanceId || event._id}
                              draggable
                              onDragStart={(e) =>
                                handleDragStart(e, 'event', event.originalId || event._id)
                              }
                              onClick={() => onSelectItem({ type: 'event', item: event })}
                              className="group/item flex items-center space-x-1 text-[11px] px-1.5 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all truncate"
                              style={{
                                backgroundColor: `${event.color || '#6366f1'}15`,
                                color: event.color || '#6366f1',
                              }}
                              title={`${event.title} (${timeStr})`}
                            >
                              <div
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: event.color || '#6366f1' }}
                              />
                              <span className="font-semibold text-[10px] opacity-80 flex-shrink-0">
                                {timeStr}
                              </span>
                              <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                                {event.title}
                              </span>
                              {event.recurrence && event.recurrence.type !== 'none' && (
                                <Repeat className="w-2.5 h-2.5 opacity-60 flex-shrink-0 ml-auto" />
                              )}
                            </div>
                          );
                        } else {
                          const task = entry.item;
                          const isDone = Boolean(task.isCompleted);

                          return (
                            <div
                              key={task._id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, 'task', task._id)}
                              className={`flex items-center space-x-1 text-[11px] px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors border border-slate-100 dark:border-slate-800 ${
                                isDone ? 'opacity-50' : ''
                              }`}
                            >
                              {/* Direct completion checkbox */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleTask(task._id);
                                }}
                                className="text-slate-400 hover:text-indigo-600 transition-colors flex-shrink-0"
                              >
                                {isDone ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                ) : (
                                  <Square className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <span
                                onClick={() => onSelectItem({ type: 'task', item: task })}
                                className={`truncate flex-1 font-medium ${
                                  isDone
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-slate-800 dark:text-slate-200'
                                }`}
                                title={task.title}
                              >
                                {task.title}
                              </span>

                              {task.priority === 'high' && (
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                              )}
                            </div>
                          );
                        }
                      })}

                      {/* More items indicator */}
                      {remainingCount > 0 && (
                        <div
                          onClick={() => onQuickAdd(day.dateStr)}
                          className="text-[10px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer text-center font-medium pt-0.5"
                        >
                          +{remainingCount} mục khác
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
