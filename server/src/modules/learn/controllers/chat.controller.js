import path from 'path';
import fs from 'fs';
import { Conversation, Message, AiUsage, Deck, Card, UploadedFile, LearnerProfile } from '../models/index.js';
import { Goal } from '../../../models/goal.model.js';
import { Task } from '../../../models/task.model.js';
import { recalculateGoalProgress } from '../../../services/progress.service.js';
import { geminiService } from '../services/gemini.service.js';
import { fileService } from '../services/file.service.js';
import { syncDailyReviewTask, syncLearnGoals } from '../services/learnTaskSync.service.js';
import { env } from '../../../config/env.js';
import { sendSuccess, sendError, AppError } from '../../../utils/response.js';

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Get all conversations for current user, sorted by pinned first, then newest.
 */
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { search } = req.query;

    const filter = { userId };
    if (search && search.trim()) {
      filter.title = { $regex: escapeRegex(search.trim()), $options: 'i' };
    }

    const conversations = await Conversation.find(filter).sort({ pinned: -1, updatedAt: -1 });

    return sendSuccess(res, conversations);
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new conversation.
 */
export const createConversation = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { title } = req.body;

    const conversation = await Conversation.create({
      userId,
      title: title?.trim() || 'Cuộc trò chuyện mới',
    });

    return sendSuccess(res, conversation, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Update conversation title or toggle pinned.
 */
export const updateConversation = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { title, pinned } = req.body;

    const conversation = await Conversation.findOne({ _id: id, userId });
    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (title !== undefined) {
      conversation.title = title.trim();
    }
    if (pinned !== undefined) {
      conversation.pinned = Boolean(pinned);
    }

    await conversation.save();

    return sendSuccess(res, conversation);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a conversation, cascade delete all its messages, and unlink attached files.
 */
export const deleteConversation = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const conversation = await Conversation.findOne({ _id: id, userId });
    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    // Cleanup physical files attached to messages in this conversation
    await fileService.cleanupConversationFiles(id, userId);

    // Cascade delete all messages
    const deleteResult = await Message.deleteMany({ conversationId: id, userId });
    await Conversation.deleteOne({ _id: id, userId });

    return sendSuccess(res, {
      deletedConversationId: id,
      deletedMessagesCount: deleteResult.deletedCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get messages in a conversation.
 */
export const getMessages = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const conversation = await Conversation.findOne({ _id: id, userId });
    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    const messages = await Message.find({ conversationId: id, userId }).sort({ createdAt: 1, _id: 1 });

    return sendSuccess(res, messages);
  } catch (err) {
    next(err);
  }
};

/**
 * Post a user message (with optional attachments) and stream assistant reply via SSE.
 */
export const sendMessageStream = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { content = '', attachments = [] } = req.body;

    const conversation = await Conversation.findOne({ _id: id, userId });
    if (!conversation) {
      return sendError(res, 'Conversation not found', 404, 'NOT_FOUND');
    }

    // 1. Check daily AI request quota & token limits
    const todayStr = new Date().toISOString().slice(0, 10);
    const usage = await AiUsage.findOne({ userId, date: todayStr });
    const maxRequests = env.MAX_DAILY_CHAT_REQUESTS || env.AI_DAILY_QUOTA_REQUESTS || 50;
    if (usage && usage.requests >= maxRequests) {
      return sendError(
        res,
        `Bạn đã đạt giới hạn ${maxRequests} tin nhắn AI hôm nay. Vui lòng quay lại vào ngày mai!`,
        429,
        'AI_QUOTA_EXCEEDED'
      );
    }
    if (usage && env.MAX_DAILY_INPUT_TOKENS && usage.inputTokens >= env.MAX_DAILY_INPUT_TOKENS) {
      return sendError(
        res,
        `Bạn đã đạt giới hạn token đầu vào (${env.MAX_DAILY_INPUT_TOKENS}) trong ngày hôm nay. Vui lòng quay lại vào ngày mai!`,
        429,
        'AI_TOKEN_QUOTA_EXCEEDED'
      );
    }
    if (usage && env.MAX_DAILY_OUTPUT_TOKENS && usage.outputTokens >= env.MAX_DAILY_OUTPUT_TOKENS) {
      return sendError(
        res,
        `Bạn đã đạt giới hạn token đầu ra (${env.MAX_DAILY_OUTPUT_TOKENS}) trong ngày hôm nay. Vui lòng quay lại vào ngày mai!`,
        429,
        'AI_OUTPUT_TOKEN_QUOTA_EXCEEDED'
      );
    }

    // Lookup physical storage paths for attachments to feed into multimodal Gemini
    let verifiedAttachments = [];
    let attachmentsWithPaths = [];
    if (attachments && attachments.length > 0) {
      const fileIds = attachments.map((a) => a.fileId).filter(Boolean);
      const foundFiles = await UploadedFile.find({ _id: { $in: fileIds }, userId }).lean();
      const fileMap = new Map(foundFiles.map((f) => [f._id.toString(), f]));

      for (const att of attachments) {
        const dbFile = fileMap.get(att.fileId);
        if (dbFile) {
          verifiedAttachments.push({
            fileId: att.fileId,
            name: att.name || dbFile.originalName,
            mime: att.mime || dbFile.mime,
            size: att.size || dbFile.size,
          });
          attachmentsWithPaths.push({
            ...att,
            storagePath: dbFile.storagePath,
          });
        }
      }
    }

    // 2. Save user message
    const cleanContent = content
      ? content.trim()
      : verifiedAttachments.length > 0
        ? `Đính kèm ${verifiedAttachments.length} tệp: ${verifiedAttachments.map((a) => a.name).join(', ')}`
        : '';
    await Message.create({
      conversationId: id,
      userId,
      role: 'user',
      content: cleanContent,
      attachments: verifiedAttachments,
    });

    // Auto-update conversation title from default if it's new
    const isDefaultTitle =
      !conversation.title ||
      conversation.title === 'Cuộc trò chuyện mới' ||
      conversation.title === 'New conversation' ||
      conversation.title === 'New Conversation';

    if (isDefaultTitle) {
      const titleCandidate = cleanContent || (attachments[0]?.name ? `Tệp: ${attachments[0].name}` : 'Cuộc trò chuyện mới');
      const cleanSnippet = titleCandidate.replace(/\s+/g, ' ').slice(0, 36);
      conversation.title = cleanSnippet.length >= 36 ? `${cleanSnippet}...` : cleanSnippet;
      await conversation.save();
    }

    // 3. Fetch all messages in conversation for context & rolling summary
    const allMessages = await Message.find({ conversationId: id, userId }).sort({ createdAt: 1 });

    // Two-tiered memory: Keep last 10 messages verbatim
    if (allMessages.length > 10) {
      const olderMessages = allMessages.slice(0, allMessages.length - 10);

      let unsummarized = olderMessages;
      if (conversation.summaryUpToMessageId) {
        const lastIdx = olderMessages.findIndex(
          (m) => m._id.toString() === conversation.summaryUpToMessageId.toString()
        );
        if (lastIdx !== -1) {
          unsummarized = olderMessages.slice(lastIdx + 1);
        }
      }

      if (unsummarized.length > 0) {
        const newSummary = await geminiService.generateSummary({
          previousSummary: conversation.summary,
          messagesToSummarize: unsummarized,
        });

        conversation.summary = newSummary;
        conversation.summaryUpToMessageId = unsummarized[unsummarized.length - 1]._id;
        await conversation.save();
      }
    }

    const recentMessages = allMessages.slice(-10);

    // 4. Gather app context
    const appContext = await geminiService.getUserAppContext(userId);

    // 5. Setup SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    let fullContent = '';
    let proposedCards = [];
    let proposedStudyPlan = null;
    let proposedProfileUpdate = null;

    const buildToolCalls = () => {
      const calls = [];
      if (proposedCards && proposedCards.length > 0) {
        calls.push({ name: 'propose_cards', args: { cards: proposedCards } });
      }
      if (proposedStudyPlan) {
        calls.push({ name: 'propose_study_plan', args: { plan: proposedStudyPlan } });
      }
      if (proposedProfileUpdate) {
        calls.push({ name: 'update_learner_profile', args: { profile: proposedProfileUpdate } });
      }
      return calls;
    };

    // Handle client abort gracefully
    let clientDisconnected = false;
    req.on('close', () => {
      clientDisconnected = true;
    });

    try {
      for await (const chunk of geminiService.generateChatResponseStream({
        messages: recentMessages,
        appContext,
        summary: conversation.summary,
        attachments: attachmentsWithPaths,
        onProposeCards: (cards) => {
          proposedCards = cards;
          res.write(`event: propose_cards\ndata: ${JSON.stringify({ cards })}\n\n`);
        },
        onProposeStudyPlan: (plan) => {
          proposedStudyPlan = plan;
          res.write(`event: propose_study_plan\ndata: ${JSON.stringify({ plan })}\n\n`);
        },
        onUpdateLearnerProfile: (profile) => {
          proposedProfileUpdate = profile;
          res.write(`event: update_learner_profile\ndata: ${JSON.stringify({ profile })}\n\n`);
        },
      })) {
        if (clientDisconnected) break;
        fullContent += chunk;
        res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
      }

      if (clientDisconnected) {
        if (fullContent.trim().length > 0) {
          const inputTokens = Math.max(10, Math.ceil((cleanContent.length + (conversation.summary?.length || 0)) / 4));
          const outputTokens = Math.max(5, Math.ceil(fullContent.length / 4));

          await Message.create({
            conversationId: id,
            userId,
            role: 'assistant',
            content: fullContent.trim(),
            toolCalls: buildToolCalls(),
            tokenUsage: {
              input: inputTokens,
              output: outputTokens,
            },
          });

          await AiUsage.findOneAndUpdate(
            { userId, date: todayStr },
            {
              $inc: {
                requests: 1,
                inputTokens,
                outputTokens,
              },
            },
            { upsert: true, new: true }
          );

          conversation.updatedAt = new Date();
          await conversation.save();
        }
        res.end();
        return;
      }

      // 6. Save assistant message
      const inputTokens = Math.max(10, Math.ceil((cleanContent.length + (conversation.summary?.length || 0)) / 4));
      const outputTokens = Math.max(10, Math.ceil(fullContent.length / 4));

      const toolCalls = buildToolCalls();

      const assistantMsg = await Message.create({
        conversationId: id,
        userId,
        role: 'assistant',
        content: fullContent,
        toolCalls,
        tokenUsage: {
          input: inputTokens,
          output: outputTokens,
        },
      });

      // 7. Increment AiUsage
      await AiUsage.findOneAndUpdate(
        { userId, date: todayStr },
        {
          $inc: {
            requests: 1,
            inputTokens,
            outputTokens,
          },
        },
        { upsert: true, new: true }
      );

      // Touch conversation updatedAt
      conversation.updatedAt = new Date();
      await conversation.save();

      // 8. Send SSE done event
      res.write(
        `event: done\ndata: ${JSON.stringify({
          messageId: assistantMsg._id,
          content: fullContent,
          toolCalls: assistantMsg.toolCalls,
          usage: assistantMsg.tokenUsage,
        })}\n\n`
      );
      res.end();
    } catch (streamErr) {
      console.error('[ChatController] Stream error:', streamErr);
      res.write(`event: error\ndata: ${JSON.stringify({ message: streamErr.message || 'Stream processing failed' })}\n\n`);
      res.end();
    }
  } catch (err) {
    if (!res.headersSent) {
      next(err);
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
      res.end();
    }
  }
};

/**
 * Submit feedback on a message (thumbs_up, thumbs_down, or null).
 */
export const updateMessageFeedback = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { feedback } = req.body;

    const message = await Message.findOne({ _id: id, userId });
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    message.feedback = feedback;
    await message.save();

    return sendSuccess(res, message);
  } catch (err) {
    next(err);
  }
};

/**
 * Get user AI daily usage stats.
 */
export const getAiUsage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const todayStr = new Date().toISOString().slice(0, 10);

    const usage = await AiUsage.findOne({ userId, date: todayStr });
    const used = usage ? usage.requests : 0;
    const limit = env.AI_DAILY_QUOTA_REQUESTS;
    const remaining = Math.max(0, limit - used);

    return sendSuccess(res, {
      limit,
      used,
      remaining,
      date: todayStr,
      inputTokens: usage?.inputTokens || 0,
      outputTokens: usage?.outputTokens || 0,
      maxInputTokens: env.MAX_DAILY_INPUT_TOKENS || 100000,
      maxOutputTokens: env.MAX_DAILY_OUTPUT_TOKENS || 50000,
    });
  } catch (err) {
    next(err);
  }
};

// ======================================================================
// GIAI ĐOẠN 12: FILE ATTACHMENTS & CARD ACTIONS
// ======================================================================

/**
 * Upload one or multiple files (multipart/form-data).
 * POST /api/v1/chat/files
 */
export const uploadFiles = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const rawFiles = req.files || (req.file ? [req.file] : []);

    const savedFiles = await fileService.processAndSaveFiles(rawFiles, userId);

    return sendSuccess(res, savedFiles, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * View or download an uploaded file attachment.
 * GET /api/v1/chat/files/:id
 * Strict authorization: Only the owner user can access their files.
 */
export const getFile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const { status, file, error } = await fileService.getFileRecord(id, userId);
    if (status !== 200 || !file) {
      return sendError(res, error || 'File not found', status, status === 403 ? 'FORBIDDEN' : 'NOT_FOUND');
    }

    const resolvedPath = path.resolve(file.storagePath);
    if (!fs.existsSync(resolvedPath)) {
      return sendError(res, 'Tệp vật lý không tồn tại trên hệ thống', 404, 'NOT_FOUND');
    }

    const safeAsciiName = file.originalName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '');
    const encodedName = encodeURIComponent(file.originalName);

    res.setHeader('Content-Type', file.mime);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${safeAsciiName}"; filename*=UTF-8''${encodedName}`
    );

    return res.sendFile(resolvedPath);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete an uploaded file attachment.
 * DELETE /api/v1/chat/files/:id
 */
export const deleteFile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const result = await fileService.deleteFileRecord(id, userId);

    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

/**
 * Action: Add proposed cards directly into a target deck.
 * POST /api/v1/chat/actions/add-cards
 */
export const addCardsAction = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { deckId, cards } = req.body;

    // Verify deck ownership
    const deck = await Deck.findOne({ _id: deckId, userId });
    if (!deck) {
      throw new AppError('Bộ thẻ không tồn tại hoặc bạn không có quyền truy cập', 404);
    }

    // Create cards with default initial SRS settings
    const cardDocs = cards.map((c) => ({
      userId,
      deckId,
      word: c.word.trim(),
      meaning: c.meaning.trim(),
      partOfSpeech: c.partOfSpeech || 'other',
      example: c.example ? c.example.trim() : '',
      note: c.note ? c.note.trim() : '',
      source: c.source ? c.source.trim() : 'ai_chat',
      tags: ['ai_extracted'],
      srs: {
        status: 'new',
        intervalDays: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        dueDate: new Date(),
        lastReviewedAt: null,
      },
    }));

    const createdCards = await Card.insertMany(cardDocs);

    // Sync review task & learn-linked numeric goals
    await syncDailyReviewTask(userId);
    await syncLearnGoals(userId);

    return sendSuccess(
      res,
      {
        addedCount: createdCards.length,
        cards: createdCards,
      },
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/chat/profile
 * Get learner profile, auto-creating a default profile if none exists.
 */
export const getLearnerProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let profile = await LearnerProfile.findOne({ userId });
    if (!profile) {
      profile = await LearnerProfile.create({
        userId,
        level: 'Intermediate (B1)',
        targetGoal: '',
        targetDate: null,
        dailyMinutes: 30,
        weaknesses: [],
        interests: [],
        notes: '',
      });
    }
    return sendSuccess(res, profile);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/chat/profile
 * Update learner profile.
 */
export const updateLearnerProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { level, targetGoal, targetDate, dailyMinutes, weaknesses, interests, notes } = req.body;

    let profile = await LearnerProfile.findOne({ userId });
    if (!profile) {
      profile = new LearnerProfile({ userId });
    }

    if (level !== undefined) profile.level = level;
    if (targetGoal !== undefined) profile.targetGoal = targetGoal;
    if (targetDate !== undefined) profile.targetDate = targetDate;
    if (dailyMinutes !== undefined) profile.dailyMinutes = dailyMinutes;
    if (weaknesses !== undefined) profile.weaknesses = weaknesses;
    if (interests !== undefined) profile.interests = interests;
    if (notes !== undefined) profile.notes = notes;

    await profile.save();
    return sendSuccess(res, profile);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/chat/profile
 * Reset learner profile to defaults ("Forget all").
 */
export const resetLearnerProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await LearnerProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          level: 'Intermediate (B1)',
          targetGoal: '',
          targetDate: null,
          dailyMinutes: 30,
          weaknesses: [],
          interests: [],
          notes: '',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return sendSuccess(res, profile);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/chat/actions/apply-plan
 * Persists a hierarchical study plan (Year -> Month -> Week -> Task) into GoalCalendar DB.
 */
export const applyPlanAction = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { yearGoal, monthGoals = [], weekGoals = [], tasks = [] } = req.body;

    let createdYearGoal = null;
    let rootGoalId = null;
    let createdGoalsCount = 0;
    let createdTasksCount = 0;

    const now = new Date();

    // 1. Create Year Goal if provided
    if (yearGoal && yearGoal.title) {
      const sDate = yearGoal.startDate ? new Date(yearGoal.startDate) : now;
      let eDate = yearGoal.endDate
        ? new Date(yearGoal.endDate)
        : new Date(sDate.getTime() + 365 * 24 * 60 * 60 * 1000);
      if (eDate <= sDate) {
        eDate = new Date(sDate.getTime() + 365 * 24 * 60 * 60 * 1000);
      }

      createdYearGoal = await Goal.create({
        userId,
        title: yearGoal.title.trim(),
        description: yearGoal.description ? yearGoal.description.trim() : '',
        type: 'year',
        startDate: sDate,
        endDate: eDate,
        priority: yearGoal.priority || 'medium',
        color: yearGoal.color || '#6366f1',
        parentId: null,
      });
      rootGoalId = createdYearGoal._id;
      createdGoalsCount++;
    }

    // 2. Create Month Goals
    const createdMonthGoals = [];
    for (let i = 0; i < monthGoals.length; i++) {
      const mg = monthGoals[i];
      const offsetMs = i * 30 * 24 * 60 * 60 * 1000;
      const baseStart = createdYearGoal ? createdYearGoal.startDate : now;
      const sDate = mg.startDate
        ? new Date(mg.startDate)
        : new Date(baseStart.getTime() + offsetMs);
      let eDate = mg.endDate
        ? new Date(mg.endDate)
        : new Date(sDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (eDate <= sDate) {
        eDate = new Date(sDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      }

      const monthDoc = await Goal.create({
        userId,
        title: mg.title.trim(),
        description: mg.description ? mg.description.trim() : '',
        type: 'month',
        startDate: sDate,
        endDate: eDate,
        priority: mg.priority || 'medium',
        color: mg.color || '#3b82f6',
        weight: typeof mg.weight === 'number' ? mg.weight : 1,
        parentId: createdYearGoal ? createdYearGoal._id : null,
      });
      createdMonthGoals.push(monthDoc);
      createdGoalsCount++;
      if (!rootGoalId) {
        rootGoalId = monthDoc._id;
      }
    }

    // 3. Create Week Goals
    const createdWeekGoals = [];
    for (let j = 0; j < weekGoals.length; j++) {
      const wg = weekGoals[j];
      let parentMonthId = null;
      if (typeof wg.monthGoalIndex === 'number' && createdMonthGoals[wg.monthGoalIndex]) {
        parentMonthId = createdMonthGoals[wg.monthGoalIndex]._id;
      } else if (createdMonthGoals.length > 0) {
        parentMonthId = createdMonthGoals[0]._id;
      } else if (createdYearGoal) {
        parentMonthId = createdYearGoal._id;
      }

      const parentDoc =
        (typeof wg.monthGoalIndex === 'number' && createdMonthGoals[wg.monthGoalIndex]) ||
        createdMonthGoals[0] ||
        createdYearGoal;
      const weekOffsetMs = (j % 4) * 7 * 24 * 60 * 60 * 1000;
      const baseWeekStart = parentDoc ? parentDoc.startDate : now;
      const sDate = wg.startDate
        ? new Date(wg.startDate)
        : new Date(baseWeekStart.getTime() + weekOffsetMs);
      let eDate = wg.endDate
        ? new Date(wg.endDate)
        : new Date(sDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (eDate <= sDate) {
        eDate = new Date(sDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      }

      const weekDoc = await Goal.create({
        userId,
        title: wg.title.trim(),
        description: wg.description ? wg.description.trim() : '',
        type: 'week',
        startDate: sDate,
        endDate: eDate,
        priority: wg.priority || 'medium',
        color: '#10b981',
        weight: typeof wg.weight === 'number' ? wg.weight : 1,
        parentId: parentMonthId,
      });
      createdWeekGoals.push(weekDoc);
      createdGoalsCount++;
      if (!rootGoalId) {
        rootGoalId = weekDoc._id;
      }
    }

    // 4. Create Tasks
    for (let k = 0; k < tasks.length; k++) {
      const t = tasks[k];
      let assignedGoalId = null;
      if (typeof t.weekGoalIndex === 'number' && createdWeekGoals[t.weekGoalIndex]) {
        assignedGoalId = createdWeekGoals[t.weekGoalIndex]._id;
      } else if (createdWeekGoals.length > 0) {
        assignedGoalId = createdWeekGoals[0]._id;
      } else if (createdMonthGoals.length > 0) {
        assignedGoalId = createdMonthGoals[0]._id;
      } else if (createdYearGoal) {
        assignedGoalId = createdYearGoal._id;
      }

      const parentWeek =
        (typeof t.weekGoalIndex === 'number' && createdWeekGoals[t.weekGoalIndex]) ||
        createdWeekGoals[0];
      const dueDate = t.dueDate
        ? new Date(t.dueDate)
        : (parentWeek ? parentWeek.endDate : now);

      await Task.create({
        userId,
        title: t.title.trim(),
        notes: t.notes ? t.notes.trim() : '',
        goalId: assignedGoalId,
        dueDate,
        dueTime: t.dueTime || null,
        priority: t.priority || 'medium',
        subtasks: Array.isArray(t.subtasks)
          ? t.subtasks
              .map((st) => ({
                title: typeof st === 'string' ? st.trim() : (st && st.title ? st.title.trim() : ''),
                done: Boolean(st && st.done),
              }))
              .filter((st) => st.title.length > 0)
          : [],
      });
      createdTasksCount++;
    }

    // 5. Trigger recalculateGoalProgress bottom-up without redundant cascades
    const recalculatedGoalIds = new Set();

    if (createdWeekGoals.length > 0) {
      for (const wg of createdWeekGoals) {
        await recalculateGoalProgress(wg._id, userId, 'Tạo kế hoạch học tập mới từ AI');
        recalculatedGoalIds.add(wg._id.toString());
      }
    }

    // For any month goals that have no week goals (e.g. standalone months or tasks attached directly)
    for (const mg of createdMonthGoals) {
      const hasChildWeek = createdWeekGoals.some(
        (wg) => wg.parentId && wg.parentId.toString() === mg._id.toString()
      );
      if (!hasChildWeek && !recalculatedGoalIds.has(mg._id.toString())) {
        await recalculateGoalProgress(mg._id, userId, 'Tạo kế hoạch học tập mới từ AI');
        recalculatedGoalIds.add(mg._id.toString());
      }
    }

    // If year goal has no month or week goals
    if (createdYearGoal && createdMonthGoals.length === 0 && createdWeekGoals.length === 0) {
      await recalculateGoalProgress(createdYearGoal._id, userId, 'Tạo kế hoạch học tập mới từ AI');
    }

    return sendSuccess(
      res,
      {
        createdGoalsCount,
        createdTasksCount,
        rootGoalId,
      },
      201
    );
  } catch (err) {
    next(err);
  }
};
