import React from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Tag,
  Target,
  Edit2,
  Trash2,
  ExternalLink,
  Repeat,
  CheckSquare,
  Square,
  Flame,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import type { CalendarEvent } from '../../types/event';
import type { Task } from '../../types/task';
import type { Goal } from '../../types/goal';
import type { Category } from '../../types/category';
import { formatDateVi } from '../../utils/date';
import { formatTimeHHmm } from '../../utils/calendar';
import { useNavigate } from 'react-router-dom';

export type CalendarSelectedType = 'event' | 'task' | 'goal';

export interface CalendarSelectedItem {
  type: CalendarSelectedType;
  item: CalendarEvent | Task | Goal;
}

interface CalendarItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: CalendarSelectedItem | null;
  categories?: Category[];
  onEditEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (event: CalendarEvent) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  onToggleTask?: (taskId: string) => void;
}

export const CalendarItemDetailModal: React.FC<CalendarItemDetailModalProps> = ({
  isOpen,
  onClose,
  selectedItem,
  categories = [],
  onEditEvent,
  onDeleteEvent,
  onEditTask,
  onDeleteTask,
  onToggleTask,
}) => {
  const navigate = useNavigate();

  if (!selectedItem) return null;

  const { type, item } = selectedItem;

  // --- RENDER EVENT DETAIL ---
  if (type === 'event') {
    const event = item as CalendarEvent;
    const cat = categories.find((c) => c._id === event.categoryId);

    const s = new Date(event.start);
    const e = new Date(event.end);
    const isSameDate = s.toDateString() === e.toDateString();

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Chi tiết sự kiện"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div
              className="w-4 h-4 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: event.color || '#6366f1' }}
            />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {event.title}
              </h3>
              {cat && (
                <div className="flex items-center space-x-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <Tag className="w-3.5 h-3.5" />
                  <span>{cat.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Time range */}
          <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <Clock className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <div>
              {event.allDay ? (
                <div>
                  <span className="font-semibold">Cả ngày</span> • {formatDateVi(event.start)}
                  {!isSameDate && ` - ${formatDateVi(event.end)}`}
                </div>
              ) : (
                <div>
                  <span className="font-semibold">
                    {formatTimeHHmm(s)} - {formatTimeHHmm(e)}
                  </span>{' '}
                  • {formatDateVi(event.start)}
                  {!isSameDate && ` - ${formatDateVi(event.end)}`}
                </div>
              )}
            </div>
          </div>

          {/* Recurrence badge */}
          {event.recurrence && event.recurrence.type !== 'none' && (
            <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
              <Repeat className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                Lặp lại: {event.recurrence.type === 'daily' && 'Hàng ngày'}
                {event.recurrence.type === 'weekdays' && 'Thứ 2 đến Thứ 6'}
                {event.recurrence.type === 'weekly' && 'Hàng tuần'}
                {event.recurrence.type === 'monthly' && 'Hàng tháng'}
                {event.recurrence.type === 'yearly' && 'Hàng năm'}
                {event.recurrence.endDate && ` (đến ${formatDateVi(event.recurrence.endDate)})`}
              </span>
            </div>
          )}

          {/* Reminders */}
          {event.reminders && event.reminders.length > 0 && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold">Nhắc nhở:</span>{' '}
              {event.reminders.map((r) => `${r} phút trước`).join(', ')}
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">
              {event.description}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                onClose();
                onDeleteEvent?.(event);
              }}
              className="flex items-center space-x-1"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Xóa
            </Button>
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onEditEvent?.(event);
                }}
                className="flex items-center space-x-1"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Sửa sự kiện
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // --- RENDER TASK DETAIL ---
  if (type === 'task') {
    const task = item as Task;
    const isDone = Boolean(task.isCompleted);

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Chi tiết công việc"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <button
              onClick={() => onToggleTask?.(task._id)}
              className="mt-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {isDone ? (
                <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
            <div className="flex-1">
              <h3
                className={`text-lg font-bold ${
                  isDone
                    ? 'line-through text-slate-400 dark:text-slate-500'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {task.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <Badge
                  variant={
                    task.priority === 'high'
                      ? 'danger'
                      : task.priority === 'medium'
                      ? 'warning'
                      : 'info'
                  }
                  size="sm"
                >
                  Ưu tiên {task.priority}
                </Badge>
                {task.streak && task.streak > 0 ? (
                  <span className="flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                    <Flame className="w-3.5 h-3.5 mr-1 text-amber-500" />
                    Chuỗi: {task.streak} ngày
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Due date info */}
          {task.dueDate && (
            <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <CalendarIcon className="w-4 h-4 text-indigo-500" />
              <span>
                Hạn chót: <span className="font-semibold">{formatDateVi(task.dueDate)}</span>
                {task.dueTime && ` lúc ${task.dueTime}`}
              </span>
            </div>
          )}

          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Checklist công việc phụ ({task.subtasks.filter((s) => s.done).length}/
                {task.subtasks.length})
              </span>
              <div className="space-y-1.5 pl-2">
                {task.subtasks.map((st, idx) => (
                  <div key={st._id || idx} className="flex items-center space-x-2 text-sm">
                    {st.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600" />
                    )}
                    <span
                      className={
                        st.done
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-700 dark:text-slate-300'
                      }
                    >
                      {st.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {task.notes && (
            <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">
              {task.notes}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                onClose();
                onDeleteTask?.(task);
              }}
              className="flex items-center space-x-1"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Xóa
            </Button>
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onEditTask?.(task);
                }}
                className="flex items-center space-x-1"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Sửa việc
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // --- RENDER GOAL DETAIL ---
  const goal = item as Goal;
  const progressPercent = Math.min(100, Math.max(0, goal.progressCache || 0));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chi tiết mục tiêu"
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <div
            className="w-4 h-4 rounded-md mt-1.5 flex-shrink-0"
            style={{ backgroundColor: goal.color || '#6366f1' }}
          />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {goal.title}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="outline" size="sm">
                Loại: {goal.type}
              </Badge>
              <Badge
                variant={
                  goal.status === 'completed'
                    ? 'success'
                    : goal.status === 'in_progress'
                    ? 'info'
                    : 'secondary'
                }
                size="sm"
              >
                {goal.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Multi-day date duration */}
        <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <Target className="w-4 h-4 text-indigo-500" />
          <span>
            Khoảng thời gian: <span className="font-semibold">{formatDateVi(goal.startDate)}</span>{' '}
            đến <span className="font-semibold">{formatDateVi(goal.endDate)}</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span>Tiến độ thực tế</span>
            <span>{progressPercent}%</span>
          </div>
          <ProgressBar progress={progressPercent} color={goal.color} size="md" />
          {goal.progressMode === 'numeric' && (
            <div className="text-xs text-slate-500 dark:text-slate-400 text-right">
              {goal.currentValue} / {goal.targetValue} {goal.unit || ''}
            </div>
          )}
        </div>

        {/* Description */}
        {goal.description && (
          <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">
            {goal.description}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Đóng
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onClose();
              navigate('/goals');
            }}
            className="flex items-center space-x-1"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Xem trong Mục tiêu
          </Button>
        </div>
      </div>
    </Modal>
  );
};
