import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password is too long'),
  settings: z
    .object({
      language: z.enum(['vi', 'en']).optional(),
      theme: z.enum(['light', 'dark', 'system']).optional(),
      weekStartsOn: z.union([z.literal(0), z.literal(1)]).optional(),
    })
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional(),
});

export const updateSettingsSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  language: z.enum(['vi', 'en']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).optional(),
});
