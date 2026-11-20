import { z } from 'zod';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const createDeckSchema = z.object({
  name: z.string().trim().min(1, 'Deck name is required').max(100, 'Deck name cannot exceed 100 characters'),
  color: z.string().trim().max(30).optional(),
  description: z.string().trim().max(500).optional(),
});

export const updateDeckSchema = z.object({
  name: z.string().trim().min(1, 'Deck name cannot be empty').max(100).optional(),
  color: z.string().trim().max(30).optional(),
  description: z.string().trim().max(500).optional(),
});

export const mergeDeckSchema = z.object({
  sourceDeckId: z.string().regex(objectIdPattern, 'Invalid sourceDeckId format'),
  targetDeckId: z.string().regex(objectIdPattern, 'Invalid targetDeckId format'),
}).refine((data) => data.sourceDeckId !== data.targetDeckId, {
  message: 'Source deck and target deck must be different',
  path: ['targetDeckId'],
});
