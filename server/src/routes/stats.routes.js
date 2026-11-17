import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validateQuery } from '../middlewares/validate.middleware.js';
import {
  getSummaryQuerySchema,
  getHeatmapQuerySchema,
  getTrendQuerySchema,
} from '../validators/stats.validator.js';
import * as statsController from '../controllers/stats.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', validateQuery(getSummaryQuerySchema), statsController.getStatsSummary);
router.get('/heatmap', validateQuery(getHeatmapQuerySchema), statsController.getStatsHeatmap);
router.get('/trend', validateQuery(getTrendQuerySchema), statsController.getStatsTrend);
router.get('/by-category', statsController.getStatsByCategory);

export default router;
