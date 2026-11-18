import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Target,
  Plus,
  GitFork,
  LayoutGrid,
  CalendarDays,
  CalendarRange,
  Sparkles,
  Download,
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
import { CardSkeleton, Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ExportModal } from '../components/common/ExportModal';
import { toast } from '../store/useToastStore';
import { useI18n } from '../i18n';
import {
  getStartAndEndOfWeek,
  getStartAndEndOfMonth,
  getStartAndEndOfYear,
  getNextPeriodDates,
} from '../utils/date';

type GoalViewMode = 'tree' | 'cards';
type GoalFilterTab = 'all' | 'year' | 'quarter' | 'month' | 'week' | 'custom' | 'completed';

export const GoalsPage: React.FC = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<GoalViewMode>('cards');
  const [activeTab, setActiveTab] = useState<GoalFilterTab>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);

  // Preset modal configs (for quick actions: week, month, year)
  const [presetType, setPresetType] = useState<GoalType | undefined>(undefined);
  const [presetStart, setPresetStart] = useState<string | undefined>(undefined);
  const [presetEnd, setPresetEnd] = useState<string | undefined>(undefined);

  // Check for ?create=true
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setEditingGoal(null);
      setPresetType(undefined);
      setPresetStart(undefined);
      setPresetEnd(undefined);
      setIsModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
      toast.success(t('common.success'));
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('common.error'));
    },
  });

  // Update Goal
  const updateGoalMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateGoalInput> }) =>
      goalService.updateGoal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
      toast.success(t('common.success'));
      setIsModalOpen(false);
      setEditingGoal(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('common.error'));
    },
  });

  // Delete Goal
  const deleteGoalMutation = useMutation({
    mutationFn: (id: string) => goalService.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(t('common.success'));
      setDeletingGoal(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('common.error'));
    },
  });

  // Update Numeric Progress
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
      toast.error(t('common.error'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
    },
  });

  // Toggle Task Completion from inside tree view
  const toggleTaskMutation = useMutation({
    mutationFn: (task: Task) => taskService.toggleTask(task._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Quick Action Handlers
  const handleCreateThisWeek = () => {
    const today = new Date();
    const { start, end } = getStartAndEndOfWeek(today);
    setEditingGoal(null);
    setPresetType('week');
    setPresetStart(start.toISOString().split('T')[0]);
    setPresetEnd(end.toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleCreateThisMonth = () => {
    const today = new Date();
    const { start, end } = getStartAndEndOfMonth(today);
    setEditingGoal(null);
    setPresetType('month');
    setPresetStart(start.toISOString().split('T')[0]);
    setPresetEnd(end.toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleCreateThisYear = () => {
    const today = new Date();
    const { start, end } = getStartAndEndOfYear(today);
    setEditingGoal(null);
    setPresetType('year');
    setPresetStart(start.toISOString().split('T')[0]);
    setPresetEnd(end.toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  // Roll to Next Period Handler
  const handleRollToNextPeriod = async (g: Goal) => {
    try {
      const nextDates = getNextPeriodDates(g.type, g.startDate, g.endDate);
      const nextGoalData: CreateGoalInput = {
        title: `${g.title} (Kỳ tiếp theo)`,
        description: g.description,
        type: g.type,
        startDate: nextDates.startStr,
        endDate: nextDates.endStr,
        parentId: g.parentId,
        categoryId: g.categoryId,
        color: g.color,
        priority: g.priority,
        progressMode: g.progressMode,
        targetValue: g.targetValue,
        currentValue: 0,
        unit: g.unit,
        weight: g.weight,
      };

      await createGoalMutation.mutateAsync(nextGoalData);
      toast.success('Đã chuyển tiếp mục tiêu sang kỳ tiếp theo!');
    } catch {
      toast.error('Không thể chuyển tiếp mục tiêu');
    }
  };

  // Filtered Goals based on Tab
  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'completed') {
        return g.status === 'completed' || (g.progressCache ?? 0) >= 100;
      }
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
            <span>{t('goals.title')}</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('goals.subtitle')}
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
            {t('goals.quickWeek')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateThisMonth}
            className="text-xs bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
          >
            <CalendarRange className="w-3.5 h-3.5 mr-1 text-indigo-500" />
            {t('goals.quickMonth')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateThisYear}
            className="text-xs bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
            {t('goals.quickYear')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            className="text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            {t('header.exportData')}
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setEditingGoal(null);
              setPresetType(undefined);
              setPresetStart(undefined);
              setPresetEnd(undefined);
              setIsModalOpen(true);
            }}
            className="shadow-sm text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {t('goals.addGoal')}
          </Button>
        </div>
      </div>

      {/* View Switcher & Filter Tabs Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        {/* Filter Tabs (when in cards view) */}
        {viewMode === 'cards' ? (
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: t('goals.tabs.all') },
              { id: 'year', label: t('goals.tabs.year') },
              { id: 'quarter', label: t('goals.tabs.quarter') },
              { id: 'month', label: t('goals.tabs.month') },
              { id: 'week', label: t('goals.tabs.week') },
              { id: 'custom', label: t('goals.tabs.custom') },
              { id: 'completed', label: t('goals.tabs.completed') },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as GoalFilterTab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
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
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{t('goals.viewCards')}</span>
          </button>
          <button
            onClick={() => setViewMode('tree')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              viewMode === 'tree'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>{t('goals.viewTree')}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Cards or Tree */}
      {viewMode === 'tree' ? (
        isTreeLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <GoalTreeView
            tree={goalTree}
            categories={categories}
            onEditGoal={(g) => {
              setEditingGoal(g);
              setIsModalOpen(true);
            }}
            onDeleteGoal={(g) => setDeletingGoal(g)}
            onUpdateProgress={(id, val) =>
              updateNumericProgressMutation.mutate({ id, value: val })
            }
            onToggleTask={(task) => toggleTaskMutation.mutate(task)}
          />
        )
      ) : isGoalsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <CardSkeleton key={n} rows={4} />
          ))}
        </div>
      ) : filteredGoals.length === 0 ? (
        <EmptyState
          icon={Target}
          title={t('goals.emptyTitle')}
          description={t('goals.emptyDesc')}
          actionLabel={t('goals.createFirstGoal')}
          onAction={() => {
            setEditingGoal(null);
            setIsModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGoals.map((g) => (
            <GoalCard
              key={g._id}
              goal={g}
              categories={categories}
              onEdit={(goal) => {
                setEditingGoal(goal);
                setIsModalOpen(true);
              }}
              onDelete={(goal) => setDeletingGoal(goal)}
              onUpdateProgress={(id, val) =>
                updateNumericProgressMutation.mutate({ id, value: val })
              }
              onRollToNextPeriod={handleRollToNextPeriod}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      <GoalModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGoal(null);
        }}
        onSubmit={async (data) => {
          if (editingGoal) {
            await updateGoalMutation.mutateAsync({ id: editingGoal._id, data });
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingGoal}
        onClose={() => setDeletingGoal(null)}
        onConfirm={async () => {
          if (deletingGoal) {
            await deleteGoalMutation.mutateAsync(deletingGoal._id);
          }
        }}
        title={t('common.confirmDeleteTitle')}
        description={`${t('common.confirmDeleteDesc')} ("${deletingGoal?.title}")`}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        isLoading={deleteGoalMutation.isPending}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        defaultType="goals"
      />
    </div>
  );
};
