import React, { useState } from 'react';
import {
  Calendar,
  AlertTriangle,
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  ArrowRightCircle,
  CheckCircle2,
} from 'lucide-react';
import type { Goal } from '../../types/goal';
import type { Category } from '../../types/category';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { NumericGoalControls } from './NumericGoalControls';

interface GoalCardProps {
  goal: Goal;
  categories?: Category[];
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onPostpone: (goal: Goal) => void;
  onUpdateNumericProgress: (goal: Goal, newValue: number) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  categories = [],
  onEdit,
  onDelete,
  onPostpone,
  onUpdateNumericProgress,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const category = goal.categoryId
    ? categories.find((c) => c._id === goal.categoryId)
    : null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const typeLabels = {
    year: 'Năm',
    quarter: 'Quý',
    month: 'Tháng',
    week: 'Tuần',
    custom: 'Dài hạn',
  };

  const isCompleted = goal.progressCache >= 100 || goal.status === 'completed';

  return (
    <div
      className={`relative rounded-2xl border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between ${
        goal.isOverdue
          ? 'border-rose-200 dark:border-rose-900/60'
          : goal.atRisk
          ? 'border-amber-200 dark:border-amber-900/60'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* Top Color Accent Line */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: goal.color || '#6366f1' }}
      />

      <div className="p-5 flex-1 flex flex-col">
        {/* Header row: Category / Type / Menu */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            {/* Category tag */}
            {category && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{
                  backgroundColor: `${category.color}20`,
                  color: category.color,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full mr-1.5"
                  style={{ backgroundColor: category.color }}
                />
                {category.name}
              </span>
            )}

            {/* Type badge */}
            <Badge variant="outline" size="sm">
              {typeLabels[goal.type] || goal.type}
            </Badge>

            {/* Priority */}
            {goal.priority === 'high' && (
              <Badge variant="danger" size="sm">
                Ưu tiên cao
              </Badge>
            )}
            {goal.priority === 'medium' && (
              <Badge variant="warning" size="sm">
                Ưu tiên TB
              </Badge>
            )}
          </div>

          {/* Action Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-6 z-20 w-48 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 text-xs">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onPostpone(goal);
                    }}
                    className="w-full px-3 py-2 flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                  >
                    <ArrowRightCircle className="w-3.5 h-3.5" />
                    <span>Dời sang kỳ kế tiếp</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(goal);
                    }}
                    className="w-full px-3 py-2 flex items-center space-x-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Chỉnh sửa</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(goal);
                    }}
                    className="w-full px-3 py-2 flex items-center space-x-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa mục tiêu</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div className="mb-3">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug line-clamp-1">
              {goal.title}
            </h3>
            {isCompleted && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            )}
          </div>
          {goal.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {goal.description}
            </p>
          )}
        </div>

        {/* Warning Badges (Overdue & At Risk) */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {goal.isOverdue && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
              <Clock className="w-3 h-3 text-rose-600" />
              <span>Quá hạn</span>
            </span>
          )}

          {goal.atRisk && !goal.isOverdue && (
            <span
              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse"
              title="Tiến độ thực tế đang chậm hơn tiến độ lý tưởng > 20%"
            >
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>Nguy cơ trễ</span>
            </span>
          )}
        </div>

        {/* Date timeline */}
        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-4">
          <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
          <span>
            {formatDate(goal.startDate)} — {formatDate(goal.endDate)}
          </span>
        </div>

        {/* Progress Section */}
        <div className="mt-auto space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {goal.progressMode === 'numeric' ? 'Tiến độ số' : 'Tiến độ tổng hợp'}
            </span>
            <span className="font-extrabold text-slate-900 dark:text-white">
              {goal.progressCache}%
            </span>
          </div>

          <ProgressBar value={goal.progressCache} size="md" />

          {/* Numeric quick stepper */}
          {goal.progressMode === 'numeric' && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">Cập nhật nhanh:</span>
              <NumericGoalControls
                goal={goal}
                onUpdateValue={onUpdateNumericProgress}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
