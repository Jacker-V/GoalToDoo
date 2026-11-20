import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Task } from '../src/models/task.model.js';
import { Goal } from '../src/models/goal.model.js';
import { Deck, Card, ReviewLog } from '../src/modules/learn/models/index.js';
import { signAccessToken } from '../src/utils/jwt.js';

describe('Learn Integration Phase 10: Task Sync, Goal Sync & Stats', () => {
  let app;
  let user;
  let otherUser;
  let token;
  let otherToken;
  let deck;

  beforeEach(async () => {
    app = createApp();

    user = await User.create({
      name: 'Integration User',
      email: `integ_${Date.now()}_${Math.random()}@example.com`,
      passwordHash: 'hashed123',
    });
    token = signAccessToken({ id: user._id.toString() });

    otherUser = await User.create({
      name: 'Other User',
      email: `other_${Date.now()}_${Math.random()}@example.com`,
      passwordHash: 'hashed456',
    });
    otherToken = signAccessToken({ id: otherUser._id.toString() });

    deck = await Deck.create({
      userId: user._id,
      name: 'Integration Deck',
      color: '#6366f1',
    });
  });

  describe('1. Auto-generate System Review Task', () => {
    it('does not create a system review task if there are no due cards', async () => {
      const res = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const systemTasks = res.body.data.filter((t) => t.source === 'system');
      expect(systemTasks.length).toBe(0);
    });

    it('does not count suspended cards as due cards', async () => {
      await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'suspended_word',
        meaning: 'từ tạm ngưng',
        srs: {
          dueDate: new Date(Date.now() - 3600000), // 1 hour ago
          status: 'suspended',
        },
      });

      const res = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const systemTasks = res.body.data.filter((t) => t.source === 'system');
      expect(systemTasks.length).toBe(0);
    });

    it('automatically generates a system review task when user has due cards on GET /tasks', async () => {
      // Create 2 due cards
      await Card.create([
        {
          userId: user._id,
          deckId: deck._id,
          word: 'apple',
          meaning: 'quả táo',
          srs: {
            dueDate: new Date(Date.now() - 3600000),
            status: 'learning',
          },
        },
        {
          userId: user._id,
          deckId: deck._id,
          word: 'banana',
          meaning: 'quả chuối',
          srs: {
            dueDate: new Date(),
            status: 'learning',
          },
        },
      ]);

      const res = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const systemTask = res.body.data.find(
        (t) => t.source === 'system' && t.linkedModule === 'learn'
      );
      expect(systemTask).toBeDefined();
      expect(systemTask.title).toBe('Ôn tập 2 từ vựng đến hạn');
      expect(systemTask.priority).toBe('high');
      expect(systemTask.isCompleted).toBe(false);
      expect(systemTask.metadata.targetCount).toBe(2);
      expect(systemTask.metadata.completedCount).toBe(0);
    });

    it('also triggers system review task sync on GET /calendar and GET /review/queue', async () => {
      await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'cat',
        meaning: 'con mèo',
        srs: {
          dueDate: new Date(),
          status: 'learning',
        },
      });

      // GET /review/queue triggers sync
      const resQueue = await request(app)
        .get('/api/v1/learn/review/queue')
        .set('Authorization', `Bearer ${token}`);
      expect(resQueue.status).toBe(200);

      // Verify task exists in DB
      const task = await Task.findOne({
        userId: user._id,
        source: 'system',
        linkedModule: 'learn',
      });
      expect(task).toBeDefined();
      expect(task.metadata.targetCount).toBe(1);

      // GET /calendar also includes it
      const todayStr = new Date().toISOString().slice(0, 10);
      const resCal = await request(app)
        .get(`/api/v1/calendar?from=${todayStr}&to=${todayStr}`)
        .set('Authorization', `Bearer ${token}`);
      expect(resCal.status).toBe(200);
      const calTask = resCal.body.data.tasks.find((t) => t.source === 'system');
      expect(calTask).toBeDefined();
      expect(calTask._id.toString()).toBe(task._id.toString());
    });
  });

  describe('2. Auto-completion of System Review Task', () => {
    it('increments completedCount on review and marks task completed when reaching targetCount', async () => {
      const card1 = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'dog',
        meaning: 'con chó',
        srs: {
          dueDate: new Date(),
          status: 'learning',
        },
      });

      const card2 = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'bird',
        meaning: 'con chim',
        srs: {
          dueDate: new Date(),
          status: 'learning',
        },
      });

      // Generate the initial task with targetCount = 2
      const resTasks = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`);
      const initialTask = resTasks.body.data.find((t) => t.source === 'system');
      expect(initialTask.isCompleted).toBe(false);
      expect(initialTask.metadata.targetCount).toBe(2);

      // User answers card1
      const resAns1 = await request(app)
        .post('/api/v1/learn/review/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({ cardId: card1._id, rating: 3, durationMs: 2000 });
      expect(resAns1.status).toBe(200);

      // Check task after 1st review
      let taskAfter1 = await Task.findById(initialTask._id);
      expect(taskAfter1.metadata.completedCount).toBe(1);
      expect(taskAfter1.isCompleted).toBe(false);

      // User answers card2
      const resAns2 = await request(app)
        .post('/api/v1/learn/review/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({ cardId: card2._id, rating: 4, durationMs: 1500 });
      expect(resAns2.status).toBe(200);

      // Check task after 2nd review
      let taskAfter2 = await Task.findById(initialTask._id);
      expect(taskAfter2.metadata.completedCount).toBe(2);
      expect(taskAfter2.isCompleted).toBe(true);
      expect(taskAfter2.completedAt).toBeDefined();
    });

    it('triggers recalculateGoalProgress if system task is linked to a goal', async () => {
      const goal = await Goal.create({
        userId: user._id,
        title: 'Learn English Daily',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        progressMode: 'auto',
      });

      const card = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'sun',
        meaning: 'mặt trời',
        srs: { dueDate: new Date(), status: 'learning' },
      });

      // Initial tasks call creates system task
      await request(app).get('/api/v1/tasks').set('Authorization', `Bearer ${token}`);
      const systemTask = await Task.findOne({ userId: user._id, source: 'system' });
      systemTask.goalId = goal._id;
      await systemTask.save();

      // Answer card to complete system task
      await request(app)
        .post('/api/v1/learn/review/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({ cardId: card._id, rating: 3 });

      const updatedGoal = await Goal.findById(goal._id);
      expect(updatedGoal.progressCache).toBe(100);
    });
  });

  describe('3. Goal Numeric Synchronization (Learn Goal Sync)', () => {
    it('synchronizes goal with linkedMetric "cards_added" when cards are added or deleted', async () => {
      // Create a numeric goal for adding 10 cards
      const goalRes = await request(app)
        .post('/api/v1/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Học 10 từ vựng',
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: '2026-12-31T00:00:00.000Z',
          progressMode: 'numeric',
          linkedMetric: 'cards_added',
          targetValue: 10,
          currentValue: 0,
          unit: 'từ',
        });

      expect(goalRes.status).toBe(201);
      const goalId = goalRes.body.data._id;
      expect(goalRes.body.data.linkedMetric).toBe('cards_added');

      // Add a card via API
      const cardRes = await request(app)
        .post('/api/v1/learn/cards')
        .set('Authorization', `Bearer ${token}`)
        .send({
          deckId: deck._id,
          word: 'elephant',
          meaning: 'con voi',
        });
      expect(cardRes.status).toBe(201);
      const cardId = cardRes.body.data._id;

      // Check that goal currentValue is now 1 and progress is 10%
      const goalAfterAdd = await Goal.findById(goalId);
      expect(goalAfterAdd.currentValue).toBe(1);
      expect(goalAfterAdd.progressCache).toBe(10);

      // Bulk import 4 more cards
      const bulkRes = await request(app)
        .post('/api/v1/learn/cards/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({
          deckId: deck._id,
          rawText: 'lion - sư tử\ntiger - con hổ\nbear - con gấu\nwolf - chó sói',
        });
      expect(bulkRes.status).toBe(201);

      // Check that goal currentValue is now 5 and progress is 50%
      const goalAfterBulk = await Goal.findById(goalId);
      expect(goalAfterBulk.currentValue).toBe(5);
      expect(goalAfterBulk.progressCache).toBe(50);

      // Delete 1 card
      await request(app)
        .delete(`/api/v1/learn/cards/${cardId}`)
        .set('Authorization', `Bearer ${token}`);

      const goalAfterDelete = await Goal.findById(goalId);
      expect(goalAfterDelete.currentValue).toBe(4);
      expect(goalAfterDelete.progressCache).toBe(40);
    });

    it('synchronizes goal with linkedMetric "cards_mastered" when card reaches review status', async () => {
      const goalRes = await request(app)
        .post('/api/v1/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Thuộc 2 từ vựng',
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: '2026-12-31T00:00:00.000Z',
          progressMode: 'numeric',
          linkedMetric: 'cards_mastered',
          targetValue: 2,
          currentValue: 0,
          unit: 'từ đã thuộc',
        });

      const goalId = goalRes.body.data._id;

      // Create a card that has intervalDays = 15, repetitions = 2
      const card = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'master_word',
        meaning: 'từ đã thuộc',
        srs: {
          intervalDays: 15,
          repetitions: 2,
          easeFactor: 2.5,
          dueDate: new Date(),
          status: 'learning',
        },
      });

      // Answering with rating 4 (Easy) gives interval > 21 and changes status to 'review'
      const answerRes = await request(app)
        .post('/api/v1/learn/review/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({ cardId: card._id, rating: 4 });
      expect(answerRes.status).toBe(200);
      expect(answerRes.body.data.nextReview.status).toBe('review');

      // Verify goal was synced to 1
      const updatedGoal = await Goal.findById(goalId);
      expect(updatedGoal.currentValue).toBe(1);
      expect(updatedGoal.progressCache).toBe(50);
    });

    it('synchronizes goal with linkedMetric "review_sessions" based on distinct review days', async () => {
      const goalRes = await request(app)
        .post('/api/v1/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Duy trì 5 ngày ôn tập',
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: '2026-12-31T00:00:00.000Z',
          progressMode: 'numeric',
          linkedMetric: 'review_sessions',
          targetValue: 5,
          currentValue: 0,
          unit: 'ngày ôn',
        });

      const goalId = goalRes.body.data._id;

      const card = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'test_session',
        meaning: 'phiên test',
      });

      // Add historical review logs on 2 distinct past days
      await ReviewLog.create([
        {
          userId: user._id,
          cardId: card._id,
          rating: 3,
          reviewedAt: new Date('2026-11-10T10:00:00Z'),
        },
        {
          userId: user._id,
          cardId: card._id,
          rating: 4,
          reviewedAt: new Date('2026-11-11T10:00:00Z'),
        },
        // Same day second log should not count as another day
        {
          userId: user._id,
          cardId: card._id,
          rating: 3,
          reviewedAt: new Date('2026-11-11T15:00:00Z'),
        },
      ]);

      // Trigger a review today via API
      await request(app)
        .post('/api/v1/learn/review/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({ cardId: card._id, rating: 3 });

      // Total distinct days = 2026-11-10, 2026-11-11, and today -> 3 days!
      const updatedGoal = await Goal.findById(goalId);
      expect(updatedGoal.currentValue).toBe(3);
      expect(updatedGoal.progressCache).toBe(60);
    });

    it('protects multi-tenancy: User B card operations never modify User A goals', async () => {
      const goalA = await Goal.create({
        userId: user._id,
        title: 'User A Goal',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        progressMode: 'numeric',
        linkedMetric: 'cards_added',
        targetValue: 10,
        currentValue: 0,
      });

      // Other user adds card
      const otherDeck = await Deck.create({
        userId: otherUser._id,
        name: 'Other Deck',
      });

      await request(app)
        .post('/api/v1/learn/cards')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          deckId: otherDeck._id,
          word: 'other_word',
          meaning: 'nghĩa khác',
        });

      const refreshedGoalA = await Goal.findById(goalA._id);
      expect(refreshedGoalA.currentValue).toBe(0);
    });
  });

  describe('4. Stats Integration (Streak & Heatmap)', () => {
    it('includes review log activity in stats summary streak calculation', async () => {
      const card = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'streak_word',
        meaning: 'từ streak',
      });

      // User has no tasks, but has reviews on 2 consecutive days: yesterday and today (refDate: 2026-11-18)
      await ReviewLog.create([
        {
          userId: user._id,
          cardId: card._id,
          rating: 3,
          reviewedAt: new Date('2026-11-17T12:00:00Z'),
        },
        {
          userId: user._id,
          cardId: card._id,
          rating: 4,
          reviewedAt: new Date('2026-11-18T12:00:00Z'),
        },
      ]);

      const res = await request(app)
        .get('/api/v1/stats/summary?period=month&refDate=2026-11-18T15:00:00Z')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.currentStreak).toBe(2);
      expect(res.body.data.longestStreak).toBe(2);
    });

    it('records review activity in stats heatmap dailyCounts', async () => {
      const card = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'heatmap_word',
        meaning: 'từ heatmap',
      });

      // Add 3 reviews on 2026-05-15
      await ReviewLog.create([
        {
          userId: user._id,
          cardId: card._id,
          rating: 3,
          reviewedAt: new Date('2026-05-15T10:00:00Z'),
        },
        {
          userId: user._id,
          cardId: card._id,
          rating: 4,
          reviewedAt: new Date('2026-05-15T11:00:00Z'),
        },
        {
          userId: user._id,
          cardId: card._id,
          rating: 2,
          reviewedAt: new Date('2026-05-15T12:00:00Z'),
        },
      ]);

      const res = await request(app)
        .get('/api/v1/stats/heatmap?year=2026')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.dailyCounts['2026-05-15']).toBe(3);
      expect(res.body.data.totalCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('5. Advanced Edge Cases & System Sync Robustness', () => {
    it('removes phantom system review task when all due cards are suspended', async () => {
      // 1. Create a due card
      const card = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'phantom_word',
        meaning: 'từ ảo',
        srs: { dueDate: new Date(), status: 'learning' },
      });

      // 2. Fetch tasks to trigger system task creation
      const res1 = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`);
      expect(res1.body.data.some((t) => t.source === 'system')).toBe(true);

      // 3. Suspend the card via API
      const suspendRes = await request(app)
        .patch(`/api/v1/learn/cards/${card._id}/suspend`)
        .set('Authorization', `Bearer ${token}`);
      expect(suspendRes.status).toBe(200);

      // 4. Fetch tasks again - the uncompleted system task should be cleaned up!
      const res2 = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`);
      const systemTasks = res2.body.data.filter((t) => t.source === 'system' && t.linkedModule === 'learn');
      expect(systemTasks.length).toBe(0);
    });

    it('immediately populates currentValue when creating a goal if cards already exist', async () => {
      // Create 3 existing cards
      await Card.create([
        { userId: user._id, deckId: deck._id, word: 'w1', meaning: 'm1' },
        { userId: user._id, deckId: deck._id, word: 'w2', meaning: 'm2' },
        { userId: user._id, deckId: deck._id, word: 'w3', meaning: 'm3' },
      ]);

      // Create numeric goal with cards_added
      const res = await request(app)
        .post('/api/v1/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Goal with existing cards',
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: '2026-12-31T00:00:00.000Z',
          progressMode: 'numeric',
          linkedMetric: 'cards_added',
          targetValue: 6,
          currentValue: 0,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.currentValue).toBe(3);
      expect(res.body.data.progressCache).toBe(50);
    });

    it('syncs cards_mastered goal when a card is updated directly via PATCH /api/v1/learn/cards/:id', async () => {
      const goal = await Goal.create({
        userId: user._id,
        title: 'Mastered Goal',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        progressMode: 'numeric',
        linkedMetric: 'cards_mastered',
        targetValue: 5,
        currentValue: 0,
      });

      const card = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'edit_word',
        meaning: 'từ sửa',
        srs: { status: 'learning', intervalDays: 5 },
      });

      // Update card SRS status to review directly
      const patchRes = await request(app)
        .patch(`/api/v1/learn/cards/${card._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          srs: { status: 'review', intervalDays: 30 },
        });
      expect(patchRes.status).toBe(200);

      const refreshedGoal = await Goal.findById(goal._id);
      expect(refreshedGoal.currentValue).toBe(1);
      expect(refreshedGoal.progressCache).toBe(20);
    });

    it('keeps review_sessions goal value stable when multiple reviews occur on the same day', async () => {
      const goal = await Goal.create({
        userId: user._id,
        title: 'Streak sessions goal',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        progressMode: 'numeric',
        linkedMetric: 'review_sessions',
        targetValue: 10,
        currentValue: 0,
      });

      const c1 = await Card.create({ userId: user._id, deckId: deck._id, word: 'c1', meaning: 'm1' });
      const c2 = await Card.create({ userId: user._id, deckId: deck._id, word: 'c2', meaning: 'm2' });
      const c3 = await Card.create({ userId: user._id, deckId: deck._id, word: 'c3', meaning: 'm3' });

      // Review all 3 cards today
      await request(app).post('/api/v1/learn/review/answer').set('Authorization', `Bearer ${token}`).send({ cardId: c1._id, rating: 3 });
      await request(app).post('/api/v1/learn/review/answer').set('Authorization', `Bearer ${token}`).send({ cardId: c2._id, rating: 4 });
      await request(app).post('/api/v1/learn/review/answer').set('Authorization', `Bearer ${token}`).send({ cardId: c3._id, rating: 3 });

      const refreshed = await Goal.findById(goal._id);
      expect(refreshed.currentValue).toBe(1);
      expect(refreshed.progressCache).toBe(10);
    });

    it('creates a new system task for the new day without overwriting yesterday task', async () => {
      // Yesterday card
      const yesterday = new Date(Date.now() - 86400000);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      // Create yesterday system task
      await Task.create({
        userId: user._id,
        title: 'Ôn tập 1 từ vựng đến hạn',
        dueDate: yesterday,
        source: 'system',
        linkedModule: 'learn',
        isCompleted: true,
        completedAt: yesterday,
        metadata: {
          date: yesterdayStr,
          targetCount: 1,
          completedCount: 1,
        },
      });

      // Today card due
      await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'today_card',
        meaning: 'từ hôm nay',
        srs: { dueDate: new Date(), status: 'learning' },
      });

      // GET /tasks triggers sync for today
      const res = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`);

      const systemTasks = res.body.data.filter((t) => t.source === 'system' && t.linkedModule === 'learn');
      expect(systemTasks.length).toBe(2);

      const yesterdayTask = systemTasks.find((t) => t.metadata.date === yesterdayStr);
      expect(yesterdayTask.isCompleted).toBe(true);

      const todayStr = new Date().toLocaleDateString('en-CA');
      const todayTask = systemTasks.find((t) => t.metadata.date === todayStr);
      expect(todayTask).toBeDefined();
      expect(todayTask.isCompleted).toBe(false);
    });
  });
});
