import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Goal } from '../src/models/goal.model.js';
import { Task } from '../src/models/task.model.js';
import { Category } from '../src/models/category.model.js';
import { signAccessToken } from '../src/utils/jwt.js';

describe('Audit: Edge cases, Security & Data Integrity', () => {
  let app;
  let userA, userB;
  let tokenA, tokenB;

  beforeEach(async () => {
    app = createApp();

    userA = await User.create({
      name: 'User A',
      email: `usera_${Date.now()}_${Math.random()}@test.com`,
      passwordHash: 'hashA',
    });
    tokenA = signAccessToken({ id: userA._id.toString() });

    userB = await User.create({
      name: 'User B',
      email: `userb_${Date.now()}_${Math.random()}@test.com`,
      passwordHash: 'hashB',
    });
    tokenB = signAccessToken({ id: userB._id.toString() });
  });

  describe('Bug 1: Cross-Tenant Foreign Key Injection', () => {
    it('prevents User A from creating a goal with User B parentId', async () => {
      const goalB = await Goal.create({
        userId: userB._id,
        title: 'Secret Goal B',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      });

      const res = await request(app)
        .post('/api/v1/goals')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Goal A claiming Parent B',
          startDate: '2026-01-01',
          endDate: '2026-06-30',
          parentId: goalB._id.toString(),
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('prevents User A from creating a task with User B goalId', async () => {
      const goalB = await Goal.create({
        userId: userB._id,
        title: 'Goal B',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      });

      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Task A stealing Goal B',
          goalId: goalB._id.toString(),
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('prevents User A from creating an event with User B categoryId', async () => {
      const catB = await Category.create({
        userId: userB._id,
        name: 'Private Category B',
      });

      const res = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Event A stealing Cat B',
          start: '2026-11-20T10:00:00Z',
          end: '2026-11-20T11:00:00Z',
          categoryId: catB._id.toString(),
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Bug 2: Goal End Date Before Start Date', () => {
    it('rejects POST /api/v1/goals when endDate is before startDate', async () => {
      const res = await request(app)
        .post('/api/v1/goals')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Backwards Goal',
          startDate: '2026-12-31',
          endDate: '2026-01-01',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_DATE_RANGE');
    });

    it('rejects PATCH /api/v1/goals/:id when updating endDate before startDate', async () => {
      const goal = await Goal.create({
        userId: userA._id,
        title: 'Normal Goal',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      });

      const res = await request(app)
        .patch(`/api/v1/goals/${goal._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          endDate: '2025-12-31',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_DATE_RANGE');
    });
  });

  describe('Bug 3: Task isCompleted and Subtasks Desync', () => {
    it('synchronizes subtasks to done=true when updating task with isCompleted=true', async () => {
      const goal = await Goal.create({
        userId: userA._id,
        title: 'Auto Goal',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        progressMode: 'auto',
      });

      const task = await Task.create({
        userId: userA._id,
        title: 'Task with subtasks',
        goalId: goal._id,
        subtasks: [
          { title: 'Sub 1', done: false },
          { title: 'Sub 2', done: false },
        ],
      });

      const res = await request(app)
        .patch(`/api/v1/tasks/${task._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          isCompleted: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isCompleted).toBe(true);
      expect(res.body.data.progress).toBe(100);
      expect(res.body.data.subtasks.every((s) => s.done)).toBe(true);

      const updatedGoal = await Goal.findById(goal._id);
      expect(updatedGoal.progressCache).toBe(100);
    });

    it('sets isCompleted=true on creation if all subtasks are done', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Pre-completed subtasks',
          subtasks: [
            { title: 'Sub 1', done: true },
            { title: 'Sub 2', done: true },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isCompleted).toBe(true);
      expect(res.body.data.completedAt).not.toBeNull();
      expect(res.body.data.progress).toBe(100);
    });
  });

  describe('Bug 5: Date validations and null queries', () => {
    it('rejects invalid calendar date like 2026-02-31 for recurring task completion', async () => {
      const task = await Task.create({
        userId: userA._id,
        title: 'Drink Water',
        recurrence: { type: 'daily' },
      });

      const res = await request(app)
        .post(`/api/v1/tasks/${task._id}/complete?date=2026-02-31`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('filters uncategorized goals with categoryId=null', async () => {
      const cat = await Category.create({ userId: userA._id, name: 'Work' });
      await Goal.create([
        {
          userId: userA._id,
          title: 'Categorized Goal',
          categoryId: cat._id,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
        },
        {
          userId: userA._id,
          title: 'Uncategorized Goal',
          categoryId: null,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
        },
      ]);

      const res = await request(app)
        .get('/api/v1/goals?categoryId=null')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Uncategorized Goal');
    });
  });

  describe('Deep Hierarchy & Re-parenting Bubble-up', () => {
    it('bubbles up across 4 levels when an intermediate branch is moved to a new root', async () => {
      // Tree 1: Root1 -> Branch1 -> Leaf1 (Numeric, 100%)
      const root1 = await Goal.create({
        userId: userA._id,
        title: 'Root 1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        progressMode: 'auto',
      });
      const branch1 = await Goal.create({
        userId: userA._id,
        title: 'Branch 1',
        parentId: root1._id,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        progressMode: 'auto',
      });
      const leaf1 = await Goal.create({
        userId: userA._id,
        title: 'Leaf 1',
        parentId: branch1._id,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        progressMode: 'numeric',
        targetValue: 10,
        currentValue: 10,
        progressCache: 100,
      });

      // Tree 2: Root2 (Auto, currently 0%)
      const root2 = await Goal.create({
        userId: userA._id,
        title: 'Root 2',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        progressMode: 'auto',
      });

      // Recalculate Tree 1 initially
      const { recalculateGoalProgress } = await import('../src/services/progress.service.js');
      await recalculateGoalProgress(leaf1._id, userA._id);

      expect((await Goal.findById(root1._id)).progressCache).toBe(100);
      expect((await Goal.findById(root2._id)).progressCache).toBe(0);

      // Re-parent Branch1 from Root1 to Root2
      const res = await request(app)
        .patch(`/api/v1/goals/${branch1._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          parentId: root2._id.toString(),
        });

      expect(res.status).toBe(200);

      // Root1 lost its only child, so Root1 drops to 0%
      const updatedRoot1 = await Goal.findById(root1._id);
      expect(updatedRoot1.progressCache).toBe(0);

      // Root2 gained Branch1 (which is 100%), so Root2 rises to 100%
      const updatedRoot2 = await Goal.findById(root2._id);
      expect(updatedRoot2.progressCache).toBe(100);
    });
  });

  describe('Concurrency & Race Condition Handling', () => {
    it('handles parallel task completion updates under the same parent goal correctly', async () => {
      const parentGoal = await Goal.create({
        userId: userA._id,
        title: 'Parent Goal for Concurrent Tasks',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        progressMode: 'auto',
      });

      const tasks = await Promise.all([
        Task.create({ userId: userA._id, title: 'Task 1', goalId: parentGoal._id }),
        Task.create({ userId: userA._id, title: 'Task 2', goalId: parentGoal._id }),
        Task.create({ userId: userA._id, title: 'Task 3', goalId: parentGoal._id }),
        Task.create({ userId: userA._id, title: 'Task 4', goalId: parentGoal._id }),
      ]);

      // Fire 4 parallel toggle requests
      const promises = tasks.map((t) =>
        request(app)
          .post(`/api/v1/tasks/${t._id}/toggle`)
          .set('Authorization', `Bearer ${tokenA}`)
      );
      const responses = await Promise.all(promises);

      for (const res of responses) {
        expect(res.status).toBe(200);
        expect(res.body.data.isCompleted).toBe(true);
      }

      // Re-fetch parent goal - since all 4 tasks are completed, parent goal progressCache must be 100%
      const finalGoal = await Goal.findById(parentGoal._id);
      expect(finalGoal.progressCache).toBe(100);
    });
  });
});
