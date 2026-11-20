import { z } from 'zod';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const emptyToUndefined = (val) => (val === '' || val === null ? undefined : val);

export const reviewQueueQuerySchema = z.object({
  deckId: z.preprocess(emptyToUndefined, z.string().regex(objectIdPattern, 'Invalid deckId format').optional()),
  limit: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1, 'Limit must be at least 1').max(500, 'Limit cannot exceed 500').optional()
  ),
});

export const answerCardSchema = z.object({
  cardId: z.string().regex(objectIdPattern, 'Invalid cardId format'),
  rating: z.coerce.number().int().min(1, 'Rating must be between 1 and 4').max(4, 'Rating must be between 1 and 4'),
  durationMs: z.coerce.number().min(0).default(0).optional(),
});

export const updateLearnSettingsSchema = z.object({
  maxNewCardsPerDay: z.coerce.number().int().min(1, 'Max new cards per day must be at least 1').max(500).optional(),
  maxReviewCardsPerDay: z.coerce.number().int().min(1, 'Max review cards per day must be at least 1').max(1000).optional(),
  defaultDirection: z.enum(['en_to_vi', 'vi_to_en']).optional(),
  enableTypingMode: z.boolean().optional(),
});
