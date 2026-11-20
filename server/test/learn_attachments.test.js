import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Goal } from '../src/models/goal.model.js';
import { Task } from '../src/models/task.model.js';
import { Deck, Card, Conversation, Message, UploadedFile } from '../src/modules/learn/models/index.js';
import { signAccessToken } from '../src/utils/jwt.js';

describe('Giai đoạn 12: Attachments & Propose Cards API (/api/v1/chat)', () => {
  let app;
  let userA;
  let userB;
  let tokenA;
  let tokenB;
  let deckA;

  // Track created files for cleanup
  const createdTestPaths = [];

  beforeEach(async () => {
    app = createApp();

    userA = await User.create({
      name: 'User A',
      email: `user_a_${Date.now()}@example.com`,
      passwordHash: 'hashA',
    });
    tokenA = signAccessToken({ id: userA._id.toString() });

    userB = await User.create({
      name: 'User B',
      email: `user_b_${Date.now()}@example.com`,
      passwordHash: 'hashB',
    });
    tokenB = signAccessToken({ id: userB._id.toString() });

    deckA = await Deck.create({
      userId: userA._id,
      name: 'IELTS Vocabulary Deck',
      color: '#4f46e5',
    });
  });

  afterEach(async () => {
    // Cleanup any lingering test files created during tests
    for (const p of createdTestPaths) {
      try {
        if (fs.existsSync(p)) {
          await fs.promises.unlink(p);
        }
      } catch {}
    }
    createdTestPaths.length = 0;
  });

  // ====================================================================
  // 1. FILE UPLOAD & VALIDATION
  // ====================================================================
  describe('File Upload & Validation (POST /api/v1/chat/files)', () => {
    it('successfully uploads a valid PNG image and verifies magic bytes & DB record', async () => {
      // Valid PNG header (89 50 4E 47 0D 0A 1A 0A) followed by dummy data
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      ]);

      const res = await request(app)
        .post('/api/v1/chat/files')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('files', pngBuffer, 'test_screenshot.png');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);

      const uploaded = res.body.data[0];
      expect(uploaded.name).toBe('test_screenshot.png');
      expect(uploaded.mime).toBe('image/png');
      expect(uploaded.size).toBe(pngBuffer.length);
      expect(uploaded.url).toContain(`/api/v1/chat/files/${uploaded.fileId}`);

      // Verify in MongoDB
      const fileInDb = await UploadedFile.findById(uploaded.fileId);
      expect(fileInDb).not.toBeNull();
      expect(fileInDb.userId.toString()).toBe(userA._id.toString());
      expect(fileInDb.storagePath).toContain(userA._id.toString());

      // Verify physical file on disk
      expect(fs.existsSync(fileInDb.storagePath)).toBe(true);
      createdTestPaths.push(fileInDb.storagePath);
    });

    it('successfully uploads a valid PDF document', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

      const res = await request(app)
        .post('/api/v1/chat/files')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('files', pdfBuffer, 'ielts_reading.pdf');

      expect(res.status).toBe(201);
      const uploaded = res.body.data[0];
      expect(uploaded.mime).toBe('application/pdf');

      const fileInDb = await UploadedFile.findById(uploaded.fileId);
      expect(fileInDb).not.toBeNull();
      createdTestPaths.push(fileInDb.storagePath);
    });

    it('successfully uploads a plain text document (TXT and MD)', async () => {
      const txtBuffer = Buffer.from('Perseverance is key to language learning. Acquisition requires consistent practice.');

      const res = await request(app)
        .post('/api/v1/chat/files')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('files', txtBuffer, 'notes.txt');

      expect(res.status).toBe(201);
      expect(res.body.data[0].mime).toBe('text/plain');

      const fileInDb = await UploadedFile.findById(res.body.data[0].fileId);
      createdTestPaths.push(fileInDb.storagePath);
    });

    it('rejects unsupported MIME type (e.g. shell script or audio)', async () => {
      const shBuffer = Buffer.from('#!/bin/bash\necho "hello"');

      const res = await request(app)
        .post('/api/v1/chat/files')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('files', shBuffer, 'script.sh');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects spoofed file with fake extension and invalid magic bytes', async () => {
      // Fake PNG that actually contains an executable signature (MZ)
      const fakePngBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);

      const res = await request(app)
        .post('/api/v1/chat/files')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('files', fakePngBuffer, 'malicious.png');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('chữ ký nhị phân không hợp lệ');

      // Ensure no record in DB
      const count = await UploadedFile.countDocuments();
      expect(count).toBe(0);
    });

    it('rejects file exceeding 10MB limit', async () => {
      // Create a 10.5 MB buffer
      const largeBuffer = Buffer.alloc(10.5 * 1024 * 1024);
      // Valid PNG header so it's not rejected by magic bytes first
      largeBuffer[0] = 0x89;
      largeBuffer[1] = 0x50;
      largeBuffer[2] = 0x4e;
      largeBuffer[3] = 0x47;
      largeBuffer[4] = 0x0d;
      largeBuffer[5] = 0x0a;
      largeBuffer[6] = 0x1a;
      largeBuffer[7] = 0x0a;

      const res = await request(app)
        .post('/api/v1/chat/files')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('files', largeBuffer, 'huge_file.png');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FILE_TOO_LARGE');
    });

    it('rejects upload of more than 5 files per request', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      ]);

      const req = request(app)
        .post('/api/v1/chat/files')
        .set('Authorization', `Bearer ${tokenA}`);

      for (let i = 1; i <= 6; i++) {
        req.attach('files', pngBuffer, `img_${i}.png`);
      }

      const res = await req;
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ====================================================================
  // 2. MULTI-USER ISOLATION & ACCESS CONTROL
  // ====================================================================
  describe('Multi-user Isolation (GET & DELETE /api/v1/chat/files/:id)', () => {
    let fileA;

    beforeEach(async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      ]);

      const res = await request(app)
        .post('/api/v1/chat/files')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('files', pngBuffer, 'userA_private.png');

      fileA = res.body.data[0];
      const inDb = await UploadedFile.findById(fileA.fileId);
      createdTestPaths.push(inDb.storagePath);
    });

    it('allows file owner (User A) to view/download file', async () => {
      const res = await request(app)
        .get(`/api/v1/chat/files/${fileA.fileId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
    });

    it('strictly forbids User B from viewing User A file (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/chat/files/${fileA.fileId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('strictly forbids User B from deleting User A file (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/v1/chat/files/${fileA.fileId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);

      // Verify file still exists in DB
      const inDb = await UploadedFile.findById(fileA.fileId);
      expect(inDb).not.toBeNull();
    });

    it('allows User A to delete file and unlinks physical file on disk', async () => {
      const inDb = await UploadedFile.findById(fileA.fileId);
      const filePath = inDb.storagePath;
      expect(fs.existsSync(filePath)).toBe(true);

      const res = await request(app)
        .delete(`/api/v1/chat/files/${fileA.fileId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deletedFileId).toBe(fileA.fileId);

      // Verify removed from DB
      const afterDb = await UploadedFile.findById(fileA.fileId);
      expect(afterDb).toBeNull();

      // Verify physical file is unlinked on disk
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('returns 404 for non-existent file ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/v1/chat/files/${fakeId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
    });
  });

  // ====================================================================
  // 3. CONVERSATION CASCADE CLEANUP
  // ====================================================================
  describe('Conversation Deletion Cascade Cleanup', () => {
    it('unlinks physical files when conversation containing attachments is deleted', async () => {
      const conv = await Conversation.create({
        userId: userA._id,
        title: 'Conversation with attachments',
      });

      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      ]);

      const uploadRes = await request(app)
        .post('/api/v1/chat/files')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('files', pngBuffer, 'attached_doc.png');

      const att = uploadRes.body.data[0];
      const fileRecord = await UploadedFile.findById(att.fileId);
      const filePath = fileRecord.storagePath;
      expect(fs.existsSync(filePath)).toBe(true);
      createdTestPaths.push(filePath);

      await Message.create({
        conversationId: conv._id,
        userId: userA._id,
        role: 'user',
        content: 'Check this image',
        attachments: [att],
      });

      // Delete the conversation
      const delRes = await request(app)
        .delete(`/api/v1/chat/conversations/${conv._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(delRes.status).toBe(200);

      // Verify physical file was cleaned up
      expect(fs.existsSync(filePath)).toBe(false);

      // Verify UploadedFile record was deleted
      const afterFile = await UploadedFile.findById(att.fileId);
      expect(afterFile).toBeNull();
    });
  });

  // ====================================================================
  // 4. ACTION: ADD PROPOSED CARDS TO DECK
  // ====================================================================
  describe('Action: Add Proposed Cards (POST /api/v1/chat/actions/add-cards)', () => {
    it('adds cards to deck and synchronizes daily review task and learn goals', async () => {
      // Create a learn-linked goal for cards_added
      const goal = await Goal.create({
        userId: userA._id,
        title: 'Học 100 từ vựng tiếng Anh',
        type: 'month',
        progressMode: 'numeric',
        targetValue: 100,
        currentValue: 0,
        linkedMetric: 'cards_added',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
      });

      const cardsToAdd = [
        {
          word: 'Perseverance',
          meaning: 'Sự kiên trì, bền bỉ',
          partOfSpeech: 'noun',
          example: 'Language learning requires perseverance.',
          note: 'C1 Vocabulary',
          source: 'ai_chat',
        },
        {
          word: 'Acquisition',
          meaning: 'Sự tiếp thu kiến thức',
          partOfSpeech: 'noun',
          example: 'Vocabulary acquisition takes time.',
          note: 'C1 Vocabulary',
          source: 'ai_chat',
        },
      ];

      const res = await request(app)
        .post('/api/v1/chat/actions/add-cards')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          deckId: deckA._id.toString(),
          cards: cardsToAdd,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.addedCount).toBe(2);
      expect(res.body.data.cards.length).toBe(2);

      // Check cards in MongoDB
      const cardsInDb = await Card.find({ deckId: deckA._id });
      expect(cardsInDb.length).toBe(2);
      expect(cardsInDb[0].srs.status).toBe('new');
      expect(cardsInDb[0].srs.easeFactor).toBe(2.5);
      expect(cardsInDb[0].tags).toContain('ai_extracted');

      // Check that daily review system task was automatically created/synchronized
      const todayStr = new Date().toISOString().slice(0, 10);
      const systemTask = await Task.findOne({
        userId: userA._id,
        source: 'system',
        linkedModule: 'learn',
        'metadata.date': todayStr,
      });
      expect(systemTask).not.toBeNull();
      expect(systemTask.metadata.targetCount).toBeGreaterThanOrEqual(2);

      // Check that cards_added goal was automatically synced
      const updatedGoal = await Goal.findById(goal._id);
      expect(updatedGoal.currentValue).toBe(2);
      expect(updatedGoal.progressCache).toBe(2);
    });

    it('rejects adding cards to another user deck (404 Not Found)', async () => {
      const res = await request(app)
        .post('/api/v1/chat/actions/add-cards')
        .set('Authorization', `Bearer ${tokenB}`) // User B attempting on User A's deck
        .send({
          deckId: deckA._id.toString(),
          cards: [
            {
              word: 'Hacked',
              meaning: 'Bị hack',
            },
          ],
        });

      expect(res.status).toBe(404);
    });

    it('rejects empty cards array (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/v1/chat/actions/add-cards')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          deckId: deckA._id.toString(),
          cards: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ====================================================================
  // 5. MULTIMODAL MESSAGE & PROPOSE_CARDS EXTRACTION
  // ====================================================================
  describe('Multimodal Message & Propose Cards SSE Exchange', () => {
    it('accepts attachments array and emits propose_cards event and saves toolCalls in DB', async () => {
      const conv = await Conversation.create({
        userId: userA._id,
        title: 'Cuộc trò chuyện mới',
      });

      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      ]);

      const uploadRes = await request(app)
        .post('/api/v1/chat/files')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('files', pngBuffer, 'ielts_reading_snippet.png');

      const att = uploadRes.body.data[0];
      const inDb = await UploadedFile.findById(att.fileId);
      createdTestPaths.push(inDb.storagePath);

      // Send message with attachment
      const res = await request(app)
        .post(`/api/v1/chat/conversations/${conv._id}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          content: 'Trích từ mới cho tôi từ hình ảnh này',
          attachments: [att],
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/event-stream');

      const sseText = res.text;
      expect(sseText).toContain('event: propose_cards');
      expect(sseText).toContain('event: chunk');
      expect(sseText).toContain('event: done');

      // Check messages in DB
      const messages = await Message.find({ conversationId: conv._id }).sort({ createdAt: 1 });
      expect(messages.length).toBe(2);

      // User message
      expect(messages[0].role).toBe('user');
      expect(messages[0].attachments.length).toBe(1);
      expect(messages[0].attachments[0].fileId).toBe(att.fileId);

      // Assistant message
      expect(messages[1].role).toBe('assistant');
      expect(messages[1].toolCalls.length).toBe(1);
      expect(messages[1].toolCalls[0].name).toBe('propose_cards');
      expect(Array.isArray(messages[1].toolCalls[0].args.cards)).toBe(true);
      expect(messages[1].toolCalls[0].args.cards.length).toBeGreaterThan(0);

      const firstCard = messages[1].toolCalls[0].args.cards[0];
      expect(firstCard.word).toBeDefined();
      expect(firstCard.meaning).toBeDefined();
    });

    it('emits propose_cards when user asks "Trích từ mới cho tôi" even without attachments', async () => {
      const conv = await Conversation.create({
        userId: userA._id,
        title: 'Vocabulary chat',
      });

      const res = await request(app)
        .post(`/api/v1/chat/conversations/${conv._id}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          content: 'Trích từ mới cho tôi các từ hay gặp',
        });

      expect(res.status).toBe(200);
      expect(res.text).toContain('event: propose_cards');

      const assistantMsg = await Message.findOne({ conversationId: conv._id, role: 'assistant' });
      expect(assistantMsg.toolCalls.length).toBe(1);
      expect(assistantMsg.toolCalls[0].name).toBe('propose_cards');
    });

    it('rejects upload of 0-byte empty file with 400 Bad Request', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const res = await request(app)
        .post('/api/v1/chat/files')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('files', emptyBuffer, 'empty.txt');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('0 bytes');
    });

    it('strictly sanitizes file extension so spoofed dangerous names (malware.exe) resolve to safe default extension', async () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

      const res = await request(app)
        .post('/api/v1/chat/files')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('files', jpegBuffer, { filename: 'malware.exe', contentType: 'image/jpeg' });

      expect(res.status).toBe(201);
      const uploaded = res.body.data[0];
      const inDb = await UploadedFile.findById(uploaded.fileId);
      expect(inDb).not.toBeNull();
      createdTestPaths.push(inDb.storagePath);

      // Verify stored filename on disk ends with .jpg, NEVER .exe
      expect(inDb.storagePath.endsWith('.jpg')).toBe(true);
      expect(inDb.storagePath.endsWith('.exe')).toBe(false);
    });

    it('rejects invalid zip/docx header bytes (e.g. 50 4B 03 00)', async () => {
      const corruptZip = Buffer.from([0x50, 0x4b, 0x03, 0x00, 0x11, 0x22]);

      const res = await request(app)
        .post('/api/v1/chat/files')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('files', corruptZip, 'corrupted.docx');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('chữ ký nhị phân không hợp lệ');
    });

    it('authenticates file download via query parameter (?token=...) with nosniff and Content-Disposition headers', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      ]);

      const uploadRes = await request(app)
        .post('/api/v1/chat/files')
        .set('Authorization', `Bearer ${tokenA}`)
        .attach('files', pngBuffer, 'avatar.png');

      const fileId = uploadRes.body.data[0].fileId;
      const inDb = await UploadedFile.findById(fileId);
      createdTestPaths.push(inDb.storagePath);

      // Query param token without Authorization header (simulates browser <img> or <a>)
      const res = await request(app).get(`/api/v1/chat/files/${fileId}?token=${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['content-disposition']).toContain('filename="avatar.png"');
    });

    it('sendMessageStream filters out cross-tenant/unowned attachment fileIds so only owned files are persisted', async () => {
      // User B uploads a file
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      ]);
      const uploadResB = await request(app)
        .post('/api/v1/chat/files')
        .set('Authorization', `Bearer ${tokenB}`)
        .attach('files', pngBuffer, 'userB_secret.png');
      const fileB = uploadResB.body.data[0];
      const inDbB = await UploadedFile.findById(fileB.fileId);
      createdTestPaths.push(inDbB.storagePath);

      // User A creates conversation
      const conv = await Conversation.create({
        userId: userA._id,
        title: 'User A conversation',
      });

      // User A attempts to attach User B's file
      const res = await request(app)
        .post(`/api/v1/chat/conversations/${conv._id}/messages`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          content: 'Here is an attachment',
          attachments: [fileB], // file owned by User B
        });

      expect(res.status).toBe(200);

      // Verify that User A's user message in DB does NOT contain User B's file
      const userMsg = await Message.findOne({ conversationId: conv._id, role: 'user' });
      expect(userMsg.attachments.length).toBe(0);
    });
  });
});
