import { Deck, Card, ReviewLog } from '../models/index.js';
import { User } from '../../../models/user.model.js';
import { calculateNextReview, previewNextIntervals } from '../services/srs.service.js';
import { syncDailyReviewTask, onCardReviewed } from '../services/learnTaskSync.service.js';
import { sendSuccess, sendError, AppError } from '../../../utils/response.js';

/**
 * GET /api/v1/learn/settings
 * Retrieve user's flashcard & SRS study settings.
 */
export const getLearnSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('settings');
    const learnSettings = {
      maxNewCardsPerDay: 20,
      maxReviewCardsPerDay: 100,
      defaultDirection: 'en_to_vi',
      enableTypingMode: false,
      ...(user?.settings?.learn ? user.settings.learn.toObject?.() || user.settings.learn : {}),
    };

    return sendSuccess(res, learnSettings);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/learn/settings
 * Update user's flashcard & SRS study settings.
 */
export const updateLearnSettings = async (req, res, next) => {
  try {
    const { maxNewCardsPerDay, maxReviewCardsPerDay, defaultDirection, enableTypingMode } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new AppError('User not found', 404, 'NOT_FOUND'));
    }

    if (!user.settings) user.settings = {};
    if (!user.settings.learn) {
      user.settings.learn = {
        maxNewCardsPerDay: 20,
        maxReviewCardsPerDay: 100,
        defaultDirection: 'en_to_vi',
        enableTypingMode: false,
      };
    }

    if (maxNewCardsPerDay !== undefined) user.settings.learn.maxNewCardsPerDay = maxNewCardsPerDay;
    if (maxReviewCardsPerDay !== undefined) user.settings.learn.maxReviewCardsPerDay = maxReviewCardsPerDay;
    if (defaultDirection !== undefined) user.settings.learn.defaultDirection = defaultDirection;
    if (enableTypingMode !== undefined) user.settings.learn.enableTypingMode = enableTypingMode;

    await user.save();

    const updated = {
      maxNewCardsPerDay: user.settings.learn.maxNewCardsPerDay,
      maxReviewCardsPerDay: user.settings.learn.maxReviewCardsPerDay,
      defaultDirection: user.settings.learn.defaultDirection,
      enableTypingMode: user.settings.learn.enableTypingMode,
    };

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/learn/review/queue?deckId=&limit=
 * Retrieves flashcards queued for review, prioritized by due cards first, then new cards,
 * respecting daily limits from user settings.
 */
export const getReviewQueue = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { deckId, limit } = req.query;

    await syncDailyReviewTask(userId);

    // Load user settings
    const user = await User.findById(userId).select('settings');
    const maxNew = user?.settings?.learn?.maxNewCardsPerDay ?? 20;
    const maxReview = user?.settings?.learn?.maxReviewCardsPerDay ?? 100;

    // Calculate start of current day (midnight local server time)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Count cards already reviewed today
    const logsToday = await ReviewLog.find({
      userId,
      reviewedAt: { $gte: startOfToday },
    }).select('prevInterval rating');

    let newReviewedToday = 0;
    let reviewReviewedToday = 0;
    for (const log of logsToday) {
      if (log.prevInterval === 0) {
        newReviewedToday++;
      } else {
        reviewReviewedToday++;
      }
    }

    const remainingNewQuota = Math.max(0, maxNew - newReviewedToday);
    const remainingReviewQuota = Math.max(0, maxReview - reviewReviewedToday);

    const baseFilter = {
      userId,
      'srs.status': { $ne: 'suspended' },
    };
    if (deckId) {
      const deck = await Deck.findOne({ _id: deckId, userId });
      if (!deck) {
        return next(new AppError('Deck not found', 404, 'NOT_FOUND'));
      }
      baseFilter.deckId = deckId;
    }

    // 1. Due Cards: cards with status learning/review whose dueDate <= now
    const dueFilter = {
      ...baseFilter,
      'srs.status': { $in: ['learning', 'review'] },
      'srs.dueDate': { $lte: now },
    };
    const dueCount = await Card.countDocuments(dueFilter);

    // 2. New Cards: cards with status new
    const newFilter = {
      ...baseFilter,
      'srs.status': 'new',
    };
    const newCount = await Card.countDocuments(newFilter);

    // Fetch due cards (up to remaining quota)
    const dueCards = remainingReviewQuota > 0
      ? await Card.find(dueFilter)
          .populate('deckId', 'name color')
          .sort({ 'srs.dueDate': 1 })
          .limit(remainingReviewQuota)
      : [];

    // Fetch new cards (up to remaining quota)
    const newCards = remainingNewQuota > 0
      ? await Card.find(newFilter)
          .populate('deckId', 'name color')
          .sort({ createdAt: 1 })
          .limit(remainingNewQuota)
      : [];

    let queue = [...dueCards, ...newCards];
    if (limit && Number(limit) > 0 && queue.length > Number(limit)) {
      queue = queue.slice(0, Number(limit));
    }

    // Attach next review preview intervals to each card for instant button hints
    const queueWithPreviews = queue.map((card) => {
      const cardObj = card.toObject();
      cardObj.nextReviews = previewNextIntervals(card.srs, now);
      return cardObj;
    });

    return sendSuccess(res, {
      queue: queueWithPreviews,
      dueCount,
      newCount,
      totalInQueue: queueWithPreviews.length,
      dailyStats: {
        newReviewedToday,
        reviewReviewedToday,
        maxNewCardsPerDay: maxNew,
        maxReviewCardsPerDay: maxReview,
        remainingNewQuota,
        remainingReviewQuota,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/learn/review/answer
 * Applies SM-2 algorithm to card, logs review entry, and returns updated card.
 */
export const answerCard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { cardId, rating, durationMs = 0 } = req.body;

    const card = await Card.findOne({ _id: cardId, userId });
    if (!card) {
      return next(new AppError('Card not found', 404, 'NOT_FOUND'));
    }

    if (card.srs?.status === 'suspended') {
      return next(new AppError('Cannot review a suspended card', 400, 'CARD_SUSPENDED'));
    }

    const prevInterval = card.srs?.intervalDays || 0;
    const nextSrs = calculateNextReview(card.srs, rating);

    card.srs = nextSrs;
    await card.save();

    const log = await ReviewLog.create({
      userId,
      cardId: card._id,
      rating: Number(rating),
      prevInterval,
      newInterval: nextSrs.intervalDays,
      durationMs: Number(durationMs) || 0,
      reviewedAt: nextSrs.lastReviewedAt,
    });

    const populated = await Card.findById(card._id).populate('deckId', 'name color');
    const populatedObj = populated.toObject();
    populatedObj.nextReviews = previewNextIntervals(populated.srs, new Date());

    await onCardReviewed(userId);

    return sendSuccess(res, {
      card: populatedObj,
      nextReview: {
        intervalDays: nextSrs.intervalDays,
        dueDate: nextSrs.dueDate,
        status: nextSrs.status,
        easeFactor: nextSrs.easeFactor,
        repetitions: nextSrs.repetitions,
        lapses: nextSrs.lapses,
      },
      logId: log._id,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/learn/stats
 * Aggregates statistics: word status distribution, retention rate, leech cards,
 * 7-day review forecast, and learning source distribution.
 */
export const getLearnStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Status distribution
    const statusAgg = await Card.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$srs.status',
          count: { $sum: 1 },
        },
      },
    ]);

    const byStatus = { new: 0, learning: 0, review: 0, suspended: 0 };
    let totalCards = 0;
    for (const item of statusAgg) {
      if (item._id && byStatus[item._id] !== undefined) {
        byStatus[item._id] = item.count;
      }
      totalCards += item.count;
    }

    // 2. Retention rate from ReviewLog
    const ratingAgg = await ReviewLog.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ]);

    let totalReviews = 0;
    let successfulReviews = 0;
    const ratingsBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const item of ratingAgg) {
      const r = Number(item._id);
      totalReviews += item.count;
      if (ratingsBreakdown[r] !== undefined) {
        ratingsBreakdown[r] = item.count;
      }
      if (r === 3 || r === 4) {
        successfulReviews += item.count;
      }
    }
    const retentionRate = totalReviews > 0 ? Math.round((successfulReviews / totalReviews) * 100) : 0;

    // 3. Leech Cards (lapses >= 3)
    const leechCards = await Card.find({
      userId,
      'srs.lapses': { $gte: 3 },
    })
      .populate('deckId', 'name color')
      .sort({ 'srs.lapses': -1, updatedAt: -1 })
      .limit(20);

    // 4. 7-day Review Forecast
    const now = new Date();
    const forecast = [];
    const dayNamesVi = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const startOfDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999);
      const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(
        dayDate.getDate()
      ).padStart(2, '0')}`;

      let count = 0;
      if (i === 0) {
        // Today includes any overdue review cards
        count = await Card.countDocuments({
          userId,
          'srs.status': { $in: ['learning', 'review'] },
          'srs.dueDate': { $lte: endOfDay },
        });
      } else {
        count = await Card.countDocuments({
          userId,
          'srs.status': { $in: ['learning', 'review'] },
          'srs.dueDate': { $gte: startOfDay, $lte: endOfDay },
        });
      }

      forecast.push({
        date: dateStr,
        dayOfWeek: dayDate.getDay(),
        labelVi: i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : dayNamesVi[dayDate.getDay()],
        labelEn: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayNamesEn[dayDate.getDay()],
        dueCount: count,
      });
    }

    // 5. Source distribution
    const sourceAgg = await Card.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: {
            $let: {
              vars: {
                trimmed: { $trim: { input: { $ifNull: ['$source', ''] } } },
              },
              in: {
                $cond: [{ $eq: ['$$trimmed', ''] }, 'Khác', '$$trimmed'],
              },
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const bySource = sourceAgg.map((s) => ({
      source: s._id || 'Khác',
      count: s.count,
    }));

    return sendSuccess(res, {
      totalCards,
      byStatus,
      retentionRate,
      totalReviews,
      successfulReviews,
      ratingsBreakdown,
      leechCards,
      forecast,
      bySource,
    });
  } catch (err) {
    next(err);
  }
};
