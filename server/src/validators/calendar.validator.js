import { z } from 'zod';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const getCalendarQuerySchema = z.object({
  from: z.string({ required_error: 'Query parameter "from" is required' }).min(1, 'Query parameter "from" is required'),
  to: z.string({ required_error: 'Query parameter "to" is required' }).min(1, 'Query parameter "to" is required'),
  categoryId: z.union([z.string().regex(objectIdPattern), z.literal('null')]).optional(),
});
