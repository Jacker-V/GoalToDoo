import { api } from './api';
import type { ApiResponse } from '../types/auth';
import type {
  Goal,
  GoalTreeNode,
  CreateGoalInput,
  UpdateGoalInput,
  ProgressLog,
} from '../types/goal';

export interface GoalQueryParams {
  type?: string;
  status?: string;
  priority?: string;
  categoryId?: string;
  parentId?: string;
}

export const goalService = {
  getGoals: async (params?: GoalQueryParams): Promise<Goal[]> => {
    const { data } = await api.get<ApiResponse<Goal[]>>('/goals', { params });
    return data.data;
  },

  getGoalTree: async (): Promise<GoalTreeNode[]> => {
    const { data } = await api.get<ApiResponse<GoalTreeNode[]>>('/goals/tree');
    return data.data;
  },

  getGoalById: async (id: string): Promise<Goal> => {
    const { data } = await api.get<ApiResponse<Goal>>(`/goals/${id}`);
    return data.data;
  },

  createGoal: async (payload: CreateGoalInput): Promise<Goal> => {
    const { data } = await api.post<ApiResponse<Goal>>('/goals', payload);
    return data.data;
  },

  updateGoal: async (id: string, payload: UpdateGoalInput): Promise<Goal> => {
    const { data } = await api.patch<ApiResponse<Goal>>(`/goals/${id}`, payload);
    return data.data;
  },

  deleteGoal: async (id: string): Promise<void> => {
    await api.delete<ApiResponse<{ message: string }>>(`/goals/${id}`);
  },

  updateGoalProgress: async (
    id: string,
    currentValue: number,
    note?: string
  ): Promise<Goal> => {
    const { data } = await api.patch<ApiResponse<Goal>>(`/goals/${id}/progress`, {
      currentValue,
      note,
    });
    return data.data;
  },

  getGoalLogs: async (id: string): Promise<ProgressLog[]> => {
    const { data } = await api.get<ApiResponse<ProgressLog[]>>(`/goals/${id}/logs`);
    return data.data;
  },
};
