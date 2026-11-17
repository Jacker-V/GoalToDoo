import { api } from './api';
import type { ApiResponse } from '../types/auth';
import type { Task, CreateTaskInput, UpdateTaskInput } from '../types/task';

export interface TaskQueryParams {
  goalId?: string;
  priority?: string;
  isCompleted?: boolean;
  dueDate?: string;
  tag?: string;
}

export const taskService = {
  getTasks: async (params?: TaskQueryParams): Promise<Task[]> => {
    const { data } = await api.get<ApiResponse<Task[]>>('/tasks', { params });
    return data.data;
  },

  getTaskById: async (id: string): Promise<Task> => {
    const { data } = await api.get<ApiResponse<Task>>(`/tasks/${id}`);
    return data.data;
  },

  createTask: async (payload: CreateTaskInput): Promise<Task> => {
    const { data } = await api.post<ApiResponse<Task>>('/tasks', payload);
    return data.data;
  },

  updateTask: async (id: string, payload: UpdateTaskInput): Promise<Task> => {
    const { data } = await api.patch<ApiResponse<Task>>(`/tasks/${id}`, payload);
    return data.data;
  },

  deleteTask: async (id: string): Promise<void> => {
    await api.delete<ApiResponse<{ message: string }>>(`/tasks/${id}`);
  },

  toggleTask: async (id: string): Promise<Task> => {
    const { data } = await api.post<ApiResponse<Task>>(`/tasks/${id}/toggle`);
    return data.data;
  },

  completeRecurring: async (id: string, date: string): Promise<any> => {
    const { data } = await api.post<ApiResponse<any>>(`/tasks/${id}/complete`, null, {
      params: { date },
    });
    return data.data;
  },

  uncompleteRecurring: async (id: string, date: string): Promise<any> => {
    const { data } = await api.delete<ApiResponse<any>>(`/tasks/${id}/complete`, {
      params: { date },
    });
    return data.data;
  },
};
