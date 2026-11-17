import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Event } from '../src/models/event.model.js';
import { Category } from '../src/models/category.model.js';
import { signAccessToken } from '../src/utils/jwt.js';

describe('Event API (/api/v1/events)', () => {
  let app;
  let user;
  let otherUser;
  let token;
  let otherToken;

  beforeEach(async () => {
    app = createApp();

    user = await User.create({
      name: 'Event User',
      email: `eventuser_${Date.now()}@example.com`,
      passwordHash: 'hashed1',
    });
    token = signAccessToken({ id: user._id.toString() });

    otherUser = await User.create({
      name: 'Other Event User',
      email: `otherevent_${Date.now()}@example.com`,
      passwordHash: 'hashed2',
    });
    otherToken = signAccessToken({ id: otherUser._id.toString() });
  });

  describe('POST /api/v1/events', () => {
    it('creates an event with valid timing and details', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Team Sync',
          description: 'Weekly team status update',
          start: '2026-11-20T10:00:00Z',
          end: '2026-11-20T11:00:00Z',
          allDay: false,
          color: '#3b82f6',
          reminders: [15, 30],
          recurrence: {
            type: 'weekly',
            interval: 1,
            daysOfWeek: [5], // Friday
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Team Sync');
      expect(res.body.data.reminders).toEqual([15, 30]);
      expect(res.body.data.recurrence.type).toBe('weekly');
    });

    it('rejects event when end time is before start time', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Time Travel Meeting',
          start: '2026-11-20T11:00:00Z',
          end: '2026-11-20T10:00:00Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TIME_RANGE');
    });
  });

  describe('GET /api/v1/events', () => {
    it('filters events within date range and by category', async () => {
      const cat = await Category.create({ userId: user._id, name: 'Work' });

      await Event.create([
        {
          userId: user._id,
          title: 'Event Inside Range',
          start: new Date('2026-11-15T09:00:00Z'),
          end: new Date('2026-11-15T10:00:00Z'),
          categoryId: cat._id,
        },
        {
          userId: user._id,
          title: 'Event Outside Range',
          start: new Date('2026-12-01T09:00:00Z'),
          end: new Date('2026-12-01T10:00:00Z'),
        },
      ]);

      const res = await request(app)
        .get('/api/v1/events?start=2026-11-01T00:00:00Z&end=2026-11-30T23:59:59Z')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Event Inside Range');
    });
  });

  describe('GET /api/v1/events/:id', () => {
    it('returns event details when owned by user', async () => {
      const event = await Event.create({
        userId: user._id,
        title: 'Project Kickoff',
        start: new Date('2026-11-25T14:00:00Z'),
        end: new Date('2026-11-25T15:00:00Z'),
      });

      const res = await request(app)
        .get(`/api/v1/events/${event._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Project Kickoff');
    });

    it('returns 404 for event belonging to another user', async () => {
      const otherEvent = await Event.create({
        userId: otherUser._id,
        title: 'Confidential Meeting',
        start: new Date('2026-11-25T14:00:00Z'),
        end: new Date('2026-11-25T15:00:00Z'),
      });

      const res = await request(app)
        .get(`/api/v1/events/${otherEvent._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/events/:id', () => {
    it('updates event and enforces valid timing', async () => {
      const event = await Event.create({
        userId: user._id,
        title: 'Draft Event',
        start: new Date('2026-11-25T14:00:00Z'),
        end: new Date('2026-11-25T15:00:00Z'),
      });

      const res = await request(app)
        .patch(`/api/v1/events/${event._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Final Event',
          color: '#10b981',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Final Event');
      expect(res.body.data.color).toBe('#10b981');
    });
  });

  describe('DELETE /api/v1/events/:id', () => {
    it('deletes event successfully', async () => {
      const event = await Event.create({
        userId: user._id,
        title: 'Event to Cancel',
        start: new Date('2026-11-25T14:00:00Z'),
        end: new Date('2026-11-25T15:00:00Z'),
      });

      const res = await request(app)
        .delete(`/api/v1/events/${event._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(await Event.findById(event._id)).toBeNull();
    });
  });
});
