import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Goal } from '../src/models/goal.model.js';
import { Task } from '../src/models/task.model.js';
import { TaskCompletion } from '../src/models/taskCompletion.model.js';
import { signAccessToken } from '../src/utils/jwt.js';

describe('Task API (/api/v1/tasks)', () => {
  let app;
  let user;
  let otherUser;
  let token;
  let otherToken;

  beforeEach(async () => {
    app = createApp();

    user = await User.create({
      name: 'Task User',
      email: `taskuser_${Date.now()}@example.com`,
      passwordHash: 'hashed1',
    });
    token = signAccessToken({ id: user._id.toString() });

    otherUser = await User.create({
      name: 'Other Task User',
      email: `othertask_${Date.now()}@example.com`,
      passwordHash: 'hashed2',
    });
    otherToken = signAccessToken({ id: otherUser._id.toString() });
  });

  describe('POST /api/v1/tasks', () => {
    it('creates a task with subtasks and recurrence', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Daily Standup',
          notes: 'Prepare sprint updates',
          priority: 'high',
          tags: ['work', 'scrum'],
          subtasks: [
            { title: 'Check tickets', done: true },
            { title: 'Write update', done: false },
          ],
          recurrence: {
            type: 'daily',
            interval: 1,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Daily Standup');
      expect(res.body.data.tags).toEqual(['work', 'scrum']);
      expect(res.body.data.subtasks).toHaveLength(2);
      expect(res.body.data.progress).toBe(50); // 1 of 2 done
    });

    it('bubbles up to goal when task is created with goalId', async () => {
      const goal = await Goal.create({
        userId: user._id,
        title: 'Launch MVP',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
        progressMode: 'auto',
      });

      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Setup DB',
          goalId: goal._id.toString(),
          isCompleted: true,
        });

      expect(res.status).toBe(201);

      const updatedGoal = await Goal.findById(goal._id);
      expect(updatedGoal.progressCache).toBe(100);
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('filters tasks by isCompleted, priority, and tag', async () => {
      await Task.create([
        {
          userId: user._id,
          title: 'Task A',
          isCompleted: true,
          priority: 'high',
          tags: ['important'],
        },
        {
          userId: user._id,
          title: 'Task B',
          isCompleted: false,
          priority: 'low',
          tags: ['routine'],
        },
      ]);

      const res = await request(app)
        .get('/api/v1/tasks?isCompleted=true&priority=high&tag=important')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Task A');
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('updates subtasks and recalculates parent goal progress', async () => {
      const goal = await Goal.create({
        userId: user._id,
        title: 'Parent Goal',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        progressMode: 'auto',
      });

      const task = await Task.create({
        userId: user._id,
        title: 'Task with subtasks',
        goalId: goal._id,
        subtasks: [
          { title: 'Subtask 1', done: false },
          { title: 'Subtask 2', done: false },
        ],
      });

      const res = await request(app)
        .patch(`/api/v1/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          subtasks: [
            { title: 'Subtask 1', done: true },
            { title: 'Subtask 2', done: false },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.progress).toBe(50);

      const updatedGoal = await Goal.findById(goal._id);
      expect(updatedGoal.progressCache).toBe(50);
    });
  });

  describe('POST /api/v1/tasks/:id/toggle', () => {
    it('toggles task completion status and bubbles up to goal', async () => {
      const goal = await Goal.create({
        userId: user._id,
        title: 'Toggle Goal',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        progressMode: 'auto',
      });

      const task = await Task.create({
        userId: user._id,
        title: 'Toggle Me',
        goalId: goal._id,
        isCompleted: false,
      });

      // Toggle ON
      const resOn = await request(app)
        .post(`/api/v1/tasks/${task._id}/toggle`)
        .set('Authorization', `Bearer ${token}`);

      expect(resOn.status).toBe(200);
      expect(resOn.body.data.isCompleted).toBe(true);
      expect(resOn.body.data.completedAt).not.toBeNull();

      expect((await Goal.findById(goal._id)).progressCache).toBe(100);

      // Toggle OFF
      const resOff = await request(app)
        .post(`/api/v1/tasks/${task._id}/toggle`)
        .set('Authorization', `Bearer ${token}`);

      expect(resOff.status).toBe(200);
      expect(resOff.body.data.isCompleted).toBe(false);
      expect(resOff.body.data.completedAt).toBeNull();

      expect((await Goal.findById(goal._id)).progressCache).toBe(0);
    });

    it('toggling a task with subtasks marks all subtasks as done/undone', async () => {
      const task = await Task.create({
        userId: user._id,
        title: 'Task with subtasks',
        isCompleted: false,
        subtasks: [
          { title: 'Subtask 1', done: false },
          { title: 'Subtask 2', done: false },
        ],
      });

      const res = await request(app)
        .post(`/api/v1/tasks/${task._id}/toggle`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isCompleted).toBe(true);
      expect(res.body.data.subtasks.every((s) => s.done)).toBe(true);
      expect(res.body.data.progress).toBe(100);
    });
  });

  describe('POST /api/v1/tasks/:id/complete?date=YYYY-MM-DD', () => {
    it('records completion for recurring task on specific date', async () => {
      const task = await Task.create({
        userId: user._id,
        title: 'Drink 2L Water',
        recurrence: { type: 'daily' },
      });

      const res = await request(app)
        .post(`/api/v1/tasks/${task._id}/complete?date=2026-11-17`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.date).toBe('2026-11-17');
      expect(res.body.data.taskId).toBe(task._id.toString());

      const completionRecord = await TaskCompletion.findOne({
        taskId: task._id,
        date: '2026-11-17',
      });
      expect(completionRecord).not.toBeNull();

      // Test DELETE completion (uncomplete recurring task)
      const delRes = await request(app)
        .delete(`/api/v1/tasks/${task._id}/complete?date=2026-11-17`)
        .set('Authorization', `Bearer ${token}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
      expect(await TaskCompletion.findOne({ taskId: task._id, date: '2026-11-17' })).toBeNull();
    });

    it('rejects invalid date query parameter', async () => {
      const task = await Task.create({
        userId: user._id,
        title: 'Morning Run',
      });

      const res = await request(app)
        .post(`/api/v1/tasks/${task._id}/complete?date=17-11-2026`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('deletes task, deletes its completions, and recalculates parent goal', async () => {
      const goal = await Goal.create({
        userId: user._id,
        title: 'Goal with Task',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        progressMode: 'auto',
      });

      const task = await Task.create({
        userId: user._id,
        title: 'Task to Delete',
        goalId: goal._id,
        isCompleted: true,
      });

      await TaskCompletion.create({
        taskId: task._id,
        userId: user._id,
        date: '2026-11-17',
      });

      // Goal is currently 100%
      await Goal.updateOne({ _id: goal._id }, { progressCache: 100 });

      const res = await request(app)
        .delete(`/api/v1/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(await Task.findById(task._id)).toBeNull();
      expect(await TaskCompletion.findOne({ taskId: task._id })).toBeNull();

      // Goal with no remaining children now resets to 0%
      const updatedGoal = await Goal.findById(goal._id);
      expect(updatedGoal.progressCache).toBe(0);
    });
  });
});
