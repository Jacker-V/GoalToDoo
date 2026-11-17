import { Event } from '../models/event.model.js';
import { Task } from '../models/task.model.js';
import { Goal } from '../models/goal.model.js';
import { TaskCompletion } from '../models/taskCompletion.model.js';
import { AppError, sendSuccess } from '../utils/response.js';
import { calculateStreak } from '../utils/streak.js';
import { expandEventOccurrences } from '../utils/calendarRecurrence.js';

export const parseDateRange = (fromStr, toStr) => {
  if (!fromStr || !toStr) {
    throw new AppError('Query parameters "from" and "to" are required', 400, 'MISSING_DATE_RANGE');
  }

  let fromDate;
  let toDate;

  if (/^\d{4}-\d{2}-\d{2}$/.test(fromStr.trim())) {
    fromDate = new Date(`${fromStr.trim()}T00:00:00.000Z`);
  } else {
    fromDate = new Date(fromStr);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(toStr.trim())) {
    toDate = new Date(`${toStr.trim()}T23:59:59.999Z`);
  } else {
    toDate = new Date(toStr);
  }

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    throw new AppError('Invalid date format for "from" or "to"', 400, 'INVALID_DATE_FORMAT');
  }

  if (toDate < fromDate) {
    throw new AppError('"to" date cannot be earlier than "from" date', 400, 'INVALID_DATE_RANGE');
  }

  return { fromDate, toDate };
};

export const getCalendarData = async (req, res, next) => {
  try {
    const { from, to, categoryId } = req.query;
    const { fromDate, toDate } = parseDateRange(from, to);

    const userId = req.user._id;

    // --- 1. Fetch & Expand Events ---
    const eventFilter = { userId };
    if (categoryId !== undefined) {
      eventFilter.categoryId = categoryId === 'null' ? null : categoryId;
    }

    const userEvents = await Event.find(eventFilter);
    const expandedEvents = [];

    for (const ev of userEvents) {
      const occurrences = expandEventOccurrences(ev, fromDate, toDate);
      expandedEvents.push(...occurrences);
    }

    // Sort events by start time ascending
    expandedEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    // --- 2. Fetch Tasks with dueDate in range ---
    const taskFilter = {
      userId,
      dueDate: { $gte: fromDate, $lte: toDate },
    };

    if (categoryId !== undefined) {
      const catVal = categoryId === 'null' ? null : categoryId;
      const goalsWithCategory = await Goal.find({ userId, categoryId: catVal }).select('_id');
      const goalIds = goalsWithCategory.map((g) => g._id);
      taskFilter.goalId = { $in: goalIds };
    }

    const tasks = await Task.find(taskFilter).sort({ dueDate: 1, dueTime: 1, order: 1 });

    const taskIds = tasks.map((t) => t._id);
    const completions = await TaskCompletion.find({
      userId,
      taskId: { $in: taskIds },
    });

    const completionsByTask = new Map();
    for (const c of completions) {
      const tId = c.taskId.toString();
      if (!completionsByTask.has(tId)) {
        completionsByTask.set(tId, []);
      }
      completionsByTask.get(tId).push(c.date);
    }

    const tasksWithStreak = tasks.map((t) => {
      const tObj = t.toJSON();
      const dates = completionsByTask.get(t._id.toString()) || [];
      const streakInfo = calculateStreak(dates);
      return {
        ...tObj,
        streak: streakInfo.streak,
        isCompletedToday: streakInfo.isCompletedToday,
        completionDates: dates,
      };
    });

    // --- 3. Fetch Goals intersecting range [fromDate, toDate] ---
    const goalFilter = {
      userId,
      startDate: { $lte: toDate },
      endDate: { $gte: fromDate },
    };

    if (categoryId !== undefined) {
      goalFilter.categoryId = categoryId === 'null' ? null : categoryId;
    }

    const goals = await Goal.find(goalFilter).sort({ startDate: 1, endDate: 1 });
    const goalsJson = goals.map((g) => g.toJSON());

    return sendSuccess(
      res,
      {
        events: expandedEvents,
        tasks: tasksWithStreak,
        goals: goalsJson,
      },
      200
    );
  } catch (err) {
    next(err);
  }
};
