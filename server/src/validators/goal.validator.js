import { z } from 'zod';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const nullableObjectId = z
  .union([z.string().regex(objectIdPattern, 'Invalid ID format'), z.null(), z.literal('')])
  .optional()
  .transform((val) => (val === '' ? null : val));

export const createGoalSchema = z.object({
  title: z.string().trim().min(1, 'Goal title is required').max(200, 'Goal title cannot exceed 200 characters'),
  description: z.string().trim().optional(),
  type: z.enum(['year', 'quarter', 'month', 'week', 'custom']).optional(),
  startDate: z.coerce.date({ invalid_type_error: 'Valid start date is required' }),
  endDate: z.coerce.date({ invalid_type_error: 'Valid end date is required' }),
  parentId: nullableObjectId,
  categoryId: nullableObjectId,
  color: z.string().trim().max(30).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'paused', 'cancelled']).optional(),
  progressMode: z.enum(['auto', 'numeric']).optional(),
  targetValue: z.number().min(0, 'Target value cannot be negative').optional(),
  currentValue: z.number().min(0, 'Current value cannot be negative').optional(),
  unit: z.string().trim().max(50).optional(),
  weight: z.number().min(0, 'Weight cannot be negative').optional(),
});

export const updateGoalSchema = z.object({
  title: z.string().trim().min(1, 'Goal title cannot be empty').max(200).optional(),
  description: z.string().trim().optional(),
  type: z.enum(['year', 'quarter', 'month', 'week', 'custom']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  parentId: nullableObjectId,
  categoryId: nullableObjectId,
  color: z.string().trim().max(30).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'paused', 'cancelled']).optional(),
  progressMode: z.enum(['auto', 'numeric']).optional(),
  targetValue: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  unit: z.string().trim().max(50).optional(),
  weight: z.number().min(0).optional(),
});

export const updateGoalProgressSchema = z.object({
  currentValue: z.number({ required_error: 'currentValue is required' }).min(0, 'currentValue cannot be negative'),
  note: z.string().trim().optional(),
});

export const queryGoalSchema = z.object({
  type: z.enum(['year', 'quarter', 'month', 'week', 'custom']).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'paused', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  categoryId: z.union([z.string().regex(objectIdPattern), z.literal('null')]).optional(),
  parentId: z.union([z.string().regex(objectIdPattern), z.literal('null')]).optional(),
});
