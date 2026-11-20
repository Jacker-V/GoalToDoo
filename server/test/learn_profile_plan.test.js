import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/user.model.js';
import { Goal } from '../src/models/goal.model.js';
import { Task } from '../src/models/task.model.js';
import { LearnerProfile } from '../src/modules/learn/models/learnerProfile.model.js';
import { Conversation, Message } from '../src/modules/learn/models/index.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { geminiService } from '../src/modules/learn/services/gemini.service.js';
import { recalculateGoalProgress } from '../src/services/progress.service.js';

describe('Learner Profile & Study Plan Strategy API (Giai đoạn 13)', () => {
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
      email: `other_learner_${Date.now()}@example.com`,
      passwordHash: 'hash456',
    });
    otherToken = signAccessToken({ id: otherUser._id.toString() });
  });

  // =========================================================================
  // 1. LEARNER PROFILE CRUD
  // =========================================================================
  describe('LearnerProfile CRUD (/api/v1/chat/profile)', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/v1/chat/profile');
      expect(res.status).toBe(401);
    });

    it('GET /profile auto-creates default profile if none exists', async () => {
      const res = await request(app)
        .get('/api/v1/chat/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(user._id.toString());
      expect(res.body.data.level).toBe('Intermediate (B1)');
      expect(res.body.data.dailyMinutes).toBe(30);
      expect(res.body.data.targetGoal).toBe('');
      expect(res.body.data.weaknesses).toEqual([]);
      expect(res.body.data.interests).toEqual([]);
    });

    it('PATCH /profile updates profile fields with valid data', async () => {
      // First ensure profile exists
      await request(app)
        .get('/api/v1/chat/profile')
        .set('Authorization', `Bearer ${token}`);

      const updateData = {
        level: 'Upper-Intermediate (B2)',
        targetGoal: 'IELTS 6.5 trong 6 tháng',
        targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        dailyMinutes: 45,
        weaknesses: ['Từ vựng học thuật', 'Phản xạ nói trôi chảy'],
        interests: ['Công nghệ', 'Du lịch quốc tế'],
        notes: 'Học đều đặn mỗi tối 20h',
      };

      const res = await request(app)
        .patch('/api/v1/chat/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.level).toBe('Upper-Intermediate (B2)');
      expect(res.body.data.targetGoal).toBe('IELTS 6.5 trong 6 tháng');
      expect(res.body.data.dailyMinutes).toBe(45);
      expect(res.body.data.weaknesses).toEqual(['Từ vựng học thuật', 'Phản xạ nói trôi chảy']);
      expect(res.body.data.interests).toEqual(['Công nghệ', 'Du lịch quốc tế']);
      expect(res.body.data.notes).toBe('Học đều đặn mỗi tối 20h');
    });

    it('PATCH /profile validates dailyMinutes boundary values (min: 5, max: 480)', async () => {
      const tooLow = await request(app)
        .patch('/api/v1/chat/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ dailyMinutes: 3 });

      expect(tooLow.status).toBe(400);

      const tooHigh = await request(app)
        .patch('/api/v1/chat/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ dailyMinutes: 500 });

      expect(tooHigh.status).toBe(400);
    });

    it('DELETE /profile resets profile back to default ("Forget all")', async () => {
      // Set customized profile first
      await request(app)
        .patch('/api/v1/chat/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          level: 'Advanced (C1)',
          targetGoal: 'Master 3000 words',
          dailyMinutes: 90,
          weaknesses: ['Slang', 'Idioms'],
          interests: ['Movies'],
        });

      // Call DELETE to reset
      const deleteRes = await request(app)
        .delete('/api/v1/chat/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
      expect(deleteRes.body.data.level).toBe('Intermediate (B1)');
      expect(deleteRes.body.data.targetGoal).toBe('');
      expect(deleteRes.body.data.dailyMinutes).toBe(30);
      expect(deleteRes.body.data.weaknesses).toEqual([]);
      expect(deleteRes.body.data.interests).toEqual([]);
      expect(deleteRes.body.data.notes).toBe('');
    });
  });

  // =========================================================================
  // 2. MULTI-USER ISOLATION (CROSS-TENANT)
  // =========================================================================
  describe('Multi-user Profile Isolation', () => {
    it('ensures User A and User B have separate, isolated learner profiles', async () => {
      // User A updates profile
      await request(app)
        .patch('/api/v1/chat/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          level: 'Beginner (A1)',
          targetGoal: 'Learn basic grammar',
          dailyMinutes: 15,
        });

      // User B fetches profile -> receives distinct default profile
      const resB = await request(app)
        .get('/api/v1/chat/profile')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(resB.status).toBe(200);
      expect(resB.body.data.userId).toBe(otherUser._id.toString());
      expect(resB.body.data.level).toBe('Intermediate (B1)');
      expect(resB.body.data.dailyMinutes).toBe(30);

      // Verify User A profile is intact
      const resA = await request(app)
        .get('/api/v1/chat/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(resA.body.data.userId).toBe(user._id.toString());
      expect(resA.body.data.level).toBe('Beginner (A1)');
      expect(resA.body.data.dailyMinutes).toBe(15);
    });
  });

  // =========================================================================
  // 3. APPLY STUDY PLAN ACTION (POST /api/v1/chat/actions/apply-plan)
  // =========================================================================
  describe('Apply Study Plan Action (/api/v1/chat/actions/apply-plan)', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).post('/api/v1/chat/actions/apply-plan').send({});
      expect(res.status).toBe(401);
    });

    it('creates hierarchical Year -> Month -> Week -> Task structure in DB', async () => {
      const planPayload = {
        yearGoal: {
          title: 'Chinh phục IELTS 7.0 trong năm',
          description: 'Lộ trình toàn diện',
          priority: 'high',
          color: '#6366f1',
        },
        monthGoals: [
          {
            title: 'Tháng 1-2: Xây nền phát âm & 500 từ vựng',
            description: 'Luyện IPA 44 âm',
            priority: 'high',
            color: '#3b82f6',
            weight: 1,
          },
          {
            title: 'Tháng 3-4: Nâng cao ngữ pháp & 1500 từ vựng',
            description: 'Hiện tại hoàn thành, câu điều kiện',
            priority: 'medium',
            color: '#10b981',
            weight: 1,
          },
        ],
        weekGoals: [
          {
            title: 'Tuần 1: 20 nguyên âm IPA & Thẻ cơ bản',
            description: 'Luyện 20 nguyên âm',
            priority: 'high',
            monthGoalIndex: 0,
            weight: 1,
          },
          {
            title: 'Tuần 2: 24 phụ âm IPA',
            description: 'Luyện phụ âm',
            priority: 'medium',
            monthGoalIndex: 0,
            weight: 1,
          },
        ],
        tasks: [
          {
            title: 'Luyện nguyên âm đôi /eɪ/, /aɪ/ (20 phút)',
            notes: 'Học qua video VOA',
            priority: 'high',
            weekGoalIndex: 0,
            subtasks: [{ title: 'Xem lý thuyết' }, { title: 'Thực hành trước gương' }],
          },
          {
            title: 'Ôn 15 thẻ từ vựng chủ đề Travel',
            notes: 'Spaced repetition',
            priority: 'medium',
            weekGoalIndex: 0,
            subtasks: [],
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/chat/actions/apply-plan')
        .set('Authorization', `Bearer ${token}`)
        .send(planPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.createdGoalsCount).toBe(5); // 1 year + 2 month + 2 week
      expect(res.body.data.createdTasksCount).toBe(2);
      expect(res.body.data.rootGoalId).toBeDefined();

      const rootGoal = await Goal.findById(res.body.data.rootGoalId);
      expect(rootGoal).not.toBeNull();
      expect(rootGoal.title).toBe('Chinh phục IELTS 7.0 trong năm');
      expect(rootGoal.type).toBe('year');
      expect(rootGoal.userId.toString()).toBe(user._id.toString());

      // Verify Month Goals have parentId = yearGoal._id
      const months = await Goal.find({ parentId: rootGoal._id, userId: user._id });
      expect(months.length).toBe(2);
      expect(months[0].type).toBe('month');

      // Verify Week Goals have parentId = monthGoals[0]._id
      const weeks = await Goal.find({ parentId: months[0]._id, userId: user._id });
      expect(weeks.length).toBe(2);
      expect(weeks[0].type).toBe('week');

      // Verify Tasks have goalId = weeks[0]._id
      const tasks = await Task.find({ goalId: weeks[0]._id, userId: user._id });
      expect(tasks.length).toBe(2);
      expect(tasks[0].subtasks.length).toBe(2);
      expect(tasks[0].subtasks[0].title).toBe('Xem lý thuyết');

      // Verify progressCache is initialized
      expect(typeof rootGoal.progressCache).toBe('number');
      expect(typeof months[0].progressCache).toBe('number');
      expect(typeof weeks[0].progressCache).toBe('number');
    });

    it('works cleanly when yearGoal is omitted (creating standalone month/week goals)', async () => {
      const planPayload = {
        monthGoals: [
          {
            title: 'Tháng 1: Học từ vựng chủ đề Kinh doanh',
            priority: 'medium',
          },
        ],
        weekGoals: [
          {
            title: 'Tuần 1: 50 từ vựng đàm phán & hợp đồng',
            monthGoalIndex: 0,
          },
        ],
        tasks: [
          {
            title: 'Ôn 25 từ đàm phán buổi sáng',
            weekGoalIndex: 0,
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/chat/actions/apply-plan')
        .set('Authorization', `Bearer ${token}`)
        .send(planPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.createdGoalsCount).toBe(2); // 1 month + 1 week
      expect(res.body.data.createdTasksCount).toBe(1);

      const rootGoal = await Goal.findById(res.body.data.rootGoalId);
      expect(rootGoal.type).toBe('month');
      expect(rootGoal.parentId).toBeNull();
    });

    it('properly recalculates parent progress when task is marked completed', async () => {
      const planPayload = {
        monthGoals: [{ title: 'Tháng ôn tập nhanh' }],
        weekGoals: [{ title: 'Tuần ôn tập', monthGoalIndex: 0 }],
        tasks: [{ title: 'Nhiệm vụ 1', weekGoalIndex: 0 }],
      };

      const createRes = await request(app)
        .post('/api/v1/chat/actions/apply-plan')
        .set('Authorization', `Bearer ${token}`)
        .send(planPayload);

      const task = await Task.findOne({ userId: user._id, title: 'Nhiệm vụ 1' });
      expect(task).not.toBeNull();

      // Mark task completed and recalculate
      task.isCompleted = true;
      task.completedAt = new Date();
      await task.save();

      await recalculateGoalProgress(task.goalId, user._id, 'Hoàn thành task');

      const weekGoal = await Goal.findById(task.goalId);
      expect(weekGoal.progressCache).toBe(100);

      const monthGoal = await Goal.findById(weekGoal.parentId);
      expect(monthGoal.progressCache).toBe(100);
    });

    it('rejects an empty study plan with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/chat/actions/apply-plan')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('handles tasks with string subtasks and transforms them cleanly', async () => {
      const planPayload = {
        monthGoals: [{ title: 'Tháng học từ vựng' }],
        weekGoals: [{ title: 'Tuần 1: Học từ cơ bản', monthGoalIndex: 0 }],
        tasks: [
          {
            title: 'Luyện nghe podcast',
            weekGoalIndex: 0,
            subtasks: ['Nghe lần 1 không phụ đề', 'Nghe lần 2 có phụ đề', ' '],
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/chat/actions/apply-plan')
        .set('Authorization', `Bearer ${token}`)
        .send(planPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.createdTasksCount).toBe(1);

      const task = await Task.findOne({ userId: user._id, title: 'Luyện nghe podcast' });
      expect(task).not.toBeNull();
      // Should have sanitized 2 non-empty subtasks
      expect(task.subtasks.length).toBe(2);
      expect(task.subtasks[0].title).toBe('Nghe lần 1 không phụ đề');
      expect(task.subtasks[0].done).toBe(false);
    });

    it('handles targetDate as empty string or null in PATCH /profile', async () => {
      const res = await request(app)
        .patch('/api/v1/chat/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          targetGoal: 'Target without deadline',
          targetDate: '',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.targetDate).toBeNull();
    });

    it('creates standalone tasks when both monthGoals and weekGoals are omitted', async () => {
      const planPayload = {
        tasks: [
          {
            title: 'Nhiệm vụ độc lập 1',
            notes: 'Không gắn với goal cụ thể',
          },
        ],
      };

      const res = await request(app)
        .post('/api/v1/chat/actions/apply-plan')
        .set('Authorization', `Bearer ${token}`)
        .send(planPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.createdGoalsCount).toBe(0);
      expect(res.body.data.createdTasksCount).toBe(1);
      expect(res.body.data.rootGoalId).toBeNull();

      const task = await Task.findOne({ userId: user._id, title: 'Nhiệm vụ độc lập 1' });
      expect(task).not.toBeNull();
      expect(task.goalId).toBeNull();
    });
  });

  // =========================================================================
  // 4. TIER 3 MEMORY & GEMINI PROMPT EMBEDDING
  // =========================================================================
  describe('Tier 3 Memory & System Prompt Embedding', () => {
    it('embeds LearnerProfile into system prompt when present', () => {
      const appContext = {
        activeGoals: [{ title: 'Mục tiêu A', progress: 40, targetValue: 100, currentValue: 40, unit: '%' }],
        weeklyProgress: { completedTasks: 5, avgGoalProgress: 40 },
        dueCardsCount: 12,
        leechCards: [],
        learnerProfile: {
          level: 'Upper-Intermediate (B2)',
          targetGoal: 'IELTS 7.0 trong 6 tháng',
          targetDate: new Date('2026-12-31'),
          dailyMinutes: 45,
          weaknesses: ['Phản xạ nói', 'Từ vựng học thuật'],
          interests: ['Công nghệ', 'AI'],
          notes: 'Ưu tiên phương pháp Shadowing',
        },
      };

      const prompt = geminiService.buildSystemPrompt(appContext, 'Tóm tắt trước đó');
      expect(prompt).toContain('HỒ SƠ NGƯỜI HỌC (LEARNER PROFILE - TRÍ NHỚ TẦNG 3)');
      expect(prompt).toContain('Upper-Intermediate (B2)');
      expect(prompt).toContain('IELTS 7.0 trong 6 tháng');
      expect(prompt).toContain('45 phút');
      expect(prompt).toContain('Phản xạ nói, Từ vựng học thuật');
      expect(prompt).toContain('Công nghệ, AI');
      expect(prompt).toContain('Ưu tiên phương pháp Shadowing');
      expect(prompt).toContain('json:propose_study_plan');
      expect(prompt).toContain('json:update_learner_profile');
    });

    it('getUserAppContext queries and includes LearnerProfile from MongoDB', async () => {
      await LearnerProfile.create({
        userId: user._id,
        level: 'Advanced (C1)',
        targetGoal: 'Fluency in English',
        dailyMinutes: 60,
        weaknesses: ['Nuances'],
        interests: ['Literature'],
      });

      const context = await geminiService.getUserAppContext(user._id);
      expect(context.learnerProfile).not.toBeNull();
      expect(context.learnerProfile.level).toBe('Advanced (C1)');
      expect(context.learnerProfile.targetGoal).toBe('Fluency in English');
      expect(context.learnerProfile.dailyMinutes).toBe(60);
      expect(context.learnerProfile.weaknesses).toContain('Nuances');
    });

    it('shouldProposeStudyPlan and shouldUpdateLearnerProfile detection helpers work accurately', () => {
      expect(geminiService.shouldProposeStudyPlan('Lên lộ trình học tiếng Anh 6 tháng')).toBe(true);
      expect(geminiService.shouldProposeStudyPlan('Lập kế hoạch học tập giúp tôi')).toBe(true);
      expect(geminiService.shouldProposeStudyPlan('roadmap cho người mất gốc')).toBe(true);
      expect(geminiService.shouldProposeStudyPlan('Từ này nghĩa là gì?')).toBe(false);

      expect(geminiService.shouldUpdateLearnerProfile('Tôi muốn đạt IELTS 6.5')).toBe(true);
      expect(geminiService.shouldUpdateLearnerProfile('Trình độ hiện tại của tôi là B1')).toBe(true);
      expect(geminiService.shouldUpdateLearnerProfile('Điểm yếu của tôi là phát âm')).toBe(true);
      expect(geminiService.shouldUpdateLearnerProfile('Hello world')).toBe(false);
    });

    it('mockStreamResponse triggers callbacks for propose_study_plan and update_learner_profile', async () => {
      let proposedPlan = null;
      let proposedProfile = null;

      const planMessages = [{ role: 'user', content: 'Lập lộ trình học tiếng Anh cho tôi' }];
      for await (const chunk of geminiService.generateChatResponseStream({
        messages: planMessages,
        appContext: {},
        onProposeStudyPlan: (plan) => {
          proposedPlan = plan;
        },
      })) {
        expect(chunk).toBeDefined();
      }

      expect(proposedPlan).not.toBeNull();
      expect(proposedPlan.yearGoal).toBeDefined();
      expect(proposedPlan.monthGoals.length).toBeGreaterThan(0);
      expect(proposedPlan.weekGoals.length).toBeGreaterThan(0);
      expect(proposedPlan.tasks.length).toBeGreaterThan(0);

      const profileMessages = [{ role: 'user', content: 'Mục tiêu của tôi là đạt IELTS 7.0, trình độ B1' }];
      for await (const chunk of geminiService.generateChatResponseStream({
        messages: profileMessages,
        appContext: {},
        onUpdateLearnerProfile: (profile) => {
          proposedProfile = profile;
        },
      })) {
        expect(chunk).toBeDefined();
      }

      expect(proposedProfile).not.toBeNull();
      expect(proposedProfile.level).toBeDefined();
      expect(proposedProfile.targetGoal).toBeDefined();
    });
  });
});
