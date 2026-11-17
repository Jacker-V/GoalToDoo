import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Event } from '../src/models/event.model.js';
import { Task } from '../src/models/task.model.js';
import { Goal } from '../src/models/goal.model.js';
import { Category } from '../src/models/category.model.js';
import { signAccessToken } from '../src/utils/jwt.js';

describe('Calendar Aggregation API (/api/v1/calendar)', () => {
  let app;
  let user;
  let otherUser;
  let token;
  let otherToken;

  beforeEach(async () => {
    app = createApp();

    user = await User.create({
      name: 'Calendar User',
      email: `caluser_${Date.now()}_${Math.random()}@example.com`,
      passwordHash: 'hashed1',
    });
    token = signAccessToken({ id: user._id.toString() });

    otherUser = await User.create({
      name: 'Other Cal User',
      email: `othercal_${Date.now()}_${Math.random()}@example.com`,
      passwordHash: 'hashed2',
    });
    otherToken = signAccessToken({ id: otherUser._id.toString() });
  });

  describe('Authentication & Validation', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app).get('/api/v1/calendar?from=2026-11-01&to=2026-11-30');
      expect(res.status).toBe(401);
    });

    it('returns 400 when from or to query param is missing', async () => {
      const res1 = await request(app)
        .get('/api/v1/calendar?from=2026-11-01')
        .set('Authorization', `Bearer ${token}`);
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .get('/api/v1/calendar?to=2026-11-30')
        .set('Authorization', `Bearer ${token}`);
      expect(res2.status).toBe(400);
    });

    it('returns 400 when from or to date format is invalid', async () => {
      const res = await request(app)
        .get('/api/v1/calendar?from=not-a-date&to=2026-11-30')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });

    it('returns 400 when to is earlier than from', async () => {
      const res = await request(app)
        .get('/api/v1/calendar?from=2026-11-30&to=2026-11-01')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/calendar - Data Aggregation', () => {
    it('aggregates non-recurring events, tasks with dueDate, and intersecting goals', async () => {
      // 1. Events
      await Event.create([
        {
          userId: user._id,
          title: 'Event Inside Window',
          start: new Date('2026-11-10T09:00:00Z'),
          end: new Date('2026-11-10T10:00:00Z'),
        },
        {
          userId: user._id,
          title: 'Event Outside Window',
          start: new Date('2026-12-05T09:00:00Z'),
          end: new Date('2026-12-05T10:00:00Z'),
        },
        {
          userId: otherUser._id,
          title: 'Other User Event',
          start: new Date('2026-11-10T09:00:00Z'),
          end: new Date('2026-11-10T10:00:00Z'),
        },
      ]);

      // 2. Goals
      await Goal.create([
        {
          userId: user._id,
          title: 'Goal Spanning November',
          startDate: new Date('2026-11-05T00:00:00Z'),
          endDate: new Date('2026-11-25T23:59:59Z'),
        },
        {
          userId: user._id,
          title: 'Goal In October (Past)',
          startDate: new Date('2026-10-01T00:00:00Z'),
          endDate: new Date('2026-10-20T23:59:59Z'),
        },
        {
          userId: otherUser._id,
          title: 'Other User Goal',
          startDate: new Date('2026-11-01T00:00:00Z'),
          endDate: new Date('2026-11-30T23:59:59Z'),
        },
      ]);

      // 3. Tasks
      await Task.create([
        {
          userId: user._id,
          title: 'Task Due In November',
          dueDate: new Date('2026-11-12T14:00:00Z'),
          subtasks: [
            { title: 'Sub 1', done: true },
            { title: 'Sub 2', done: false },
          ],
        },
        {
          userId: user._id,
          title: 'Task Due In December',
          dueDate: new Date('2026-12-01T10:00:00Z'),
        },
        {
          userId: user._id,
          title: 'Task Without Due Date',
          dueDate: null,
        },
        {
          userId: otherUser._id,
          title: 'Other User Task',
          dueDate: new Date('2026-11-12T14:00:00Z'),
        },
      ]);

      const res = await request(app)
        .get('/api/v1/calendar?from=2026-11-01&to=2026-11-30')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { events, tasks, goals } = res.body.data;

      // Assert Events
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Event Inside Window');

      // Assert Tasks
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Task Due In November');
      expect(tasks[0].subtasks).toHaveLength(2);
      expect(tasks[0].progress).toBe(50);

      // Assert Goals
      expect(goals).toHaveLength(1);
      expect(goals[0].title).toBe('Goal Spanning November');
    });

    it('expands recurring events across the requested window', async () => {
      // Create a daily event starting Nov 1 ending Nov 3
      await Event.create({
        userId: user._id,
        title: 'Daily Standup',
        start: new Date('2026-11-01T09:00:00Z'),
        end: new Date('2026-11-01T09:30:00Z'),
        recurrence: {
          type: 'daily',
          interval: 1,
          endDate: new Date('2026-11-05T23:59:59Z'),
        },
      });

      // Create a weekly event on Mondays (day 1) and Wednesdays (day 3)
      await Event.create({
        userId: user._id,
        title: 'Gym Workout',
        start: new Date('2026-11-02T07:00:00Z'), // Monday
        end: new Date('2026-11-02T08:00:00Z'),
        recurrence: {
          type: 'weekly',
          interval: 1,
          daysOfWeek: [1, 3], // Mon, Wed
        },
      });

      // Query Nov 1 to Nov 7 (first week of Nov 2026: Nov 1 is Sunday, Nov 2 Mon, Nov 3 Tue, Nov 4 Wed, Nov 5 Thu, Nov 6 Fri, Nov 7 Sat)
      const res = await request(app)
        .get('/api/v1/calendar?from=2026-11-01&to=2026-11-07')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const { events } = res.body.data;

      const standupInstances = events.filter((e) => e.title === 'Daily Standup');
      // Daily standup from Nov 1 to Nov 5 -> 5 instances
      expect(standupInstances.length).toBe(5);
      expect(standupInstances.some((e) => e.isRecurringInstance === false)).toBe(true);
      expect(standupInstances.some((e) => e.isRecurringInstance === true)).toBe(true);

      const gymInstances = events.filter((e) => e.title === 'Gym Workout');
      // Mon Nov 2, Wed Nov 4
      expect(gymInstances.length).toBe(2);
    });

    it('filters aggregated calendar items by categoryId', async () => {
      const catWork = await Category.create({ userId: user._id, name: 'Work' });
      const catPersonal = await Category.create({ userId: user._id, name: 'Personal' });

      // Event in Work
      await Event.create({
        userId: user._id,
        title: 'Work Sprint Planning',
        start: new Date('2026-11-10T10:00:00Z'),
        end: new Date('2026-11-10T11:00:00Z'),
        categoryId: catWork._id,
      });

      // Event in Personal
      await Event.create({
        userId: user._id,
        title: 'Doctor Appointment',
        start: new Date('2026-11-11T10:00:00Z'),
        end: new Date('2026-11-11T11:00:00Z'),
        categoryId: catPersonal._id,
      });

      // Goal in Work
      const workGoal = await Goal.create({
        userId: user._id,
        title: 'Q4 Product Launch',
        startDate: new Date('2026-11-01T00:00:00Z'),
        endDate: new Date('2026-11-30T23:59:59Z'),
        categoryId: catWork._id,
      });

      // Task under Work Goal
      await Task.create({
        userId: user._id,
        title: 'Deploy to Staging',
        dueDate: new Date('2026-11-12T15:00:00Z'),
        goalId: workGoal._id,
      });

      // Query with categoryId = catWork._id
      const res = await request(app)
        .get(`/api/v1/calendar?from=2026-11-01&to=2026-11-30&categoryId=${catWork._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const { events, tasks, goals } = res.body.data;

      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Work Sprint Planning');

      expect(goals).toHaveLength(1);
      expect(goals[0].title).toBe('Q4 Product Launch');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Deploy to Staging');
    });

    it('supports ISO timestamp queries with partial day window', async () => {
      await Event.create({
        userId: user._id,
        title: 'Lunch Meeting',
        start: new Date('2026-11-15T12:00:00Z'),
        end: new Date('2026-11-15T13:00:00Z'),
      });

      const res = await request(app)
        .get('/api/v1/calendar?from=2026-11-15T10:00:00.000Z&to=2026-11-15T18:00:00.000Z')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.events).toHaveLength(1);
      expect(res.body.data.events[0].title).toBe('Lunch Meeting');
    });

    it('expands weekdays, monthly (with 31st clamping), and yearly recurring events', async () => {
      // 1. Weekdays event starting Mon Nov 2
      await Event.create({
        userId: user._id,
        title: 'Daily Code Review',
        start: new Date('2026-11-02T16:00:00Z'),
        end: new Date('2026-11-02T16:30:00Z'),
        recurrence: {
          type: 'weekdays',
        },
      });

      // 2. Monthly event starting Oct 31
      await Event.create({
        userId: user._id,
        title: 'End of Month Accounting',
        start: new Date('2026-10-31T09:00:00Z'),
        end: new Date('2026-10-31T10:00:00Z'),
        recurrence: {
          type: 'monthly',
          interval: 1,
        },
      });

      // 3. Yearly event
      await Event.create({
        userId: user._id,
        title: 'Company Anniversary',
        start: new Date('2025-11-15T00:00:00Z'),
        end: new Date('2025-11-15T23:59:59Z'),
        allDay: true,
        recurrence: {
          type: 'yearly',
          interval: 1,
        },
      });

      // Query full month of November 2026
      const res = await request(app)
        .get('/api/v1/calendar?from=2026-11-01&to=2026-11-30')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const { events } = res.body.data;

      // In Nov 2026: Nov 2 is Mon, Nov 30 is Mon. Total weekdays = 21 days
      const reviewEvents = events.filter((e) => e.title === 'Daily Code Review');
      expect(reviewEvents.length).toBe(21);

      // Monthly on 31st in Nov (30 days) clamps to Nov 30
      const eomEvents = events.filter((e) => e.title === 'End of Month Accounting');
      expect(eomEvents.length).toBe(1);
      const eomDate = new Date(eomEvents[0].start);
      expect(eomDate.getDate()).toBe(30);

      // Yearly event from 2025 recurs on Nov 15, 2026
      const anniversaryEvents = events.filter((e) => e.title === 'Company Anniversary');
      expect(anniversaryEvents.length).toBe(1);
      const annivDate = new Date(anniversaryEvents[0].start);
      expect(annivDate.getFullYear()).toBe(2026);
      expect(annivDate.getMonth()).toBe(10); // Nov is 10 (0-indexed)
      expect(annivDate.getDate()).toBe(15);
    });

    it('returns empty lists when no records match without error', async () => {
      const res = await request(app)
        .get('/api/v1/calendar?from=2030-01-01&to=2030-01-31')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.events).toEqual([]);
      expect(res.body.data.tasks).toEqual([]);
      expect(res.body.data.goals).toEqual([]);
    });
  });
});
