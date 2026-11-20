import { Task } from '../models/task.model.js';
import { Goal } from '../models/goal.model.js';
import { TaskCompletion } from '../models/taskCompletion.model.js';
import { recalculateGoalProgress } from '../services/progress.service.js';
import { AppError, sendSuccess } from '../utils/response.js';
import { calculateStreak } from '../utils/streak.js';
import { syncDailyReviewTask } from '../modules/learn/services/learnTaskSync.service.js';

export { calculateStreak };

export const getTasks = async (req, res, next) => {
  try {
    await syncDailyReviewTask(req.user._id);

    const { goalId, priority, isCompleted, dueDate, tag } = req.query;
    const filter = { userId: req.user._id };

    if (goalId !== undefined) {
      filter.goalId = goalId === 'null' ? null : goalId;
    }
    if (priority) filter.priority = priority;
    if (isCompleted !== undefined) filter.isCompleted = isCompleted;
    if (tag) filter.tags = tag;
    if (dueDate) {
      const d = new Date(dueDate);
      const startOfDay = new Date(d);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);
      filter.dueDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const tasks = await Task.find(filter).sort({ order: 1, createdAt: -1 });

    const taskIds = tasks.map((t) => t._id);
    const completions = await TaskCompletion.find({
      userId: req.user._id,
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
      };
    });

    return sendSuccess(res, tasksWithStreak, 200);
  } catch (err) {
    next(err);
  }
};

export const createTask = async (req, res, next) => {
  try {
    if (req.body.goalId) {
      const goal = await Goal.findOne({ _id: req.body.goalId, userId: req.user._id });
      if (!goal) {
        return next(new AppError('Goal not found', 404, 'NOT_FOUND'));
      }
    }

    const taskData = {
      ...req.body,
      userId: req.user._id,
    };

    if (Array.isArray(taskData.subtasks) && taskData.subtasks.length > 0) {
      if (taskData.isCompleted === true) {
        taskData.subtasks.forEach((s) => {
          s.done = true;
        });
      } else {
        const allDone = taskData.subtasks.every((s) => s.done);
        taskData.isCompleted = allDone;
      }
    }

    if (taskData.isCompleted) {
      taskData.completedAt = taskData.completedAt || new Date();
    }

    const task = await Task.create(taskData);

    if (task.goalId) {
      await recalculateGoalProgress(
        task.goalId,
        req.user._id,
        `Task "${task.title}" added to goal`
      );
    }

    return sendSuccess(res, task, 201);
  } catch (err) {
    next(err);
  }
};

export const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!task) {
      return next(new AppError('Task not found', 404, 'NOT_FOUND'));
    }
    return sendSuccess(res, task, 200);
  } catch (err) {
    next(err);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!task) {
      return next(new AppError('Task not found', 404, 'NOT_FOUND'));
    }

    if (req.body.goalId) {
      const goal = await Goal.findOne({ _id: req.body.goalId, userId: req.user._id });
      if (!goal) {
        return next(new AppError('Goal not found', 404, 'NOT_FOUND'));
      }
    }

    const oldGoalId = task.goalId ? task.goalId.toString() : null;
    const hasSubtasksInput = Array.isArray(req.body.subtasks);
    const hasIsCompletedInput = req.body.isCompleted !== undefined;

    Object.assign(task, req.body);

    if (hasSubtasksInput && task.subtasks.length > 0) {
      if (hasIsCompletedInput && req.body.isCompleted === true) {
        task.subtasks.forEach((s) => {
          s.done = true;
        });
        task.isCompleted = true;
        task.completedAt = task.completedAt || new Date();
      } else if (hasIsCompletedInput && req.body.isCompleted === false) {
        task.isCompleted = false;
        task.completedAt = null;
      } else {
        const allDone = task.subtasks.every((s) => s.done);
        task.isCompleted = allDone;
        task.completedAt = allDone ? (task.completedAt || new Date()) : null;
      }
    } else if (!hasSubtasksInput && task.subtasks && task.subtasks.length > 0) {
      if (hasIsCompletedInput) {
        task.subtasks.forEach((s) => {
          s.done = req.body.isCompleted;
        });
        task.completedAt = req.body.isCompleted ? new Date() : null;
      }
    } else if (hasIsCompletedInput) {
      task.completedAt = req.body.isCompleted ? new Date() : null;
    }

    await task.save();

    const newGoalId = task.goalId ? task.goalId.toString() : null;

    if (oldGoalId && oldGoalId !== newGoalId) {
      await recalculateGoalProgress(oldGoalId, req.user._id, `Task "${task.title}" moved from goal`);
    }
    if (newGoalId) {
      await recalculateGoalProgress(newGoalId, req.user._id, `Task "${task.title}" updated`);
    }

    const updatedTask = await Task.findOne({ _id: task._id, userId: req.user._id });
    return sendSuccess(res, updatedTask, 200);
  } catch (err) {
    next(err);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!task) {
      return next(new AppError('Task not found', 404, 'NOT_FOUND'));
    }

    const goalId = task.goalId;

    await TaskCompletion.deleteMany({ taskId: task._id, userId: req.user._id });
    await Task.deleteOne({ _id: task._id, userId: req.user._id });

    if (goalId) {
      await recalculateGoalProgress(goalId, req.user._id, `Task "${task.title}" removed`);
    }

    return sendSuccess(res, { message: 'Task deleted successfully' }, 200);
  } catch (err) {
    next(err);
  }
};

export const toggleTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!task) {
      return next(new AppError('Task not found', 404, 'NOT_FOUND'));
    }

    task.isCompleted = !task.isCompleted;
    task.completedAt = task.isCompleted ? new Date() : null;

    if (task.subtasks && task.subtasks.length > 0) {
      task.subtasks.forEach((s) => {
        s.done = task.isCompleted;
      });
    }

    await task.save();

    if (task.goalId) {
      await recalculateGoalProgress(
        task.goalId,
        req.user._id,
        `Task "${task.title}" marked as ${task.isCompleted ? 'completed' : 'incomplete'}`
      );
    }

    const updated = await Task.findOne({ _id: task._id, userId: req.user._id });
    return sendSuccess(res, updated, 200);
  } catch (err) {
    next(err);
  }
};

export const completeRecurringTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!task) {
      return next(new AppError('Task not found', 404, 'NOT_FOUND'));
    }

    const dateStr = req.query.date;

    const completion = await TaskCompletion.findOneAndUpdate(
      { taskId: task._id, userId: req.user._id, date: dateStr },
      { completedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (task.goalId) {
      await recalculateGoalProgress(
        task.goalId,
        req.user._id,
        `Recurring task "${task.title}" completed for ${dateStr}`
      );
    }

    return sendSuccess(res, completion, 200);
  } catch (err) {
    next(err);
  }
};

export const uncompleteRecurringTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!task) {
      return next(new AppError('Task not found', 404, 'NOT_FOUND'));
    }

    const dateStr = req.query.date;

    await TaskCompletion.deleteOne({
      taskId: task._id,
      userId: req.user._id,
      date: dateStr,
    });

    if (task.goalId) {
      await recalculateGoalProgress(
        task.goalId,
        req.user._id,
        `Recurring task "${task.title}" uncompleted for ${dateStr}`
      );
    }

    return sendSuccess(res, { message: 'Completion removed' }, 200);
  } catch (err) {
    next(err);
  }
};
