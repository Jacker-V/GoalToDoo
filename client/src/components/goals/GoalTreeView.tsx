import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Target,
  CheckSquare,
  AlertTriangle,
  Clock,
  Plus,
  Check,
  Edit2,
  Trash2,
  RotateCw,
  Flame,
  ChevronsDown,
  ChevronsUp,
} from 'lucide-react';
import type { GoalTreeNode, Goal } from '../../types/goal';
import type { Task } from '../../types/task';
import type { Category } from '../../types/category';
import { ProgressBar } from '../ui/ProgressBar';
import { NumericGoalControls } from './NumericGoalControls';
import { formatDateVi } from '../../utils/date';

interface GoalTreeViewProps {
  tree: GoalTreeNode[];
  categories?: Category[];
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goal: Goal) => void;
  onAddChildGoal?: (parentGoal: Goal) => void;
  onToggleTask: (task: Task) => void;
  onUpdateNumericProgress?: (goal: Goal, newValue: number) => void;
  onUpdateProgress?: (id: string, val: number) => void;
}

const TreeNodeItem: React.FC<{
  node: GoalTreeNode;
  depth: number;
  forceExpandAll?: boolean | null;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goal: Goal) => void;
  onAddChildGoal?: (parentGoal: Goal) => void;
  onToggleTask: (task: Task) => void;
  onUpdateNumericProgress?: (goal: Goal, newValue: number) => void;
}> = ({
  node,
  depth,
  forceExpandAll,
  onEditGoal,
  onDeleteGoal,
  onAddChildGoal,
  onToggleTask,
  onUpdateNumericProgress,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Sync when parent forceExpandAll changes
  React.useEffect(() => {
    if (forceExpandAll !== undefined && forceExpandAll !== null) {
      setIsExpanded(forceExpandAll);
    }
  }, [forceExpandAll]);

  const hasChildren = node.children && node.children.length > 0;
  const hasTasks = node.tasks && node.tasks.length > 0;
  const hasExpandables = hasChildren || hasTasks;

  const typeLabels: { [key: string]: string } = {
    year: 'NĂM',
    quarter: 'QUÝ',
    month: 'THÁNG',
    week: 'TUẦN',
    custom: 'DÀI HẠN',
  };

  return (
    <div className="space-y-1">
      {/* Node Row */}
      <div
        className={`group flex items-center justify-between p-3 rounded-xl border transition-all duration-150 ${
          node.isOverdue
            ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20'
            : node.atRisk
            ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/20'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700'
        }`}
        style={{ marginLeft: `${depth * 20}px` }}
      >
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          {/* Chevron */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors ${
              !hasExpandables ? 'invisible' : ''
            }`}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {/* Color pill / Icon */}
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: node.color || '#6366f1' }}
          />

          {/* Type Badge */}
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase flex-shrink-0">
            {typeLabels[node.type] || node.type}
          </span>

          {/* Title */}
          <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {node.title}
          </span>

          {/* Warning Badges */}
          {node.isOverdue && (
            <span className="hidden sm:inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200">
              <Clock className="w-3 h-3 text-rose-600" />
              <span>Quá hạn</span>
            </span>
          )}

          {node.atRisk && !node.isOverdue && (
            <span
              className="hidden sm:inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200"
              title="Tiến độ thực tế đang chậm hơn tiến độ lý tưởng > 20%"
            >
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>Nguy cơ trễ</span>
            </span>
          )}
        </div>

        {/* Right side: Numeric Controls / Progress Bar & Actions */}
        <div className="flex items-center space-x-3 ml-3 flex-shrink-0">
          {/* Numeric Stepper if numeric mode */}
          {node.progressMode === 'numeric' && onUpdateNumericProgress ? (
            <div className="hidden md:flex items-center">
              <NumericGoalControls
                goal={node}
                onUpdateValue={onUpdateNumericProgress}
              />
            </div>
          ) : null}

          {/* Progress Bar & Percentage */}
          <div className="w-20 sm:w-28 flex items-center space-x-2">
            <ProgressBar value={node.progressCache} size="sm" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 w-9 text-right">
              {node.progressCache}%
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onAddChildGoal && (
              <button
                onClick={() => onAddChildGoal(node)}
                className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                title="Thêm mục tiêu con"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onEditGoal(node)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Chỉnh sửa"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDeleteGoal(node)}
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
              title="Xóa"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Children Goals & Tasks */}
      {isExpanded && (
        <div className="space-y-1">
          {/* Nested Goals */}
          {hasChildren &&
            node.children.map((child) => (
              <TreeNodeItem
                key={child._id}
                node={child}
                depth={depth + 1}
                forceExpandAll={forceExpandAll}
                onEditGoal={onEditGoal}
                onDeleteGoal={onDeleteGoal}
                onAddChildGoal={onAddChildGoal}
                onToggleTask={onToggleTask}
                onUpdateNumericProgress={onUpdateNumericProgress}
              />
            ))}

          {/* Nested Tasks under this Goal */}
          {hasTasks && (
            <div
              className="space-y-1 py-1"
              style={{ marginLeft: `${(depth + 1) * 20}px` }}
            >
              {node.tasks.map((task) => {
                const isRecurring = task.recurrence && task.recurrence.type !== 'none';
                const isChecked = isRecurring ? !!task.isCompletedToday : task.isCompleted;

                return (
                  <div
                    key={task._id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-slate-200 text-xs"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleTask(task)}
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                          isChecked
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                        }`}
                        title={isRecurring ? 'Đánh dấu hoàn thành hôm nay' : 'Đánh dấu hoàn thành'}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3] animate-check" />}
                      </button>
                      <span
                        className={`truncate font-medium ${
                          isChecked
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-slate-400">
                      {/* Recurring & Streak info */}
                      {isRecurring && (
                        <span className="flex items-center text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                          <RotateCw className="w-2.5 h-2.5 mr-0.5 animate-spin-slow" />
                          {typeof task.streak === 'number' && task.streak > 0 && (
                            <span className="flex items-center text-amber-500 ml-1">
                              <Flame className="w-2.5 h-2.5 fill-amber-500 mr-0.5" />
                              {task.streak}
                            </span>
                          )}
                        </span>
                      )}

                      {/* Subtasks Count */}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <span className="flex items-center text-[10px]">
                          <CheckSquare className="w-3 h-3 mr-1 text-indigo-400" />
                          {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
                        </span>
                      )}

                      {/* Due Date */}
                      {task.dueDate && (
                        <span className="text-[10px]">
                          {formatDateVi(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const GoalTreeView: React.FC<GoalTreeViewProps> = ({
  tree,
  onEditGoal,
  onDeleteGoal,
  onAddChildGoal,
  onToggleTask,
  onUpdateNumericProgress,
  onUpdateProgress,
}) => {
  const [expandAllState, setExpandAllState] = useState<boolean | null>(null);

  const handleUpdateNumericProgress =
    onUpdateNumericProgress ||
    (onUpdateProgress ? (goal: Goal, val: number) => onUpdateProgress(goal._id, val) : undefined);

  if (tree.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
        <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
          <Target className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-slate-800 dark:text-white">
          Chưa có cây mục tiêu nào
        </h4>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Hãy tạo mục tiêu cấp cao nhất (ví dụ Mục tiêu Năm) và gắn các mục tiêu con theo tháng, tuần và công việc để xem dạng cây phân cấp.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Tree View Controls */}
      <div className="flex items-center justify-end space-x-2 text-xs">
        <button
          onClick={() => setExpandAllState(true)}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronsDown className="w-3.5 h-3.5" />
          <span>Mở rộng tất cả</span>
        </button>
        <button
          onClick={() => setExpandAllState(false)}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronsUp className="w-3.5 h-3.5" />
          <span>Thu gọn tất cả</span>
        </button>
      </div>

      {/* Nodes */}
      <div className="space-y-2">
        {tree.map((rootNode) => (
          <TreeNodeItem
            key={rootNode._id}
            node={rootNode}
            depth={0}
            forceExpandAll={expandAllState}
            onEditGoal={onEditGoal}
            onDeleteGoal={onDeleteGoal}
            onAddChildGoal={onAddChildGoal}
            onToggleTask={onToggleTask}
            onUpdateNumericProgress={handleUpdateNumericProgress}
          />
        ))}
      </div>
    </div>
  );
};
