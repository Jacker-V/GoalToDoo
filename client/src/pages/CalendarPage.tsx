import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarService } from '../services/calendar.service';
import { eventService } from '../services/event.service';
import { taskService } from '../services/task.service';
import { categoryService } from '../services/category.service';
import { goalService } from '../services/goal.service';
import { CalendarHeader } from '../components/calendar/CalendarHeader';
import { MonthView } from '../components/calendar/MonthView';
import { WeekView } from '../components/calendar/WeekView';
import { DayView } from '../components/calendar/DayView';
import { AgendaView } from '../components/calendar/AgendaView';
import { EventModal } from '../components/calendar/EventModal';
import { TaskModal } from '../components/tasks/TaskModal';
import {
  CalendarItemDetailModal,
  type CalendarSelectedItem,
} from '../components/calendar/CalendarItemDetailModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Skeleton } from '../components/ui/Skeleton';
import { toast } from '../store/useToastStore';
import { useI18n } from '../i18n';
import type { CalendarViewMode, CalendarFilterState } from '../types/calendar';
import type { CalendarEvent, CreateEventInput } from '../types/event';
import type { Task, CreateTaskInput } from '../types/task';
import {
  getMonthDays,
  getWeekDays,
} from '../utils/calendar';
import { formatLocalDate } from '../utils/date';

export const CalendarPage: React.FC = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation & View State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  // Filters State
  const [filters, setFilters] = useState<CalendarFilterState>({
    showEvents: true,
    showTasks: true,
    showGoals: true,
    categoryId: null,
  });

  // Modal States
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [selectedDetailItem, setSelectedDetailItem] = useState<CalendarSelectedItem | null>(null);

  const [deletingEvent, setDeletingEvent] = useState<CalendarEvent | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const [quickAddDate, setQuickAddDate] = useState<string>('');
  const [quickAddTime, setQuickAddTime] = useState<string>('');

  // Shortcut T: Jump to today
  useEffect(() => {
    const handleJumpToday = () => {
      setCurrentDate(new Date());
    };
    window.addEventListener('gc-jump-today', handleJumpToday);
    return () => window.removeEventListener('gc-jump-today', handleJumpToday);
  }, []);

  // Shortcut N (if routed here with create=true)
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setEditingEvent(null);
      setIsEventModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // 1. Compute dynamic date window [fromStr, toStr] based on viewMode and currentDate
  const { fromStr, toStr, monthDays, weekDays } = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();

    const mDays = getMonthDays(y, m);
    const wDays = getWeekDays(currentDate);

    let from: string;
    let to: string;

    if (viewMode === 'month') {
      from = mDays[0].dateStr;
      to = mDays[mDays.length - 1].dateStr;
    } else if (viewMode === 'week') {
      from = wDays[0].dateStr;
      to = wDays[wDays.length - 1].dateStr;
    } else if (viewMode === 'day') {
      from = formatLocalDate(currentDate);
      to = formatLocalDate(currentDate);
    } else {
      // Agenda: from today/currentDate for 35 days
      from = formatLocalDate(currentDate);
      const agendaEnd = new Date(currentDate);
      agendaEnd.setDate(currentDate.getDate() + 35);
      to = formatLocalDate(agendaEnd);
    }

    return {
      fromStr: from,
      toStr: to,
      monthDays: mDays,
      weekDays: wDays,
    };
  }, [currentDate, viewMode]);

  // 2. Fetch Aggregated Calendar Data
  const {
    data: calendarData = { events: [], tasks: [], goals: [] },
    isLoading: isCalendarLoading,
  } = useQuery({
    queryKey: ['calendar', fromStr, toStr, filters.categoryId],
    queryFn: () => calendarService.getCalendarData(fromStr, toStr, filters.categoryId),
  });

  // 3. Fetch Categories & Goals for select dropdowns
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalService.getGoals(),
  });

  // --- MUTATIONS ---

  // Event Mutations
  const createEventMutation = useMutation({
    mutationFn: (data: CreateEventInput) => eventService.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setIsEventModalOpen(false);
      setEditingEvent(null);
      toast.success(t('common.success'));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || t('common.error'));
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateEventInput> }) =>
      eventService.updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setIsEventModalOpen(false);
      setEditingEvent(null);
      toast.success(t('common.success'));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || t('common.error'));
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => eventService.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setDeletingEvent(null);
      setSelectedDetailItem(null);
      toast.success(t('common.success'));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || t('common.error'));
    },
  });

  // Task Mutations (From Calendar)
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskInput) => taskService.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsTaskModalOpen(false);
      setEditingTask(null);
      toast.success(t('common.success'));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || t('common.error'));
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTaskInput> }) =>
      taskService.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsTaskModalOpen(false);
      setEditingTask(null);
      toast.success(t('common.success'));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || t('common.error'));
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => taskService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setDeletingTask(null);
      setSelectedDetailItem(null);
      toast.success(t('common.success'));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || t('common.error'));
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: (taskId: string) => taskService.toggleTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || t('common.error'));
    },
  });

  // Action Handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else if (viewMode === 'day') {
      next.setDate(next.getDate() - 1);
    } else {
      next.setDate(next.getDate() - 14);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else if (viewMode === 'day') {
      next.setDate(next.getDate() + 1);
    } else {
      next.setDate(next.getDate() + 14);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleQuickAdd = (dateStr: string, timeStr?: string) => {
    setQuickAddDate(dateStr);
    setQuickAddTime(timeStr || '09:00');
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEventSubmit = async (data: CreateEventInput) => {
    if (editingEvent) {
      await updateEventMutation.mutateAsync({
        id: editingEvent.originalId || editingEvent._id,
        data,
      });
    } else {
      await createEventMutation.mutateAsync(data);
    }
  };

  const handleTaskSubmit = async (data: CreateTaskInput) => {
    if (editingTask) {
      await updateTaskMutation.mutateAsync({
        id: editingTask._id,
        data,
      });
    } else {
      await createTaskMutation.mutateAsync(data);
    }
  };

  const handleMoveItem = async (
    type: 'task' | 'event',
    id: string,
    newDateStr: string,
    newStartTime?: string
  ) => {
    try {
      if (type === 'event') {
        const ev = calendarData.events.find((e) => e._id === id || e.originalId === id);
        if (!ev) return;
        const origStart = new Date(ev.start);
        const origEnd = new Date(ev.end);
        const duration = origEnd.getTime() - origStart.getTime();

        const [y, m, d] = newDateStr.split('-').map(Number);
        const nextStart = new Date(y, m - 1, d);

        if (newStartTime && !ev.allDay) {
          const [hh, mm] = newStartTime.split(':').map(Number);
          nextStart.setHours(hh, mm, 0, 0);
        } else {
          nextStart.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0);
        }

        const nextEnd = new Date(nextStart.getTime() + duration);

        await updateEventMutation.mutateAsync({
          id: ev.originalId || ev._id,
          data: {
            start: nextStart.toISOString(),
            end: nextEnd.toISOString(),
          },
        });
        toast.success('Đã cập nhật thời gian sự kiện');
      } else if (type === 'task') {
        const t = calendarData.tasks.find((task) => task._id === id);
        if (!t) return;
        const [y, m, d] = newDateStr.split('-').map(Number);
        const nextDue = new Date(y, m - 1, d);
        nextDue.setHours(23, 59, 59, 999);

        await updateTaskMutation.mutateAsync({
          id: t._id,
          data: {
            dueDate: nextDue.toISOString(),
            dueTime: newStartTime || t.dueTime || null,
          },
        });
        toast.success('Đã đổi hạn hoàn thành công việc');
      }
    } catch {
      toast.error('Không thể di chuyển mục lịch');
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto flex flex-col h-full">
      {/* 1. Header Toolbar */}
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        filters={filters}
        categories={categories}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onViewModeChange={setViewMode}
        onFilterChange={setFilters}
        onAddEvent={() => {
          setEditingEvent(null);
          setQuickAddDate(formatLocalDate(currentDate));
          setQuickAddTime('09:00');
          setIsEventModalOpen(true);
        }}
        onAddTask={() => {
          setEditingTask(null);
          setQuickAddDate(formatLocalDate(currentDate));
          setIsTaskModalOpen(true);
        }}
      />

      {/* 2. Loading Skeleton Indicator */}
      {isCalendarLoading && (
        <div className="w-full">
          <Skeleton className="h-1.5 w-full bg-indigo-500/30 rounded-full animate-pulse" />
        </div>
      )}

      {/* 3. Views based on viewMode */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-2 sm:p-4">
        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            days={monthDays}
            events={calendarData.events}
            tasks={calendarData.tasks}
            goals={calendarData.goals}
            filters={filters}
            onSelectItem={setSelectedDetailItem}
            onQuickAdd={handleQuickAdd}
            onToggleTask={(id) => toggleTaskMutation.mutate(id)}
            onMoveItem={handleMoveItem}
          />
        )}

        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            days={weekDays}
            events={calendarData.events}
            tasks={calendarData.tasks}
            goals={calendarData.goals}
            filters={filters}
            onSelectItem={setSelectedDetailItem}
            onQuickAdd={handleQuickAdd}
            onToggleTask={(id) => toggleTaskMutation.mutate(id)}
            onMoveItem={handleMoveItem}
          />
        )}

        {viewMode === 'day' && (
          <DayView
            currentDate={currentDate}
            events={calendarData.events}
            tasks={calendarData.tasks}
            goals={calendarData.goals}
            filters={filters}
            onSelectItem={setSelectedDetailItem}
            onQuickAdd={handleQuickAdd}
            onToggleTask={(id) => toggleTaskMutation.mutate(id)}
            onMoveItem={handleMoveItem}
          />
        )}

        {viewMode === 'agenda' && (
          <AgendaView
            currentDate={currentDate}
            events={calendarData.events}
            tasks={calendarData.tasks}
            goals={calendarData.goals}
            filters={filters}
            onSelectItem={setSelectedDetailItem}
            onQuickAdd={handleQuickAdd}
            onToggleTask={(id) => toggleTaskMutation.mutate(id)}
          />
        )}
      </div>

      {/* 4. Modals */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setEditingEvent(null);
        }}
        onSubmit={handleEventSubmit}
        event={editingEvent}
        categories={categories}
        initialDate={quickAddDate}
        initialStartTime={quickAddTime}
        isLoading={createEventMutation.isPending || updateEventMutation.isPending}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleTaskSubmit}
        task={editingTask}
        goals={goals}
        initialDueDate={quickAddDate}
        isLoading={createTaskMutation.isPending || updateTaskMutation.isPending}
      />

      <CalendarItemDetailModal
        isOpen={Boolean(selectedDetailItem)}
        onClose={() => setSelectedDetailItem(null)}
        selectedItem={selectedDetailItem}
        categories={categories}
        onEditEvent={(ev) => {
          setEditingEvent(ev);
          setIsEventModalOpen(true);
        }}
        onDeleteEvent={(ev) => setDeletingEvent(ev)}
        onEditTask={(t) => {
          setEditingTask(t);
          setIsTaskModalOpen(true);
        }}
        onDeleteTask={(t) => setDeletingTask(t)}
        onToggleTask={(id) => toggleTaskMutation.mutate(id)}
      />

      <ConfirmModal
        isOpen={Boolean(deletingEvent)}
        onClose={() => setDeletingEvent(null)}
        onConfirm={() => {
          if (deletingEvent) {
            deleteEventMutation.mutate(deletingEvent.originalId || deletingEvent._id);
          }
        }}
        title={t('common.confirmDeleteTitle')}
        description={`${t('common.confirmDeleteDesc')} ("${deletingEvent?.title}")`}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        isLoading={deleteEventMutation.isPending}
      />

      <ConfirmModal
        isOpen={Boolean(deletingTask)}
        onClose={() => setDeletingTask(null)}
        onConfirm={() => {
          if (deletingTask) {
            deleteTaskMutation.mutate(deletingTask._id);
          }
        }}
        title={t('common.confirmDeleteTitle')}
        description={`${t('common.confirmDeleteDesc')} ("${deletingTask?.title}")`}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        isLoading={deleteTaskMutation.isPending}
      />
    </div>
  );
};
