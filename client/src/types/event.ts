export type EventRecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';

export interface EventRecurrence {
  type: EventRecurrenceType;
  interval?: number;
  daysOfWeek?: number[];
  endDate?: string | null;
}

export interface CalendarEvent {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay: boolean;
  color?: string;
  categoryId?: string | null;
  recurrence?: EventRecurrence;
  reminders?: number[];
  instanceId?: string;
  isRecurringInstance?: boolean;
  originalId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay?: boolean;
  color?: string;
  categoryId?: string | null;
  recurrence?: EventRecurrence;
  reminders?: number[];
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  start?: string;
  end?: string;
  allDay?: boolean;
  color?: string;
  categoryId?: string | null;
  recurrence?: EventRecurrence;
  reminders?: number[];
}
