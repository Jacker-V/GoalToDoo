import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../services/task.service';
import { goalService } from '../services/goal.service';
import type { Task, CreateTaskInput, Subtask } from '../types/task';
import { TaskItem } from '../components/tasks/TaskItem';
import { TaskModal } from '../components/tasks/TaskModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ExportModal } from '../components/common/ExportModal';
import { toast } from '../store/useToastStore';
import { useI18n } from '../i18n';
import {
  getTodayLocalDateString,
  getStartAndEndOfWeek,
} from '../utils/date';

type TaskTab = 'today' | 'week' | 'upcoming' | 'overdue' | 'completed';

export const TasksPage: React.FC = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<TaskTab>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [goalFilter, setGoalFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [showCompletedSection, setShowCompletedSection] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // Open modal if ?create=true
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setEditingTask(null);
      setIsModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Fetch Tasks
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskService.getTasks(),
  });

  // Fetch Goals for selector and filtering
  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalService.getGoals(),
  });

  // --- MUTATIONS WITH OPTIMISTIC UPDATES ---

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskInput) => taskService.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
      toast.success(t('common.success'));
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('common.error'));
    },
  });

  // Update Task Mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTaskInput> }) =>
      taskService.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
      toast.success(t('common.success'));
      setIsModalOpen(false);
      setEditingTask(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('common.error'));
    },
  });

  // Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => taskService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
      toast.success(t('common.success'));
      setDeletingTask(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('common.error'));
    },
  });

  // Optimistic Toggle Task Completion Mutation
  const toggleTaskMutation = useMutation({
    mutationFn: (task: Task) => taskService.toggleTask(task._id),
    onMutate: async (task: Task) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      queryClient.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.map((t) =>
          t._id === task._id
            ? {
                ...t,
                isCompleted: !t.isCompleted,
                completedAt: !t.isCompleted ? new Date().toISOString() : null,
              }
            : t
        )
      );

      return { previousTasks };
    },
    onError: (_err, _task, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
      toast.error(t('common.error'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
      queryClient.invalidateQueries({ queryKey: ['statsSummary'] });
    },
  });

  // Optimistic Toggle Recurring Task Mutation
  const toggleRecurringMutation = useMutation({
    mutationFn: async (task: Task) => {
      const today = getTodayLocalDateString();
      if (task.isCompletedToday) {
        return taskService.uncompleteRecurring(task._id, today);
      } else {
        return taskService.completeRecurring(task._id, today);
      }
    },
    onMutate: async (task: Task) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      queryClient.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.map((t) =>
          t._id === task._id
            ? {
                ...t,
                isCompletedToday: !t.isCompletedToday,
              }
            : t
        )
      );

      return { previousTasks };
    },
    onError: (_err, _task, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
      toast.error(t('common.error'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
      queryClient.invalidateQueries({ queryKey: ['statsSummary'] });
    },
  });

  // Update Subtasks Checklist
  const updateSubtasksMutation = useMutation({
    mutationFn: ({ task, subtasks }: { task: Task; subtasks: Subtask[] }) =>
      taskService.updateTask(task._id, { subtasks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
    },
  });

  // All distinct tags from tasks for filtering
  const allTags = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      t.tags?.forEach((tg) => set.add(tg));
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Filter tasks based on activeTab, search, priority, goal, tag
  const { activeTasks, completedInTab } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const { start: startOfWeek, end: endOfWeek } = getStartAndEndOfWeek(today);

    const taskMatchesTabTimeframe = (task: Task): boolean => {
      const isRecurring = task.recurrence && task.recurrence.type !== 'none';
      const d = task.dueDate ? new Date(task.dueDate) : null;

      if (activeTab === 'completed') {
        return isRecurring ? !!task.isCompletedToday : task.isCompleted;
      }

      if (activeTab === 'today') {
        const isDueToday = d && d.getTime() >= today.getTime() && d.getTime() <= endOfToday.getTime();
        return Boolean(isDueToday || isRecurring);
      }

      if (activeTab === 'week') {
        const isDueThisWeek = d && d.getTime() >= startOfWeek.getTime() && d.getTime() <= endOfWeek.getTime();
        return Boolean(isDueThisWeek || isRecurring);
      }

      if (activeTab === 'upcoming') {
        const isFutureOrUnscheduled = !d || d.getTime() > endOfToday.getTime();
        return Boolean(isFutureOrUnscheduled && !isRecurring);
      }

      if (activeTab === 'overdue') {
        const isOverdue = d && d.getTime() < today.getTime();
        const isDone = isRecurring ? !!task.isCompletedToday : task.isCompleted;
        return Boolean(isOverdue && !isDone);
      }

      return true;
    };

    const matchesSearchAndFilter = (task: Task): boolean => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchNotes = (task.notes || '').toLowerCase().includes(q);
        const matchTag = task.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchNotes && !matchTag) return false;
      }

      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }

      if (goalFilter !== 'all') {
        if (goalFilter === 'none' && task.goalId) return false;
        if (goalFilter !== 'none' && task.goalId !== goalFilter) return false;
      }

      if (tagFilter !== 'all' && (!task.tags || !task.tags.includes(tagFilter))) {
        return false;
      }

      return true;
    };

    const relevant = tasks.filter((t) => matchesSearchAndFilter(t) && taskMatchesTabTimeframe(t));

    if (activeTab === 'completed') {
      return { activeTasks: relevant, completedInTab: [] };
    }

    const active: Task[] = [];
    const completed: Task[] = [];

    for (const t of relevant) {
      const isRecurring = t.recurrence && t.recurrence.type !== 'none';
      const isDone = isRecurring ? !!t.isCompletedToday : t.isCompleted;
      if (isDone) {
        completed.push(t);
      } else {
        active.push(t);
      }
    }

    return { activeTasks: active, completedInTab: completed };
  }, [tasks, activeTab, searchQuery, priorityFilter, goalFilter, tagFilter]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    const { start: startOfWeek, end: endOfWeek } = getStartAndEndOfWeek(today);

    let todayCount = 0;
    let weekCount = 0;
    let upcomingCount = 0;
    let overdueCount = 0;
    let completedCount = 0;

    tasks.forEach((t) => {
      const isRecurring = t.recurrence && t.recurrence.type !== 'none';
      const d = t.dueDate ? new Date(t.dueDate) : null;
      const isDone = isRecurring ? !!t.isCompletedToday : t.isCompleted;

      if (isDone) {
        completedCount++;
      } else {
        if (d && d.getTime() < today.getTime()) {
          overdueCount++;
        }
        if ((d && d.getTime() >= today.getTime() && d.getTime() <= endOfToday.getTime()) || isRecurring) {
          todayCount++;
        }
        if (d && d.getTime() >= startOfWeek.getTime() && d.getTime() <= endOfWeek.getTime()) {
          weekCount++;
        }
        if (!d || d.getTime() > endOfToday.getTime()) {
          upcomingCount++;
        }
      }
    });

    return { todayCount, weekCount, upcomingCount, overdueCount, completedCount };
  }, [tasks]);

  const defaultDueDateForModal = useMemo(() => {
    if (activeTab === 'today' || activeTab === 'week') {
      return getTodayLocalDateString();
    }
    return '';
  }, [activeTab]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <CheckSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>{t('tasks.title')}</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('tasks.subtitle')}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            className="text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {t('tasks.quickExport')}
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setEditingTask(null);
              setIsModalOpen(true);
            }}
            className="shadow-sm text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {t('tasks.addTask')}
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'today'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{t('tasks.tabs.today')}</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-xs ${
              activeTab === 'today'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {tabCounts.todayCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('week')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'week'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{t('tasks.tabs.week')}</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-xs ${
              activeTab === 'week'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {tabCounts.weekCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'upcoming'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t('tasks.tabs.upcoming')}</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-xs ${
              activeTab === 'upcoming'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {tabCounts.upcomingCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'overdue'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>{t('tasks.tabs.overdue')}</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-xs ${
              activeTab === 'overdue'
                ? 'bg-white/20 text-white'
                : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
            }`}
          >
            {tabCounts.overdueCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'completed'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{t('tasks.tabs.completed')}</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-xs ${
              activeTab === 'completed'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {tabCounts.completedCount}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Keyword Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('tasks.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center space-x-2 flex-wrap">
          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">{t('common.priority.all')}</option>
            <option value="high">{t('common.priority.high')}</option>
            <option value="medium">{t('common.priority.medium')}</option>
            <option value="low">{t('common.priority.low')}</option>
          </select>

          {/* Goal Link */}
          <select
            value={goalFilter}
            onChange={(e) => setGoalFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[180px] truncate cursor-pointer"
          >
            <option value="all">{t('tasks.filterGoal')}</option>
            <option value="none">-- Không mục tiêu --</option>
            {goals.map((g) => (
              <option key={g._id} value={g._id}>
                {g.title}
              </option>
            ))}
          </select>

          {/* Tags */}
          {allTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">{t('tasks.filterTag')}</option>
              {allTags.map((tg) => (
                <option key={tg} value={tg}>
                  #{tg}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Task List Items */}
      {isTasksLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : activeTasks.length === 0 && completedInTab.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={t('tasks.emptyTitle')}
          description={
            activeTab === 'today'
              ? t('tasks.emptyToday')
              : activeTab === 'overdue'
              ? t('tasks.emptyOverdue')
              : t('tasks.emptyGeneral')
          }
          actionLabel={t('tasks.addTask')}
          onAction={() => {
            setEditingTask(null);
            setIsModalOpen(true);
          }}
        />
      ) : (
        <div className="space-y-6">
          {/* Active Tasks Section */}
          {activeTasks.length > 0 && (
            <div className="space-y-3">
              {activeTasks.map((task) => (
                <TaskItem
                  key={task._id}
                  task={task}
                  goals={goals}
                  onToggleComplete={(t) => toggleTaskMutation.mutate(t)}
                  onToggleRecurringToday={(t) => toggleRecurringMutation.mutate(t)}
                  onUpdateSubtasks={(t, subtasks) =>
                    updateSubtasksMutation.mutate({ task: t, subtasks })
                  }
                  onEdit={(t) => {
                    setEditingTask(t);
                    setIsModalOpen(true);
                  }}
                  onDelete={(t) => setDeletingTask(t)}
                />
              ))}
            </div>
          )}

          {/* Completed in Tab Section */}
          {completedInTab.length > 0 && activeTab !== 'completed' && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowCompletedSection(!showCompletedSection)}
                className="flex items-center space-x-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-3 transition-colors cursor-pointer"
              >
                {showCompletedSection ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                )}
                <span>{t('tasks.completedSection', { count: completedInTab.length })}</span>
              </button>

              {showCompletedSection && (
                <div className="space-y-3 opacity-80 hover:opacity-100 transition-opacity">
                  {completedInTab.map((task) => (
                    <TaskItem
                      key={task._id}
                      task={task}
                      goals={goals}
                      onToggleComplete={(t) => toggleTaskMutation.mutate(t)}
                      onToggleRecurringToday={(t) => toggleRecurringMutation.mutate(t)}
                      onUpdateSubtasks={(t, subtasks) =>
                        updateSubtasksMutation.mutate({ task: t, subtasks })
                      }
                      onEdit={(t) => {
                        setEditingTask(t);
                        setIsModalOpen(true);
                      }}
                      onDelete={(t) => setDeletingTask(t)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={async (data) => {
          if (editingTask) {
            await updateTaskMutation.mutateAsync({ id: editingTask._id, data });
          } else {
            await createTaskMutation.mutateAsync(data);
          }
        }}
        task={editingTask}
        goals={goals}
        initialDueDate={defaultDueDateForModal}
        isLoading={createTaskMutation.isPending || updateTaskMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={async () => {
          if (deletingTask) {
            await deleteTaskMutation.mutateAsync(deletingTask._id);
          }
        }}
        title={t('common.confirmDeleteTitle')}
        description={`${t('common.confirmDeleteDesc')} ("${deletingTask?.title}")`}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        isLoading={deleteTaskMutation.isPending}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        defaultType="tasks"
      />
    </div>
  );
};
