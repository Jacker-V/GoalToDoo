import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import {
  validateBody,
  validateQuery,
  validateParams,
  idParamSchema,
} from '../middlewares/validate.middleware.js';
import {
  createGoalSchema,
  updateGoalSchema,
  updateGoalProgressSchema,
  queryGoalSchema,
} from '../validators/goal.validator.js';
import * as goalController from '../controllers/goal.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/tree', goalController.getGoalTree);
router.get('/', validateQuery(queryGoalSchema), goalController.getGoals);
router.post('/', validateBody(createGoalSchema), goalController.createGoal);
router.get('/:id', validateParams(idParamSchema), goalController.getGoalById);
router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateGoalSchema),
  goalController.updateGoal
);
router.delete('/:id', validateParams(idParamSchema), goalController.deleteGoal);
router.patch(
  '/:id/progress',
  validateParams(idParamSchema),
  validateBody(updateGoalProgressSchema),
  goalController.updateGoalProgress
);
router.get('/:id/logs', validateParams(idParamSchema), goalController.getGoalProgressLogs);

export default router;
