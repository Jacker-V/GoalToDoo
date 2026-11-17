import React, { useState } from 'react';
import {
  Check,
  Calendar,
  Clock,
  RotateCw,
  Flame,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Edit2,
  Trash2,
  Tag,
  Target,
  CheckSquare,
} from 'lucide-react';
import type { Task, Subtask } from '../../types/task';
import type { Goal } from '../../types/goal';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { formatDateVi } from '../../utils/date';

interface TaskItemProps {
  task: Task;
  goals?: Goal[];
  onToggleComplete: (task: Task) => void;
  onUpdateSubtasks: (task: Task, subtasks: Subtask[]) => void;
  onToggleRecurringToday?: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  goals = [],
  onToggleComplete,
  onUpdateSubtasks,
  onToggleRecurringToday,
  onEdit,
  onDelete,
}) => {
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isRecurring = task.recurrence && task.recurrence.type !== 'none';
  const hasSubtasks = Array.isArray(task.subtasks) && task.subtasks.length > 0;
  const completedSubtasksCount = hasSubtasks ? task.subtasks.filter((s) => s.done).length : 0;
  const subtasksPercent = hasSubtasks
    ? Math.round((completedSubtasksCount / task.subtasks.length) * 100)
    : 0;

  const linkedGoal = task.goalId ? goals.find((g) => g._id === task.goalId) : null;

  const isOverdue =
    task.dueDate &&
    !task.isCompleted &&
    new Date(task.dueDate).setHours(23, 59, 59, 999) < Date.now();

  const handleSubtaskToggle = (index: number) => {
    if (!task.subtasks) return;
    const updated = task.subtasks.map((s, idx) =>
      idx === index ? { ...s, done: !s.done } : s
    );
    onUpdateSubtasks(task, updated);
  };

  const handleCheckboxClick = () => {
    if (isRecurring && onToggleRecurringToday) {
      onToggleRecurringToday(task);
    } else {
      onToggleComplete(task);
    }
  };

  const isChecked = isRecurring ? !!task.isCompletedToday : task.isCompleted;

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md ${
        isChecked
          ? 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40'
          : isOverdue
          ? 'border-rose-200 dark:border-rose-900/60'
          : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
      }`}
    >
      <div className="p-4 flex items-start space-x-3.5">
        {/* Animated Checkbox */}
        <button
          type="button"
          onClick={handleCheckboxClick}
          className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all duration-200 flex-shrink-0 ${
            isChecked
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm scale-105'
              : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-400 bg-white dark:bg-slate-800'
          }`}
          title={isRecurring ? 'Đánh dấu hoàn thành hôm nay' : 'Đánh dấu hoàn thành'}
        >
          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3] animate-check" />}
        </button>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4
              className={`text-sm font-semibold transition-all duration-200 truncate ${
                isChecked
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-slate-800 dark:text-slate-100'
              }`}
            >
              {task.title}
            </h4>

            {/* Actions dropdown button */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-6 z-20 w-36 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 text-xs">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onEdit(task);
                      }}
                      className="w-full px-3 py-2 flex items-center space-x-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Chỉnh sửa</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDelete(task);
                      }}
                      className="w-full px-3 py-2 flex items-center space-x-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa task</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          {task.notes && (
            <p
              className={`text-xs mt-1 line-clamp-2 ${
                isChecked
                  ? 'text-slate-400 dark:text-slate-600 line-through'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {task.notes}
            </p>
          )}

          {/* Meta Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {/* Priority Badge */}
            {task.priority === 'high' && (
              <Badge variant="danger" size="sm">
                Ưu tiên cao
              </Badge>
            )}
            {task.priority === 'medium' && (
              <Badge variant="warning" size="sm">
                Trung bình
              </Badge>
            )}
            {task.priority === 'low' && (
              <Badge variant="default" size="sm">
                Thấp
              </Badge>
            )}

            {/* Recurring & Streak Badge */}
            {isRecurring && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <RotateCw className="w-3 h-3 animate-spin-slow" />
                <span>
                  {task.recurrence.type === 'daily'
                    ? 'Hàng ngày'
                    : task.recurrence.type === 'weekdays'
                    ? 'Ngày thường'
                    : 'Hàng tuần'}
                </span>
                {typeof task.streak === 'number' && task.streak > 0 && (
                  <span className="ml-1 flex items-center text-amber-600 dark:text-amber-400 font-extrabold">
                    <Flame className="w-3 h-3 fill-amber-500 text-amber-500 mr-0.5" />
                    {task.streak}
                  </span>
                )}
              </span>
            )}

            {/* Linked Goal Badge */}
            {linkedGoal && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <Target className="w-3 h-3 text-indigo-500" />
                <span className="truncate max-w-[130px]">{linkedGoal.title}</span>
              </span>
            )}

            {/* Due Date & Time Badge */}
            {task.dueDate && (
              <span
                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                  isOverdue
                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800'
                    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>{formatDateVi(task.dueDate)}</span>
                {task.dueTime && (
                  <>
                    <Clock className="w-3 h-3 ml-1" />
                    <span>{task.dueTime}</span>
                  </>
                )}
                {isOverdue && <span className="font-bold text-rose-600 ml-1">(Quá hạn)</span>}
              </span>
            )}

            {/* Tags */}
            {task.tags &&
              task.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80"
                >
                  <Tag className="w-2.5 h-2.5" />
                  <span>{tag}</span>
                </span>
              ))}

            {/* Subtasks Accordion Toggle */}
            {hasSubtasks && (
              <button
                type="button"
                onClick={() => setShowSubtasks(!showSubtasks)}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-auto"
              >
                <CheckSquare className="w-3 h-3 text-indigo-500" />
                <span>
                  {completedSubtasksCount}/{task.subtasks.length}
                </span>
                {showSubtasks ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
          </div>

          {/* Subtasks Mini Progress Bar */}
          {hasSubtasks && (
            <div className="mt-2.5">
              <ProgressBar value={subtasksPercent} size="sm" animate={true} />
            </div>
          )}

          {/* Subtasks Expanded Checklist */}
          {hasSubtasks && showSubtasks && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Checklist con ({completedSubtasksCount}/{task.subtasks.length})
              </div>
              {task.subtasks.map((st, idx) => (
                <div
                  key={st._id || idx}
                  className="flex items-center space-x-2.5 py-1 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs"
                >
                  <input
                    type="checkbox"
                    checked={st.done}
                    onChange={() => handleSubtaskToggle(idx)}
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                  />
                  <span
                    className={`flex-1 transition-all ${
                      st.done
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {st.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
