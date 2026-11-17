import React, { useState, useMemo } from 'react';
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
import { toast } from '../store/useToastStore';
import type { CalendarViewMode, CalendarFilterState } from '../types/calendar';
import type { CalendarEvent, CreateEventInput } from '../types/event';
import type { Task, CreateTaskInput } from '../types/task';
import {
  getMonthDays,
  getWeekDays,
  formatTimeHHmm,
} from '../utils/calendar';
import { formatLocalDate } from '../utils/date';

export const CalendarPage: React.FC = () => {
  const queryClient = useQueryClient();

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
      toast.success('Đã tạo sự kiện thành công');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể tạo sự kiện');
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateEventInput> }) =>
      eventService.updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setIsEventModalOpen(false);
      setEditingEvent(null);
      toast.success('Đã cập nhật sự kiện');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể cập nhật sự kiện');
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => eventService.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setDeletingEvent(null);
      toast.success('Đã xóa sự kiện');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể xóa sự kiện');
    },
  });

  // Task Mutations
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskInput) => taskService.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setIsTaskModalOpen(false);
      setEditingTask(null);
      toast.success('Đã tạo công việc thành công');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể tạo công việc');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      taskService.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setIsTaskModalOpen(false);
      setEditingTask(null);
      toast.success('Đã cập nhật công việc');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể cập nhật công việc');
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: (id: string) => taskService.toggleTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể cập nhật trạng thái');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => taskService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setDeletingTask(null);
      toast.success('Đã xóa công việc');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Không thể xóa công việc');
    },
  });

  // --- HANDLERS ---

  // Quick Add from Day / Time slot click
  const handleQuickAdd = (dateStr: string, timeStr?: string) => {
    setQuickAddDate(dateStr);
    setQuickAddTime(timeStr || '09:00');
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleOpenCreateEvent = () => {
    setQuickAddDate(formatLocalDate(currentDate));
    setQuickAddTime('09:00');
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleOpenCreateTask = () => {
    setQuickAddDate(formatLocalDate(currentDate));
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  // Drag and Drop move handler
  const handleMoveItem = (
    type: 'event' | 'task',
    id: string,
    targetDateStr: string,
    targetTimeStr?: string
  ) => {
    if (type === 'event') {
      const eventToMove = calendarData.events.find(
        (e) => (e.originalId || e._id) === id || e._id === id
      );
      if (!eventToMove) return;

      const originalStart = new Date(eventToMove.start);
      const originalEnd = new Date(eventToMove.end);
      const durationMs = originalEnd.getTime() - originalStart.getTime();

      let newStart: Date;
      let newEnd: Date;
      const updateData: Partial<CreateEventInput> = {};

      if (eventToMove.allDay && !targetTimeStr) {
        newStart = new Date(`${targetDateStr}T00:00:00.000Z`);
        newEnd = new Date(newStart.getTime() + durationMs);
      } else if (targetTimeStr) {
        const [th, tm] = targetTimeStr.split(':').map(Number);
        newStart = new Date(`${targetDateStr}T${String(th).padStart(2, '0')}:${String(tm).padStart(2, '0')}:00`);
        newEnd = new Date(newStart.getTime() + durationMs);
        if (eventToMove.allDay) {
          updateData.allDay = false;
        }
      } else {
        const h = originalStart.getHours();
        const m = originalStart.getMinutes();
        newStart = new Date(`${targetDateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
        newEnd = new Date(newStart.getTime() + durationMs);
      }

      updateData.start = newStart.toISOString();
      updateData.end = newEnd.toISOString();

      updateEventMutation.mutate({
        id: eventToMove.originalId || eventToMove._id,
        data: updateData,
      });
    } else if (type === 'task') {
      const taskToMove = calendarData.tasks.find((t) => t._id === id);
      if (!taskToMove) return;

      const updatePayload: any = {
        dueDate: new Date(`${targetDateStr}T00:00:00.000Z`).toISOString(),
      };
      if (targetTimeStr) {
        updatePayload.dueTime = targetTimeStr;
      }

      updateTaskMutation.mutate({
        id: taskToMove._id,
        data: updatePayload,
      });
    }
  };

  // Submit Event Form
  const handleEventSubmit = async (data: CreateEventInput) => {
    if (editingEvent) {
      const targetId = editingEvent.originalId || editingEvent._id;
      await updateEventMutation.mutateAsync({ id: targetId, data });
    } else {
      await createEventMutation.mutateAsync(data);
    }
  };

  // Submit Task Form
  const handleTaskSubmit = async (data: CreateTaskInput) => {
    if (editingTask) {
      await updateTaskMutation.mutateAsync({ id: editingTask._id, data });
    } else {
      await createTaskMutation.mutateAsync(data);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* 1. Header Toolbar */}
      <CalendarHeader
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filters={filters}
        onFiltersChange={setFilters}
        categories={categories}
        onOpenCreateEvent={handleOpenCreateEvent}
        onOpenCreateTask={handleOpenCreateTask}
      />

      {/* 2. Loading Indicator */}
      {isCalendarLoading && (
        <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="w-1/3 h-full bg-indigo-600 animate-pulse rounded-full" />
        </div>
      )}

      {/* 3. Active Calendar View */}
      {viewMode === 'month' && (
        <MonthView
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

      {/* 4. Modals */}
      {/* Event Modal (Create / Edit) */}
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

      {/* Task Modal (Create / Edit) */}
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

      {/* Item Detail Modal */}
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

      {/* Confirm Delete Event Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingEvent)}
        onClose={() => setDeletingEvent(null)}
        onConfirm={() => {
          if (deletingEvent) {
            deleteEventMutation.mutate(deletingEvent.originalId || deletingEvent._id);
          }
        }}
        title="Xóa sự kiện"
        message={`Bạn có chắc chắn muốn xóa sự kiện "${deletingEvent?.title}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa sự kiện"
        variant="danger"
        isLoading={deleteEventMutation.isPending}
      />

      {/* Confirm Delete Task Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingTask)}
        onClose={() => setDeletingTask(null)}
        onConfirm={() => {
          if (deletingTask) {
            deleteTaskMutation.mutate(deletingTask._id);
          }
        }}
        title="Xóa công việc"
        message={`Bạn có chắc chắn muốn xóa công việc "${deletingTask?.title}"?`}
        confirmText="Xóa công việc"
        variant="danger"
        isLoading={deleteTaskMutation.isPending}
      />
    </div>
  );
};
