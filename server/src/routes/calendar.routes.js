import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateQuery } from '../middlewares/validate.middleware.js';
import { getCalendarQuerySchema } from '../validators/calendar.validator.js';
import * as calendarController from '../controllers/calendar.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', validateQuery(getCalendarQuerySchema), calendarController.getCalendarData);

export default router;
