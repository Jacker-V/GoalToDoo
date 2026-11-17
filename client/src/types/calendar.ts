import type { CalendarEvent } from './event';
import type { Task } from './task';
import type { Goal } from './goal';

export interface CalendarData {
  events: CalendarEvent[];
  tasks: Task[];
  goals: Goal[];
}

export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

export interface CalendarFilterState {
  showEvents: boolean;
  showTasks: boolean;
  showGoals: boolean;
  categoryId?: string | null;
}
