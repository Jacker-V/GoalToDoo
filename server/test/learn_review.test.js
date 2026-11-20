import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Deck, Card, ReviewLog } from '../src/modules/learn/models/index.js';
import { signAccessToken } from '../src/utils/jwt.js';

describe('Learn Review & SRS API (/api/v1/learn)', () => {
  let app;
  let user;
  let otherUser;
  let token;
  let otherToken;
  let deck;

  beforeEach(async () => {
    app = createApp();

    user = await User.create({
      name: 'Review Learner',
      email: `learner_rev_${Date.now()}_${Math.random()}@example.com`,
      passwordHash: 'hash123',
    });
    token = signAccessToken({ id: user._id.toString() });

    otherUser = await User.create({
      name: 'Other Learner',
      email: `other_rev_${Date.now()}_${Math.random()}@example.com`,
      passwordHash: 'hash456',
    });
    otherToken = signAccessToken({ id: otherUser._id.toString() });

    deck = await Deck.create({
      userId: user._id,
      name: 'Test Review Deck',
      color: '#6366f1',
    });
  });

  // -------------------------------------------------------------
  // SETTINGS TESTS
  // -------------------------------------------------------------
  describe('Settings API (/api/v1/learn/settings)', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app).get('/api/v1/learn/settings');
      expect(res.status).toBe(401);
    });

    it('returns default settings when not previously set', async () => {
      const res = await request(app)
        .get('/api/v1/learn/settings')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.maxNewCardsPerDay).toBe(20);
      expect(res.body.data.maxReviewCardsPerDay).toBe(100);
      expect(res.body.data.defaultDirection).toBe('en_to_vi');
      expect(res.body.data.enableTypingMode).toBe(false);
    });

    it('updates learn settings successfully', async () => {
      const res = await request(app)
        .patch('/api/v1/learn/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          maxNewCardsPerDay: 30,
          maxReviewCardsPerDay: 150,
          defaultDirection: 'vi_to_en',
          enableTypingMode: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.maxNewCardsPerDay).toBe(30);
      expect(res.body.data.maxReviewCardsPerDay).toBe(150);
      expect(res.body.data.defaultDirection).toBe('vi_to_en');
      expect(res.body.data.enableTypingMode).toBe(true);

      // Verify persisted in GET
      const getRes = await request(app)
        .get('/api/v1/learn/settings')
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.body.data.maxNewCardsPerDay).toBe(30);
      expect(getRes.body.data.enableTypingMode).toBe(true);
    });

    it('rejects invalid settings input', async () => {
      const res = await request(app)
        .patch('/api/v1/learn/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          maxNewCardsPerDay: -5,
          defaultDirection: 'invalid_dir',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // REVIEW QUEUE TESTS
  // -------------------------------------------------------------
  describe('Review Queue API (/api/v1/learn/review/queue)', () => {
    it('returns empty queue when user has no cards', async () => {
      const res = await request(app)
        .get('/api/v1/learn/review/queue')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.queue).toEqual([]);
      expect(res.body.data.totalInQueue).toBe(0);
      expect(res.body.data.dueCount).toBe(0);
      expect(res.body.data.newCount).toBe(0);
    });

    it('fetches due cards prioritized before new cards', async () => {
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

      // Card 1: Overdue review card
      await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'diligent',
        meaning: 'siêng năng',
        srs: {
          status: 'learning',
          intervalDays: 1,
          repetitions: 1,
          dueDate: pastDate,
        },
      });

      // Card 2: New card
      await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'ubiquitous',
        meaning: 'phổ biến khắp nơi',
        srs: {
          status: 'new',
        },
      });

      // Card 3: Future card (should not be in queue)
      await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'future_word',
        meaning: 'tương lai',
        srs: {
          status: 'review',
          dueDate: futureDate,
        },
      });

      // Card 4: Suspended card (should be excluded)
      await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'suspended_word',
        meaning: 'tạm ngưng',
        srs: {
          status: 'suspended',
          dueDate: pastDate,
        },
      });

      const res = await request(app)
        .get('/api/v1/learn/review/queue')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalInQueue).toBe(2);
      expect(res.body.data.dueCount).toBe(1);
      expect(res.body.data.newCount).toBe(1);

      // Verify due card comes first, then new card
      expect(res.body.data.queue[0].word).toBe('diligent');
      expect(res.body.data.queue[1].word).toBe('ubiquitous');

      // Verify next reviews preview attached
      expect(res.body.data.queue[0].nextReviews).toBeDefined();
      expect(res.body.data.queue[0].nextReviews['1']).toBeDefined();
      expect(res.body.data.queue[0].nextReviews['3']).toBeDefined();
    });

    it('filters queue by deckId', async () => {
      const otherDeck = await Deck.create({
        userId: user._id,
        name: 'Another Deck',
      });

      await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'deck1_word',
        meaning: 'nghĩa 1',
        srs: { status: 'new' },
      });

      await Card.create({
        userId: user._id,
        deckId: otherDeck._id,
        word: 'deck2_word',
        meaning: 'nghĩa 2',
        srs: { status: 'new' },
      });

      const res = await request(app)
        .get(`/api/v1/learn/review/queue?deckId=${deck._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalInQueue).toBe(1);
      expect(res.body.data.queue[0].word).toBe('deck1_word');
    });

    it('respects user daily limits for new and review cards', async () => {
      // Set daily limit: 1 new card per day
      await User.findByIdAndUpdate(user._id, {
        'settings.learn.maxNewCardsPerDay': 1,
      });

      await Card.create([
        { userId: user._id, deckId: deck._id, word: 'new1', meaning: 'mới 1', srs: { status: 'new' } },
        { userId: user._id, deckId: deck._id, word: 'new2', meaning: 'mới 2', srs: { status: 'new' } },
      ]);

      const res = await request(app)
        .get('/api/v1/learn/review/queue')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // Even though there are 2 new cards, only 1 is included in queue due to maxNewCardsPerDay = 1
      expect(res.body.data.newCount).toBe(2);
      expect(res.body.data.totalInQueue).toBe(1);
      expect(res.body.data.queue.length).toBe(1);
    });

    it('handles empty query parameters (?deckId=&limit=) without 400 validation error', async () => {
      await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'serendipity',
        meaning: 'sự tình cờ may mắn',
        srs: { status: 'new' },
      });

      const res = await request(app)
        .get('/api/v1/learn/review/queue?deckId=&limit=')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalInQueue).toBe(1);
    });

    it('returns 404 when deckId in review queue does not exist or belongs to another user', async () => {
      const otherDeck = await Deck.create({
        userId: otherUser._id,
        name: 'Private Deck of User B',
      });

      const resOther = await request(app)
        .get(`/api/v1/learn/review/queue?deckId=${otherDeck._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(resOther.status).toBe(404);
      expect(resOther.body.error.code).toBe('NOT_FOUND');

      const nonExistentId = '60c72b2f9b1d8b2bad000000';
      const resNonExistent = await request(app)
        .get(`/api/v1/learn/review/queue?deckId=${nonExistentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(resNonExistent.status).toBe(404);
    });
  });

  // -------------------------------------------------------------
  // ANSWER CARD TESTS
  // -------------------------------------------------------------
  describe('Answer Card API (/api/v1/learn/review/answer)', () => {
    it('returns 404 when card is not found or belongs to another user', async () => {
      const card = await Card.create({
        userId: otherUser._id,
        deckId: deck._id,
        word: 'secret',
        meaning: 'bí mật',
      });

      const res = await request(app)
        .post('/api/v1/learn/review/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cardId: card._id.toString(),
          rating: 3,
        });

      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid rating', async () => {
      const card = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'valid',
        meaning: 'hợp lệ',
      });

      const res = await request(app)
        .post('/api/v1/learn/review/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cardId: card._id.toString(),
          rating: 5,
        });

      expect(res.status).toBe(400);
    });

    it('rejects answering a suspended card with 400', async () => {
      const card = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'dormant',
        meaning: 'ngủ yên',
        srs: {
          status: 'suspended',
          intervalDays: 1,
        },
      });

      const res = await request(app)
        .post('/api/v1/learn/review/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cardId: card._id.toString(),
          rating: 3,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CARD_SUSPENDED');
    });

    it('processes rating 1 (Again), updates SRS and creates ReviewLog', async () => {
      const card = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'perseverance',
        meaning: 'kiên trì',
        srs: {
          intervalDays: 10,
          repetitions: 3,
          easeFactor: 2.5,
          lapses: 0,
          status: 'review',
        },
      });

      const res = await request(app)
        .post('/api/v1/learn/review/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cardId: card._id.toString(),
          rating: 1,
          durationMs: 4500,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.card.srs.repetitions).toBe(0);
      expect(res.body.data.card.srs.lapses).toBe(1);
      expect(res.body.data.card.srs.intervalDays).toBe(1);
      expect(res.body.data.card.srs.easeFactor).toBe(2.3);
      expect(res.body.data.card.srs.status).toBe('learning');

      // Verify ReviewLog created
      const log = await ReviewLog.findById(res.body.data.logId);
      expect(log).not.toBeNull();
      expect(log.rating).toBe(1);
      expect(log.prevInterval).toBe(10);
      expect(log.newInterval).toBe(1);
      expect(log.durationMs).toBe(4500);
    });

    it('processes rating 3 (Good) on new card and sets interval to 1', async () => {
      const card = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'meticulous',
        meaning: 'tỉ mỉ',
        srs: {
          status: 'new',
          repetitions: 0,
          intervalDays: 0,
        },
      });

      const res = await request(app)
        .post('/api/v1/learn/review/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cardId: card._id.toString(),
          rating: 3,
          durationMs: 3200,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.card.srs.repetitions).toBe(1);
      expect(res.body.data.card.srs.intervalDays).toBe(1);
      expect(res.body.data.card.srs.status).toBe('learning');
    });

    it('processes rating 4 (Easy) and awards easeFactor bonus', async () => {
      const card = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'eloquent',
        meaning: 'hùng biện',
        srs: {
          status: 'learning',
          repetitions: 2,
          intervalDays: 6,
          easeFactor: 2.5,
        },
      });

      const res = await request(app)
        .post('/api/v1/learn/review/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cardId: card._id.toString(),
          rating: 4,
          durationMs: 2100,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.card.srs.repetitions).toBe(3);
      expect(res.body.data.card.srs.easeFactor).toBe(2.65);
      // Math.round(6 * 2.5 * 1.3) = 20
      expect(res.body.data.card.srs.intervalDays).toBe(20);
    });
  });

  // -------------------------------------------------------------
  // STATS TESTS
  // -------------------------------------------------------------
  describe('Stats API (/api/v1/learn/stats)', () => {
    it('returns empty statistics structure when no data exists', async () => {
      const res = await request(app)
        .get('/api/v1/learn/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalCards).toBe(0);
      expect(res.body.data.byStatus).toEqual({
        new: 0,
        learning: 0,
        review: 0,
        suspended: 0,
      });
      expect(res.body.data.retentionRate).toBe(0);
      expect(res.body.data.leechCards).toEqual([]);
      expect(res.body.data.forecast.length).toBe(7);
    });

    it('calculates status distribution, retention rate, leech cards, and 7-day forecast', async () => {
      // Create cards with various statuses
      const card1 = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'card_new',
        meaning: 'từ mới',
        source: 'IELTS Cam 16',
        srs: { status: 'new' },
      });

      const card2 = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'card_learning',
        meaning: 'đang học',
        source: 'Oxford 3000',
        srs: {
          status: 'learning',
          intervalDays: 3,
          repetitions: 1,
          dueDate: new Date(),
        },
      });

      const card3 = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'card_leech',
        meaning: 'từ khó hay quên',
        source: 'IELTS Cam 16',
        srs: {
          status: 'learning',
          lapses: 4, // Leech card (lapses >= 3)
          intervalDays: 1,
        },
      });

      const card4 = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'card_suspended',
        meaning: 'tạm dừng',
        source: '',
        srs: { status: 'suspended' },
      });

      // Create Review Logs: 3 good/easy + 1 again = 75% retention rate
      await ReviewLog.create([
        { userId: user._id, cardId: card1._id, rating: 3 },
        { userId: user._id, cardId: card2._id, rating: 4 },
        { userId: user._id, cardId: card2._id, rating: 3 },
        { userId: user._id, cardId: card3._id, rating: 1 },
      ]);

      const res = await request(app)
        .get('/api/v1/learn/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalCards).toBe(4);
      expect(res.body.data.byStatus.new).toBe(1);
      expect(res.body.data.byStatus.learning).toBe(2);
      expect(res.body.data.byStatus.suspended).toBe(1);

      // Retention rate: 3/4 = 75%
      expect(res.body.data.retentionRate).toBe(75);
      expect(res.body.data.totalReviews).toBe(4);

      // Leech cards: card3 has lapses=4 >= 3
      expect(res.body.data.leechCards.length).toBe(1);
      expect(res.body.data.leechCards[0].word).toBe('card_leech');

      // Forecast: array of 7 days
      expect(res.body.data.forecast.length).toBe(7);
      expect(res.body.data.forecast[0].labelVi).toBe('Hôm nay');
      expect(res.body.data.forecast[1].labelVi).toBe('Ngày mai');

      // Sources
      expect(res.body.data.bySource.length).toBeGreaterThan(0);
      const ieltsSource = res.body.data.bySource.find((s) => s.source === 'IELTS Cam 16');
      expect(ieltsSource.count).toBe(2);
    });
  });
});
