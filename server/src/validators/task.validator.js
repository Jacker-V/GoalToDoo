import { z } from 'zod';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const nullableObjectId = z
  .union([z.string().regex(objectIdPattern, 'Invalid ID format'), z.null(), z.literal('')])
  .optional()
  .transform((val) => (val === '' ? null : val));

const subtaskItemSchema = z.object({
  _id: z.string().regex(objectIdPattern).optional(),
  title: z.string().trim().min(1, 'Subtask title cannot be empty').max(200),
  done: z.boolean().optional().default(false),
});

const recurrenceSchema = z.object({
  type: z.enum(['none', 'daily', 'weekdays', 'weekly']).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  interval: z.number().int().min(1).optional(),
  endDate: z.coerce.date().nullable().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(200, 'Task title cannot exceed 200 characters'),
  notes: z.string().trim().optional(),
  goalId: nullableObjectId,
  dueDate: z.coerce.date().nullable().optional(),
  dueTime: z.string().trim().max(20).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  tags: z.array(z.string().trim().max(50)).optional(),
  subtasks: z.array(subtaskItemSchema).optional(),
  isCompleted: z.boolean().optional(),
  recurrence: recurrenceSchema.optional(),
  order: z.number().optional(),
  weight: z.number().min(0).optional(),
  source: z.enum(['user', 'system']).optional(),
  linkedModule: z.enum(['none', 'learn']).optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title cannot be empty').max(200).optional(),
  notes: z.string().trim().optional(),
  goalId: nullableObjectId,
  dueDate: z.coerce.date().nullable().optional(),
  dueTime: z.string().trim().max(20).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  tags: z.array(z.string().trim().max(50)).optional(),
  subtasks: z.array(subtaskItemSchema).optional(),
  isCompleted: z.boolean().optional(),
  recurrence: recurrenceSchema.optional(),
  order: z.number().optional(),
  weight: z.number().min(0).optional(),
  source: z.enum(['user', 'system']).optional(),
  linkedModule: z.enum(['none', 'learn']).optional(),
  metadata: z.record(z.any()).optional(),
});

export const completeRecurringQuerySchema = z.object({
  date: z
    .string({ required_error: 'date query parameter is required (YYYY-MM-DD)' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must follow YYYY-MM-DD format')
    .refine((val) => {
      const [y, m, d] = val.split('-').map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      return (
        date.getUTCFullYear() === y &&
        date.getUTCMonth() === m - 1 &&
        date.getUTCDate() === d
      );
    }, 'Invalid calendar date'),
});

export const queryTaskSchema = z.object({
  goalId: z.union([z.string().regex(objectIdPattern), z.literal('null')]).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  isCompleted: z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .transform((val) => (val === true || val === 'true'))
    .optional(),
  dueDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid dueDate format')
    .optional(),
  tag: z.string().optional(),
});
