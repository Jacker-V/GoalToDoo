import mongoose from 'mongoose';
import { Card, ReviewLog } from '../models/index.js';
import { Task } from '../../../models/task.model.js';
import { Goal } from '../../../models/goal.model.js';
import { recalculateGoalProgress } from '../../../services/progress.service.js';

/**
 * Format a Date to 'YYYY-MM-DD' in local time.
 */
function formatDateLocal(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parse date parameter safely into local calendar day boundaries.
 */
function parseDateParam(date) {
  if (!date) return new Date();
  if (date instanceof Date) return date;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  return new Date(date);
}

/**
 * Computes ISO timezone offset string (e.g. '+07:00' or '-05:00') for aggregation grouping.
 */
function getTimezoneOffsetString(date = new Date()) {
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const hours = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, '0');
  const minutes = String(Math.abs(offsetMin) % 60).padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}

/**
 * Synchronize daily learn review task for a user.
 * If there are flashcards due today (or cards reviewed today), creates or updates a system task.
 * Automatically marks the task as completed when review target is met.
 * Cleans up phantom tasks if all due cards were suspended or removed without reviews.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {Date|string} [date=new Date()]
 * @returns {Promise<Object|null>} The system review task, or null if no cards due.
 */
export async function syncDailyReviewTask(userId, date = new Date()) {
  if (!userId) return null;

  const d = parseDateParam(date);
  const startOfToday = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const dateStr = formatDateLocal(d);

  // 1. Count cards currently due today
  const dueCardsCount = await Card.countDocuments({
    userId,
    'srs.status': { $ne: 'suspended' },
    'srs.dueDate': { $lte: endOfToday },
  });

  // 2. Count cards reviewed today
  const reviewedTodayCount = await ReviewLog.countDocuments({
    userId,
    reviewedAt: { $gte: startOfToday, $lte: endOfToday },
  });

  // 3. Find existing system task for this day
  let task = await Task.findOne({
    userId,
    source: 'system',
    linkedModule: 'learn',
    'metadata.date': dateStr,
  });

  if (!task) {
    // Only create a new task if there are due cards or cards reviewed today
    if (dueCardsCount > 0 || reviewedTodayCount > 0) {
      const targetCount = dueCardsCount + reviewedTodayCount;
      const isCompleted = targetCount > 0 && reviewedTodayCount >= targetCount;

      try {
        task = await Task.create({
          userId,
          title: `Ôn tập ${targetCount} từ vựng đến hạn`,
          dueDate: endOfToday,
          source: 'system',
          linkedModule: 'learn',
          priority: 'high',
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          metadata: {
            date: dateStr,
            targetCount,
            completedCount: reviewedTodayCount,
            targetReviewCount: targetCount,
            completedReviewCount: reviewedTodayCount,
          },
        });
      } catch (err) {
        if (err.code === 11000) {
          task = await Task.findOne({
            userId,
            source: 'system',
            linkedModule: 'learn',
            'metadata.date': dateStr,
          });
        } else {
          throw err;
        }
      }

      if (task?.goalId && isCompleted) {
        await recalculateGoalProgress(task.goalId, userId, 'Tự động hoàn thành task ôn tập');
      }
    }
  } else {
    // If no cards are due AND no cards were reviewed today (e.g. cards suspended or deleted)
    if (dueCardsCount === 0 && reviewedTodayCount === 0) {
      if (!task.isCompleted) {
        await Task.deleteOne({ _id: task._id });
        return null;
      }
    }

    // Determine target count:
    // If cards are still due, target expands to accommodate all due cards.
    // If no cards are currently due, target is locked to the original target or reviews completed.
    const prevTarget = task.metadata?.targetCount || 0;
    let targetCount;
    if (dueCardsCount > 0) {
      targetCount = Math.max(prevTarget, dueCardsCount + reviewedTodayCount);
    } else {
      if (prevTarget > 0 && reviewedTodayCount >= prevTarget) {
        targetCount = prevTarget;
      } else if (reviewedTodayCount > 0) {
        targetCount = reviewedTodayCount;
      } else {
        targetCount = 0;
      }
    }

    const wasCompleted = task.isCompleted;
    const isNowCompleted = targetCount > 0 && reviewedTodayCount >= targetCount;

    task.metadata = {
      ...task.metadata,
      date: dateStr,
      targetCount,
      completedCount: reviewedTodayCount,
      targetReviewCount: targetCount,
      completedReviewCount: reviewedTodayCount,
    };
    task.title = `Ôn tập ${targetCount} từ vựng đến hạn`;

    let shouldRecalculateGoal = false;
    if (!wasCompleted && isNowCompleted) {
      task.isCompleted = true;
      task.completedAt = task.completedAt || new Date();
      if (task.goalId) {
        shouldRecalculateGoal = true;
      }
    } else if (wasCompleted && !isNowCompleted) {
      task.isCompleted = false;
      task.completedAt = null;
      if (task.goalId) {
        shouldRecalculateGoal = true;
      }
    }

    task.markModified('metadata');
    await task.save();

    if (shouldRecalculateGoal) {
      await recalculateGoalProgress(task.goalId, userId, 'Tự động hoàn thành task ôn tập');
    }
  }

  return task;
}

/**
 * Synchronize all numeric goals linked to learning metrics:
 * - 'cards_added': Total cards owned by user
 * - 'cards_mastered': Total cards with SRS status 'review' (interval >= 21 days)
 * - 'review_sessions': Total distinct calendar days user has reviewed
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {Promise<Array<Object>>} Updated goal documents
 */
export async function syncLearnGoals(userId) {
  if (!userId) return [];

  const userObjectId = mongoose.Types.ObjectId.isValid(userId)
    ? (userId instanceof mongoose.Types.ObjectId ? userId : new mongoose.Types.ObjectId(userId))
    : userId;

  const goals = await Goal.find({
    userId: userObjectId,
    progressMode: 'numeric',
    linkedMetric: { $in: ['cards_added', 'cards_mastered', 'review_sessions'] },
  });

  if (!goals || goals.length === 0) {
    return [];
  }

  let totalCards = null;
  let masteredCards = null;
  let reviewSessions = null;
  const updatedGoals = [];

  for (const goal of goals) {
    let currentMetricValue = 0;

    if (goal.linkedMetric === 'cards_added') {
      if (totalCards === null) {
        totalCards = await Card.countDocuments({ userId: userObjectId });
      }
      currentMetricValue = totalCards;
    } else if (goal.linkedMetric === 'cards_mastered') {
      if (masteredCards === null) {
        masteredCards = await Card.countDocuments({
          userId: userObjectId,
          'srs.status': 'review',
        });
      }
      currentMetricValue = masteredCards;
    } else if (goal.linkedMetric === 'review_sessions') {
      if (reviewSessions === null) {
        const tz = getTimezoneOffsetString();
        const distinctDays = await ReviewLog.aggregate([
          { $match: { userId: userObjectId } },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$reviewedAt', timezone: tz },
              },
            },
          },
          { $count: 'totalDays' },
        ]);
        reviewSessions = distinctDays[0]?.totalDays || 0;
      }
      currentMetricValue = reviewSessions;
    }

    if (goal.currentValue !== currentMetricValue) {
      goal.currentValue = currentMetricValue;
      await goal.save();
      const updatedDoc = await recalculateGoalProgress(
        goal._id,
        userObjectId,
        'Tự động đồng bộ chỉ số học tập'
      );
      updatedGoals.push(updatedDoc || goal);
    }
  }

  return updatedGoals;
}

/**
 * Helper hook called after each flashcard answer:
 * 1. Synchronizes the daily review task (completedCount, targetCount, completion status).
 * 2. Synchronizes learn-linked numeric goals.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {Promise<{ task: Object|null, updatedGoals: Array<Object> }>}
 */
export async function onCardReviewed(userId) {
  const [task, updatedGoals] = await Promise.all([
    syncDailyReviewTask(userId),
    syncLearnGoals(userId),
  ]);
  return { task, updatedGoals };
}
