import { Goal } from '../models/goal.model.js';
import { Task } from '../models/task.model.js';
import { TaskCompletion } from '../models/taskCompletion.model.js';
import { ProgressLog } from '../models/progressLog.model.js';
import { calculateStreak } from '../utils/streak.js';

/**
 * Calculates progress for a task.
 * If task has subtasks: percentage of completed subtasks.
 * Otherwise: 100% if completed, 0% otherwise.
 *
 * @param {Object} task
 * @returns {number} 0 - 100
 */
export const calculateTaskProgress = (task) => {
  if (!task) return 0;
  if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
    const doneCount = task.subtasks.filter((s) => s.done).length;
    return Math.round((doneCount / task.subtasks.length) * 100 * 100) / 100;
  }
  return task.isCompleted ? 100 : 0;
};

/**
 * Calculates progress for a numeric goal: min(currentValue / targetValue, 1) * 100
 *
 * @param {number} currentValue
 * @param {number} targetValue
 * @returns {number} 0 - 100
 */
export const calculateNumericGoalProgress = (currentValue, targetValue) => {
  if (!targetValue || targetValue <= 0) return 0;
  const current = typeof currentValue === 'number' ? currentValue : 0;
  const ratio = Math.min(Math.max(current / targetValue, 0), 1);
  return Math.round(ratio * 100 * 100) / 100;
};

/**
 * Calculates risk, overdue status, and ideal progress.
 *
 * @param {Object} goal
 * @param {Date} [now=new Date()]
 * @returns {{ isOverdue: boolean, atRisk: boolean, idealProgress: number }}
 */
export const calculateGoalRiskAndOverdue = (goal, now = new Date()) => {
  if (!goal) {
    return { isOverdue: false, atRisk: false, idealProgress: 0 };
  }

  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const startMs = new Date(goal.startDate).getTime();
  const endMs = new Date(goal.endDate).getTime();
  const currentProgress = typeof goal.progressCache === 'number' ? goal.progressCache : 0;

  // Overdue: endDate < now and not reached 100%
  const isOverdue = endMs < nowMs && currentProgress < 100;

  // Ideal progress calculation
  let ideal = 0;
  if (endMs <= startMs) {
    ideal = nowMs >= endMs ? 100 : 0;
  } else if (nowMs <= startMs) {
    ideal = 0;
  } else {
    const rawRatio = ((nowMs - startMs) / (endMs - startMs)) * 100;
    ideal = Math.min(Math.max(rawRatio, 0), 100);
  }
  const idealProgress = Math.round(ideal * 100) / 100;

  // At risk: time has elapsed (now > start), ideal - actual > 20%, and not completed (<100%)
  const hasTimeStarted = nowMs > startMs;
  const atRisk = hasTimeStarted && currentProgress < 100 && idealProgress - currentProgress > 20;

  return { isOverdue, atRisk, idealProgress };
};

/**
 * Calculates weighted average progress for an 'auto' goal based on its direct child goals and direct tasks.
 *
 * @param {Array<Object>} childGoals
 * @param {Array<Object>} tasks
 * @returns {number} 0 - 100
 */
export const calculateAutoGoalProgress = (childGoals = [], tasks = []) => {
  const children = [];

  for (const cg of childGoals) {
    const weight = typeof cg.weight === 'number' && cg.weight >= 0 ? cg.weight : 1;
    const progress = typeof cg.progressCache === 'number' ? cg.progressCache : 0;
    children.push({ progress, weight });
  }

  for (const t of tasks) {
    const weight = typeof t.weight === 'number' && t.weight >= 0 ? t.weight : 1;
    const progress = calculateTaskProgress(t);
    children.push({ progress, weight });
  }

  if (children.length === 0) {
    return 0;
  }

  const totalWeight = children.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) {
    return 0;
  }

  const totalWeightedProgress = children.reduce((sum, item) => sum + item.progress * item.weight, 0);
  const average = totalWeightedProgress / totalWeight;
  return Math.round(Math.min(Math.max(average, 0), 100) * 100) / 100;
};

/**
 * Recalculates goal progress, writes ProgressLog, and recursively bubbles up to parent goals.
 *
 * @param {string|import('mongoose').Types.ObjectId} goalId
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {string} [note='Progress updated']
 * @param {Set<string>} [visited=new Set()]
 * @returns {Promise<Object|null>} Updated goal document
 */
export const recalculateGoalProgress = async (
  goalId,
  userId,
  note = 'Progress updated',
  visited = new Set()
) => {
  if (!goalId) return null;
  const idStr = goalId.toString();
  if (visited.has(idStr)) {
    return null; // Cycle guard
  }
  visited.add(idStr);

  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) return null;

  let newProgress = 0;
  if (goal.progressMode === 'numeric') {
    newProgress = calculateNumericGoalProgress(goal.currentValue, goal.targetValue);
  } else {
    // 'auto' mode: fetch direct child goals and tasks
    const [childGoals, directTasks] = await Promise.all([
      Goal.find({ parentId: goal._id, userId }),
      Task.find({ goalId: goal._id, userId }),
    ]);
    newProgress = calculateAutoGoalProgress(childGoals, directTasks);
  }

  const oldProgress = typeof goal.progressCache === 'number' ? goal.progressCache : 0;
  const delta = Math.round((newProgress - oldProgress) * 100) / 100;

  goal.progressCache = newProgress;
  await goal.save();

  // Create ProgressLog entry
  await ProgressLog.create({
    userId,
    goalId: goal._id,
    date: new Date(),
    value: goal.progressMode === 'numeric' ? goal.currentValue : newProgress,
    delta,
    note,
    snapshotPercent: newProgress,
  });

  // Bubble-up to parent goal if any
  if (goal.parentId) {
    await recalculateGoalProgress(
      goal.parentId,
      userId,
      `Propagated from child goal: "${goal.title}"`,
      visited
    );
  }

  return goal;
};

/**
 * Builds a hierarchical tree of goals and their tasks for a given user.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @returns {Promise<Array<Object>>}
 */
export const buildGoalTree = async (userId) => {
  const [goals, tasks] = await Promise.all([
    Goal.find({ userId }).sort({ createdAt: 1 }).lean(),
    Task.find({ userId }).sort({ order: 1, createdAt: 1 }).lean(),
  ]);

  const taskIds = tasks.map((t) => t._id);
  const completions = await TaskCompletion.find({
    userId,
    taskId: { $in: taskIds },
  }).lean();

  const completionsByTask = new Map();
  for (const c of completions) {
    const tId = c.taskId.toString();
    if (!completionsByTask.has(tId)) {
      completionsByTask.set(tId, []);
    }
    completionsByTask.get(tId).push(c.date);
  }

  const goalMap = new Map();
  const rootGoals = [];

  // Group tasks by goalId with streak & completion info
  const tasksByGoalId = new Map();
  for (const task of tasks) {
    if (task.goalId) {
      const gId = task.goalId.toString();
      if (!tasksByGoalId.has(gId)) {
        tasksByGoalId.set(gId, []);
      }
      const dates = completionsByTask.get(task._id.toString()) || [];
      const streakInfo = calculateStreak(dates);
      tasksByGoalId.get(gId).push({
        ...task,
        progress: calculateTaskProgress(task),
        streak: streakInfo.streak,
        isCompletedToday: streakInfo.isCompletedToday,
      });
    }
  }

  // Initialize nodes
  for (const goal of goals) {
    const risk = calculateGoalRiskAndOverdue(goal);
    const node = {
      ...goal,
      isOverdue: risk.isOverdue,
      atRisk: risk.atRisk,
      idealProgress: risk.idealProgress,
      tasks: tasksByGoalId.get(goal._id.toString()) || [],
      children: [],
    };
    goalMap.set(goal._id.toString(), node);
  }

  // Link children to parents
  for (const goal of goals) {
    const node = goalMap.get(goal._id.toString());
    if (goal.parentId && goalMap.has(goal.parentId.toString())) {
      goalMap.get(goal.parentId.toString()).children.push(node);
    } else {
      rootGoals.push(node);
    }
  }

  return rootGoals;
};
