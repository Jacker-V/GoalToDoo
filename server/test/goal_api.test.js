import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Goal } from '../src/models/goal.model.js';
import { Task } from '../src/models/task.model.js';
import { TaskCompletion } from '../src/models/taskCompletion.model.js';
import { Category } from '../src/models/category.model.js';
import { ProgressLog } from '../src/models/progressLog.model.js';
import { signAccessToken } from '../src/utils/jwt.js';

describe('Goal API (/api/v1/goals)', () => {
  let app;
  let user;
  let otherUser;
  let token;
  let otherToken;

  beforeEach(async () => {
    app = createApp();

    user = await User.create({
      name: 'Goal User',
      email: `goaluser_${Date.now()}@example.com`,
      passwordHash: 'hash123',
    });
    token = signAccessToken({ id: user._id.toString() });

    otherUser = await User.create({
      name: 'Other User',
      email: `othergoal_${Date.now()}@example.com`,
      passwordHash: 'hash456',
    });
    otherToken = signAccessToken({ id: otherUser._id.toString() });
  });

  describe('POST /api/v1/goals', () => {
    it('creates a numeric goal and calculates initial progress', async () => {
      const res = await request(app)
        .post('/api/v1/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Save $10,000',
          type: 'year',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          progressMode: 'numeric',
          targetValue: 10000,
          currentValue: 2500,
          unit: 'USD',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Save $10,000');
      expect(res.body.data.progressCache).toBe(25); // 2500 / 10000 = 25%

      // Progress log created
      const logs = await ProgressLog.find({ goalId: res.body.data._id });
      expect(logs).toHaveLength(1);
      expect(logs[0].snapshotPercent).toBe(25);
    });

    it('rejects goal creation with invalid dates or missing title', async () => {
      const res = await request(app)
        .post('/api/v1/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: '',
          startDate: 'not-a-date',
          endDate: '2026-12-31',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('bubbles up to parent goal when child goal is created', async () => {
      const parentGoal = await Goal.create({
        userId: user._id,
        title: 'Parent Auto Goal',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        progressMode: 'auto',
      });

      const res = await request(app)
        .post('/api/v1/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Child Numeric Goal',
          startDate: '2026-01-01',
          endDate: '2026-06-30',
          parentId: parentGoal._id.toString(),
          progressMode: 'numeric',
          targetValue: 100,
          currentValue: 80,
        });

      expect(res.status).toBe(201);

      const updatedParent = await Goal.findById(parentGoal._id);
      expect(updatedParent.progressCache).toBe(80);
    });
  });

  describe('GET /api/v1/goals', () => {
    it('filters goals by status, priority, and category', async () => {
      const cat = await Category.create({ userId: user._id, name: 'Work' });

      await Goal.create([
        {
          userId: user._id,
          title: 'Goal 1',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
          status: 'in_progress',
          priority: 'high',
          categoryId: cat._id,
        },
        {
          userId: user._id,
          title: 'Goal 2',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
          status: 'completed',
          priority: 'low',
        },
      ]);

      const res = await request(app)
        .get('/api/v1/goals?status=in_progress&priority=high')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Goal 1');
    });
  });

  describe('GET /api/v1/goals/:id', () => {
    it('computes virtual fields (isOverdue, atRisk, idealProgress)', async () => {
      // Overdue goal
      const overdueGoal = await Goal.create({
        userId: user._id,
        title: 'Past Goal',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-06-01'),
        progressCache: 50,
      });

      const res = await request(app)
        .get(`/api/v1/goals/${overdueGoal._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isOverdue).toBe(true);
      expect(res.body.data.idealProgress).toBe(100);
    });

    it('returns 404 if goal belongs to another user', async () => {
      const otherGoal = await Goal.create({
        userId: otherUser._id,
        title: 'Other Secret Goal',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      });

      const res = await request(app)
        .get(`/api/v1/goals/${otherGoal._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/goals/:id/progress', () => {
    it('updates currentValue for numeric goal and bubbles up', async () => {
      const parentGoal = await Goal.create({
        userId: user._id,
        title: 'Parent Goal',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        progressMode: 'auto',
      });

      const numGoal = await Goal.create({
        userId: user._id,
        title: 'Numeric Child',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        parentId: parentGoal._id,
        progressMode: 'numeric',
        targetValue: 200,
        currentValue: 50,
        progressCache: 25,
      });

      const res = await request(app)
        .patch(`/api/v1/goals/${numGoal._id}/progress`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentValue: 150,
          note: 'Made great progress',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.currentValue).toBe(150);
      expect(res.body.data.progressCache).toBe(75); // 150 / 200 = 75%

      // Parent goal updated to 75%
      const updatedParent = await Goal.findById(parentGoal._id);
      expect(updatedParent.progressCache).toBe(75);
    });

    it('returns 400 when attempting to update progress of auto-mode goal', async () => {
      const autoGoal = await Goal.create({
        userId: user._id,
        title: 'Auto Goal',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        progressMode: 'auto',
      });

      const res = await request(app)
        .patch(`/api/v1/goals/${autoGoal._id}/progress`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentValue: 50,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_MODE');
    });
  });

  describe('GET /api/v1/goals/:id/logs', () => {
    it('returns chronological progress history for plotting charts', async () => {
      const goal = await Goal.create({
        userId: user._id,
        title: 'Fitness Goal',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        progressMode: 'numeric',
        targetValue: 100,
      });

      // Update progress twice
      await request(app)
        .patch(`/api/v1/goals/${goal._id}/progress`)
        .set('Authorization', `Bearer ${token}`)
        .send({ currentValue: 30, note: 'Week 1' });

      await request(app)
        .patch(`/api/v1/goals/${goal._id}/progress`)
        .set('Authorization', `Bearer ${token}`)
        .send({ currentValue: 60, note: 'Week 2' });

      const res = await request(app)
        .get(`/api/v1/goals/${goal._id}/logs`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data[res.body.data.length - 1].snapshotPercent).toBe(60);
    });
  });

  describe('PATCH /api/v1/goals/:id', () => {
    it('prevents setting parentId to itself', async () => {
      const goal = await Goal.create({
        userId: user._id,
        title: 'Self Goal',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      });

      const res = await request(app)
        .patch(`/api/v1/goals/${goal._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          parentId: goal._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PARENT');
    });

    it('prevents cyclic dependencies (A -> B -> A)', async () => {
      const goalA = await Goal.create({
        userId: user._id,
        title: 'Goal A',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      });

      const goalB = await Goal.create({
        userId: user._id,
        title: 'Goal B',
        parentId: goalA._id,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      });

      // Try making Goal A child of Goal B (which already has parent Goal A)
      const res = await request(app)
        .patch(`/api/v1/goals/${goalA._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          parentId: goalB._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CYCLIC_DEPENDENCY');
    });
  });

  describe('GET /api/v1/goals/tree', () => {
    it('returns hierarchical tree of goals', async () => {
      const parent = await Goal.create({
        userId: user._id,
        title: 'Parent Goal in Tree',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      });

      await Goal.create({
        userId: user._id,
        title: 'Child in Tree',
        parentId: parent._id,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
      });

      const res = await request(app)
        .get('/api/v1/goals/tree')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Parent Goal in Tree');
      expect(res.body.data[0].children).toHaveLength(1);
      expect(res.body.data[0].children[0].title).toBe('Child in Tree');
    });

    it('populates streak and isCompletedToday for recurring tasks under goals', async () => {
      const goal = await Goal.create({
        userId: user._id,
        title: 'Fitness Goal',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      });

      const task = await Task.create({
        userId: user._id,
        goalId: goal._id,
        title: 'Run 5km',
        recurrence: { type: 'daily' },
      });

      const todayStr = new Date().toISOString().split('T')[0];
      await TaskCompletion.create({
        userId: user._id,
        taskId: task._id,
        date: todayStr,
      });

      const res = await request(app)
        .get('/api/v1/goals/tree')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const treeGoal = res.body.data.find((g) => g._id === goal._id.toString());
      expect(treeGoal).toBeDefined();
      expect(treeGoal.tasks).toHaveLength(1);
      expect(treeGoal.tasks[0].title).toBe('Run 5km');
      expect(treeGoal.tasks[0].streak).toBe(1);
      expect(treeGoal.tasks[0].isCompletedToday).toBe(true);
    });
  });

  describe('DELETE /api/v1/goals/:id', () => {
    it('deletes goal and detaches child goals and tasks', async () => {
      const parent = await Goal.create({
        userId: user._id,
        title: 'Parent to Delete',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      });

      const child = await Goal.create({
        userId: user._id,
        title: 'Child of Deleted Parent',
        parentId: parent._id,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
      });

      const task = await Task.create({
        userId: user._id,
        title: 'Task of Deleted Parent',
        goalId: parent._id,
      });

      const res = await request(app)
        .delete(`/api/v1/goals/${parent._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(await Goal.findById(parent._id)).toBeNull();

      const updatedChild = await Goal.findById(child._id);
      expect(updatedChild.parentId).toBeNull();

      const updatedTask = await Task.findById(task._id);
      expect(updatedTask.goalId).toBeNull();
    });
  });
});
