import { Router } from 'express';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import goalRoutes from './goal.routes.js';
import taskRoutes from './task.routes.js';
import eventRoutes from './event.routes.js';
import calendarRoutes from './calendar.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'GoalCalendar API',
  });
});

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/goals', goalRoutes);
router.use('/tasks', taskRoutes);
router.use('/events', eventRoutes);
router.use('/calendar', calendarRoutes);

export default router;
