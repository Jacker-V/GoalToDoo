import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/user.model.js';

const app = createApp();

describe('Auth Edge Cases & Security Attacks', () => {
  const sampleUser = {
    name: 'Test Worker',
    email: 'edgecase@example.com',
    password: 'password123',
  };

  it('attack: concurrent refresh requests should not crash with 500 VersionError', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(sampleUser);
    const token = regRes.body.data.refreshToken;

    // Send two concurrent refresh requests with the exact same token
    const [res1, res2] = await Promise.all([
      request(app).post('/api/v1/auth/refresh').send({ refreshToken: token }),
      request(app).post('/api/v1/auth/refresh').send({ refreshToken: token }),
    ]);

    // Neither request should return 500 (Internal Server Error / VersionError)
    expect(res1.status).not.toBe(500);
    expect(res2.status).not.toBe(500);

    // Exactly one should succeed with 200, and the other should be cleanly rejected with 401
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 401]);
  });

  it('attack: concurrent logins should not crash with 500 VersionError', async () => {
    await request(app).post('/api/v1/auth/register').send(sampleUser);

    const [login1, login2] = await Promise.all([
      request(app).post('/api/v1/auth/login').send({
        email: sampleUser.email,
        password: sampleUser.password,
      }),
      request(app).post('/api/v1/auth/login').send({
        email: sampleUser.email,
        password: sampleUser.password,
      }),
    ]);

    expect(login1.status).toBe(200);
    expect(login2.status).toBe(200);

    const user = await User.findOne({ email: sampleUser.email }).select('+refreshTokens');
    expect(user.refreshTokens.length).toBe(3); // 1 from register + 2 from logins
  });

  it('attack: token reuse detection should invalidate all refresh tokens for the user', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(sampleUser);
    const oldRefreshToken = regRes.body.data.refreshToken;

    // Legitimate rotation
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefreshToken });
    expect(refreshRes.status).toBe(200);
    const newRefreshToken = refreshRes.body.data.refreshToken;

    // Attacker tries to reuse oldRefreshToken
    const reuseRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefreshToken });
    expect(reuseRes.status).toBe(401);

    // In a secure token rotation system, all sessions are now invalidated!
    // Therefore, even newRefreshToken must now be rejected!
    const subsequentRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: newRefreshToken });
    expect(subsequentRes.status).toBe(401);
  });

  it('attack: logout with an expired refresh token should still remove it and clear cookie', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(sampleUser);
    const userId = regRes.body.data.user._id;

    // Create an expired refresh token
    const expiredToken = jwt.sign(
      { id: userId, jti: 'test-expired-uuid' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '-1s' }
    );

    // Add expired token to user's refreshTokens
    await User.findByIdAndUpdate(userId, { $push: { refreshTokens: expiredToken } });

    // Call logout with expired token
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: expiredToken });

    expect(res.status).toBe(200);

    // Verify it was pulled from database
    const user = await User.findById(userId).select('+refreshTokens');
    expect(user.refreshTokens).not.toContain(expiredToken);
  });

  it('attack: Authorization header with extra spaces (Bearer  token) should be accepted', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(sampleUser);
    const accessToken = regRes.body.data.accessToken;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer   ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('robustness: comparePassword returns false when passwordHash is undefined instead of throwing', async () => {
    const user = new User({ name: 'Bob', email: 'bob@example.com' });
    // passwordHash is not loaded / selected
    expect(user.passwordHash).toBeUndefined();
    await expect(user.comparePassword('test')).resolves.toBe(false);
  });

  it('edge case: email casing should be normalized on register and login', async () => {
    const mixedCaseUser = {
      name: '  Trần Văn B  ',
      email: 'MixedCase.User@Example.COM',
      password: 'password123',
    };

    const regRes = await request(app).post('/api/v1/auth/register').send(mixedCaseUser);
    expect(regRes.status).toBe(201);
    expect(regRes.body.data.user.email).toBe('mixedcase.user@example.com');
    expect(regRes.body.data.user.name).toBe('Trần Văn B');

    // Login with lowercase email
    const loginRes1 = await request(app).post('/api/v1/auth/login').send({
      email: 'mixedcase.user@example.com',
      password: 'password123',
    });
    expect(loginRes1.status).toBe(200);

    // Login with uppercase email
    const loginRes2 = await request(app).post('/api/v1/auth/login').send({
      email: 'MIXEDCASE.USER@EXAMPLE.COM',
      password: 'password123',
    });
    expect(loginRes2.status).toBe(200);
  });

  it('edge case: expired access token should return 401 TOKEN_EXPIRED', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send(sampleUser);
    const userId = regRes.body.data.user._id;

    const expiredAccessToken = jwt.sign(
      { id: userId, email: sampleUser.email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '-1s' }
    );

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredAccessToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('edge case: tampered access token signature should return 401 INVALID_TOKEN', async () => {
    const forgedToken = jwt.sign(
      { id: '60d0fe4f5311236168a109ca', email: 'hacker@example.com' },
      'wrong_signature_secret'
    );

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${forgedToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});
