import { z } from 'zod';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const nullableObjectId = z
  .union([z.string().regex(objectIdPattern, 'Invalid ID format'), z.null(), z.literal('')])
  .optional()
  .transform((val) => (val === '' ? null : val));

const eventRecurrenceSchema = z.object({
  type: z.enum(['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly']).optional(),
  interval: z.number().int().min(1).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  endDate: z.coerce.date().nullable().optional(),
});

export const createEventSchema = z.object({
  title: z.string().trim().min(1, 'Event title is required').max(200, 'Event title cannot exceed 200 characters'),
  description: z.string().trim().optional(),
  start: z.coerce.date({ invalid_type_error: 'Valid start date/time is required' }),
  end: z.coerce.date({ invalid_type_error: 'Valid end date/time is required' }),
  allDay: z.boolean().optional(),
  color: z.string().trim().max(30).optional(),
  categoryId: nullableObjectId,
  recurrence: eventRecurrenceSchema.optional(),
  reminders: z.array(z.number()).optional(),
});

export const updateEventSchema = z.object({
  title: z.string().trim().min(1, 'Event title cannot be empty').max(200).optional(),
  description: z.string().trim().optional(),
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
  allDay: z.boolean().optional(),
  color: z.string().trim().max(30).optional(),
  categoryId: nullableObjectId,
  recurrence: eventRecurrenceSchema.optional(),
  reminders: z.array(z.number()).optional(),
});

export const queryEventSchema = z.object({
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
  categoryId: z.union([z.string().regex(objectIdPattern), z.literal('null')]).optional(),
});
