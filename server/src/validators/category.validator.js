import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100, 'Category name cannot exceed 100 characters'),
  color: z.string().trim().max(30).optional(),
  icon: z.string().trim().max(50).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name cannot be empty').max(100, 'Category name cannot exceed 100 characters').optional(),
  color: z.string().trim().max(30).optional(),
  icon: z.string().trim().max(50).optional(),
});
