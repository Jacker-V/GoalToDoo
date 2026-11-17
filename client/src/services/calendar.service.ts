import { api } from './api';
import type { ApiResponse } from '../types/auth';
import type { CalendarData } from '../types/calendar';

export const calendarService = {
  getCalendarData: async (from: string, to: string, categoryId?: string | null): Promise<CalendarData> => {
    const params: Record<string, string> = { from, to };
    if (categoryId !== undefined && categoryId !== null && categoryId !== 'all') {
      params.categoryId = categoryId;
    } else if (categoryId === null) {
      params.categoryId = 'null';
    }
    const { data } = await api.get<ApiResponse<CalendarData>>('/calendar', { params });
    return data.data;
  },
};
