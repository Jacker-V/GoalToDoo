export interface Subtask {
  _id?: string;
  title: string;
  done: boolean;
}

export type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekly';

export interface Recurrence {
  type: RecurrenceType;
  daysOfWeek?: number[];
  interval?: number;
  endDate?: string | null;
}

export type Priority = 'low' | 'medium' | 'high';

export type TaskSource = 'user' | 'system';
export type TaskLinkedModule = 'none' | 'learn';

export interface Task {
  _id: string;
  userId: string;
  title: string;
  notes?: string;
  goalId?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  priority: Priority;
  tags: string[];
  subtasks: Subtask[];
  isCompleted: boolean;
  completedAt?: string | null;
  recurrence: Recurrence;
  order: number;
  weight: number;
  source?: TaskSource;
  linkedModule?: TaskLinkedModule;
  metadata?: Record<string, any>;
  progress?: number;
  streak?: number;
  isCompletedToday?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  notes?: string;
  goalId?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: Priority;
  tags?: string[];
  subtasks?: Subtask[];
  isCompleted?: boolean;
  recurrence?: Recurrence;
  order?: number;
  weight?: number;
  source?: TaskSource;
  linkedModule?: TaskLinkedModule;
  metadata?: Record<string, any>;
}

export interface UpdateTaskInput {
  title?: string;
  notes?: string;
  goalId?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: Priority;
  tags?: string[];
  subtasks?: Subtask[];
  isCompleted?: boolean;
  recurrence?: Recurrence;
  order?: number;
  weight?: number;
  source?: TaskSource;
  linkedModule?: TaskLinkedModule;
  metadata?: Record<string, any>;
}
