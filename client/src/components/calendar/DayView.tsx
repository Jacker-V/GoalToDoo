import React, { useRef, useEffect, useState } from 'react';
import {
  Clock,
  CheckSquare,
  Square,
  Target,
  Repeat,
  Plus,
  Tag,
  AlertCircle,
  Flame,
} from 'lucide-react';
import type { CalendarEvent } from '../../types/event';
import type { Task } from '../../types/task';
import type { Goal } from '../../types/goal';
import type { CalendarFilterState } from '../../types/calendar';
import type { CalendarSelectedItem } from './CalendarItemDetailModal';
import { formatLocalDate, formatDateVi } from '../../utils/date';
import { formatTimeHHmm } from '../../utils/calendar';

interface DayViewProps {
  currentDate: Date;
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
const HOUR_HEIGHT = 56; // px per hour

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
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
  const dateStr = formatLocalDate(currentDate);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 8 * HOUR_HEIGHT;
    }
  }, [currentDate]);

  // Filter events for this day
  const dayEvents = React.useMemo(() => {
    if (!filters.showEvents) return [];
    return events.filter((e) => {
      const sDate = e.start.split('T')[0];
      return sDate === dateStr;
    });
  }, [events, dateStr, filters.showEvents]);

  // Filter tasks for this day
  const dayTasks = React.useMemo(() => {
    if (!filters.showTasks) return [];
    return tasks.filter((t) => t.dueDate?.split('T')[0] === dateStr);
  }, [tasks, dateStr, filters.showTasks]);

  // Filter goals active on this day
  const activeGoals = React.useMemo(() => {
    if (!filters.showGoals) return [];
    return goals.filter((g) => {
      const gStart = g.startDate.split('T')[0];
      const gEnd = g.endDate.split('T')[0];
      return dateStr >= gStart && dateStr <= gEnd;
    });
  }, [goals, dateStr, filters.showGoals]);

  const allDayEvents = dayEvents.filter((e) => e.allDay);
  const timedEvents = dayEvents.filter((e) => !e.allDay);

  const handleDragStart = (e: React.DragEvent, type: 'event' | 'task', id: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type, id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverHour !== hour) setDragOverHour(hour);
  };

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    setDragOverHour(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type && data.id) {
        const timeStr = `${String(hour).padStart(2, '0')}:00`;
        onMoveItem(data.type, data.id, dateStr, timeStr);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[750px]">
      {/* Header Info */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-base font-bold text-slate-900 dark:text-white">
            {currentDate.toLocaleDateString('vi-VN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ({dayEvents.length} sự kiện • {dayTasks.length} việc)
          </span>
        </div>
        <button
          onClick={() => onQuickAdd(dateStr)}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
        >
          <Plus className="w-4 h-4 mr-1" />
          Thêm sự kiện / việc
        </button>
      </div>

      {/* Active Goals Bar if any */}
      {activeGoals.length > 0 && (
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-purple-50/40 dark:bg-purple-950/20 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center">
            <Target className="w-3.5 h-3.5 mr-1" />
            Mục tiêu đang diễn ra:
          </span>
          {activeGoals.map((g) => (
            <div
              key={g._id}
              onClick={() => onSelectItem({ type: 'goal', item: g })}
              className="text-xs px-2.5 py-1 rounded-full text-white font-semibold cursor-pointer hover:opacity-90 shadow-xs flex items-center space-x-1"
              style={{ backgroundColor: g.color || '#8b5cf6' }}
            >
              <span>{g.title}</span>
              <span className="opacity-80">({g.progressCache || 0}%)</span>
            </div>
          ))}
        </div>
      )}

      {/* All-Day Events */}
      {allDayEvents.length > 0 && (
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Cả ngày:</span>
          {allDayEvents.map((e) => (
            <div
              key={e.instanceId || e._id}
              onClick={() => onSelectItem({ type: 'event', item: e })}
              className="text-xs px-2.5 py-1 rounded-lg text-white font-semibold cursor-pointer hover:opacity-90"
              style={{ backgroundColor: e.color || '#6366f1' }}
            >
              {e.title}
            </div>
          ))}
        </div>
      )}

      {/* Main 2-Column Schedule: Left = Timed Events & Slots, Right = Tasks of the Day */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
        {/* Left 2 Cols: 24h Timeline */}
        <div ref={containerRef} className="md:col-span-2 overflow-y-auto relative">
          <div className="grid grid-cols-[64px_1fr] relative">
            {/* Hours */}
            <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 select-none">
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{ height: `${HOUR_HEIGHT}px` }}
                  className="text-xs font-medium text-slate-400 text-right pr-2 pt-1 border-b border-slate-100 dark:border-slate-800/40"
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Time Slot column */}
            <div className="relative">
              {HOURS.map((h) => {
                const isOver = dragOverHour === h;
                return (
                  <div
                    key={h}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    onDragOver={(e) => handleDragOver(e, h)}
                    onDragLeave={() => setDragOverHour(null)}
                    onDrop={(e) => handleDrop(e, h)}
                    onClick={() =>
                      onQuickAdd(dateStr, `${String(h).padStart(2, '0')}:00`)
                    }
                    className={`border-b border-slate-100 dark:border-slate-800/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors relative group/slot ${
                      isOver ? 'bg-indigo-100/40 dark:bg-indigo-950/40 ring-1 ring-inset ring-indigo-500' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickAdd(dateStr, `${String(h).padStart(2, '0')}:00`);
                      }}
                      className="opacity-0 group-hover/slot:opacity-100 absolute top-1 right-2 p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all z-10"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {/* Event blocks */}
              {timedEvents.map((event) => {
                const s = new Date(event.start);
                const e = new Date(event.end);
                const startHour = s.getHours();
                const startMin = s.getMinutes();

                const top = (startHour + startMin / 60) * HOUR_HEIGHT;
                const durationHours = Math.max(
                  0.5,
                  (e.getTime() - s.getTime()) / (1000 * 60 * 60)
                );
                const height = Math.max(36, durationHours * HOUR_HEIGHT);

                return (
                  <div
                    key={event.instanceId || event._id}
                    draggable
                    onDragStart={(evt) =>
                      handleDragStart(evt, 'event', event.originalId || event._id)
                    }
                    onClick={() => onSelectItem({ type: 'event', item: event })}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      backgroundColor: event.color || '#6366f1',
                    }}
                    className="absolute left-2 right-2 rounded-xl p-2.5 text-white shadow-md cursor-pointer hover:brightness-110 transition-all overflow-hidden z-10 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm truncate">{event.title}</span>
                        {event.recurrence && event.recurrence.type !== 'none' && (
                          <Repeat className="w-3.5 h-3.5 opacity-80" />
                        )}
                      </div>
                      <div className="text-xs opacity-90 flex items-center space-x-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>
                          {formatTimeHHmm(s)} - {formatTimeHHmm(e)}
                        </span>
                      </div>
                    </div>
                    {event.description && (
                      <p className="text-xs opacity-80 truncate mt-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Tasks of the Day */}
        <div className="overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Công việc trong ngày ({dayTasks.length})
            </h4>
            <span className="text-xs text-slate-500">
              {dayTasks.filter((t) => t.isCompleted).length} xong
            </span>
          </div>

          {dayTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Không có công việc nào có hạn chót trong ngày này.
            </div>
          ) : (
            <div className="space-y-2">
              {dayTasks.map((task) => {
                const isDone = Boolean(task.isCompleted);

                return (
                  <div
                    key={task._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'task', task._id)}
                    className={`p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-start space-x-2.5 hover:border-slate-300 dark:hover:border-slate-600 transition-colors ${
                      isDone ? 'opacity-60' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleTask(task._id)}
                      className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors flex-shrink-0"
                    >
                      {isDone ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <div
                      onClick={() => onSelectItem({ type: 'task', item: task })}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <h5
                        className={`text-sm font-semibold truncate ${
                          isDone
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {task.title}
                      </h5>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                        {task.dueTime && (
                          <span className="flex items-center text-indigo-600 dark:text-indigo-400 font-semibold">
                            <Clock className="w-3 h-3 mr-0.5" />
                            {task.dueTime}
                          </span>
                        )}
                        {task.subtasks && task.subtasks.length > 0 && (
                          <span>
                            {task.subtasks.filter((s) => s.done).length}/
                            {task.subtasks.length} subtasks
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
