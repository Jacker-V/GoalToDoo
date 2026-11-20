import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Deck, Card } from '../src/modules/learn/models/index.js';
import { signAccessToken } from '../src/utils/jwt.js';

describe('Learn Module API (/api/v1/learn)', () => {
  let app;
  let user;
  let otherUser;
  let token;
  let otherToken;

  beforeEach(async () => {
    app = createApp();

    user = await User.create({
      name: 'Learner User',
      email: `learner_${Date.now()}@example.com`,
      passwordHash: 'hash123',
    });
    token = signAccessToken({ id: user._id.toString() });

    otherUser = await User.create({
      name: 'Other Learner',
      email: `otherlearner_${Date.now()}@example.com`,
      passwordHash: 'hash456',
    });
    otherToken = signAccessToken({ id: otherUser._id.toString() });
  });

  // -------------------------------------------------------------
  // DECK TESTS
  // -------------------------------------------------------------
  describe('Deck API (/api/v1/learn/decks)', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app).get('/api/v1/learn/decks');
      expect(res.status).toBe(401);
    });

    it('creates a new deck with default color and custom description', async () => {
      const res = await request(app)
        .post('/api/v1/learn/decks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Oxford 3000',
          description: 'Common vocabulary',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Oxford 3000');
      expect(res.body.data.color).toBe('#6366f1');
      expect(res.body.data.totalCards).toBe(0);
      expect(res.body.data.dueCards).toBe(0);
      expect(res.body.data.masteredCards).toBe(0);
    });

    it('validates deck creation requires a non-empty name', async () => {
      const res = await request(app)
        .post('/api/v1/learn/decks')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('lists decks with computed stats (totalCards, dueCards, masteredCards)', async () => {
      const deck = await Deck.create({
        userId: user._id,
        name: 'Tech Terms',
        color: '#10b981',
      });

      // 1 due card
      await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'latency',
        meaning: 'độ trễ',
        srs: {
          dueDate: new Date(Date.now() - 3600 * 1000), // past
          status: 'learning',
          intervalDays: 1,
          repetitions: 1,
        },
      });

      // 1 mastered card (interval >= 21)
      await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'throughput',
        meaning: 'thông lượng',
        srs: {
          dueDate: new Date(Date.now() + 86400 * 10000),
          status: 'review',
          intervalDays: 30,
          repetitions: 4,
        },
      });

      // 1 suspended card (should not be counted in dueCards)
      await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'bandwidth',
        meaning: 'băng thông',
        srs: {
          dueDate: new Date(Date.now() - 3600 * 1000),
          status: 'suspended',
          intervalDays: 0,
        },
      });

      const res = await request(app)
        .get('/api/v1/learn/decks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const target = res.body.data.find((d) => d._id === deck._id.toString());
      expect(target).toBeDefined();
      expect(target.totalCards).toBe(3);
      expect(target.dueCards).toBe(1);
      expect(target.masteredCards).toBe(1);
    });

    it('updates deck name and color', async () => {
      const deck = await Deck.create({
        userId: user._id,
        name: 'Old Name',
        color: '#000000',
      });

      const res = await request(app)
        .patch(`/api/v1/learn/decks/${deck._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Name',
          color: '#3b82f6',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('New Name');
      expect(res.body.data.color).toBe('#3b82f6');
    });

    it('prevents cross-tenant updating of decks', async () => {
      const deck = await Deck.create({
        userId: otherUser._id,
        name: 'Other Deck',
      });

      const res = await request(app)
        .patch(`/api/v1/learn/decks/${deck._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(404);
    });

    it('deletes a deck and cascades cards deletion by default', async () => {
      const deck = await Deck.create({
        userId: user._id,
        name: 'To Delete',
      });

      await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'test',
        meaning: 'thử nghiệm',
      });

      const res = await request(app)
        .delete(`/api/v1/learn/decks/${deck._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deletedCardsCount).toBe(1);

      const foundCards = await Card.find({ deckId: deck._id });
      expect(foundCards.length).toBe(0);
    });

    it('deletes a deck and releases cards when cascade=false (deckId set to null)', async () => {
      const deck = await Deck.create({
        userId: user._id,
        name: 'To Release Deck',
      });

      const targetDeck = await Deck.create({
        userId: user._id,
        name: 'Target Reassign Deck',
      });

      const card = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'unassigned_candidate',
        meaning: 'từ sắp được giải phóng',
      });

      const res = await request(app)
        .delete(`/api/v1/learn/decks/${deck._id}?cascade=false`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deletedCardsCount).toBe(0);
      expect(res.body.data.releasedCardsCount).toBe(1);

      // Verify deck is deleted
      const foundDeck = await Deck.findById(deck._id);
      expect(foundDeck).toBeNull();

      // Verify card still exists with deckId: null
      const releasedCard = await Card.findById(card._id);
      expect(releasedCard).not.toBeNull();
      expect(releasedCard.deckId).toBeNull();

      // Verify updating released card (assigning to new deck) works without crashing
      const updateRes = await request(app)
        .patch(`/api/v1/learn/cards/${card._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          deckId: targetDeck._id.toString(),
          meaning: 'đã gán vào deck mới',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.meaning).toBe('đã gán vào deck mới');
      expect(updateRes.body.data.deckId._id).toBe(targetDeck._id.toString());
    });

    it('merges two decks: moves all cards to targetDeck and deletes sourceDeck', async () => {
      const source = await Deck.create({
        userId: user._id,
        name: 'Source Deck',
      });
      const target = await Deck.create({
        userId: user._id,
        name: 'Target Deck',
      });

      await Card.create({
        userId: user._id,
        deckId: source._id,
        word: 'word1',
        meaning: 'nghĩa 1',
      });
      await Card.create({
        userId: user._id,
        deckId: source._id,
        word: 'word2',
        meaning: 'nghĩa 2',
      });

      const res = await request(app)
        .post('/api/v1/learn/decks/merge')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceDeckId: source._id.toString(),
          targetDeckId: target._id.toString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.movedCardsCount).toBe(2);

      // Verify cards moved
      const targetCards = await Card.find({ deckId: target._id });
      expect(targetCards.length).toBe(2);

      // Verify source deleted
      const sourceExists = await Deck.findById(source._id);
      expect(sourceExists).toBeNull();
    });

    it('rejects merging when source and target decks are identical', async () => {
      const deck = await Deck.create({
        userId: user._id,
        name: 'Self Deck',
      });

      const res = await request(app)
        .post('/api/v1/learn/decks/merge')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sourceDeckId: deck._id.toString(),
          targetDeckId: deck._id.toString(),
        });

      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------
  // CARD TESTS
  // -------------------------------------------------------------
  describe('Card API (/api/v1/learn/cards)', () => {
    let deck;

    beforeEach(async () => {
      deck = await Deck.create({
        userId: user._id,
        name: 'Vocabulary Deck',
      });
    });

    it('creates a new card with valid data and default SRS properties', async () => {
      const res = await request(app)
        .post('/api/v1/learn/cards')
        .set('Authorization', `Bearer ${token}`)
        .send({
          deckId: deck._id.toString(),
          word: 'resilient',
          meaning: 'kiên cường, có khả năng phục hồi nhanh',
          partOfSpeech: 'adjective',
          example: 'He remained resilient despite multiple setbacks.',
          source: 'IELTS Band 8',
          tags: ['ielts', 'personality'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.word).toBe('resilient');
      expect(res.body.data.partOfSpeech).toBe('adjective');
      expect(res.body.data.srs.easeFactor).toBe(2.5);
      expect(res.body.data.srs.status).toBe('new');
    });

    it('returns 409 DUPLICATE_CARD when adding an existing word in the same deck without allowDuplicate', async () => {
      await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'meticulous',
        meaning: 'tỉ mỉ',
      });

      const res = await request(app)
        .post('/api/v1/learn/cards')
        .set('Authorization', `Bearer ${token}`)
        .send({
          deckId: deck._id.toString(),
          word: '  Meticulous  ',
          meaning: 'cẩn thận từng li',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_CARD');
    });

    it('allows duplicate creation when allowDuplicate is true', async () => {
      await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'meticulous',
        meaning: 'tỉ mỉ',
      });

      const res = await request(app)
        .post('/api/v1/learn/cards')
        .set('Authorization', `Bearer ${token}`)
        .send({
          deckId: deck._id.toString(),
          word: 'meticulous',
          meaning: 'cẩn thận từng li (nghĩa thứ 2)',
          allowDuplicate: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.word).toBe('meticulous');
    });

    it('filters cards by deckId, status, tag, source, and search keyword with pagination', async () => {
      await Card.create([
        {
          userId: user._id,
          deckId: deck._id,
          word: 'apple',
          meaning: 'quả táo',
          source: 'Food Unit',
          tags: ['fruit'],
          srs: { status: 'new' },
        },
        {
          userId: user._id,
          deckId: deck._id,
          word: 'banana',
          meaning: 'quả chuối',
          source: 'Food Unit',
          tags: ['fruit'],
          srs: { status: 'learning' },
        },
        {
          userId: user._id,
          deckId: deck._id,
          word: 'algorithm',
          meaning: 'thuật toán',
          source: 'Computer Science',
          tags: ['tech'],
          srs: { status: 'review' },
        },
      ]);

      // 1. Search keyword "quả"
      const searchRes = await request(app)
        .get('/api/v1/learn/cards?search=quả')
        .set('Authorization', `Bearer ${token}`);
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.length).toBe(2);

      // 2. Filter by status 'learning'
      const statusRes = await request(app)
        .get('/api/v1/learn/cards?status=learning')
        .set('Authorization', `Bearer ${token}`);
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.length).toBe(1);
      expect(statusRes.body.data[0].word).toBe('banana');

      // 3. Filter by tag 'tech'
      const tagRes = await request(app)
        .get('/api/v1/learn/cards?tag=tech')
        .set('Authorization', `Bearer ${token}`);
      expect(tagRes.status).toBe(200);
      expect(tagRes.body.data.length).toBe(1);
      expect(tagRes.body.data[0].word).toBe('algorithm');

      // 4. Pagination
      const pageRes = await request(app)
        .get('/api/v1/learn/cards?limit=2&page=1')
        .set('Authorization', `Bearer ${token}`);
      expect(pageRes.status).toBe(200);
      expect(pageRes.body.data.length).toBe(2);
      expect(pageRes.body.meta.total).toBe(3);
      expect(pageRes.body.meta.totalPages).toBe(2);
    });

    it('toggles card suspend status back and forth', async () => {
      const card = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'pause',
        meaning: 'tạm dừng',
        srs: {
          status: 'review',
          repetitions: 3,
        },
      });

      // 1. Suspend
      const suspendRes = await request(app)
        .patch(`/api/v1/learn/cards/${card._id}/suspend`)
        .set('Authorization', `Bearer ${token}`);

      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.data.srs.status).toBe('suspended');

      // 2. Resume -> should return to 'review' since repetitions > 0
      const resumeRes = await request(app)
        .patch(`/api/v1/learn/cards/${card._id}/suspend`)
        .set('Authorization', `Bearer ${token}`);

      expect(resumeRes.status).toBe(200);
      expect(resumeRes.body.data.srs.status).toBe('review');
    });

    it('updates card details and deletes card', async () => {
      const card = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'editme',
        meaning: 'sửa tôi đi',
      });

      // Update
      const updateRes = await request(app)
        .patch(`/api/v1/learn/cards/${card._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          meaning: 'nghĩa đã sửa',
          example: 'an example sentence',
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.meaning).toBe('nghĩa đã sửa');
      expect(updateRes.body.data.example).toBe('an example sentence');

      // Delete
      const deleteRes = await request(app)
        .delete(`/api/v1/learn/cards/${card._id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(deleteRes.status).toBe(200);

      const check = await Card.findById(card._id);
      expect(check).toBeNull();
    });

    it('rejects cross-tenant operations on cards (view, update, delete, suspend)', async () => {
      const card = await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'secret',
        meaning: 'bí mật',
      });

      // View
      const getRes = await request(app)
        .get(`/api/v1/learn/cards/${card._id}`)
        .set('Authorization', `Bearer ${otherToken}`);
      expect(getRes.status).toBe(404);

      // Update
      const patchRes = await request(app)
        .patch(`/api/v1/learn/cards/${card._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ meaning: 'bị hack' });
      expect(patchRes.status).toBe(404);

      // Suspend
      const suspendRes = await request(app)
        .patch(`/api/v1/learn/cards/${card._id}/suspend`)
        .set('Authorization', `Bearer ${otherToken}`);
      expect(suspendRes.status).toBe(404);

      // Delete
      const deleteRes = await request(app)
        .delete(`/api/v1/learn/cards/${card._id}`)
        .set('Authorization', `Bearer ${otherToken}`);
      expect(deleteRes.status).toBe(404);

      // Verify card was not altered
      const cardAfter = await Card.findById(card._id);
      expect(cardAfter.meaning).toBe('bí mật');
    });

    it('allows querying cards with empty string query filters without 400 validation error', async () => {
      const res = await request(app)
        .get('/api/v1/learn/cards?deckId=&status=&tag=&source=&search=')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // BULK IMPORT TESTS
  // -------------------------------------------------------------
  describe('Bulk Import API (POST /api/v1/learn/cards/bulk)', () => {
    let deck;

    beforeEach(async () => {
      deck = await Deck.create({
        userId: user._id,
        name: 'Bulk Deck',
      });

      await Card.create({
        userId: user._id,
        deckId: deck._id,
        word: 'existing',
        meaning: 'từ đã có sẵn',
      });
    });

    it('previews raw multiline text: parses formats and detects duplicate words without modifying DB', async () => {
      const rawText = `
        # Header comment to be ignored
        ubiquitous (adj) - có mặt ở khắp mọi nơi - Smart devices are ubiquitous.
        existing - từ đã có nhưng dán lại
        alleviate | verb | làm giảm bớt áp lực
        meticulous : tỉ mỉ cẩn thận
        repeat - từ đầu tiên
        repeat - từ lặp lại trong cùng batch
      `;

      const res = await request(app)
        .post('/api/v1/learn/cards/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({
          deckId: deck._id.toString(),
          rawText,
          preview: true,
          source: 'Bulk Source',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.preview).toBe(true);
      expect(res.body.data.total).toBe(6);

      const cards = res.body.data.cards;
      // 1. ubiquitous
      const ubiquitous = cards.find((c) => c.word === 'ubiquitous');
      expect(ubiquitous).toBeDefined();
      expect(ubiquitous.partOfSpeech).toBe('adjective');
      expect(ubiquitous.meaning).toBe('có mặt ở khắp mọi nơi');
      expect(ubiquitous.example).toBe('Smart devices are ubiquitous.');
      expect(ubiquitous.isDuplicate).toBe(false);

      // 2. existing -> duplicate from DB
      const existing = cards.find((c) => c.word === 'existing');
      expect(existing).toBeDefined();
      expect(existing.isDuplicate).toBe(true);
      expect(existing.duplicateReason).toContain('Đã tồn tại trong deck này');

      // 3. repeat -> second occurrence flagged as duplicate
      const repeats = cards.filter((c) => c.word === 'repeat');
      expect(repeats.length).toBe(2);
      expect(repeats[0].isDuplicate).toBe(false);
      expect(repeats[1].isDuplicate).toBe(true);
      expect(repeats[1].duplicateReason).toContain('Lặp lại trong danh sách');

      // Crucial: verify DB was NOT modified during preview
      const dbCount = await Card.countDocuments({ deckId: deck._id });
      expect(dbCount).toBe(1); // Only the pre-existing card
    });

    it('commits bulk import with skipDuplicates=true', async () => {
      const rawText = `
        existing - từ đã tồn tại
        fresh_word_1 - từ mới một
        fresh_word_2 | từ mới hai
      `;

      const res = await request(app)
        .post('/api/v1/learn/cards/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({
          deckId: deck._id.toString(),
          rawText,
          preview: false,
          skipDuplicates: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.insertedCount).toBe(2);
      expect(res.body.data.skippedCount).toBe(1);

      const allCards = await Card.find({ deckId: deck._id });
      expect(allCards.length).toBe(3); // 1 existing + 2 new
    });

    it('commits bulk import with updateDuplicates=true', async () => {
      const rawText = `
        existing (adj) - nghĩa mới được cập nhật sau khi import - Ví dụ mới
      `;

      const res = await request(app)
        .post('/api/v1/learn/cards/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({
          deckId: deck._id.toString(),
          rawText,
          preview: false,
          updateDuplicates: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.updatedCount).toBe(1);

      const updated = await Card.findOne({ deckId: deck._id, word: 'existing' });
      expect(updated.meaning).toBe('nghĩa mới được cập nhật sau khi import');
      expect(updated.partOfSpeech).toBe('adjective');
      expect(updated.example).toBe('Ví dụ mới');
    });

    it('parses hyphenated English words, multi-colon formats, and POS with dots correctly', async () => {
      const rawText = `
        state-of-the-art (adj.) - hiện đại nhất - It has state-of-the-art tech.
        long-term - dài hạn - This is a long-term plan.
        mother-in-law (n.) - mẹ chồng
        coherent (adj) : mạch lạc chặt chẽ : He wrote a coherent essay.
        adapt (vi.) : thích nghi : adapt to changes
      `;

      const res = await request(app)
        .post('/api/v1/learn/cards/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({
          deckId: deck._id.toString(),
          rawText,
          preview: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(5);

      const cards = res.body.data.cards;
      // 1. state-of-the-art
      const sota = cards.find((c) => c.word === 'state-of-the-art');
      expect(sota).toBeDefined();
      expect(sota.partOfSpeech).toBe('adjective');
      expect(sota.meaning).toBe('hiện đại nhất');
      expect(sota.example).toBe('It has state-of-the-art tech.');

      // 2. long-term
      const lt = cards.find((c) => c.word === 'long-term');
      expect(lt).toBeDefined();
      expect(lt.meaning).toBe('dài hạn');
      expect(lt.example).toBe('This is a long-term plan.');

      // 3. mother-in-law
      const mil = cards.find((c) => c.word === 'mother-in-law');
      expect(mil).toBeDefined();
      expect(mil.partOfSpeech).toBe('noun');
      expect(mil.meaning).toBe('mẹ chồng');

      // 4. coherent (colon format with example)
      const coh = cards.find((c) => c.word === 'coherent');
      expect(coh).toBeDefined();
      expect(coh.partOfSpeech).toBe('adjective');
      expect(coh.meaning).toBe('mạch lạc chặt chẽ');
      expect(coh.example).toBe('He wrote a coherent essay.');

      // 5. adapt (vi. intransitive verb)
      const adp = cards.find((c) => c.word === 'adapt');
      expect(adp).toBeDefined();
      expect(adp.partOfSpeech).toBe('verb');
      expect(adp.meaning).toBe('thích nghi');
      expect(adp.example).toBe('adapt to changes');
    });

    it('handles duplicates within the same batch when updateDuplicates=true without inserting duplicate cards', async () => {
      const rawText = `
        novel - tiểu thuyết
        novel (adj) - mới lạ độc đáo - A novel approach to problem solving.
      `;

      const res = await request(app)
        .post('/api/v1/learn/cards/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({
          deckId: deck._id.toString(),
          rawText,
          preview: false,
          skipDuplicates: false,
          updateDuplicates: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.insertedCount).toBe(1);
      expect(res.body.data.updatedCount).toBe(1);

      // Verify only ONE card exists for 'novel' in the database
      const foundCards = await Card.find({ deckId: deck._id, word: 'novel' });
      expect(foundCards.length).toBe(1);
      expect(foundCards[0].partOfSpeech).toBe('adjective');
      expect(foundCards[0].meaning).toBe('mới lạ độc đáo');
      expect(foundCards[0].example).toBe('A novel approach to problem solving.');
    });
  });
});
