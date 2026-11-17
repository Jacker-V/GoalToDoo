import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Category } from '../src/models/category.model.js';
import { Goal } from '../src/models/goal.model.js';
import { Event } from '../src/models/event.model.js';
import { signAccessToken } from '../src/utils/jwt.js';

describe('Category API (/api/v1/categories)', () => {
  let app;
  let user1;
  let user2;
  let token1;
  let token2;

  beforeEach(async () => {
    app = createApp();

    user1 = await User.create({
      name: 'User One',
      email: `user1_${Date.now()}@example.com`,
      passwordHash: 'hashed1',
    });
    token1 = signAccessToken({ id: user1._id.toString() });

    user2 = await User.create({
      name: 'User Two',
      email: `user2_${Date.now()}@example.com`,
      passwordHash: 'hashed2',
    });
    token2 = signAccessToken({ id: user2._id.toString() });
  });

  describe('Authentication check', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app).get('/api/v1/categories');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/categories', () => {
    it('creates a category with valid payload', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'Work',
          color: '#3b82f6',
          icon: 'briefcase',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Work');
      expect(res.body.data.color).toBe('#3b82f6');
      expect(res.body.data.icon).toBe('briefcase');
      expect(res.body.data.userId).toBe(user1._id.toString());
    });

    it('fails with 400 when name is missing or empty', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/categories', () => {
    it('returns only the categories belonging to the authenticated user', async () => {
      await Category.create([
        { userId: user1._id, name: 'Work' },
        { userId: user1._id, name: 'Personal' },
        { userId: user2._id, name: 'User2 Secret' },
      ]);

      const res = await request(app)
        .get('/api/v1/categories')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.map((c) => c.name)).toEqual(expect.arrayContaining(['Work', 'Personal']));
    });
  });

  describe('GET /api/v1/categories/:id', () => {
    it('returns 400 for invalid ObjectId format', async () => {
      const res = await request(app)
        .get('/api/v1/categories/invalid-id')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when category does not exist or belongs to another user', async () => {
      const cat2 = await Category.create({ userId: user2._id, name: 'Other Category' });

      const res = await request(app)
        .get(`/api/v1/categories/${cat2._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns category details when found', async () => {
      const cat = await Category.create({ userId: user1._id, name: 'Health' });

      const res = await request(app)
        .get(`/api/v1/categories/${cat._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Health');
    });
  });

  describe('PATCH /api/v1/categories/:id', () => {
    it('updates category properties', async () => {
      const cat = await Category.create({ userId: user1._id, name: 'Old Name' });

      const res = await request(app)
        .patch(`/api/v1/categories/${cat._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'New Name',
          color: '#10b981',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('New Name');
      expect(res.body.data.color).toBe('#10b981');
    });
  });

  describe('DELETE /api/v1/categories/:id', () => {
    it('deletes category and unsets categoryId in related goals and events', async () => {
      const cat = await Category.create({ userId: user1._id, name: 'Finance' });

      const goal = await Goal.create({
        userId: user1._id,
        title: 'Save money',
        categoryId: cat._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
      });

      const event = await Event.create({
        userId: user1._id,
        title: 'Budget Review',
        categoryId: cat._id,
        start: new Date(),
        end: new Date(Date.now() + 3600000),
      });

      const res = await request(app)
        .delete(`/api/v1/categories/${cat._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      expect(await Category.findById(cat._id)).toBeNull();

      const updatedGoal = await Goal.findById(goal._id);
      expect(updatedGoal.categoryId).toBeNull();

      const updatedEvent = await Event.findById(event._id);
      expect(updatedEvent.categoryId).toBeNull();
    });
  });
});
