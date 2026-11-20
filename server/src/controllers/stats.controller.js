import { Goal } from '../models/goal.model.js';
import { Task } from '../models/task.model.js';
import { TaskCompletion } from '../models/taskCompletion.model.js';
import { Category } from '../models/category.model.js';
import { ProgressLog } from '../models/progressLog.model.js';
import { ReviewLog } from '../modules/learn/models/index.js';
import { AppError, sendSuccess } from '../utils/response.js';
import { calculateStreak, calculateLongestStreak } from '../utils/streak.js';

const formatDateString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getPeriodRange = (period = 'month', refDate = new Date(), customStart, customEnd) => {
  const d = new Date(refDate);
  if (isNaN(d.getTime())) {
    throw new AppError('Invalid reference date', 400, 'INVALID_DATE');
  }

  let startCurrent, endCurrent, startPrev, endPrev;

  if (period === 'custom' && customStart && customEnd) {
    if (typeof customStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(customStart)) {
      const [y, m, day] = customStart.split('-').map(Number);
      startCurrent = new Date(y, m - 1, day, 0, 0, 0, 0);
    } else {
      startCurrent = new Date(customStart);
      startCurrent.setHours(0, 0, 0, 0);
    }

    if (isNaN(startCurrent.getTime())) {
      throw new AppError('Invalid startDate', 400, 'INVALID_DATE');
    }

    if (typeof customEnd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(customEnd)) {
      const [y, m, day] = customEnd.split('-').map(Number);
      endCurrent = new Date(y, m - 1, day, 23, 59, 59, 999);
    } else {
      endCurrent = new Date(customEnd);
      endCurrent.setHours(23, 59, 59, 999);
    }

    if (isNaN(endCurrent.getTime())) {
      throw new AppError('Invalid endDate', 400, 'INVALID_DATE');
    }

    if (startCurrent.getTime() > endCurrent.getTime()) {
      throw new AppError('startDate must be before or equal to endDate', 400, 'INVALID_DATE_RANGE');
    }

    const duration = endCurrent.getTime() - startCurrent.getTime();
    endPrev = new Date(startCurrent.getTime() - 1);
    startPrev = new Date(endPrev.getTime() - duration);
  } else if (period === 'week') {
    const day = d.getDay();
    const diffToMonday = (day + 6) % 7;
    startCurrent = new Date(d);
    startCurrent.setDate(d.getDate() - diffToMonday);
    startCurrent.setHours(0, 0, 0, 0);

    endCurrent = new Date(startCurrent);
    endCurrent.setDate(startCurrent.getDate() + 6);
    endCurrent.setHours(23, 59, 59, 999);

    startPrev = new Date(startCurrent);
    startPrev.setDate(startPrev.getDate() - 7);

    endPrev = new Date(endCurrent);
    endPrev.setDate(endPrev.getDate() - 7);
  } else if (period === 'year') {
    const year = d.getFullYear();
    startCurrent = new Date(year, 0, 1, 0, 0, 0, 0);
    endCurrent = new Date(year, 11, 31, 23, 59, 59, 999);

    startPrev = new Date(year - 1, 0, 1, 0, 0, 0, 0);
    endPrev = new Date(year - 1, 11, 31, 23, 59, 59, 999);
  } else {
    // Default: month
    const year = d.getFullYear();
    const month = d.getMonth();
    startCurrent = new Date(year, month, 1, 0, 0, 0, 0);
    endCurrent = new Date(year, month + 1, 0, 23, 59, 59, 999);

    startPrev = new Date(year, month - 1, 1, 0, 0, 0, 0);
    endPrev = new Date(year, month, 0, 23, 59, 59, 999);
  }

  return { startCurrent, endCurrent, startPrev, endPrev };
};

const nonRecurringFilter = {
  $or: [
    { 'recurrence.type': 'none' },
    { 'recurrence.type': { $exists: false } },
    { recurrence: null },
  ],
};

/**
 * GET /api/v1/stats/summary?period=week|month|year|custom
 */
export const getStatsSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const period = req.query.period || 'month';
    const refDate = req.query.refDate ? new Date(req.query.refDate) : new Date();

    const { startCurrent, endCurrent, startPrev, endPrev } = getPeriodRange(
      period,
      refDate,
      req.query.startDate,
      req.query.endDate
    );
    const startCurrentStr = formatDateString(startCurrent);
    const endCurrentStr = formatDateString(endCurrent);

    // 1. Goals for current period (active / overlapping with the period)
    const currentGoals = await Goal.find({
      userId,
      startDate: { $lte: endCurrent },
      endDate: { $gte: startCurrent },
    });

    const currentGoalsAvg =
      currentGoals.length > 0
        ? Math.round(
            (currentGoals.reduce((sum, g) => sum + (g.progressCache || 0), 0) / currentGoals.length) * 10
          ) / 10
        : 0;

    // 2. Goals for previous period (accurate historical snapshots if logs exist)
    const prevGoals = await Goal.find({
      userId,
      startDate: { $lte: endPrev },
      endDate: { $gte: startPrev },
    });

    let prevGoalsSum = 0;
    for (const g of prevGoals) {
      const latestLog = await ProgressLog.findOne({
        userId,
        goalId: g._id,
        date: { $lte: endPrev },
      }).sort({ date: -1, createdAt: -1 });

      if (latestLog) {
        prevGoalsSum += latestLog.snapshotPercent;
      } else if (g.startDate > endPrev) {
        prevGoalsSum += 0;
      } else {
        prevGoalsSum += (g.progressCache || 0);
      }
    }

    const prevGoalsAvg =
      prevGoals.length > 0
        ? Math.round((prevGoalsSum / prevGoals.length) * 10) / 10
        : 0;

    const delta = Math.round((currentGoalsAvg - prevGoalsAvg) * 10) / 10;

    // 3. Completed Tasks in current period
    // a) Regular non-recurring completed tasks
    const completedTasksList = await Task.find({
      userId,
      isCompleted: true,
      $and: [
        nonRecurringFilter,
        {
          $or: [
            { completedAt: { $gte: startCurrent, $lte: endCurrent } },
            {
              completedAt: null,
              updatedAt: { $gte: startCurrent, $lte: endCurrent },
            },
          ],
        },
      ],
    });

    // b) Recurring completions in period
    const recurringCompletions = await TaskCompletion.find({
      userId,
      date: { $gte: startCurrentStr, $lte: endCurrentStr },
    });

    const totalCompletedTasks = completedTasksList.length + recurringCompletions.length;

    // 4. On-time completion rate
    let onTimeCount = 0;

    for (const t of completedTasksList) {
      if (!t.dueDate) {
        onTimeCount++;
      } else {
        const due = new Date(t.dueDate);
        due.setHours(23, 59, 59, 999);
        const doneAt = t.completedAt ? new Date(t.completedAt) : new Date(t.updatedAt);
        if (doneAt.getTime() <= due.getTime()) {
          onTimeCount++;
        }
      }
    }
    // Recurring completions recorded for their date are considered on-time
    onTimeCount += recurringCompletions.length;

    const onTimeRate =
      totalCompletedTasks > 0 ? Math.round((onTimeCount / totalCompletedTasks) * 100) : 100;

    // 5. Streaks (current streak & longest streak)
    const allTaskCompletions = await TaskCompletion.find({ userId }).select('date').lean();
    const allCompletedTasks = await Task.find({
      userId,
      isCompleted: true,
      ...nonRecurringFilter,
    }).select('completedAt updatedAt').lean();

    const completionDates = new Set();
    for (const tc of allTaskCompletions) {
      if (tc.date) completionDates.add(tc.date);
    }
    for (const t of allCompletedTasks) {
      const d = t.completedAt || t.updatedAt;
      if (d) {
        const ds = formatDateString(d);
        if (ds) completionDates.add(ds);
      }
    }

    const allReviewLogs = await ReviewLog.find({ userId }).select('reviewedAt').lean();
    for (const r of allReviewLogs) {
      if (r.reviewedAt) {
        const ds = formatDateString(r.reviewedAt);
        if (ds) completionDates.add(ds);
      }
    }

    const dateArray = Array.from(completionDates);
    const { streak: currentStreak } = calculateStreak(dateArray, refDate);
    const longestStreak = calculateLongestStreak(dateArray);

    // 6. At-risk goals count (active goals with atRisk or overdue)
    const activeGoals = await Goal.find({
      userId,
      status: { $nin: ['completed', 'cancelled'] },
    });
    const atRiskCount = activeGoals.filter((g) => g.atRisk || g.isOverdue).length;

    const completedGoalsCount = currentGoals.filter(
      (g) => g.status === 'completed' || g.progressCache >= 100
    ).length;

    return sendSuccess(res, {
      period,
      startDate: startCurrent.toISOString(),
      endDate: endCurrent.toISOString(),
      completionRate: currentGoalsAvg,
      previousCompletionRate: prevGoalsAvg,
      delta,
      completedTasks: totalCompletedTasks,
      onTimeRate,
      currentStreak,
      longestStreak,
      atRiskCount,
      totalGoals: currentGoals.length,
      completedGoals: completedGoalsCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/stats/heatmap?year=YYYY
 */
export const getStatsHeatmap = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const yearStr = req.query.year || String(new Date().getFullYear());
    const yearNum = parseInt(yearStr, 10);

    if (isNaN(yearNum) || yearNum < 1970 || yearNum > 2100) {
      throw new AppError('Year must be between 1970 and 2100', 400, 'INVALID_YEAR');
    }

    const startOfYear = new Date(yearNum, 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(yearNum, 11, 31, 23, 59, 59, 999);

    // Task completions from recurring habits
    const recurringCompletions = await TaskCompletion.find({
      userId,
      date: { $gte: `${yearNum}-01-01`, $lte: `${yearNum}-12-31` },
    }).select('date');

    // Completed regular tasks
    const completedTasks = await Task.find({
      userId,
      isCompleted: true,
      $and: [
        nonRecurringFilter,
        {
          $or: [
            { completedAt: { $gte: startOfYear, $lte: endOfYear } },
            {
              completedAt: null,
              updatedAt: { $gte: startOfYear, $lte: endOfYear },
            },
          ],
        },
      ],
    }).select('completedAt updatedAt');

    const countsMap = {};

    for (const c of recurringCompletions) {
      if (c.date) {
        countsMap[c.date] = (countsMap[c.date] || 0) + 1;
      }
    }

    for (const t of completedTasks) {
      const d = t.completedAt || t.updatedAt;
      if (d) {
        const dateStr = formatDateString(d);
        if (dateStr.startsWith(`${yearNum}-`)) {
          countsMap[dateStr] = (countsMap[dateStr] || 0) + 1;
        }
      }
    }

    // Flashcard reviews from Learn module
    const reviewLogs = await ReviewLog.find({
      userId,
      reviewedAt: { $gte: startOfYear, $lte: endOfYear },
    }).select('reviewedAt');

    for (const r of reviewLogs) {
      if (r.reviewedAt) {
        const dateStr = formatDateString(r.reviewedAt);
        if (dateStr.startsWith(`${yearNum}-`)) {
          countsMap[dateStr] = (countsMap[dateStr] || 0) + 1;
        }
      }
    }

    let totalCount = 0;
    const days = Object.entries(countsMap)
      .map(([date, count]) => {
        totalCount += count;
        return { date, count };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return sendSuccess(res, {
      year: yearNum,
      totalCount,
      dailyCounts: countsMap,
      days,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/stats/trend?goalId=ID
 */
export const getStatsTrend = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { goalId } = req.query;

    const goal = await Goal.findOne({ _id: goalId, userId });
    if (!goal) {
      throw new AppError('Goal not found', 404, 'NOT_FOUND');
    }

    const logs = await ProgressLog.find({ userId, goalId }).sort({ date: 1, createdAt: 1 });

    const startTime = new Date(goal.startDate).getTime();
    const endTime = new Date(goal.endDate).getTime();
    const totalDuration = endTime - startTime;

    const calcIdeal = (timestamp) => {
      if (totalDuration <= 0) return timestamp >= endTime ? 100 : 0;
      if (timestamp <= startTime) return 0;
      if (timestamp >= endTime) return 100;
      const progress = ((timestamp - startTime) / totalDuration) * 100;
      return Math.round(progress * 10) / 10;
    };

    const logsWithIdeal = logs.map((log) => {
      const logTime = new Date(log.date).getTime();
      return {
        _id: log._id,
        date: log.date,
        value: log.value,
        delta: log.delta,
        snapshotPercent: log.snapshotPercent,
        note: log.note,
        idealPercent: calcIdeal(logTime),
      };
    });

    const now = Date.now();
    const currentIdeal = calcIdeal(now);

    // Build timeline points for chart
    const dataPoints = [];

    // 1. Start point
    dataPoints.push({
      date: goal.startDate,
      actualPercent: 0,
      idealPercent: 0,
      label: 'Bắt đầu',
    });

    // 2. Logs points
    for (const l of logsWithIdeal) {
      dataPoints.push({
        date: l.date,
        actualPercent: l.snapshotPercent,
        idealPercent: l.idealPercent,
        value: l.value,
        note: l.note,
      });
    }

    // 3. Current point (if after start and before end)
    if (now > startTime && now < endTime) {
      dataPoints.push({
        date: new Date(now).toISOString(),
        actualPercent: goal.progressCache,
        idealPercent: currentIdeal,
        label: 'Hiện tại',
      });
    }

    // 4. End point
    dataPoints.push({
      date: goal.endDate,
      idealPercent: 100,
      actualPercent: goal.progressCache >= 100 || now >= endTime ? goal.progressCache : null,
      label: 'Hạn chót',
    });

    return sendSuccess(res, {
      goal: {
        _id: goal._id,
        title: goal.title,
        startDate: goal.startDate,
        endDate: goal.endDate,
        targetValue: goal.targetValue,
        currentValue: goal.currentValue,
        unit: goal.unit,
        progressMode: goal.progressMode,
        progressCache: goal.progressCache,
        idealProgress: goal.idealProgress,
        status: goal.status,
        atRisk: goal.atRisk,
        isOverdue: goal.isOverdue,
      },
      logs: logsWithIdeal,
      idealLine: [
        { date: goal.startDate, idealPercent: 0 },
        { date: goal.endDate, idealPercent: 100 },
      ],
      dataPoints,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/stats/by-category
 */
export const getStatsByCategory = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [categories, goals, tasks] = await Promise.all([
      Category.find({ userId }),
      Goal.find({ userId }),
      Task.find({ userId }),
    ]);

    // Map goalId -> goal
    const goalMap = new Map();
    for (const g of goals) {
      goalMap.set(g._id.toString(), g);
    }

    // Group goals by categoryId (null or string)
    const goalsByCat = new Map();
    for (const g of goals) {
      const catKey = g.categoryId ? g.categoryId.toString() : 'null';
      if (!goalsByCat.has(catKey)) goalsByCat.set(catKey, []);
      goalsByCat.get(catKey).push(g);
    }

    // Group tasks by categoryId (derived from task.goalId)
    const tasksByCat = new Map();
    for (const t of tasks) {
      let catKey = 'null';
      if (t.goalId) {
        const goal = goalMap.get(t.goalId.toString());
        if (goal && goal.categoryId) {
          catKey = goal.categoryId.toString();
        }
      }
      if (!tasksByCat.has(catKey)) tasksByCat.set(catKey, []);
      tasksByCat.get(catKey).push(t);
    }

    const totalTasksCount = tasks.length;
    const totalGoalsCount = goals.length;
    const totalCompletedTasks = tasks.filter((t) => t.isCompleted).length;
    const totalCompletedGoals = goals.filter(
      (g) => g.status === 'completed' || g.progressCache >= 100
    ).length;

    const categoryStats = [];

    // 1. Process known categories
    for (const cat of categories) {
      const catIdStr = cat._id.toString();
      const catGoals = goalsByCat.get(catIdStr) || [];
      const catTasks = tasksByCat.get(catIdStr) || [];

      const completedGoals = catGoals.filter(
        (g) => g.status === 'completed' || g.progressCache >= 100
      ).length;
      const completedTasks = catTasks.filter((t) => t.isCompleted).length;

      categoryStats.push({
        categoryId: cat._id,
        categoryName: cat.name,
        color: cat.color || '#6366f1',
        icon: cat.icon || 'Folder',
        totalGoals: catGoals.length,
        completedGoals,
        totalTasks: catTasks.length,
        completedTasks,
        taskShare:
          totalCompletedTasks > 0
            ? Math.round((completedTasks / totalCompletedTasks) * 100 * 10) / 10
            : 0,
        goalShare:
          totalGoalsCount > 0
            ? Math.round((catGoals.length / totalGoalsCount) * 100 * 10) / 10
            : 0,
      });
    }

    // 2. Uncategorized items
    const uncategorizedGoals = goalsByCat.get('null') || [];
    const uncategorizedTasks = tasksByCat.get('null') || [];

    if (uncategorizedGoals.length > 0 || uncategorizedTasks.length > 0) {
      const completedGoals = uncategorizedGoals.filter(
        (g) => g.status === 'completed' || g.progressCache >= 100
      ).length;
      const completedTasks = uncategorizedTasks.filter((t) => t.isCompleted).length;

      categoryStats.push({
        categoryId: null,
        categoryName: 'Chưa phân loại',
        color: '#94a3b8',
        icon: 'HelpCircle',
        totalGoals: uncategorizedGoals.length,
        completedGoals,
        totalTasks: uncategorizedTasks.length,
        completedTasks,
        taskShare:
          totalCompletedTasks > 0
            ? Math.round((completedTasks / totalCompletedTasks) * 100 * 10) / 10
            : 0,
        goalShare:
          totalGoalsCount > 0
            ? Math.round((uncategorizedGoals.length / totalGoalsCount) * 100 * 10) / 10
            : 0,
      });
    }

    return sendSuccess(res, {
      categories: categoryStats,
      totalGoals: totalGoalsCount,
      completedGoals: totalCompletedGoals,
      totalTasks: totalTasksCount,
      completedTasks: totalCompletedTasks,
    });
  } catch (err) {
    next(err);
  }
};
