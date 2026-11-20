import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Goal } from '../src/models/goal.model.js';
import { Task } from '../src/models/task.model.js';
import { TaskCompletion } from '../src/models/taskCompletion.model.js';
import { Conversation, Message, AiUsage, Card } from '../src/modules/learn/models/index.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { geminiService } from '../src/modules/learn/services/gemini.service.js';

describe('AI Chatbot & Learn Chat API (/api/v1/chat)', () => {
  let app;
  let user;
  let otherUser;
  let token;
  let otherToken;

  beforeEach(async () => {
    app = createApp();

    user = await User.create({
      name: 'Chat User',
      email: `chat_user_${Date.now()}@example.com`,
      passwordHash: 'hash123',
    });
    token = signAccessToken({ id: user._id.toString() });

    otherUser = await User.create({
      name: 'Other Chat User',
      email: `other_chat_${Date.now()}@example.com`,
      passwordHash: 'hash456',
    });
    otherToken = signAccessToken({ id: otherUser._id.toString() });
  });

  // =============================================================
  // 1. CONVERSATION CRUD
  // =============================================================
  describe('Conversation Management', () => {
    it('returns 401 when no authorization token is provided', async () => {
      const res = await request(app).get('/api/v1/chat/conversations');
      expect(res.status).toBe(401);
    });

    it('creates a conversation with default title if not provided', async () => {
      const res = await request(app)
        .post('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Cuộc trò chuyện mới');
      expect(res.body.data.pinned).toBe(false);
      expect(res.body.data.userId).toBe(user._id.toString());
    });

    it('creates a conversation with a custom title', async () => {
      const res = await request(app)
        .post('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Ôn thi IELTS Speaking Part 2' });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Ôn thi IELTS Speaking Part 2');
    });

    it('lists conversations sorted by pinned first, then newest updated', async () => {
      const c1 = await Conversation.create({
        userId: user._id,
        title: 'Conv Normal 1',
        pinned: false,
        updatedAt: new Date(Date.now() - 10000),
      });

      const c2 = await Conversation.create({
        userId: user._id,
        title: 'Conv Pinned',
        pinned: true,
        updatedAt: new Date(Date.now() - 5000),
      });

      const c3 = await Conversation.create({
        userId: user._id,
        title: 'Conv Normal 2',
        pinned: false,
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
      // Pinned should come first
      expect(res.body.data[0]._id).toBe(c2._id.toString());
      // Then the more recently updated normal conversation
      expect(res.body.data[1]._id).toBe(c3._id.toString());
      expect(res.body.data[2]._id).toBe(c1._id.toString());
    });

    it('supports searching conversations by title keyword', async () => {
      await Conversation.create([
        { userId: user._id, title: 'Grammar: Present Perfect' },
        { userId: user._id, title: 'Vocabulary: Oxford 3000' },
        { userId: user._id, title: 'Speaking tips' },
      ]);

      const res = await request(app)
        .get('/api/v1/chat/conversations?search=grammar')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Grammar: Present Perfect');
    });

    it('safely escapes special regex characters in search query without crashing', async () => {
      await Conversation.create([
        { userId: user._id, title: 'IELTS (Academic) Prep' },
        { userId: user._id, title: 'Grammar [Basic]' },
        { userId: user._id, title: 'C1+ Advanced Collocations' },
      ]);

      // Search with parentheses
      const resParen = await request(app)
        .get('/api/v1/chat/conversations?search=(Academic)')
        .set('Authorization', `Bearer ${token}`);

      expect(resParen.status).toBe(200);
      expect(resParen.body.data.length).toBe(1);
      expect(resParen.body.data[0].title).toBe('IELTS (Academic) Prep');

      // Search with unclosed bracket
      const resBracket = await request(app)
        .get('/api/v1/chat/conversations?search=[')
        .set('Authorization', `Bearer ${token}`);

      expect(resBracket.status).toBe(200);
      expect(resBracket.body.data.length).toBe(1);
      expect(resBracket.body.data[0].title).toBe('Grammar [Basic]');

      // Search with plus
      const resPlus = await request(app)
        .get('/api/v1/chat/conversations?search=C1+')
        .set('Authorization', `Bearer ${token}`);

      expect(resPlus.status).toBe(200);
      expect(resPlus.body.data.length).toBe(1);
    });

    it('updates conversation title and toggles pinned', async () => {
      const conv = await Conversation.create({
        userId: user._id,
        title: 'Old Title',
        pinned: false,
      });

      const res = await request(app)
        .patch(`/api/v1/chat/conversations/${conv._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Title',
          pinned: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Title');
      expect(res.body.data.pinned).toBe(true);
    });

    it('deletes a conversation and cascades all messages inside it', async () => {
      const conv = await Conversation.create({
        userId: user._id,
        title: 'To be deleted',
      });

      await Message.create([
        { conversationId: conv._id, userId: user._id, role: 'user', content: 'Message 1' },
        { conversationId: conv._id, userId: user._id, role: 'assistant', content: 'Message 2' },
      ]);

      const res = await request(app)
        .delete(`/api/v1/chat/conversations/${conv._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deletedConversationId).toBe(conv._id.toString());
      expect(res.body.data.deletedMessagesCount).toBe(2);

      // Verify DB cleanup
      const convInDb = await Conversation.findById(conv._id);
      expect(convInDb).toBeNull();
      const messagesInDb = await Message.find({ conversationId: conv._id });
      expect(messagesInDb.length).toBe(0);
    });
  });

  // =============================================================
  // 2. CROSS-TENANT SECURITY
  // =============================================================
  describe('Cross-Tenant Security', () => {
    let userAConv;

    beforeEach(async () => {
      userAConv = await Conversation.create({
        userId: user._id,
        title: 'User A Secret Chat',
      });
      await Message.create({
        conversationId: userAConv._id,
        userId: user._id,
        role: 'user',
        content: 'Private user message',
      });
    });

    it('prevents User B from reading User A conversation messages', async () => {
      const res = await request(app)
        .get(`/api/v1/chat/conversations/${userAConv._id}/messages`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('prevents User B from updating User A conversation', async () => {
      const res = await request(app)
        .patch(`/api/v1/chat/conversations/${userAConv._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(404);
      const inDb = await Conversation.findById(userAConv._id);
      expect(inDb.title).toBe('User A Secret Chat');
    });

    it('prevents User B from deleting User A conversation', async () => {
      const res = await request(app)
        .delete(`/api/v1/chat/conversations/${userAConv._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
      const inDb = await Conversation.findById(userAConv._id);
      expect(inDb).not.toBeNull();
    });

    it('prevents User B from sending a message to User A conversation', async () => {
      const res = await request(app)
        .post(`/api/v1/chat/conversations/${userAConv._id}/messages`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ content: 'Injected message' });

      expect(res.status).toBe(404);
    });
  });

  // =============================================================
  // 3. SSE STREAMING & MESSAGES
  // =============================================================
  describe('Message Exchange & SSE Streaming', () => {
    it('streams response chunks via SSE and saves user and assistant messages', async () => {
      const conv = await Conversation.create({
        userId: user._id,
        title: 'Cuộc trò chuyện mới',
      });

      const res = await request(app)
        .post(`/api/v1/chat/conversations/${conv._id}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Lên lộ trình học tiếng Anh 6 tháng từ mất gốc' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/event-stream');

      const sseText = res.text;
      expect(sseText).toContain('event: chunk');
      expect(sseText).toContain('event: done');

      // Verify conversation title was auto-updated from default
      const updatedConv = await Conversation.findById(conv._id);
      expect(updatedConv.title).not.toBe('Cuộc trò chuyện mới');
      expect(updatedConv.title).toContain('Lên lộ trình');

      // Verify messages were created in DB
      const messages = await Message.find({ conversationId: conv._id }).sort({ createdAt: 1 });
      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Lên lộ trình học tiếng Anh 6 tháng từ mất gốc');
      expect(messages[1].role).toBe('assistant');
      expect(messages[1].content).toContain('Lộ trình 6 tháng');
      expect(messages[1].tokenUsage.input).toBeGreaterThan(0);
      expect(messages[1].tokenUsage.output).toBeGreaterThan(0);
    });

    it('lists all messages in a conversation', async () => {
      const conv = await Conversation.create({
        userId: user._id,
        title: 'Messages List Test',
      });

      await Message.create([
        { conversationId: conv._id, userId: user._id, role: 'user', content: 'Hello' },
        { conversationId: conv._id, userId: user._id, role: 'assistant', content: 'Hi there!' },
      ]);

      const res = await request(app)
        .get(`/api/v1/chat/conversations/${conv._id}/messages`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].content).toBe('Hello');
      expect(res.body.data[1].content).toBe('Hi there!');
    });

    it('persists partial assistant reply when client disconnects during streaming', async () => {
      const conv = await Conversation.create({
        userId: user._id,
        title: 'Abort Stream Test',
      });

      const { EventEmitter } = await import('events');
      const req = new EventEmitter();
      req.user = { _id: user._id };
      req.params = { id: conv._id.toString() };
      req.body = { content: 'Explain present perfect grammar in depth' };

      const res = {
        writeHead: () => {},
        flushHeaders: () => {},
        write: () => {
          // Trigger client disconnect on first chunk
          req.emit('close');
        },
        end: () => {},
        headersSent: true,
      };

      const { sendMessageStream } = await import('../src/modules/learn/controllers/chat.controller.js');
      await sendMessageStream(req, res, () => {});

      // Verify assistant message was preserved in database
      const assistantMsgs = await Message.find({ conversationId: conv._id, role: 'assistant' });
      expect(assistantMsgs.length).toBe(1);
      expect(assistantMsgs[0].content.length).toBeGreaterThan(0);
      expect(assistantMsgs[0].tokenUsage.output).toBeGreaterThan(0);
    });
  });

  // =============================================================
  // 4. USAGE & QUOTA LIMITS
  // =============================================================
  describe('AI Quota & Usage Tracking', () => {
    it('returns accurate usage stats for the current day', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      await AiUsage.create({
        userId: user._id,
        date: todayStr,
        requests: 5,
        inputTokens: 120,
        outputTokens: 350,
      });

      const res = await request(app)
        .get('/api/v1/chat/usage')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.used).toBe(5);
      expect(res.body.data.limit).toBe(50);
      expect(res.body.data.remaining).toBe(45);
      expect(res.body.data.date).toBe(todayStr);
      expect(res.body.data.maxInputTokens).toBe(100000);
      expect(res.body.data.maxOutputTokens).toBe(50000);
    });

    it('rejects message with 429 when daily quota is exceeded', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      // Exhaust quota
      await AiUsage.create({
        userId: user._id,
        date: todayStr,
        requests: 50,
      });

      const conv = await Conversation.create({
        userId: user._id,
        title: 'Quota Exceeded Conv',
      });

      const res = await request(app)
        .post(`/api/v1/chat/conversations/${conv._id}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Test quota limit' });

      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AI_QUOTA_EXCEEDED');
    });

    it('rejects message with 429 when daily input token quota is exceeded', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      await AiUsage.create({
        userId: user._id,
        date: todayStr,
        requests: 5,
        inputTokens: 100000,
        outputTokens: 500,
      });

      const conv = await Conversation.create({
        userId: user._id,
        title: 'Input Token Quota Conv',
      });

      const res = await request(app)
        .post(`/api/v1/chat/conversations/${conv._id}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Test input token quota limit' });

      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AI_TOKEN_QUOTA_EXCEEDED');
    });

    it('rejects message with 429 when daily output token quota is exceeded', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      await AiUsage.create({
        userId: user._id,
        date: todayStr,
        requests: 5,
        inputTokens: 2000,
        outputTokens: 50000,
      });

      const conv = await Conversation.create({
        userId: user._id,
        title: 'Output Token Quota Conv',
      });

      const res = await request(app)
        .post(`/api/v1/chat/conversations/${conv._id}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Test output token quota limit' });

      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AI_OUTPUT_TOKEN_QUOTA_EXCEEDED');
    });
  });

  // =============================================================
  // 5. MESSAGE FEEDBACK
  // =============================================================
  describe('Message Feedback', () => {
    it('submits thumbs_up and thumbs_down feedback on assistant message', async () => {
      const conv = await Conversation.create({ userId: user._id, title: 'Feedback Test' });
      const msg = await Message.create({
        conversationId: conv._id,
        userId: user._id,
        role: 'assistant',
        content: 'Helpful explanation',
      });

      // Submit thumbs_up
      const res1 = await request(app)
        .post(`/api/v1/chat/messages/${msg._id}/feedback`)
        .set('Authorization', `Bearer ${token}`)
        .send({ feedback: 'thumbs_up' });

      expect(res1.status).toBe(200);
      expect(res1.body.data.feedback).toBe('thumbs_up');

      // Change to thumbs_down
      const res2 = await request(app)
        .post(`/api/v1/chat/messages/${msg._id}/feedback`)
        .set('Authorization', `Bearer ${token}`)
        .send({ feedback: 'thumbs_down' });

      expect(res2.status).toBe(200);
      expect(res2.body.data.feedback).toBe('thumbs_down');

      // Clear feedback to null
      const res3 = await request(app)
        .post(`/api/v1/chat/messages/${msg._id}/feedback`)
        .set('Authorization', `Bearer ${token}`)
        .send({ feedback: null });

      expect(res3.status).toBe(200);
      expect(res3.body.data.feedback).toBeNull();
    });

    it('rejects invalid feedback values with 400', async () => {
      const conv = await Conversation.create({ userId: user._id, title: 'Feedback Test' });
      const msg = await Message.create({
        conversationId: conv._id,
        userId: user._id,
        role: 'assistant',
        content: 'Helpful explanation',
      });

      const res = await request(app)
        .post(`/api/v1/chat/messages/${msg._id}/feedback`)
        .set('Authorization', `Bearer ${token}`)
        .send({ feedback: 'invalid_emoji' });

      expect(res.status).toBe(400);
    });

    it('prevents user from voting on another user message', async () => {
      const conv = await Conversation.create({ userId: user._id, title: 'User A Chat' });
      const msg = await Message.create({
        conversationId: conv._id,
        userId: user._id,
        role: 'assistant',
        content: 'User A text',
      });

      const res = await request(app)
        .post(`/api/v1/chat/messages/${msg._id}/feedback`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ feedback: 'thumbs_up' });

      expect(res.status).toBe(404);
    });
  });

  // =============================================================
  // 6. ROLLING SUMMARY & TWO-TIER MEMORY
  // =============================================================
  describe('Two-Tier Memory & Rolling Summary', () => {
    it('triggers rolling summary when conversation messages exceed 10', async () => {
      const conv = await Conversation.create({
        userId: user._id,
        title: 'Long Conversation',
        summary: '',
      });

      // Insert 10 initial messages (5 pairs)
      const initialMessages = [];
      for (let i = 1; i <= 10; i++) {
        initialMessages.push({
          conversationId: conv._id,
          userId: user._id,
          role: i % 2 === 1 ? 'user' : 'assistant',
          content: `Initial conversation turn ${i}: English grammar topic ${i}`,
        });
      }
      await Message.insertMany(initialMessages);

      // Verify initially no summary
      let freshConv = await Conversation.findById(conv._id);
      expect(freshConv.summary).toBe('');

      // Send the 11th message (will make total 11 user messages + assistant = 12 messages)
      const res = await request(app)
        .post(`/api/v1/chat/conversations/${conv._id}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Tell me more about advanced collocations' });

      expect(res.status).toBe(200);

      // Now conversation summary must have been triggered and updated
      freshConv = await Conversation.findById(conv._id);
      expect(freshConv.summary).toBeTruthy();
      expect(freshConv.summaryUpToMessageId).not.toBeNull();
    });
  });

  // =============================================================
  // 7. APP CONTEXT AWARENESS & MOCK GUIDANCE
  // =============================================================
  describe('App Context Awareness Service', () => {
    it('gathers active goals, progressCache, weeklyProgress, and leech cards accurately into context', async () => {
      // Create an active goal with progressCache
      await Goal.create({
        userId: user._id,
        title: 'IELTS Band 7.5',
        targetValue: 75,
        currentValue: 60,
        progressCache: 80,
        unit: 'điểm',
        status: 'in_progress',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 30),
      });

      // Create a completed task in the current week
      await Task.create({
        userId: user._id,
        title: 'Luyện 20 từ vựng Oxford',
        isCompleted: true,
        completedAt: new Date(),
      });

      // Create a due card and a leech card
      await Card.create({
        userId: user._id,
        word: 'Ubiquitous',
        meaning: 'Phổ biến khắp nơi',
        srs: {
          dueDate: new Date(Date.now() - 10000),
          lapses: 4,
          status: 'review',
        },
      });

      const context = await geminiService.getUserAppContext(user._id);
      expect(context.activeGoals.length).toBe(1);
      expect(context.activeGoals[0].title).toBe('IELTS Band 7.5');
      // progress must come from progressCache and be 80, not 0!
      expect(context.activeGoals[0].progress).toBe(80);
      expect(context.weeklyProgress).toBeDefined();
      expect(context.weeklyProgress.completedTasks).toBeGreaterThanOrEqual(1);
      expect(context.weeklyProgress.avgGoalProgress).toBe(80);
      expect(context.dueCardsCount).toBe(1);
      expect(context.leechCards.length).toBe(1);
      expect(context.leechCards[0].word).toBe('Ubiquitous');

      const systemPrompt = geminiService.buildSystemPrompt(context, 'Tóm tắt trước đó');
      expect(systemPrompt).toContain('IELTS Band 7.5');
      expect(systemPrompt).toContain('tiến độ: 80%');
      expect(systemPrompt).toContain('Tiến độ tuần này:');
      expect(systemPrompt).toContain('Ubiquitous');
      expect(systemPrompt).toContain('Tóm tắt trước đó');
    });

    it('includes GEMINI_API_KEY setup instructions in fallback mock assistant response', () => {
      const mockText = geminiService.generateMockResponseText(
        'Xin chào trợ lý',
        { activeGoals: [], dueCardsCount: 0, leechCards: [] },
        ''
      );

      expect(mockText).toContain('GEMINI_API_KEY');
      expect(mockText).toContain('server/.env');
    });
  });
});
