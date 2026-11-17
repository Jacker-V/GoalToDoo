import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { User } from '../src/models/user.model.js';
import { Goal } from '../src/models/goal.model.js';
import { Task } from '../src/models/task.model.js';
import { ProgressLog } from '../src/models/progressLog.model.js';
import {
  calculateTaskProgress,
  calculateNumericGoalProgress,
  calculateGoalRiskAndOverdue,
  calculateAutoGoalProgress,
  recalculateGoalProgress,
  buildGoalTree,
} from '../src/services/progress.service.js';

describe('Progress Engine - Unit Tests', () => {
  describe('calculateTaskProgress', () => {
    it('returns 0 for null/undefined task', () => {
      expect(calculateTaskProgress(null)).toBe(0);
      expect(calculateTaskProgress(undefined)).toBe(0);
    });

    it('returns 0 or 100 based on isCompleted when no subtasks exist', () => {
      expect(calculateTaskProgress({ isCompleted: false })).toBe(0);
      expect(calculateTaskProgress({ isCompleted: true })).toBe(100);
      expect(calculateTaskProgress({ isCompleted: false, subtasks: [] })).toBe(0);
      expect(calculateTaskProgress({ isCompleted: true, subtasks: [] })).toBe(100);
    });

    it('calculates percentage based on completed subtasks when subtasks exist', () => {
      const task = {
        isCompleted: false,
        subtasks: [
          { title: 'Sub 1', done: true },
          { title: 'Sub 2', done: false },
          { title: 'Sub 3', done: true },
        ],
      };
      // 2 out of 3 = 66.67%
      expect(calculateTaskProgress(task)).toBe(66.67);

      const allDone = {
        subtasks: [
          { title: 'Sub 1', done: true },
          { title: 'Sub 2', done: true },
        ],
      };
      expect(calculateTaskProgress(allDone)).toBe(100);

      const noneDone = {
        subtasks: [
          { title: 'Sub 1', done: false },
          { title: 'Sub 2', done: false },
        ],
      };
      expect(calculateTaskProgress(noneDone)).toBe(0);
    });
  });

  describe('calculateNumericGoalProgress', () => {
    it('calculates min(currentValue / targetValue, 1) * 100', () => {
      expect(calculateNumericGoalProgress(50, 100)).toBe(50);
      expect(calculateNumericGoalProgress(25, 50)).toBe(50);
      expect(calculateNumericGoalProgress(1, 3)).toBe(33.33);
      expect(calculateNumericGoalProgress(150, 100)).toBe(100); // capped at 100
    });

    it('handles negative or invalid values safely', () => {
      expect(calculateNumericGoalProgress(-10, 100)).toBe(0);
      expect(calculateNumericGoalProgress(50, 0)).toBe(0);
      expect(calculateNumericGoalProgress(50, -10)).toBe(0);
      expect(calculateNumericGoalProgress(null, 100)).toBe(0);
    });
  });

  describe('calculateGoalRiskAndOverdue', () => {
    it('correctly detects overdue goal', () => {
      const pastGoal = {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-15'),
        progressCache: 50,
      };
      const now = new Date('2026-01-20');
      const result = calculateGoalRiskAndOverdue(pastGoal, now);
      expect(result.isOverdue).toBe(true);

      // Completed goal should NOT be overdue even if past end date
      const completedGoal = {
        ...pastGoal,
        progressCache: 100,
      };
      expect(calculateGoalRiskAndOverdue(completedGoal, now).isOverdue).toBe(false);
    });

    it('calculates ideal progress and detects atRisk when ideal - actual > 20%', () => {
      // Goal from Day 0 to Day 100.
      // At Day 50, ideal progress is 50%.
      // If actual progress is 20%, gap is 30% (> 20%) -> atRisk: true
      const goal = {
        startDate: new Date('2026-01-01T00:00:00Z'),
        endDate: new Date('2026-01-11T00:00:00Z'), // 10 days
        progressCache: 20,
      };
      // Day 6: 60% ideal progress
      const now = new Date('2026-01-07T00:00:00Z');
      const result = calculateGoalRiskAndOverdue(goal, now);

      expect(result.idealProgress).toBe(60);
      expect(result.atRisk).toBe(true); // 60 - 20 = 40 > 20
    });

    it('does not flag atRisk if actual progress is close to or ahead of ideal', () => {
      const goal = {
        startDate: new Date('2026-01-01T00:00:00Z'),
        endDate: new Date('2026-01-11T00:00:00Z'),
        progressCache: 50,
      };
      // Day 6: 60% ideal progress. 60 - 50 = 10 <= 20
      const now = new Date('2026-01-07T00:00:00Z');
      const result = calculateGoalRiskAndOverdue(goal, now);

      expect(result.idealProgress).toBe(60);
      expect(result.atRisk).toBe(false);
    });

    it('does not flag atRisk if current time is before startDate or goal is 100%', () => {
      const goal = {
        startDate: new Date('2026-02-01T00:00:00Z'),
        endDate: new Date('2026-02-28T00:00:00Z'),
        progressCache: 0,
      };
      const now = new Date('2026-01-15T00:00:00Z');
      const result = calculateGoalRiskAndOverdue(goal, now);
      expect(result.idealProgress).toBe(0);
      expect(result.atRisk).toBe(false);

      // Completed goal
      const completedGoal = {
        startDate: new Date('2026-01-01T00:00:00Z'),
        endDate: new Date('2026-01-10T00:00:00Z'),
        progressCache: 100,
      };
      const midNow = new Date('2026-01-08T00:00:00Z');
      expect(calculateGoalRiskAndOverdue(completedGoal, midNow).atRisk).toBe(false);
    });
  });

  describe('calculateAutoGoalProgress', () => {
    it('returns 0 when there are no child goals or tasks', () => {
      expect(calculateAutoGoalProgress([], [])).toBe(0);
    });

    it('calculates weighted average of child goals', () => {
      const childGoals = [
        { progressCache: 100, weight: 1 },
        { progressCache: 50, weight: 1 },
      ];
      // (100*1 + 50*1) / 2 = 75
      expect(calculateAutoGoalProgress(childGoals, [])).toBe(75);

      const weightedGoals = [
        { progressCache: 100, weight: 3 },
        { progressCache: 0, weight: 1 },
      ];
      // (300 + 0) / 4 = 75
      expect(calculateAutoGoalProgress(weightedGoals, [])).toBe(75);
    });

    it('calculates combined weighted average of child goals and tasks', () => {
      const childGoals = [{ progressCache: 100, weight: 2 }];
      const tasks = [
        { isCompleted: true, weight: 1 }, // 100%
        { isCompleted: false, weight: 1 }, // 0%
      ];
      // (100*2 + 100*1 + 0*1) / 4 = 300 / 4 = 75
      expect(calculateAutoGoalProgress(childGoals, tasks)).toBe(75);
    });
  });
});

describe('Progress Engine - Integration Tests & Bubble-Up', () => {
  let user;

  beforeEach(async () => {
    user = await User.create({
      name: 'Test Tester',
      email: `test_${Date.now()}_${Math.random()}@example.com`,
      passwordHash: 'hashed123',
    });
  });

  it('updates numeric goal progress and creates ProgressLog entry', async () => {
    const goal = await Goal.create({
      userId: user._id,
      title: 'Read 20 Books',
      type: 'year',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      progressMode: 'numeric',
      targetValue: 20,
      currentValue: 5,
    });

    await recalculateGoalProgress(goal._id, user._id, 'Read 5 books');

    const updated = await Goal.findById(goal._id);
    expect(updated.progressCache).toBe(25); // 5 / 20 = 25%

    const logs = await ProgressLog.find({ goalId: goal._id, userId: user._id });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const lastLog = logs[logs.length - 1];
    expect(lastLog.snapshotPercent).toBe(25);
    expect(lastLog.value).toBe(5);
  });

  it('correctly calculates 3-tier hierarchy and bubbles up recursively', async () => {
    // Grandparent Goal (Auto) -> Parent Goal (Auto) -> Child Goal (Numeric) + Direct Task
    const grandParent = await Goal.create({
      userId: user._id,
      title: 'Grandparent Goal: Master Software Engineering',
      type: 'year',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      progressMode: 'auto',
      weight: 1,
    });

    const parent = await Goal.create({
      userId: user._id,
      title: 'Parent Goal: Learn Backend Development',
      type: 'quarter',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-03-31'),
      parentId: grandParent._id,
      progressMode: 'auto',
      weight: 1,
    });

    const childNumeric = await Goal.create({
      userId: user._id,
      title: 'Child Goal: Complete 10 Backend Projects',
      type: 'month',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-31'),
      parentId: parent._id,
      progressMode: 'numeric',
      targetValue: 10,
      currentValue: 0,
      weight: 1,
    });

    const directTask = await Task.create({
      userId: user._id,
      title: 'Read Node.js Docs',
      goalId: parent._id,
      isCompleted: false,
      weight: 1,
    });

    // Initial state: 0%
    await recalculateGoalProgress(childNumeric._id, user._id);
    expect((await Goal.findById(childNumeric._id)).progressCache).toBe(0);
    expect((await Goal.findById(parent._id)).progressCache).toBe(0);
    expect((await Goal.findById(grandParent._id)).progressCache).toBe(0);

    // Update child numeric goal: currentValue = 10 (100%)
    childNumeric.currentValue = 10;
    await childNumeric.save();
    await recalculateGoalProgress(childNumeric._id, user._id, 'Finished all 10 projects');

    // Child is 100%
    const updatedChild = await Goal.findById(childNumeric._id);
    expect(updatedChild.progressCache).toBe(100);

    // Parent has 2 children: childNumeric (100%, weight 1) and directTask (0%, weight 1)
    // Parent progress = (100*1 + 0*1) / 2 = 50%
    const updatedParent = await Goal.findById(parent._id);
    expect(updatedParent.progressCache).toBe(50);

    // Grandparent has 1 child: parent (50%, weight 1)
    // Grandparent progress = 50%
    const updatedGrandParent = await Goal.findById(grandParent._id);
    expect(updatedGrandParent.progressCache).toBe(50);

    // Now toggle the task to complete (100%)
    directTask.isCompleted = true;
    await directTask.save();
    await recalculateGoalProgress(parent._id, user._id, 'Task completed');

    // Now Parent has 2 children both 100% -> Parent = 100%
    const parentAfterTask = await Goal.findById(parent._id);
    expect(parentAfterTask.progressCache).toBe(100);

    // Grandparent bubbles up to 100%
    const grandParentAfterTask = await Goal.findById(grandParent._id);
    expect(grandParentAfterTask.progressCache).toBe(100);

    // Verify ProgressLog exists for all 3 goals
    const grandParentLogs = await ProgressLog.find({ goalId: grandParent._id });
    expect(grandParentLogs.length).toBeGreaterThanOrEqual(2);
  });

  it('buildGoalTree builds nested tree correctly', async () => {
    const rootGoal = await Goal.create({
      userId: user._id,
      title: 'Root Goal',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
    });

    const childGoal = await Goal.create({
      userId: user._id,
      title: 'Child Goal',
      parentId: rootGoal._id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30'),
    });

    const task = await Task.create({
      userId: user._id,
      title: 'Task for child goal',
      goalId: childGoal._id,
      isCompleted: true,
    });

    const tree = await buildGoalTree(user._id);
    expect(tree).toHaveLength(1);
    expect(tree[0].title).toBe('Root Goal');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].title).toBe('Child Goal');
    expect(tree[0].children[0].tasks).toHaveLength(1);
    expect(tree[0].children[0].tasks[0].title).toBe('Task for child goal');
    expect(tree[0].children[0].tasks[0].progress).toBe(100);
  });
});
