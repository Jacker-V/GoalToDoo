import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import {
  validateBody,
  validateQuery,
  validateParams,
  idParamSchema,
} from '../middlewares/validate.middleware.js';
import {
  createEventSchema,
  updateEventSchema,
  queryEventSchema,
} from '../validators/event.validator.js';
import * as eventController from '../controllers/event.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', validateQuery(queryEventSchema), eventController.getEvents);
router.post('/', validateBody(createEventSchema), eventController.createEvent);
router.get('/:id', validateParams(idParamSchema), eventController.getEventById);
router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateEventSchema),
  eventController.updateEvent
);
router.delete('/:id', validateParams(idParamSchema), eventController.deleteEvent);

export default router;
