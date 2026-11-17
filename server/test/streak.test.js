import { describe, it, expect } from 'vitest';
import { calculateStreak } from '../src/controllers/task.controller.js';

describe('Streak Calculation Engine - Unit Tests', () => {
  const refDate = new Date('2026-11-17T12:00:00Z');

  it('returns 0 streak and false when no completions exist', () => {
    const result = calculateStreak([], refDate);
    expect(result.streak).toBe(0);
    expect(result.isCompletedToday).toBe(false);
  });

  it('returns 1 streak and true when completed only today', () => {
    const result = calculateStreak(['2026-11-17'], refDate);
    expect(result.streak).toBe(1);
    expect(result.isCompletedToday).toBe(true);
  });

  it('returns 1 streak and false when completed yesterday but not today', () => {
    const result = calculateStreak(['2026-11-16'], refDate);
    expect(result.streak).toBe(1);
    expect(result.isCompletedToday).toBe(false);
  });

  it('calculates multi-day streak including today', () => {
    const dates = ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17'];
    const result = calculateStreak(dates, refDate);
    expect(result.streak).toBe(4);
    expect(result.isCompletedToday).toBe(true);
  });

  it('calculates multi-day streak ending yesterday (not yet done today)', () => {
    const dates = ['2026-11-14', '2026-11-15', '2026-11-16'];
    const result = calculateStreak(dates, refDate);
    expect(result.streak).toBe(3);
    expect(result.isCompletedToday).toBe(false);
  });

  it('breaks streak when a gap exists between dates', () => {
    // Gap on 2026-11-16: only 15th and 17th completed
    const dates = ['2026-11-15', '2026-11-17'];
    const result = calculateStreak(dates, refDate);
    expect(result.streak).toBe(1);
    expect(result.isCompletedToday).toBe(true);
  });

  it('resets streak to 0 if last completed was 2 or more days ago', () => {
    const dates = ['2026-11-14', '2026-11-15']; // today is 17th, yesterday 16th missing
    const result = calculateStreak(dates, refDate);
    expect(result.streak).toBe(0);
    expect(result.isCompletedToday).toBe(false);
  });

  it('handles duplicate completion dates gracefully', () => {
    const dates = ['2026-11-17', '2026-11-17', '2026-11-16', '2026-11-16'];
    const result = calculateStreak(dates, refDate);
    expect(result.streak).toBe(2);
    expect(result.isCompletedToday).toBe(true);
  });

  it('handles null dateStrings safely', () => {
    const result = calculateStreak(null, refDate);
    expect(result.streak).toBe(0);
    expect(result.isCompletedToday).toBe(false);
  });

  it('correctly calculates streak across month and leap-year boundaries', () => {
    // Leap year 2024: Feb 28, Feb 29, Mar 1
    const leapRef = new Date('2024-03-01T10:00:00Z');
    const dates = ['2024-02-28', '2024-02-29', '2024-03-01'];
    const result = calculateStreak(dates, leapRef);
    expect(result.streak).toBe(3);
    expect(result.isCompletedToday).toBe(true);
  });
});
