import type { Task } from './task';

export type GoalType = 'year' | 'quarter' | 'month' | 'week' | 'custom';
export type GoalPriority = 'low' | 'medium' | 'high';
export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'paused' | 'cancelled';
export type GoalProgressMode = 'auto' | 'numeric';

export interface Goal {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  type: GoalType;
  startDate: string;
  endDate: string;
  parentId?: string | null;
  categoryId?: string | null;
  color: string;
  priority: GoalPriority;
  status: GoalStatus;
  progressMode: GoalProgressMode;
  targetValue: number;
  currentValue: number;
  unit?: string;
  weight: number;
  progressCache: number;
  idealProgress?: number;
  isOverdue?: boolean;
  atRisk?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoalTreeNode extends Goal {
  tasks: Task[];
  children: GoalTreeNode[];
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  type?: GoalType;
  startDate: string;
  endDate: string;
  parentId?: string | null;
  categoryId?: string | null;
  color?: string;
  priority?: GoalPriority;
  status?: GoalStatus;
  progressMode?: GoalProgressMode;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  weight?: number;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  type?: GoalType;
  startDate?: string;
  endDate?: string;
  parentId?: string | null;
  categoryId?: string | null;
  color?: string;
  priority?: GoalPriority;
  status?: GoalStatus;
  progressMode?: GoalProgressMode;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  weight?: number;
}

export interface ProgressLog {
  _id: string;
  userId: string;
  goalId: string;
  date: string;
  value: number;
  delta: number;
  note: string;
  snapshotPercent: number;
  createdAt: string;
  updatedAt: string;
}
