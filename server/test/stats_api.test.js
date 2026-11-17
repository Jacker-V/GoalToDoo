import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Task } from '../src/models/task.model.js';
import { Goal } from '../src/models/goal.model.js';
import { Category } from '../src/models/category.model.js';
import { TaskCompletion } from '../src/models/taskCompletion.model.js';
import { ProgressLog } from '../src/models/progressLog.model.js';
import { signAccessToken } from '../src/utils/jwt.js';

describe('Stats Integration API (/api/v1/stats)', () => {
  let app;
  let user;
  let otherUser;
  let token;
  let otherToken;

  beforeEach(async () => {
    app = createApp();

    user = await User.create({
      name: 'Stats User',
      email: `statsuser_${Date.now()}_${Math.random()}@example.com`,
      passwordHash: 'hashed123',
    });
    token = signAccessToken({ id: user._id.toString() });

    otherUser = await User.create({
      name: 'Other Stats User',
      email: `otheruser_${Date.now()}_${Math.random()}@example.com`,
      passwordHash: 'hashed456',
    });
    otherToken = signAccessToken({ id: otherUser._id.toString() });
  });

  describe('Authentication Security', () => {
    it('returns 401 when no token is provided', async () => {
      const endpoints = [
        '/api/v1/stats/summary',
        '/api/v1/stats/heatmap',
        '/api/v1/stats/trend?goalId=507f1f77bcf86cd799439011',
        '/api/v1/stats/by-category',
      ];

      for (const ep of endpoints) {
        const res = await request(app).get(ep);
        expect(res.status).toBe(401);
      }
    });
  });

  describe('Validation & Edge Cases', () => {
    it('returns 400 for invalid period in /summary', async () => {
      const res = await request(app)
        .get('/api/v1/stats/summary?period=decade')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for invalid year in /heatmap', async () => {
      const res = await request(app)
        .get('/api/v1/stats/heatmap?year=not-a-year')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for missing or invalid goalId in /trend', async () => {
      const res1 = await request(app)
        .get('/api/v1/stats/trend')
        .set('Authorization', `Bearer ${token}`);
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .get('/api/v1/stats/trend?goalId=invalid-id')
        .set('Authorization', `Bearer ${token}`);
      expect(res2.status).toBe(400);
    });

    it('returns 404 when querying trend for a non-existent goal or another user goal', async () => {
      const foreignGoal = await Goal.create({
        userId: otherUser._id,
        title: 'Foreign Goal',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      });

      const res = await request(app)
        .get(`/api/v1/stats/trend?goalId=${foreignGoal._id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/stats/summary', () => {
    it('returns correct summary for current month including completion delta and streaks', async () => {
      const refDate = '2026-11-15T12:00:00Z';

      // Create goals in current month (Nov 2026)
      await Goal.create({
        userId: user._id,
        title: 'Nov Goal 1',
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-30'),
        progressCache: 80,
      });

      await Goal.create({
        userId: user._id,
        title: 'Nov Goal 2',
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-30'),
        progressCache: 60,
      });

      // Previous month goal (Oct 2026) with 50%
      await Goal.create({
        userId: user._id,
        title: 'Oct Goal',
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-31'),
        progressCache: 50,
      });

      // Regular task completed in Nov
      await Task.create({
        userId: user._id,
        title: 'Completed Task in Nov',
        isCompleted: true,
        completedAt: new Date('2026-11-10T10:00:00Z'),
        dueDate: new Date('2026-11-11T10:00:00Z'), // on time
      });

      // Recurring task completions
      await TaskCompletion.create({
        userId: user._id,
        taskId: user._id, // placeholder
        date: '2026-11-14',
      });
      await TaskCompletion.create({
        userId: user._id,
        taskId: user._id,
        date: '2026-11-15',
      });

      const res = await request(app)
        .get(`/api/v1/stats/summary?period=month&refDate=${refDate}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.period).toBe('month');
      // Nov avg: (80 + 60) / 2 = 70%
      expect(data.completionRate).toBe(70);
      // Oct avg: 50%
      expect(data.previousCompletionRate).toBe(50);
      // Delta: 70 - 50 = +20%
      expect(data.delta).toBe(20);
      // Completed tasks: 1 regular + 2 recurring = 3
      expect(data.completedTasks).toBe(3);
      expect(data.onTimeRate).toBe(100);
      expect(data.currentStreak).toBeGreaterThanOrEqual(2);
      expect(data.longestStreak).toBeGreaterThanOrEqual(2);
    });

    it('calculates atRisk count for active goals that are lagging behind', async () => {
      // Goal started a while ago, halfway through time, but 0% progress -> at risk
      const pastStart = new Date(Date.now() - 30 * 24 * 3600 * 1000);
      const futureEnd = new Date(Date.now() + 10 * 24 * 3600 * 1000);

      await Goal.create({
        userId: user._id,
        title: 'Lagging Goal',
        startDate: pastStart,
        endDate: futureEnd,
        progressCache: 10,
        status: 'in_progress',
      });

      const res = await request(app)
        .get('/api/v1/stats/summary?period=month')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.atRiskCount).toBeGreaterThanOrEqual(1);
    });

    it('ensures strict tenant isolation in summary metrics', async () => {
      await Task.create({
        userId: otherUser._id,
        title: 'Other User Task',
        isCompleted: true,
        completedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/stats/summary?period=month')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.completedTasks).toBe(0);
    });
  });

  describe('GET /api/v1/stats/heatmap', () => {
    it('returns task completion heatmap data for the specified year', async () => {
      const year = 2026;

      await TaskCompletion.create({
        userId: user._id,
        taskId: user._id,
        date: '2026-03-15',
      });

      await TaskCompletion.create({
        userId: user._id,
        taskId: user._id,
        date: '2026-03-15', // multiple completions on same day
      }).catch(() => {}); // handle potential unique compound constraint if any

      await Task.create({
        userId: user._id,
        title: 'Regular Task in March',
        isCompleted: true,
        completedAt: new Date('2026-03-15T09:00:00Z'),
      });

      await Task.create({
        userId: user._id,
        title: 'Regular Task in July',
        isCompleted: true,
        completedAt: new Date('2026-07-20T15:00:00Z'),
      });

      // Other user task in same year
      await Task.create({
        userId: otherUser._id,
        title: 'Other Task',
        isCompleted: true,
        completedAt: new Date('2026-03-15T09:00:00Z'),
      });

      const res = await request(app)
        .get(`/api/v1/stats/heatmap?year=${year}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.year).toBe(2026);
      expect(data.dailyCounts['2026-03-15']).toBeGreaterThanOrEqual(2);
      expect(data.dailyCounts['2026-07-20']).toBe(1);
      expect(data.totalCount).toBeGreaterThanOrEqual(3);
      expect(Array.isArray(data.days)).toBe(true);
    });
  });

  describe('GET /api/v1/stats/trend', () => {
    it('returns progress logs history and ideal progress trajectory', async () => {
      const startDate = new Date('2026-01-01T00:00:00Z');
      const endDate = new Date('2026-01-31T23:59:59Z');

      const goal = await Goal.create({
        userId: user._id,
        title: 'Reading 30 Books',
        startDate,
        endDate,
        targetValue: 30,
        currentValue: 15,
        progressCache: 50,
      });

      // Create progress logs
      await ProgressLog.create({
        userId: user._id,
        goalId: goal._id,
        date: new Date('2026-01-10T12:00:00Z'),
        value: 5,
        delta: 5,
        snapshotPercent: 16.7,
        note: 'Finished 5 books',
      });

      await ProgressLog.create({
        userId: user._id,
        goalId: goal._id,
        date: new Date('2026-01-20T12:00:00Z'),
        value: 15,
        delta: 10,
        snapshotPercent: 50,
        note: 'Halfway through',
      });

      const res = await request(app)
        .get(`/api/v1/stats/trend?goalId=${goal._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.goal._id.toString()).toBe(goal._id.toString());
      expect(data.logs.length).toBe(2);
      expect(data.logs[0].snapshotPercent).toBe(16.7);
      expect(data.logs[0].idealPercent).toBeGreaterThan(0);
      expect(data.idealLine).toEqual([
        { date: startDate.toISOString(), idealPercent: 0 },
        { date: endDate.toISOString(), idealPercent: 100 },
      ]);
      expect(Array.isArray(data.dataPoints)).toBe(true);
      expect(data.dataPoints.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('GET /api/v1/stats/by-category', () => {
    it('returns distribution of goals and completed tasks grouped by category', async () => {
      const catStudy = await Category.create({
        userId: user._id,
        name: 'Học tập',
        color: '#3b82f6',
      });

      const catHealth = await Category.create({
        userId: user._id,
        name: 'Sức khỏe',
        color: '#10b981',
      });

      const studyGoal = await Goal.create({
        userId: user._id,
        title: 'Master TypeScript',
        categoryId: catStudy._id,
        startDate: new Date(),
        endDate: new Date(),
        status: 'completed',
        progressCache: 100,
      });

      const healthGoal = await Goal.create({
        userId: user._id,
        title: 'Marathon Training',
        categoryId: catHealth._id,
        startDate: new Date(),
        endDate: new Date(),
        status: 'in_progress',
        progressCache: 40,
      });

      // Uncategorized goal
      await Goal.create({
        userId: user._id,
        title: 'Side Project',
        startDate: new Date(),
        endDate: new Date(),
        status: 'not_started',
      });

      // Tasks for studyGoal
      await Task.create({
        userId: user._id,
        goalId: studyGoal._id,
        title: 'Read TS Docs',
        isCompleted: true,
      });
      await Task.create({
        userId: user._id,
        goalId: studyGoal._id,
        title: 'Practice Generics',
        isCompleted: true,
      });

      // Task for healthGoal
      await Task.create({
        userId: user._id,
        goalId: healthGoal._id,
        title: 'Run 5km',
        isCompleted: false,
      });

      const res = await request(app)
        .get('/api/v1/stats/by-category')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.totalGoals).toBe(3);
      expect(data.completedGoals).toBe(1);
      expect(data.totalTasks).toBe(3);
      expect(data.completedTasks).toBe(2);

      const studyItem = data.categories.find((c) => c.categoryName === 'Học tập');
      expect(studyItem).toBeDefined();
      expect(studyItem.totalGoals).toBe(1);
      expect(studyItem.completedGoals).toBe(1);
      expect(studyItem.completedTasks).toBe(2);

      const uncategorizedItem = data.categories.find((c) => c.categoryName === 'Chưa phân loại');
      expect(uncategorizedItem).toBeDefined();
      expect(uncategorizedItem.totalGoals).toBe(1);
    });

    it('returns empty lists without crashing when user has no data', async () => {
      const res = await request(app)
        .get('/api/v1/stats/by-category')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.categories).toEqual([]);
      expect(res.body.data.totalGoals).toBe(0);
      expect(res.body.data.totalTasks).toBe(0);
    });
  });

  describe('Edge Cases & Boundary Values', () => {
    it('handles week and year periods in /summary', async () => {
      const resWeek = await request(app)
        .get('/api/v1/stats/summary?period=week')
        .set('Authorization', `Bearer ${token}`);
      expect(resWeek.status).toBe(200);
      expect(resWeek.body.data.period).toBe('week');

      const resYear = await request(app)
        .get('/api/v1/stats/summary?period=year')
        .set('Authorization', `Bearer ${token}`);
      expect(resYear.status).toBe(200);
      expect(resYear.body.data.period).toBe('year');
    });

    it('handles goal with no progress logs and zero duration in /trend safely', async () => {
      const sameDay = new Date('2026-06-01T10:00:00Z');
      const instantGoal = await Goal.create({
        userId: user._id,
        title: 'Instant Goal',
        startDate: sameDay,
        endDate: sameDay,
      });

      const res = await request(app)
        .get(`/api/v1/stats/trend?goalId=${instantGoal._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.logs).toEqual([]);
      expect(Array.isArray(res.body.data.dataPoints)).toBe(true);
    });

    it('handles clean 0s for a new user with no goals or tasks in /summary', async () => {
      const res = await request(app)
        .get('/api/v1/stats/summary?period=month')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.completionRate).toBe(0);
      expect(res.body.data.completedTasks).toBe(0);
      expect(res.body.data.currentStreak).toBe(0);
      expect(res.body.data.longestStreak).toBe(0);
      expect(res.body.data.atRiskCount).toBe(0);
    });

    it('supports custom period with startDate and endDate and compares with previous equal range', async () => {
      const res = await request(app)
        .get('/api/v1/stats/summary?period=custom&startDate=2026-11-01&endDate=2026-11-15')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.period).toBe('custom');
      expect(res.body.data.startDate).toBeDefined();
      expect(res.body.data.endDate).toBeDefined();
      expect(new Date(res.body.data.startDate).getTime()).toBeLessThan(
        new Date(res.body.data.endDate).getTime()
      );
    });

    it('returns 400 when custom period startDate is after endDate', async () => {
      const res = await request(app)
        .get('/api/v1/stats/summary?period=custom&startDate=2026-11-20&endDate=2026-11-10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('does not double count recurring tasks that have isCompleted=true', async () => {
      // Recurring task with isCompleted=true and a TaskCompletion entry on same day
      const recurringTask = await Task.create({
        userId: user._id,
        title: 'Daily Meditation',
        recurrence: { type: 'daily' },
        isCompleted: true,
        completedAt: new Date('2026-11-10T08:00:00Z'),
      });

      await TaskCompletion.create({
        userId: user._id,
        taskId: recurringTask._id,
        date: '2026-11-10',
      });

      const res = await request(app)
        .get('/api/v1/stats/summary?period=month&refDate=2026-11-10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // Must be 1, NOT 2
      expect(res.body.data.completedTasks).toBe(1);
    });

    it('provides actualPercent at end point for past/completed goals in /trend', async () => {
      const pastGoal = await Goal.create({
        userId: user._id,
        title: 'Past Completed Goal',
        startDate: new Date('2026-01-01T00:00:00Z'),
        endDate: new Date('2026-01-15T00:00:00Z'),
        progressCache: 100,
        status: 'completed',
      });

      const res = await request(app)
        .get(`/api/v1/stats/trend?goalId=${pastGoal._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const points = res.body.data.dataPoints;
      const endPoint = points[points.length - 1];
      expect(endPoint.actualPercent).toBe(100);
    });
  });
});
