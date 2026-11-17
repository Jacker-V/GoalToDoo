import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Auth API Endpoints', () => {
  const sampleUser = {
    name: 'Nguyen Van A',
    email: 'user@example.com',
    password: 'password123',
    settings: {
      language: 'vi',
      theme: 'dark',
      weekStartsOn: 1,
    },
  };

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(sampleUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');

      const user = res.body.data.user;
      expect(user.name).toBe(sampleUser.name);
      expect(user.email).toBe(sampleUser.email);
      expect(user.settings.language).toBe('vi');
      expect(user.settings.theme).toBe('dark');
      expect(user.settings.weekStartsOn).toBe(1);
      expect(user.passwordHash).toBeUndefined();
      expect(user.refreshTokens).toBeUndefined();
    });

    it('should reject registration if email is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...sampleUser,
          email: 'not-an-email',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration if password is too short', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...sampleUser,
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should prevent duplicate registration with the same email', async () => {
      await request(app).post('/api/v1/auth/register').send(sampleUser);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(sampleUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should reject registration if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'only@email.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      await request(app).post('/api/v1/auth/register').send(sampleUser);

      const res = await request(app).post('/api/v1/auth/login').send({
        email: sampleUser.email,
        password: sampleUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(sampleUser.email);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should reject login with wrong password', async () => {
      await request(app).post('/api/v1/auth/register').send(sampleUser);

      const res = await request(app).post('/api/v1/auth/login').send({
        email: sampleUser.email,
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login if email does not exist', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nobody@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should issue new access and refresh tokens using valid refresh token', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send(sampleUser);
      const oldRefreshToken = regRes.body.data.refreshToken;

      const res = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: oldRefreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');

      // Old token should now be rotated and revoked
      const reusedRes = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: oldRefreshToken,
      });
      expect(reusedRes.status).toBe(401);
    });

    it('should fail when refresh token is invalid', async () => {
      const res = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: 'invalid.token.here',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile when authenticated', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send(sampleUser);
      const token = regRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(sampleUser.email);
    });

    it('should return 401 when no token is provided', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when token is invalid', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when non-Bearer auth scheme is used', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Basic dXNlcjpwYXNz');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/auth/settings', () => {
    it('should support partial update of settings', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send(sampleUser);
      const token = regRes.body.data.accessToken;

      const res = await request(app)
        .patch('/api/v1/auth/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          theme: 'light',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.settings.theme).toBe('light');
      expect(res.body.data.user.settings.language).toBe('vi'); // untouched
    });
    it('should update user settings successfully', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send(sampleUser);
      const token = regRes.body.data.accessToken;

      const res = await request(app)
        .patch('/api/v1/auth/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          language: 'en',
          theme: 'light',
          weekStartsOn: 0,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.settings.language).toBe('en');
      expect(res.body.data.user.settings.theme).toBe('light');
      expect(res.body.data.user.settings.weekStartsOn).toBe(0);
    });

    it('should reject invalid settings values', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send(sampleUser);
      const token = regRes.body.data.accessToken;

      const res = await request(app)
        .patch('/api/v1/auth/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          language: 'invalid_lang',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should successfully logout and clear tokens', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send(sampleUser);
      const refreshToken = regRes.body.data.refreshToken;

      const res = await request(app).post('/api/v1/auth/logout').send({
        refreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify token is revoked
      const refreshRes = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken,
      });
      expect(refreshRes.status).toBe(401);
    });
  });
});
