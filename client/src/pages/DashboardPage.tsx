import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  CheckSquare,
  AlertTriangle,
  Flame,
  ArrowRight,
  Plus,
  TrendingUp,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { taskService } from '../services/task.service';
import { goalService } from '../services/goal.service';
import type { Task, Subtask } from '../types/task';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { TaskItem } from '../components/tasks/TaskItem';
import { toast } from '../store/useToastStore';
import { getTodayLocalDateString } from '../utils/date';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskService.getTasks(),
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalService.getGoals(),
  });

  // Toggle Task Completion Mutation
  const toggleTaskMutation = useMutation({
    mutationFn: (task: Task) => taskService.toggleTask(task._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
    },
  });

  // Toggle Recurring Task Today
  const toggleRecurringMutation = useMutation({
    mutationFn: async (task: Task) => {
      const todayStr = getTodayLocalDateString();
      if (task.isCompletedToday) {
        return taskService.uncompleteRecurring(task._id, todayStr);
      } else {
        return taskService.completeRecurring(task._id, todayStr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
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

  // Today's Date Boundaries
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  // Filter Tasks for Today Widget
  const todayTasks = tasks.filter((t) => {
    const isRecurring = t.recurrence && t.recurrence.type !== 'none';
    const d = t.dueDate ? new Date(t.dueDate) : null;
    const isDueToday = d && d.getTime() >= today.getTime() && d.getTime() <= endOfToday.getTime();
    return isDueToday || isRecurring;
  });

  const completedTodayCount = todayTasks.filter(
    (t) => t.isCompleted || (t.recurrence?.type !== 'none' && t.isCompletedToday)
  ).length;

  const todayCompletionRate =
    todayTasks.length > 0 ? Math.round((completedTodayCount / todayTasks.length) * 100) : 0;

  // Active Goals
  const activeGoals = goals.filter(
    (g) => g.status !== 'completed' && g.status !== 'cancelled' && g.progressCache < 100
  );

  const atRiskOrOverdueGoals = goals.filter((g) => g.atRisk || g.isOverdue);

  // Best streak
  const bestStreak = tasks.reduce((max, t) => Math.max(max, t.streak || 0), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-100 border border-white/20 mb-2">
            ✨ Hệ thống GoalCalendar - Giai đoạn 3 sẵn sàng
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Chào mừng trở lại, {user?.name}! 👋
          </h1>
          <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
            Hôm nay bạn có <span className="font-bold underline">{todayTasks.length} công việc</span> cần làm.
            {todayCompletionRate === 100 && todayTasks.length > 0
              ? ' 🎉 Bạn đã hoàn thành xuất sắc tất cả công việc hôm nay!'
              : ` Tiến độ đạt ${todayCompletionRate}%. Hãy tiếp tục giữ vững kỷ luật nhé!`}
          </p>
        </div>

        {/* Abstract Background Decors */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Tasks */}
        <div
          onClick={() => navigate('/tasks')}
          className="cursor-pointer group p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Công việc hôm nay
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {completedTodayCount}/{todayTasks.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">hoàn thành</span>
          </div>
          <div className="mt-3">
            <ProgressBar value={todayCompletionRate} size="sm" />
          </div>
        </div>

        {/* Card 2: Active Goals */}
        <div
          onClick={() => navigate('/goals')}
          className="cursor-pointer group p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Mục tiêu đang chạy
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {activeGoals.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">mục tiêu active</span>
          </div>
          <div className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center">
            <span>Xem chi tiết cây mục tiêu</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Best Streak */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Chuỗi thói quen dài nhất
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Flame className="w-4 h-4 fill-amber-500" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {bestStreak}
            </span>
            <span className="text-xs text-slate-500 font-medium">ngày liên tiếp 🔥</span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Duy trì thói quen hàng ngày để bứt phá
          </div>
        </div>

        {/* Card 4: Warnings & Risks */}
        <div
          onClick={() => navigate('/goals')}
          className={`cursor-pointer p-5 rounded-2xl border shadow-sm transition-all ${
            atRiskOrOverdueGoals.length > 0
              ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 hover:border-rose-300'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cảnh báo tiến độ
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                atRiskOrOverdueGoals.length > 0
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300'
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}
            >
              {atRiskOrOverdueGoals.length > 0 ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span
              className={`text-2xl font-extrabold ${
                atRiskOrOverdueGoals.length > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {atRiskOrOverdueGoals.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {atRiskOrOverdueGoals.length > 0 ? 'mục tiêu cần can thiệp' : 'mục tiêu đúng tiến độ'}
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500 truncate">
            {atRiskOrOverdueGoals.length > 0
              ? 'Có mục tiêu nguy cơ trễ hoặc quá hạn'
              : 'Tất cả mục tiêu đều an toàn'}
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Tasks + Active Goals Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Today's Tasks Widget */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Công việc hôm nay ({todayTasks.length})
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/tasks')}
                className="text-xs"
              >
                Xem tất cả
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            {todayTasks.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p>Không có công việc nào cần hoàn thành hôm nay!</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/tasks')}
                  className="mt-3"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Thêm việc mới
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {todayTasks.slice(0, 5).map((t) => (
                  <TaskItem
                    key={t._id}
                    task={t}
                    goals={goals}
                    onToggleComplete={(task) => toggleTaskMutation.mutate(task)}
                    onToggleRecurringToday={(task) => toggleRecurringMutation.mutate(task)}
                    onUpdateSubtasks={(task, subtasks) =>
                      updateSubtasksMutation.mutate({ task, subtasks })
                    }
                    onEdit={() => navigate('/tasks')}
                    onDelete={() => navigate('/tasks')}
                  />
                ))}
              </div>
            )}
          </div>

          {todayTasks.length > 5 && (
            <div className="pt-3 text-center border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
              Và {todayTasks.length - 5} công việc khác trong danh sách...
            </div>
          )}
        </div>

        {/* Right Column: Focus Goals */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Mục tiêu trọng tâm
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/goals')}
                className="text-xs"
              >
                Cây mục tiêu
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            {goals.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                <Target className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <p>Bạn chưa thiết lập mục tiêu nào.</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/goals')}
                  className="mt-3"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Tạo mục tiêu đầu tiên
                </Button>
              </div>
            ) : (
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {goals.slice(0, 4).map((g) => (
                  <div
                    key={g._id}
                    onClick={() => navigate('/goals')}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: g.color || '#6366f1' }}
                        />
                        <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                          {g.title}
                        </span>
                      </div>
                      <span className="font-extrabold text-slate-900 dark:text-white ml-2">
                        {g.progressCache}%
                      </span>
                    </div>

                    <ProgressBar value={g.progressCache} size="sm" />

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>{g.type.toUpperCase()}</span>
                      {g.atRisk && (
                        <span className="text-amber-500 font-semibold">⚠️ Nguy cơ trễ</span>
                      )}
                      {g.isOverdue && (
                        <span className="text-rose-500 font-semibold">🚨 Quá hạn</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
            <span>Tổng cộng: {goals.length} mục tiêu</span>
            <button
              onClick={() => navigate('/goals')}
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              Quản lý toàn bộ ➔
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
