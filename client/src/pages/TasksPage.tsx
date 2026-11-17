import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../services/task.service';
import { goalService } from '../services/goal.service';
import type { Task, CreateTaskInput, Subtask } from '../types/task';
import { TaskItem } from '../components/tasks/TaskItem';
import { TaskModal } from '../components/tasks/TaskModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Button } from '../components/ui/Button';
import { toast } from '../store/useToastStore';
import {
  getTodayLocalDateString,
  getStartAndEndOfWeek,
} from '../utils/date';

type TaskTab = 'today' | 'week' | 'upcoming' | 'overdue' | 'completed';

export const TasksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TaskTab>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [goalFilter, setGoalFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [showCompletedSection, setShowCompletedSection] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

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
      toast.success('Đã thêm công việc thành công!');
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Không thể tạo công việc');
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
      toast.success('Đã cập nhật công việc!');
      setIsModalOpen(false);
      setEditingTask(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Không thể cập nhật công việc');
    },
  });

  // Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => taskService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
      toast.success('Đã xóa công việc');
      setDeletingTask(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Không thể xóa công việc');
    },
  });

  // Toggle Task Completion (Optimistic Update)
  const toggleTaskMutation = useMutation({
    mutationFn: (task: Task) => taskService.toggleTask(task._id),
    onMutate: async (toggledTask) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      queryClient.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.map((t) =>
          t._id === toggledTask._id
            ? {
                ...t,
                isCompleted: !t.isCompleted,
                completedAt: !t.isCompleted ? new Date().toISOString() : null,
                subtasks: t.subtasks
                  ? t.subtasks.map((s) => ({ ...s, done: !t.isCompleted }))
                  : [],
              }
            : t
        )
      );

      return { previousTasks };
    },
    onError: (_err, _newTask, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
      toast.error('Có lỗi xảy ra khi cập nhật trạng thái');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
    },
  });

  // Toggle Recurring Task Today (Optimistic Update)
  const toggleRecurringMutation = useMutation({
    mutationFn: async (task: Task) => {
      const todayStr = getTodayLocalDateString();
      if (task.isCompletedToday) {
        return taskService.uncompleteRecurring(task._id, todayStr);
      } else {
        return taskService.completeRecurring(task._id, todayStr);
      }
    },
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      queryClient.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.map((t) => {
          if (t._id === task._id) {
            const nextDone = !t.isCompletedToday;
            const currentStreak = t.streak || 0;
            const nextStreak = nextDone ? currentStreak + 1 : Math.max(0, currentStreak - 1);
            return {
              ...t,
              isCompletedToday: nextDone,
              streak: nextStreak,
            };
          }
          return t;
        })
      );

      return { previousTasks };
    },
    onError: (_err, _task, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
      toast.error('Có lỗi xảy ra khi cập nhật chuỗi thói quen');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
    },
  });

  // Update Subtasks Checklist
  const updateSubtasksMutation = useMutation({
    mutationFn: ({ task, subtasks }: { task: Task; subtasks: Subtask[] }) =>
      taskService.updateTask(task._id, { subtasks }),
    onMutate: async ({ task, subtasks }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      const allDone = subtasks.length > 0 && subtasks.every((s) => s.done);

      queryClient.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.map((t) =>
          t._id === task._id
            ? {
                ...t,
                subtasks,
                isCompleted: allDone,
                progress: Math.round((subtasks.filter((s) => s.done).length / subtasks.length) * 100),
              }
            : t
        )
      );

      return { previousTasks };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
      toast.error('Không thể cập nhật danh sách việc con');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
    },
  });

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.tags) t.tags.forEach((tag) => set.add(tag));
    });
    return Array.from(set);
  }, [tasks]);

  // Tab Filtering & Search Logic
  const { activeTasks, completedInTab } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const { start: startOfWeek, end: endOfWeek } = getStartAndEndOfWeek(today);

    const matchesSearchAndFilter = (t: Task): boolean => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesNotes = t.notes?.toLowerCase().includes(q);
        const matchesTags = t.tags?.some((tag) => tag.toLowerCase().includes(q));
        if (!matchesTitle && !matchesNotes && !matchesTags) return false;
      }
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) {
        return false;
      }
      if (goalFilter !== 'all') {
        if (goalFilter === 'none' && t.goalId) return false;
        if (goalFilter !== 'none' && t.goalId !== goalFilter) return false;
      }
      if (tagFilter !== 'all' && (!t.tags || !t.tags.includes(tagFilter))) {
        return false;
      }
      return true;
    };

    const taskMatchesTabTimeframe = (t: Task): boolean => {
      const isRecurring = t.recurrence && t.recurrence.type !== 'none';
      const taskDueDate = t.dueDate ? new Date(t.dueDate) : null;

      if (activeTab === 'completed') {
        return t.isCompleted || (!!isRecurring && !!t.isCompletedToday);
      }

      if (activeTab === 'overdue') {
        return !t.isCompleted && !!taskDueDate && taskDueDate.getTime() < today.getTime();
      }

      if (activeTab === 'today') {
        // Tasks due today, or recurring habit
        const isDueToday =
          !!taskDueDate &&
          taskDueDate.getTime() >= today.getTime() &&
          taskDueDate.getTime() <= endOfToday.getTime();
        return isDueToday || isRecurring;
      }

      if (activeTab === 'week') {
        // Tasks due within the current week (Monday through Sunday)
        if (!taskDueDate) return false;
        return (
          taskDueDate.getTime() >= startOfWeek.getTime() &&
          taskDueDate.getTime() <= endOfWeek.getTime()
        );
      }

      if (activeTab === 'upcoming') {
        // Tasks due after today OR unscheduled tasks without a due date
        if (!taskDueDate) return true; // unscheduled tasks belong in upcoming!
        return taskDueDate.getTime() > endOfToday.getTime();
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
        // Overdue: past due date
        if (d && d.getTime() < today.getTime()) {
          overdueCount++;
        }
        // Today: due today or recurring
        if ((d && d.getTime() >= today.getTime() && d.getTime() <= endOfToday.getTime()) || isRecurring) {
          todayCount++;
        }
        // Week: due within this week
        if (d && d.getTime() >= startOfWeek.getTime() && d.getTime() <= endOfWeek.getTime()) {
          weekCount++;
        }
        // Upcoming: due in future OR unscheduled (no due date)
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
            <span>Quản lý Công việc (Tasks)</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Theo dõi to-do list, habit hàng ngày và tiến độ các đầu việc
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingTask(null);
            setIsModalOpen(true);
          }}
          className="shadow-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Thêm công việc
        </Button>
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
          <span>Hôm nay</span>
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
          <span>Tuần này</span>
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
          <span>Sắp tới</span>
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
          <span>Quá hạn</span>
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
          <span>Đã xong</span>
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
            placeholder="Tìm kiếm công việc theo từ khóa..."
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
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tất cả ưu tiên</option>
            <option value="high">Ưu tiên cao</option>
            <option value="medium">Ưu tiên TB</option>
            <option value="low">Ưu tiên thấp</option>
          </select>

          {/* Goal Filter */}
          <select
            value={goalFilter}
            onChange={(e) => setGoalFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[160px] truncate"
          >
            <option value="all">Tất cả mục tiêu</option>
            <option value="none">Không thuộc mục tiêu</option>
            {goals.map((g) => (
              <option key={g._id} value={g._id}>
                {g.title}
              </option>
            ))}
          </select>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tất cả thẻ</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Task List Items */}
      {isTasksLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : activeTasks.length === 0 && completedInTab.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-800 dark:text-white">
            Không có công việc nào trong danh sách này
          </h4>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            {activeTab === 'today'
              ? 'Tuyệt vời! Bạn không còn việc tồn đọng nào cho ngày hôm nay.'
              : activeTab === 'overdue'
              ? 'Không có công việc nào bị quá hạn. Tiến độ rất chuẩn xác!'
              : 'Bấm nút "Thêm công việc" phía trên để lên kế hoạch mới.'}
          </p>
        </div>
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
                className="flex items-center space-x-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-3 transition-colors"
              >
                {showCompletedSection ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                )}
                <span>Đã hoàn thành ({completedInTab.length})</span>
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

      {/* Task Create / Edit Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={async (data) => {
          if (editingTask) {
            await updateTaskMutation.mutateAsync({
              id: editingTask._id,
              data,
            });
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
        onConfirm={() => {
          if (deletingTask) {
            deleteTaskMutation.mutate(deletingTask._id);
          }
        }}
        title="Xác nhận xóa công việc"
        message={`Bạn có chắc chắn muốn xóa vĩnh viễn công việc "${deletingTask?.title}"?`}
        confirmLabel="Xóa công việc"
        isLoading={deleteTaskMutation.isPending}
      />
    </div>
  );
};
