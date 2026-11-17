import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import {
  validateBody,
  validateQuery,
  validateParams,
  idParamSchema,
} from '../middlewares/validate.middleware.js';
import {
  createTaskSchema,
  updateTaskSchema,
  completeRecurringQuerySchema,
  queryTaskSchema,
} from '../validators/task.validator.js';
import * as taskController from '../controllers/task.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', validateQuery(queryTaskSchema), taskController.getTasks);
router.post('/', validateBody(createTaskSchema), taskController.createTask);
router.get('/:id', validateParams(idParamSchema), taskController.getTaskById);
router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateTaskSchema),
  taskController.updateTask
);
router.delete('/:id', validateParams(idParamSchema), taskController.deleteTask);
router.post('/:id/toggle', validateParams(idParamSchema), taskController.toggleTask);
router.post(
  '/:id/complete',
  validateParams(idParamSchema),
  validateQuery(completeRecurringQuerySchema),
  taskController.completeRecurringTask
);
router.delete(
  '/:id/complete',
  validateParams(idParamSchema),
  validateQuery(completeRecurringQuerySchema),
  taskController.uncompleteRecurringTask
);

export default router;
