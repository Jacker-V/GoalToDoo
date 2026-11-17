import React, { useState, useMemo } from 'react';
import {
  Target,
  Plus,
  GitFork,
  LayoutGrid,
  CalendarDays,
  CalendarRange,
  Sparkles,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalService } from '../services/goal.service';
import { taskService } from '../services/task.service';
import { categoryService } from '../services/category.service';
import type { Goal, CreateGoalInput, GoalType } from '../types/goal';
import type { Task } from '../types/task';
import { GoalCard } from '../components/goals/GoalCard';
import { GoalTreeView } from '../components/goals/GoalTreeView';
import { GoalModal } from '../components/goals/GoalModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Button } from '../components/ui/Button';
import { toast } from '../store/useToastStore';
import {
  getStartAndEndOfWeek,
  getStartAndEndOfMonth,
  getStartAndEndOfYear,
  getNextPeriodDates,
  getTodayLocalDateString,
} from '../utils/date';

type GoalViewMode = 'tree' | 'cards';
type GoalFilterTab = 'all' | 'year' | 'quarter' | 'month' | 'week' | 'custom' | 'completed';

export const GoalsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<GoalViewMode>('cards');
  const [activeTab, setActiveTab] = useState<GoalFilterTab>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);

  // Preset modal configs (for quick actions: week, month, year)
  const [presetType, setPresetType] = useState<GoalType | undefined>(undefined);
  const [presetStart, setPresetStart] = useState<string | undefined>(undefined);
  const [presetEnd, setPresetEnd] = useState<string | undefined>(undefined);

  // Fetch Goals
  const { data: goals = [], isLoading: isGoalsLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalService.getGoals(),
  });

  // Fetch Goal Tree
  const { data: goalTree = [], isLoading: isTreeLoading } = useQuery({
    queryKey: ['goalTree'],
    queryFn: () => goalService.getGoalTree(),
  });

  // Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  });

  // --- MUTATIONS ---

  // Create Goal
  const createGoalMutation = useMutation({
    mutationFn: (data: CreateGoalInput) => goalService.createGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
      toast.success('Mục tiêu mới đã được thiết lập!');
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Không thể tạo mục tiêu');
    },
  });

  // Update Goal
  const updateGoalMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateGoalInput> }) =>
      goalService.updateGoal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
      toast.success('Đã cập nhật mục tiêu!');
      setIsModalOpen(false);
      setEditingGoal(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Không thể cập nhật mục tiêu');
    },
  });

  // Delete Goal
  const deleteGoalMutation = useMutation({
    mutationFn: (id: string) => goalService.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Đã xóa mục tiêu thành công');
      setDeletingGoal(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Không thể xóa mục tiêu');
    },
  });

  // Update Numeric Progress (Instant stepper / direct edit)
  const updateNumericProgressMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: number }) =>
      goalService.updateGoalProgress(id, value),
    onMutate: async ({ id, value }) => {
      await queryClient.cancelQueries({ queryKey: ['goals'] });
      const previousGoals = queryClient.getQueryData<Goal[]>(['goals']);

      queryClient.setQueryData<Goal[]>(['goals'], (old = []) =>
        old.map((g) => {
          if (g._id === id) {
            const ratio = g.targetValue > 0 ? Math.min(value / g.targetValue, 1) : 0;
            return {
              ...g,
              currentValue: value,
              progressCache: Math.round(ratio * 100),
            };
          }
          return g;
        })
      );

      return { previousGoals };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(['goals'], context.previousGoals);
      }
      toast.error('Không thể cập nhật tiến độ số');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
    },
  });

  // Toggle Task Completion from inside tree view
  const toggleTaskMutation = useMutation({
    mutationFn: async (task: Task) => {
      const isRecurring = task.recurrence && task.recurrence.type !== 'none';
      if (isRecurring) {
        const todayStr = getTodayLocalDateString();
        if (task.isCompletedToday) {
          return taskService.uncompleteRecurring(task._id, todayStr);
        } else {
          return taskService.completeRecurring(task._id, todayStr);
        }
      }
      return taskService.toggleTask(task._id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Đã cập nhật tiến độ công việc!');
    },
  });

  // Quick Action: Dời mục tiêu sang kỳ kế tiếp (Postpone / Defer)
  const handlePostpone = async (goal: Goal) => {
    const { nextStart, nextEnd } = getNextPeriodDates(
      goal.type,
      goal.startDate,
      goal.endDate
    );

    try {
      await updateGoalMutation.mutateAsync({
        id: goal._id,
        data: {
          startDate: nextStart.toISOString(),
          endDate: nextEnd.toISOString(),
        },
      });
      toast.success(`Đã dời mục tiêu "${goal.title}" sang kỳ tiếp theo!`);
    } catch {
      // handled in mutation onError
    }
  };

  // Quick Preset Actions
  const handleCreateThisWeek = () => {
    const { startStr, endStr } = getStartAndEndOfWeek();
    setEditingGoal(null);
    setPresetType('week');
    setPresetStart(startStr);
    setPresetEnd(endStr);
    setIsModalOpen(true);
  };

  const handleCreateThisMonth = () => {
    const { startStr, endStr } = getStartAndEndOfMonth();
    setEditingGoal(null);
    setPresetType('month');
    setPresetStart(startStr);
    setPresetEnd(endStr);
    setIsModalOpen(true);
  };

  const handleCreateThisYear = () => {
    const { startStr, endStr } = getStartAndEndOfYear();
    setEditingGoal(null);
    setPresetType('year');
    setPresetStart(startStr);
    setPresetEnd(endStr);
    setIsModalOpen(true);
  };

  // Filtered Goals for Cards view
  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      if (activeTab === 'completed') {
        return g.progressCache >= 100 || g.status === 'completed';
      }
      if (activeTab === 'all') return true;
      return g.type === activeTab;
    });
  }, [goals, activeTab]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Quick Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <Target className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Hệ thống Mục tiêu (Goals)</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Thiết lập tầm nhìn dài hạn và phân rã thành các kỳ Năm, Quý, Tháng, Tuần
          </p>
        </div>

        {/* Quick Action Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateThisWeek}
            className="text-xs bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
          >
            <CalendarDays className="w-3.5 h-3.5 mr-1 text-indigo-500" />
            Mục tiêu tuần này
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateThisMonth}
            className="text-xs bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
          >
            <CalendarRange className="w-3.5 h-3.5 mr-1 text-indigo-500" />
            Mục tiêu tháng này
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateThisYear}
            className="text-xs bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
            Mục tiêu năm nay
          </Button>

          <Button
            onClick={() => {
              setEditingGoal(null);
              setPresetType(undefined);
              setPresetStart(undefined);
              setPresetEnd(undefined);
              setIsModalOpen(true);
            }}
            className="shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tạo mục tiêu mới
          </Button>
        </div>
      </div>

      {/* View Switcher & Filter Tabs Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        {/* Filter Tabs (when in cards view) */}
        {viewMode === 'cards' ? (
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'year', label: 'Năm' },
              { id: 'quarter', label: 'Quý' },
              { id: 'month', label: 'Tháng' },
              { id: 'week', label: 'Tuần' },
              { id: 'custom', label: 'Dài hạn' },
              { id: 'completed', label: 'Đã hoàn thành' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as GoalFilterTab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs font-medium text-slate-500 flex items-center space-x-1.5">
            <GitFork className="w-4 h-4 text-indigo-500" />
            <span>Phân cấp: Năm ➔ Quý ➔ Tháng ➔ Tuần ➔ Công việc</span>
          </div>
        )}

        {/* View Mode Toggle Button */}
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900 self-end sm:self-auto">
          <button
            onClick={() => setViewMode('cards')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'cards'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Dạng thẻ</span>
          </button>
          <button
            onClick={() => setViewMode('tree')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'tree'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Cây mục tiêu (Tree)</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Cards or Tree */}
      {viewMode === 'tree' ? (
        isTreeLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <GoalTreeView
            tree={goalTree}
            onEditGoal={(g) => {
              setEditingGoal(g);
              setIsModalOpen(true);
            }}
            onDeleteGoal={(g) => setDeletingGoal(g)}
            onAddChildGoal={(parent) => {
              setEditingGoal(null);
              setPresetType(
                parent.type === 'year'
                  ? 'quarter'
                  : parent.type === 'quarter'
                  ? 'month'
                  : 'week'
              );
              setPresetStart(parent.startDate.split('T')[0]);
              setPresetEnd(parent.endDate.split('T')[0]);
              setIsModalOpen(true);
            }}
            onToggleTask={(task) => toggleTaskMutation.mutate(task)}
            onUpdateNumericProgress={(g, val) =>
              updateNumericProgressMutation.mutate({ id: g._id, value: val })
            }
          />
        )
      ) : isGoalsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-800 dark:text-white">
            Không tìm thấy mục tiêu nào
          </h4>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Hãy bắt đầu tạo mục tiêu đầu tiên hoặc sử dụng các nút hành động nhanh phía trên.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal._id}
              goal={goal}
              categories={categories}
              onEdit={(g) => {
                setEditingGoal(g);
                setIsModalOpen(true);
              }}
              onDelete={(g) => setDeletingGoal(g)}
              onPostpone={handlePostpone}
              onUpdateNumericProgress={(g, val) =>
                updateNumericProgressMutation.mutate({ id: g._id, value: val })
              }
            />
          ))}
        </div>
      )}

      {/* Goal Modal */}
      <GoalModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGoal(null);
        }}
        onSubmit={async (data) => {
          if (editingGoal) {
            await updateGoalMutation.mutateAsync({
              id: editingGoal._id,
              data,
            });
          } else {
            await createGoalMutation.mutateAsync(data);
          }
        }}
        goal={editingGoal}
        existingGoals={goals}
        categories={categories}
        initialType={presetType}
        initialStartDate={presetStart}
        initialEndDate={presetEnd}
        isLoading={createGoalMutation.isPending || updateGoalMutation.isPending}
      />

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={!!deletingGoal}
        onClose={() => setDeletingGoal(null)}
        onConfirm={() => {
          if (deletingGoal) {
            deleteGoalMutation.mutate(deletingGoal._id);
          }
        }}
        title="Xác nhận xóa Mục tiêu"
        message={`Bạn có chắc muốn xóa mục tiêu "${deletingGoal?.title}"? Các công việc và mục tiêu con trực thuộc sẽ được tách độc lập.`}
        confirmLabel="Xóa mục tiêu"
        isLoading={deleteGoalMutation.isPending}
      />
    </div>
  );
};
