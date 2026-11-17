import { describe, it, expect } from 'vitest';
import { runSeed } from '../src/scripts/seed.js';
import { User } from '../src/models/user.model.js';
import { Category } from '../src/models/category.model.js';
import { Goal } from '../src/models/goal.model.js';
import { Task } from '../src/models/task.model.js';
import { Event } from '../src/models/event.model.js';
import { ProgressLog } from '../src/models/progressLog.model.js';
import { TaskCompletion } from '../src/models/taskCompletion.model.js';
import { calculateStreak } from '../src/utils/streak.js';

describe('Seed Script (seed.js)', () => {
  it('successfully seeds demo user, categories, goals, tasks, events, and streaks', async () => {
    const result = await runSeed();
    expect(result).toBeDefined();

    // 1. Verify User
    const user = await User.findOne({ email: 'demo@goalcalendar.com' }).select('+passwordHash');
    expect(user).toBeDefined();
    expect(user.name).toBe('Demo User');
    const isPasswordValid = await user.comparePassword('password123');
    expect(isPasswordValid).toBe(true);

    // 2. Verify 5 Standard Categories
    const categories = await Category.find({ userId: user._id });
    expect(categories.length).toBe(5);
    const categoryNames = categories.map((c) => c.name);
    expect(categoryNames).toContain('Công việc');
    expect(categoryNames).toContain('Sức khỏe');
    expect(categoryNames).toContain('Học tập');
    expect(categoryNames).toContain('Tài chính');
    expect(categoryNames).toContain('Cá nhân');

    // 3. Verify Hierarchical Goals
    const goals = await Goal.find({ userId: user._id });
    expect(goals.length).toBeGreaterThanOrEqual(6);

    const yearlySavings = goals.find((g) => g.title === 'Tiết kiệm 100 triệu');
    expect(yearlySavings).toBeDefined();
    expect(yearlySavings.progressMode).toBe('numeric');
    expect(yearlySavings.targetValue).toBe(100);
    expect(yearlySavings.currentValue).toBe(45);
    expect(yearlySavings.unit).toBe('triệu VNĐ');

    const weeklyRun = goals.find((g) => g.title === 'Chạy bộ 20km');
    expect(weeklyRun).toBeDefined();
    expect(weeklyRun.progressMode).toBe('numeric');
    expect(weeklyRun.targetValue).toBe(20);
    expect(weeklyRun.currentValue).toBe(15);
    expect(weeklyRun.unit).toBe('km');

    // 4. Verify Tasks & Habit Streak
    const tasks = await Task.find({ userId: user._id });
    expect(tasks.length).toBeGreaterThanOrEqual(7);

    const habitTask = tasks.find((t) => t.recurrence && t.recurrence.type === 'daily');
    expect(habitTask).toBeDefined();

    const streakCompletions = await TaskCompletion.find({
      userId: user._id,
      taskId: habitTask._id,
    });
    // At least 7 consecutive days
    expect(streakCompletions.length).toBeGreaterThanOrEqual(7);

    // Verify streak calculation returns 7
    const { streak } = calculateStreak(streakCompletions.map((c) => c.date));
    expect(streak).toBe(7);

    const subtaskTask = tasks.find((t) => t.subtasks && t.subtasks.length > 0);
    expect(subtaskTask).toBeDefined();
    expect(subtaskTask.subtasks.length).toBe(3);

    // 5. Verify Calendar Events
    const events = await Event.find({ userId: user._id });
    expect(events.length).toBeGreaterThanOrEqual(4);

    // 6. Verify Progress Logs
    const logs = await ProgressLog.find({ userId: user._id });
    expect(logs.length).toBeGreaterThanOrEqual(5);
  });

  it('is idempotent: running seed a second time cleanly replaces data without duplicate errors', async () => {
    // Run first time
    await runSeed();
    // Run second time immediately on top of existing data
    await runSeed();

    const userCount = await User.countDocuments({ email: 'demo@goalcalendar.com' });
    expect(userCount).toBe(1);

    const user = await User.findOne({ email: 'demo@goalcalendar.com' });
    const categories = await Category.find({ userId: user._id });
    expect(categories.length).toBe(5);

    const goals = await Goal.find({ userId: user._id });
    expect(goals.length).toBeGreaterThanOrEqual(6);
  });
});
