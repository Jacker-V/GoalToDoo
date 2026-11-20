import { z } from 'zod';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const partOfSpeechEnum = z.enum([
  'noun',
  'verb',
  'adjective',
  'adverb',
  'preposition',
  'conjunction',
  'idiom',
  'phrase',
  'other',
]);

export const cardStatusEnum = z.enum(['new', 'learning', 'review', 'suspended']);

export const createCardSchema = z.object({
  deckId: z.string().regex(objectIdPattern, 'Invalid deckId format'),
  word: z.string().trim().min(1, 'Word is required').max(200),
  meaning: z.string().trim().min(1, 'Meaning is required').max(1000),
  partOfSpeech: partOfSpeechEnum.optional().default('other'),
  example: z.string().trim().max(1000).optional().default(''),
  note: z.string().trim().max(1000).optional().default(''),
  source: z.string().trim().max(200).optional().default(''),
  tags: z.array(z.string().trim()).optional().default([]),
  imageUrl: z.string().trim().url().or(z.literal('')).optional().default(''),
  allowDuplicate: z.boolean().optional().default(false),
});

export const updateCardSchema = z.object({
  deckId: z.string().regex(objectIdPattern, 'Invalid deckId format').optional(),
  word: z.string().trim().min(1, 'Word cannot be empty').max(200).optional(),
  meaning: z.string().trim().min(1, 'Meaning cannot be empty').max(1000).optional(),
  partOfSpeech: partOfSpeechEnum.optional(),
  example: z.string().trim().max(1000).optional(),
  note: z.string().trim().max(1000).optional(),
  source: z.string().trim().max(200).optional(),
  tags: z.array(z.string().trim()).optional(),
  imageUrl: z.string().trim().url().or(z.literal('')).optional(),
  srs: z
    .object({
      easeFactor: z.number().min(1.3).optional(),
      intervalDays: z.number().min(0).optional(),
      repetitions: z.number().min(0).optional(),
      lapses: z.number().min(0).optional(),
      dueDate: z.coerce.date().optional(),
      lastReviewedAt: z.coerce.date().nullable().optional(),
      status: cardStatusEnum.optional(),
    })
    .optional(),
});

const emptyToUndefined = (val) => (val === '' || val === null ? undefined : val);

export const queryCardSchema = z.object({
  deckId: z.preprocess(emptyToUndefined, z.string().regex(objectIdPattern).optional()),
  status: z.preprocess(emptyToUndefined, cardStatusEnum.optional()),
  tag: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  source: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  search: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  dueOnly: z
    .union([z.boolean(), z.string().transform((val) => val === 'true' || val === '1')])
    .optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(20),
  sortBy: z.enum(['createdAt', 'word', 'srs.dueDate', 'srs.status']).optional().default('createdAt'),
  sortOrder: z.union([z.literal('asc'), z.literal('desc'), z.literal('1'), z.literal('-1')]).optional().default('desc'),
});

const bulkCardItemSchema = z.object({
  word: z.string().trim().min(1, 'Word is required'),
  meaning: z.string().trim().min(1, 'Meaning is required'),
  partOfSpeech: partOfSpeechEnum.optional().default('other'),
  example: z.string().trim().optional().default(''),
  note: z.string().trim().optional().default(''),
  source: z.string().trim().optional().default(''),
  tags: z.array(z.string().trim()).optional().default([]),
});

export const bulkImportSchema = z
  .object({
    deckId: z.string().regex(objectIdPattern, 'Invalid deckId format'),
    rawText: z.string().optional(),
    cards: z.array(bulkCardItemSchema).optional(),
    preview: z.boolean().optional().default(false),
    skipDuplicates: z.boolean().optional().default(true),
    updateDuplicates: z.boolean().optional().default(false),
    source: z.string().trim().optional().default(''),
    tags: z.array(z.string().trim()).optional().default([]),
  })
  .refine((data) => (data.rawText && data.rawText.trim().length > 0) || (data.cards && data.cards.length > 0), {
    message: 'Either rawText or cards array must be provided',
    path: ['rawText'],
  });
