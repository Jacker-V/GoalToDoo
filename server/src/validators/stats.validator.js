import { z } from 'zod';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const getSummaryQuerySchema = z.object({
  period: z.enum(['week', 'month', 'year', 'custom']).optional().default('month'),
  refDate: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const getHeatmapQuerySchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}$/, 'Year must be a 4-digit number')
    .optional(),
});

export const getTrendQuerySchema = z.object({
  goalId: z
    .string({ required_error: 'Query parameter "goalId" is required' })
    .regex(objectIdPattern, 'Invalid goalId format'),
});
