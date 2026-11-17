import { api } from './api';
import type { ApiResponse } from '../types/auth';
import type { Category, CreateCategoryInput } from '../types/category';

export const categoryService = {
  getCategories: async (): Promise<Category[]> => {
    const { data } = await api.get<ApiResponse<Category[]>>('/categories');
    return data.data;
  },

  createCategory: async (payload: CreateCategoryInput): Promise<Category> => {
    const { data } = await api.post<ApiResponse<Category>>('/categories', payload);
    return data.data;
  },

  updateCategory: async (
    id: string,
    payload: Partial<CreateCategoryInput>
  ): Promise<Category> => {
    const { data } = await api.patch<ApiResponse<Category>>(`/categories/${id}`, payload);
    return data.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete<ApiResponse<{ message: string }>>(`/categories/${id}`);
  },
};
