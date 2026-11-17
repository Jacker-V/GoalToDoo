import React, { useState, useRef, useEffect } from 'react';
import {
  Clock,
  CheckSquare,
  Square,
  Target,
  Repeat,
  Plus,
} from 'lucide-react';
import type { CalendarDayInfo } from '../../utils/calendar';
import { WEEKDAY_LABELS_VI, formatTimeHHmm, getItemDateStr } from '../../utils/calendar';
import type { CalendarEvent } from '../../types/event';
import type { Task } from '../../types/task';
import type { Goal } from '../../types/goal';
import type { CalendarFilterState } from '../../types/calendar';
import type { CalendarSelectedItem } from './CalendarItemDetailModal';

interface WeekViewProps {
  days: CalendarDayInfo[]; // 7 days (Mon-Sun)
  events: CalendarEvent[];
  tasks: Task[];
  goals: Goal[];
  filters: CalendarFilterState;
  onSelectItem: (item: CalendarSelectedItem) => void;
  onQuickAdd: (dateStr: string, timeStr?: string) => void;
  onToggleTask: (taskId: string) => void;
  onMoveItem: (type: 'event' | 'task', id: string, targetDateStr: string, targetTimeStr?: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 48; // px per hour

export const WeekView: React.FC<WeekViewProps> = ({
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOverCell, setDragOverCell] = useState<{ dateStr: string; hour: number } | null>(null);

  // Auto-scroll to 08:00 on mount
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 8 * HOUR_HEIGHT;
    }
  }, []);

  // Filter all-day events vs timed events
  const allDayEvents = React.useMemo(() => {
    if (!filters.showEvents) return [];
    return events.filter((e) => e.allDay);
  }, [events, filters.showEvents]);

  const timedEvents = React.useMemo(() => {
    if (!filters.showEvents) return [];
    return events.filter((e) => !e.allDay);
  }, [events, filters.showEvents]);

  // Tasks without time vs with dueTime
  const timedTasks = React.useMemo(() => {
    if (!filters.showTasks) return [];
    return tasks.filter((t) => t.dueDate && t.dueTime);
  }, [tasks, filters.showTasks]);

  const allDayTasks = React.useMemo(() => {
    if (!filters.showTasks) return [];
    return tasks.filter((t) => t.dueDate && !t.dueTime);
  }, [tasks, filters.showTasks]);

  // Goals intersecting this week
  const weekStartStr = days[0]?.dateStr;
  const weekEndStr = days[6]?.dateStr;
  const activeGoals = React.useMemo(() => {
    if (!filters.showGoals || !weekStartStr || !weekEndStr) return [];
    return goals.filter((g) => {
      const gStart = getItemDateStr(g.startDate);
      const gEnd = getItemDateStr(g.endDate);
      return gStart <= weekEndStr && gEnd >= weekStartStr;
    });
  }, [goals, weekStartStr, weekEndStr, filters.showGoals]);

  // Current time marker
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeTop = (currentHour + currentMinute / 60) * HOUR_HEIGHT;

  // Drag Handlers
  const handleDragStart = (
    e: React.DragEvent,
    type: 'event' | 'task',
    id: string
  ) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type, id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCell?.dateStr !== dateStr || dragOverCell?.hour !== hour) {
      setDragOverCell({ dateStr, hour });
    }
  };

  const handleDrop = (e: React.DragEvent, dateStr: string, hour: number) => {
    e.preventDefault();
    setDragOverCell(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type && data.id) {
        const timeStr = `${String(hour).padStart(2, '0')}:00`;
        onMoveItem(data.type, data.id, dateStr, timeStr);
      }
    } catch (err) {
      console.error('Drag drop parse error:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[750px]">
      {/* 1. Header with 7 Day Columns */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 sticky top-0 z-20">
        <div className="p-2 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs text-slate-400 font-semibold">
          GMT+7
        </div>
        {days.map((day, idx) => (
          <div
            key={day.dateStr}
            className={`p-2 text-center border-r border-slate-200 dark:border-slate-800 last:border-r-0 ${
              day.isToday ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''
            }`}
          >
            <div
              className={`text-xs font-bold uppercase tracking-wider ${
                idx >= 5
                  ? 'text-rose-500 dark:text-rose-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {WEEKDAY_LABELS_VI[idx]}
            </div>
            <div
              className={`inline-flex items-center justify-center text-sm font-bold rounded-full w-7 h-7 mt-0.5 ${
                day.isToday
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-800 dark:text-slate-200'
              }`}
            >
              {day.dayNumber}
            </div>
          </div>
        ))}
      </div>

      {/* 2. Top All-Day & Multi-Day Goals Section */}
      {(activeGoals.length > 0 || allDayEvents.length > 0 || allDayTasks.length > 0) && (
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs">
          <div className="p-2 border-r border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 flex items-center justify-center">
            Cả ngày
          </div>
          {days.map((day) => {
            const dayAllDayEvents = allDayEvents.filter(
              (e) => getItemDateStr(e.start) === day.dateStr
            );
            const dayAllDayTasks = allDayTasks.filter(
              (t) => getItemDateStr(t.dueDate) === day.dateStr
            );
            const dayGoals = activeGoals.filter((g) => {
              const gStart = getItemDateStr(g.startDate);
              const gEnd = getItemDateStr(g.endDate);
              return day.dateStr >= gStart && day.dateStr <= gEnd;
            });

            return (
              <div
                key={`allday-${day.dateStr}`}
                className="p-1 border-r border-slate-200 dark:border-slate-800 last:border-r-0 space-y-1 min-h-[44px]"
              >
                {/* Multi-day goals */}
                {dayGoals.map((g) => (
                  <div
                    key={g._id}
                    onClick={() => onSelectItem({ type: 'goal', item: g })}
                    className="truncate text-[10px] font-semibold px-1 py-0.5 rounded text-white cursor-pointer hover:opacity-90 flex items-center space-x-1"
                    style={{ backgroundColor: g.color || '#8b5cf6' }}
                    title={`Mục tiêu: ${g.title}`}
                  >
                    <Target className="w-2.5 h-2.5 flex-shrink-0" />
                    <span className="truncate">{g.title}</span>
                  </div>
                ))}

                {/* All-day events */}
                {dayAllDayEvents.map((e) => (
                  <div
                    key={e.instanceId || e._id}
                    onClick={() => onSelectItem({ type: 'event', item: e })}
                    className="truncate text-[10px] font-semibold px-1 py-0.5 rounded text-white cursor-pointer hover:opacity-90"
                    style={{ backgroundColor: e.color || '#6366f1' }}
                    title={e.title}
                  >
                    {e.title}
                  </div>
                ))}

                {/* All-day tasks */}
                {dayAllDayTasks.map((t) => (
                  <div
                    key={t._id}
                    className="flex items-center space-x-1 text-[10px] px-1 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 truncate"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleTask(t._id)}
                      className="text-slate-400 hover:text-indigo-600"
                    >
                      {t.isCompleted ? (
                        <CheckSquare className="w-3 h-3 text-indigo-600" />
                      ) : (
                        <Square className="w-3 h-3" />
                      )}
                    </button>
                    <span
                      onClick={() => onSelectItem({ type: 'task', item: t })}
                      className={`truncate cursor-pointer ${
                        t.isCompleted ? 'line-through text-slate-400' : ''
                      }`}
                    >
                      {t.title}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. 24-Hour Scrollable Grid */}
      <div ref={containerRef} className="flex-1 overflow-y-auto relative">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
          {/* Hour labels */}
          <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40 select-none">
            {HOURS.map((h) => (
              <div
                key={h}
                style={{ height: `${HOUR_HEIGHT}px` }}
                className="text-[11px] font-medium text-slate-400 text-right pr-2 pt-1 border-b border-slate-100 dark:border-slate-800/40"
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* 7 Day Columns with Hour Grid */}
          {days.map((day) => {
            const dayStr = day.dateStr;
            const dayEvents = timedEvents.filter(
              (e) => getItemDateStr(e.start) === dayStr
            );
            const dayTasks = timedTasks.filter(
              (t) => getItemDateStr(t.dueDate) === dayStr
            );

            return (
              <div
                key={dayStr}
                className="relative border-r border-slate-200 dark:border-slate-800 last:border-r-0"
              >
                {/* 24 Hour slot backgrounds */}
                {HOURS.map((h) => {
                  const isSlotOver =
                    dragOverCell?.dateStr === dayStr && dragOverCell?.hour === h;

                  return (
                    <div
                      key={h}
                      style={{ height: `${HOUR_HEIGHT}px` }}
                      onDragOver={(e) => handleDragOver(e, dayStr, h)}
                      onDragLeave={() => setDragOverCell(null)}
                      onDrop={(e) => handleDrop(e, dayStr, h)}
                      onClick={() =>
                        onQuickAdd(dayStr, `${String(h).padStart(2, '0')}:00`)
                      }
                      className={`border-b border-slate-100 dark:border-slate-800/40 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors relative group/slot ${
                        isSlotOver
                          ? 'bg-indigo-100/40 dark:bg-indigo-950/40 ring-1 ring-inset ring-indigo-500'
                          : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickAdd(dayStr, `${String(h).padStart(2, '0')}:00`);
                        }}
                        className="opacity-0 group-hover/slot:opacity-100 absolute top-1 right-1 p-0.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all z-10"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}

                {/* Current Time Indicator line */}
                {day.isToday && (
                  <div
                    style={{ top: `${currentTimeTop}px` }}
                    className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1.5" />
                    <div className="flex-1 h-[2px] bg-rose-500" />
                  </div>
                )}

                {/* Events positioned as time blocks */}
                {dayEvents.map((event) => {
                  const s = new Date(event.start);
                  const e = new Date(event.end);
                  const startHour = s.getHours();
                  const startMin = s.getMinutes();
                  const endHour = e.getHours();
                  const endMin = e.getMinutes();

                  const top = (startHour + startMin / 60) * HOUR_HEIGHT;
                  const durationHours = Math.max(
                    0.4,
                    (e.getTime() - s.getTime()) / (1000 * 60 * 60)
                  );
                  const height = Math.max(26, durationHours * HOUR_HEIGHT);

                  return (
                    <div
                      key={event.instanceId || event._id}
                      draggable
                      onDragStart={(evt) =>
                        handleDragStart(
                          evt,
                          'event',
                          event.originalId || event._id
                        )
                      }
                      onClick={(evt) => {
                        evt.stopPropagation();
                        onSelectItem({ type: 'event', item: event });
                      }}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        backgroundColor: event.color || '#6366f1',
                      }}
                      className="absolute left-1 right-1 rounded-lg px-2 py-1 text-white shadow-sm cursor-pointer hover:brightness-110 transition-all overflow-hidden z-10 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate">
                          {event.title}
                        </span>
                        {event.recurrence && event.recurrence.type !== 'none' && (
                          <Repeat className="w-2.5 h-2.5 opacity-80 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] opacity-90 truncate">
                        {formatTimeHHmm(s)} - {formatTimeHHmm(e)}
                      </div>
                    </div>
                  );
                })}

                {/* Timed Tasks positioned at dueTime */}
                {dayTasks.map((task) => {
                  if (!task.dueTime) return null;
                  const [th, tm] = task.dueTime.split(':').map(Number);
                  const top = ((th || 0) + (tm || 0) / 60) * HOUR_HEIGHT;
                  const isDone = Boolean(task.isCompleted);

                  return (
                    <div
                      key={task._id}
                      draggable
                      onDragStart={(evt) => handleDragStart(evt, 'task', task._id)}
                      onClick={(evt) => {
                        evt.stopPropagation();
                        onSelectItem({ type: 'task', item: task });
                      }}
                      style={{ top: `${top}px` }}
                      className={`absolute left-1 right-1 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 border-2 border-emerald-500 shadow-sm cursor-pointer z-10 flex items-center space-x-1.5 ${
                        isDone ? 'opacity-50 line-through' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(evt) => {
                          evt.stopPropagation();
                          onToggleTask(task._id);
                        }}
                        className="text-slate-400 hover:text-emerald-600 flex-shrink-0"
                      >
                        {isDone ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate flex-1">
                        {task.title}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        {task.dueTime}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
