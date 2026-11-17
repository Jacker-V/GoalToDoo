import { Goal } from '../models/goal.model.js';
import { Task } from '../models/task.model.js';
import { Category } from '../models/category.model.js';
import { ProgressLog } from '../models/progressLog.model.js';
import {
  recalculateGoalProgress,
  buildGoalTree,
  calculateNumericGoalProgress,
} from '../services/progress.service.js';
import { AppError, sendSuccess } from '../utils/response.js';

export const getGoals = async (req, res, next) => {
  try {
    const { type, status, priority, categoryId, parentId } = req.query;
    const filter = { userId: req.user._id };

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (categoryId !== undefined) {
      filter.categoryId = categoryId === 'null' ? null : categoryId;
    }
    if (parentId !== undefined) {
      filter.parentId = parentId === 'null' ? null : parentId;
    }

    const goals = await Goal.find(filter).sort({ createdAt: -1 });
    return sendSuccess(res, goals, 200);
  } catch (err) {
    next(err);
  }
};

export const createGoal = async (req, res, next) => {
  try {
    if (new Date(req.body.endDate) < new Date(req.body.startDate)) {
      return next(
        new AppError('Goal end date cannot be before start date', 400, 'INVALID_DATE_RANGE')
      );
    }

    if (req.body.parentId) {
      const parent = await Goal.findOne({ _id: req.body.parentId, userId: req.user._id });
      if (!parent) {
        return next(new AppError('Parent goal not found', 404, 'NOT_FOUND'));
      }
    }

    if (req.body.categoryId) {
      const category = await Category.findOne({ _id: req.body.categoryId, userId: req.user._id });
      if (!category) {
        return next(new AppError('Category not found', 404, 'NOT_FOUND'));
      }
    }

    const goalData = {
      ...req.body,
      userId: req.user._id,
    };

    if (goalData.progressMode === 'numeric') {
      goalData.progressCache = calculateNumericGoalProgress(
        goalData.currentValue ?? 0,
        goalData.targetValue ?? 100
      );
    }

    const goal = await Goal.create(goalData);

    // Initial progress log
    await ProgressLog.create({
      userId: req.user._id,
      goalId: goal._id,
      date: new Date(),
      value: goal.progressMode === 'numeric' ? goal.currentValue : goal.progressCache,
      delta: goal.progressCache,
      note: 'Goal created',
      snapshotPercent: goal.progressCache,
    });

    // Bubble-up to parent goal if any
    if (goal.parentId) {
      await recalculateGoalProgress(
        goal.parentId,
        req.user._id,
        `Child goal "${goal.title}" created`
      );
    }

    return sendSuccess(res, goal, 201);
  } catch (err) {
    next(err);
  }
};

export const getGoalById = async (req, res, next) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!goal) {
      return next(new AppError('Goal not found', 404, 'NOT_FOUND'));
    }
    return sendSuccess(res, goal, 200);
  } catch (err) {
    next(err);
  }
};

export const updateGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!goal) {
      return next(new AppError('Goal not found', 404, 'NOT_FOUND'));
    }

    const newStart = req.body.startDate ? new Date(req.body.startDate) : goal.startDate;
    const newEnd = req.body.endDate ? new Date(req.body.endDate) : goal.endDate;
    if (newEnd < newStart) {
      return next(
        new AppError('Goal end date cannot be before start date', 400, 'INVALID_DATE_RANGE')
      );
    }

    if (req.body.categoryId) {
      const category = await Category.findOne({ _id: req.body.categoryId, userId: req.user._id });
      if (!category) {
        return next(new AppError('Category not found', 404, 'NOT_FOUND'));
      }
    }

    if (req.body.parentId) {
      if (req.body.parentId.toString() === req.params.id) {
        return next(new AppError('A goal cannot be its own parent', 400, 'INVALID_PARENT'));
      }
      let currentParent = await Goal.findOne({ _id: req.body.parentId, userId: req.user._id });
      if (!currentParent) {
        return next(new AppError('Parent goal not found', 404, 'NOT_FOUND'));
      }
      // Check ancestor chain to prevent circular hierarchies
      const visitedAncestors = new Set([req.params.id]);
      while (currentParent) {
        if (visitedAncestors.has(currentParent._id.toString())) {
          return next(
            new AppError('Cyclic goal hierarchy is not allowed', 400, 'CYCLIC_DEPENDENCY')
          );
        }
        visitedAncestors.add(currentParent._id.toString());
        if (!currentParent.parentId) break;
        currentParent = await Goal.findOne({ _id: currentParent.parentId, userId: req.user._id });
      }
    }

    const oldParentId = goal.parentId ? goal.parentId.toString() : null;
    const oldCurrentValue = goal.currentValue;
    const oldTargetValue = goal.targetValue;
    const oldMode = goal.progressMode;

    Object.assign(goal, req.body);
    await goal.save();

    // Recalculate if progress params changed or mode changed
    const progressModeChanged = req.body.progressMode && req.body.progressMode !== oldMode;
    const numericChanged =
      goal.progressMode === 'numeric' &&
      (goal.currentValue !== oldCurrentValue || goal.targetValue !== oldTargetValue);

    if (progressModeChanged || numericChanged || req.body.weight !== undefined) {
      await recalculateGoalProgress(goal._id, req.user._id, 'Goal properties updated');
    }

    // Handle parent changes
    const newParentId = goal.parentId ? goal.parentId.toString() : null;
    if (oldParentId !== newParentId) {
      if (oldParentId) {
        await recalculateGoalProgress(oldParentId, req.user._id, 'Child goal moved/unlinked');
      }
      if (newParentId) {
        await recalculateGoalProgress(newParentId, req.user._id, 'Child goal linked');
      }
    }

    const updatedGoal = await Goal.findOne({ _id: goal._id, userId: req.user._id });
    return sendSuccess(res, updatedGoal, 200);
  } catch (err) {
    next(err);
  }
};

export const deleteGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!goal) {
      return next(new AppError('Goal not found', 404, 'NOT_FOUND'));
    }

    const parentId = goal.parentId;

    // Unparent child goals
    await Goal.updateMany(
      { parentId: goal._id, userId: req.user._id },
      { parentId: null }
    );

    // Ungoal tasks
    await Task.updateMany(
      { goalId: goal._id, userId: req.user._id },
      { goalId: null }
    );

    // Delete associated progress logs
    await ProgressLog.deleteMany({
      goalId: goal._id,
      userId: req.user._id,
    });

    await Goal.deleteOne({ _id: goal._id, userId: req.user._id });

    // Recalculate parent goal if there was one
    if (parentId) {
      await recalculateGoalProgress(
        parentId,
        req.user._id,
        `Child goal "${goal.title}" deleted`
      );
    }

    return sendSuccess(res, { message: 'Goal deleted successfully' }, 200);
  } catch (err) {
    next(err);
  }
};

export const getGoalTree = async (req, res, next) => {
  try {
    const tree = await buildGoalTree(req.user._id);
    return sendSuccess(res, tree, 200);
  } catch (err) {
    next(err);
  }
};

export const updateGoalProgress = async (req, res, next) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!goal) {
      return next(new AppError('Goal not found', 404, 'NOT_FOUND'));
    }

    if (goal.progressMode !== 'numeric') {
      return next(
        new AppError(
          'Progress for auto-mode goals is calculated from children. Only numeric goals can update currentValue directly.',
          400,
          'INVALID_MODE'
        )
      );
    }

    goal.currentValue = req.body.currentValue;
    await goal.save();

    const note = req.body.note || `Progress value updated to ${req.body.currentValue}`;
    await recalculateGoalProgress(goal._id, req.user._id, note);

    const updated = await Goal.findOne({ _id: goal._id, userId: req.user._id });
    return sendSuccess(res, updated, 200);
  } catch (err) {
    next(err);
  }
};

export const getGoalProgressLogs = async (req, res, next) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!goal) {
      return next(new AppError('Goal not found', 404, 'NOT_FOUND'));
    }

    const logs = await ProgressLog.find({
      goalId: goal._id,
      userId: req.user._id,
    }).sort({ date: 1 });

    return sendSuccess(res, logs, 200);
  } catch (err) {
    next(err);
  }
};
