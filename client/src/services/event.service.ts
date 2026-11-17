import { api } from './api';
import type { ApiResponse } from '../types/auth';
import type { CalendarEvent, CreateEventInput, UpdateEventInput } from '../types/event';

export const eventService = {
  getEvents: async (params?: { start?: string; end?: string; categoryId?: string }): Promise<CalendarEvent[]> => {
    const { data } = await api.get<ApiResponse<CalendarEvent[]>>('/events', { params });
    return data.data;
  },

  getEventById: async (id: string): Promise<CalendarEvent> => {
    const { data } = await api.get<ApiResponse<CalendarEvent>>(`/events/${id}`);
    return data.data;
  },

  createEvent: async (payload: CreateEventInput): Promise<CalendarEvent> => {
    const { data } = await api.post<ApiResponse<CalendarEvent>>('/events', payload);
    return data.data;
  },

  updateEvent: async (id: string, payload: UpdateEventInput): Promise<CalendarEvent> => {
    const { data } = await api.patch<ApiResponse<CalendarEvent>>(`/events/${id}`, payload);
    return data.data;
  },

  deleteEvent: async (id: string): Promise<void> => {
    await api.delete<ApiResponse<{ message: string }>>(`/events/${id}`);
  },
};
