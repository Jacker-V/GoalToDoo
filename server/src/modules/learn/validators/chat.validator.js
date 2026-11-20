import { z } from 'zod';

export const createConversationSchema = z.object({
  title: z.string().trim().max(200, 'Title cannot exceed 200 characters').optional(),
});

export const updateConversationSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(200, 'Title cannot exceed 200 characters').optional(),
  pinned: z.boolean().optional(),
});

export const attachmentItemSchema = z.object({
  fileId: z.string().min(1, 'File ID is required'),
  name: z.string().min(1, 'File name is required'),
  mime: z.string().min(1, 'File MIME type is required'),
  size: z.number().min(0, 'File size must be positive'),
});

export const sendMessageSchema = z
  .object({
    content: z.string().trim().max(10000, 'Message is too long').default(''),
    attachments: z.array(attachmentItemSchema).optional().default([]),
  })
  .refine(
    (data) => (data.content && data.content.length > 0) || (data.attachments && data.attachments.length > 0),
    {
      message: 'Tin nhắn phải có nội dung văn bản hoặc tệp đính kèm',
      path: ['content'],
    }
  );

export const messageFeedbackSchema = z.object({
  feedback: z.enum(['thumbs_up', 'thumbs_down']).nullable(),
});

export const addCardsActionSchema = z.object({
  deckId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID bộ thẻ không hợp lệ'),
  cards: z
    .array(
      z.object({
        word: z.string().trim().min(1, 'Từ vựng không được để trống').max(100),
        meaning: z.string().trim().min(1, 'Nghĩa không được để trống').max(500),
        partOfSpeech: z
          .enum([
            'noun',
            'verb',
            'adjective',
            'adverb',
            'preposition',
            'conjunction',
            'idiom',
            'phrase',
            'other',
          ])
          .optional()
          .default('other'),
        example: z.string().trim().max(1000).optional().default(''),
        note: z.string().trim().max(500).optional().default(''),
        source: z.string().trim().max(100).optional().default('ai_chat'),
      })
    )
    .min(1, 'Danh sách thẻ không được rỗng'),
});

export const updateLearnerProfileSchema = z.object({
  level: z.string().trim().max(100, 'Trình độ không được vượt quá 100 ký tự').optional(),
  targetGoal: z.string().trim().max(300, 'Mục tiêu không được vượt quá 300 ký tự').optional(),
  targetDate: z.preprocess((val) => (val === '' ? null : val), z.coerce.date().nullable().optional()),
  dailyMinutes: z
    .number()
    .int('Thời gian học phải là số nguyên')
    .min(5, 'Thời gian học tối thiểu 5 phút')
    .max(480, 'Thời gian học tối đa 480 phút')
    .optional(),
  weaknesses: z.array(z.string().trim().max(100)).optional(),
  interests: z.array(z.string().trim().max(100)).optional(),
  notes: z.string().trim().max(2000, 'Ghi chú không được vượt quá 2000 ký tự').optional(),
});

export const applyPlanSchema = z
  .object({
    yearGoal: z
      .object({
        title: z.string().trim().min(1, 'Tiêu đề mục tiêu năm không được để trống').max(200),
        description: z.string().trim().optional().default(''),
        startDate: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.date().optional()),
        endDate: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.date().optional()),
        priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
        color: z.string().optional().default('#6366f1'),
      })
      .nullable()
      .optional(),
    monthGoals: z
      .array(
        z.object({
          title: z.string().trim().min(1, 'Tiêu đề mục tiêu tháng không được để trống').max(200),
          description: z.string().trim().optional().default(''),
          startDate: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.date().optional()),
          endDate: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.date().optional()),
          priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
          color: z.string().optional().default('#3b82f6'),
          weight: z.number().min(0).optional().default(1),
        })
      )
      .nullable()
      .optional()
      .default([]),
    weekGoals: z
      .array(
        z.object({
          title: z.string().trim().min(1, 'Tiêu đề mục tiêu tuần không được để trống').max(200),
          description: z.string().trim().optional().default(''),
          startDate: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.date().optional()),
          endDate: z.preprocess((val) => (val === '' ? undefined : val), z.coerce.date().optional()),
          priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
          monthGoalIndex: z.number().int().min(0).optional(),
          weight: z.number().min(0).optional().default(1),
        })
      )
      .nullable()
      .optional()
      .default([]),
    tasks: z
      .array(
        z.object({
          title: z.string().trim().min(1, 'Tiêu đề nhiệm vụ không được để trống').max(200),
          notes: z.string().trim().optional().default(''),
          dueDate: z.preprocess((val) => (val === '' ? null : val), z.coerce.date().nullable().optional()),
          dueTime: z.string().trim().nullable().optional(),
          priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
          weekGoalIndex: z.number().int().min(0).optional(),
          subtasks: z
            .array(
              z.union([
                z.string().transform((s) => ({ title: s.trim(), done: false })),
                z.object({
                  title: z.string().trim().max(200),
                  done: z.boolean().optional().default(false),
                }),
              ])
            )
            .transform((items) => items.filter((st) => st.title.length > 0))
            .nullable()
            .optional()
            .default([]),
        })
      )
      .nullable()
      .optional()
      .default([]),
  })
  .refine(
    (data) =>
      Boolean(data.yearGoal?.title) ||
      (Array.isArray(data.monthGoals) && data.monthGoals.length > 0) ||
      (Array.isArray(data.weekGoals) && data.weekGoals.length > 0) ||
      (Array.isArray(data.tasks) && data.tasks.length > 0),
    {
      message: 'Kế hoạch học tập phải chứa ít nhất một mục tiêu hoặc nhiệm vụ',
      path: ['tasks'],
    }
  );
