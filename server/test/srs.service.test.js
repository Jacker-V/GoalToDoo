import { describe, it, expect } from 'vitest';
import { calculateNextReview, previewNextIntervals, RATINGS } from '../src/modules/learn/services/srs.service.js';

describe('SM-2 SRS Algorithm (srs.service.js)', () => {
  const fixedNow = new Date('2026-11-18T10:00:00.000Z');

  describe('Rating 1: Again (Lại - Quên)', () => {
    it('resets repetitions to 0, increments lapses, sets interval to 1 day, decreases easeFactor by 0.2', () => {
      const initialSrs = {
        easeFactor: 2.5,
        intervalDays: 14,
        repetitions: 3,
        lapses: 0,
        status: 'review',
      };

      const result = calculateNextReview(initialSrs, RATINGS.AGAIN, fixedNow);

      expect(result.repetitions).toBe(0);
      expect(result.lapses).toBe(1);
      expect(result.intervalDays).toBe(1);
      expect(result.easeFactor).toBe(2.3);
      expect(result.status).toBe('learning');
      expect(result.lastReviewedAt.toISOString()).toBe(fixedNow.toISOString());

      const expectedDueDate = new Date(fixedNow.getTime() + 1 * 24 * 60 * 60 * 1000);
      expect(result.dueDate.toISOString()).toBe(expectedDueDate.toISOString());
    });

    it('enforces easeFactor floor at 1.3 on repeated failures', () => {
      let srs = {
        easeFactor: 1.4,
        intervalDays: 1,
        repetitions: 0,
        lapses: 2,
        status: 'learning',
      };

      srs = calculateNextReview(srs, RATINGS.AGAIN, fixedNow);
      expect(srs.easeFactor).toBe(1.3);
      expect(srs.lapses).toBe(3);

      // Again from 1.3 floor
      srs = calculateNextReview(srs, RATINGS.AGAIN, fixedNow);
      expect(srs.easeFactor).toBe(1.3);
      expect(srs.lapses).toBe(4);
    });
  });

  describe('Rating 2: Hard (Khó - Nhớ khó khăn)', () => {
    it('increments repetitions, scales interval by 1.2, decreases easeFactor by 0.15', () => {
      const initialSrs = {
        easeFactor: 2.5,
        intervalDays: 5,
        repetitions: 1,
        lapses: 0,
        status: 'learning',
      };

      const result = calculateNextReview(initialSrs, RATINGS.HARD, fixedNow);

      expect(result.repetitions).toBe(2);
      expect(result.lapses).toBe(0);
      // Math.max(1, Math.round(5 * 1.2)) = 6
      expect(result.intervalDays).toBe(6);
      expect(result.easeFactor).toBe(2.35);
      expect(result.status).toBe('learning');
    });

    it('handles initial card with interval 0 (scales Math.max(1, Math.round(1 * 1.2)) = 1)', () => {
      const initialSrs = {
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        lapses: 0,
        status: 'new',
      };

      const result = calculateNextReview(initialSrs, RATINGS.HARD, fixedNow);

      expect(result.repetitions).toBe(1);
      expect(result.intervalDays).toBe(1);
      expect(result.easeFactor).toBe(2.35);
      expect(result.status).toBe('learning');
    });

    it('promotes status to review when interval reaches >= 21 days', () => {
      const initialSrs = {
        easeFactor: 2.2,
        intervalDays: 18,
        repetitions: 3,
        lapses: 1,
        status: 'learning',
      };

      // 18 * 1.2 = 21.6 -> Math.round = 22
      const result = calculateNextReview(initialSrs, RATINGS.HARD, fixedNow);
      expect(result.intervalDays).toBe(22);
      expect(result.status).toBe('review');
    });

    it('enforces easeFactor floor at 1.3 for Hard rating', () => {
      const initialSrs = {
        easeFactor: 1.35,
        intervalDays: 5,
        repetitions: 2,
        lapses: 0,
      };

      const result = calculateNextReview(initialSrs, RATINGS.HARD, fixedNow);
      expect(result.easeFactor).toBe(1.3);
    });
  });

  describe('Rating 3: Good (Tốt - Nhớ đúng)', () => {
    it('sets interval to 1 on first successful repetition', () => {
      const initialSrs = {
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        lapses: 0,
        status: 'new',
      };

      const result = calculateNextReview(initialSrs, RATINGS.GOOD, fixedNow);
      expect(result.repetitions).toBe(1);
      expect(result.intervalDays).toBe(1);
      expect(result.easeFactor).toBe(2.5); // EaseFactor unchanged on Good
      expect(result.status).toBe('learning');
    });

    it('sets interval to 6 on second successful repetition', () => {
      const initialSrs = {
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 1,
        lapses: 0,
        status: 'learning',
      };

      const result = calculateNextReview(initialSrs, RATINGS.GOOD, fixedNow);
      expect(result.repetitions).toBe(2);
      expect(result.intervalDays).toBe(6);
      expect(result.easeFactor).toBe(2.5);
      expect(result.status).toBe('learning');
    });

    it('multiplies interval by easeFactor on third and subsequent repetitions', () => {
      const initialSrs = {
        easeFactor: 2.5,
        intervalDays: 6,
        repetitions: 2,
        lapses: 0,
        status: 'learning',
      };

      // repetitions becomes 3: interval = Math.round(6 * 2.5) = 15
      const result1 = calculateNextReview(initialSrs, RATINGS.GOOD, fixedNow);
      expect(result1.repetitions).toBe(3);
      expect(result1.intervalDays).toBe(15);
      expect(result1.status).toBe('learning');

      // repetitions becomes 4: interval = Math.round(15 * 2.5) = 38 (>= 21 => 'review')
      const result2 = calculateNextReview(result1, RATINGS.GOOD, fixedNow);
      expect(result2.repetitions).toBe(4);
      expect(result2.intervalDays).toBe(38);
      expect(result2.status).toBe('review');
    });
  });

  describe('Rating 4: Easy (Dễ - Nhớ rất sâu)', () => {
    it('sets interval to 4 on first repetition, increases easeFactor by 0.15', () => {
      const initialSrs = {
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        lapses: 0,
        status: 'new',
      };

      const result = calculateNextReview(initialSrs, RATINGS.EASY, fixedNow);
      expect(result.repetitions).toBe(1);
      expect(result.intervalDays).toBe(4);
      expect(result.easeFactor).toBe(2.65);
      expect(result.status).toBe('learning');
    });

    it('calculates interval with easeFactor * 1.3 bonus on subsequent repetitions', () => {
      const initialSrs = {
        easeFactor: 2.5,
        intervalDays: 6,
        repetitions: 2,
        lapses: 0,
        status: 'learning',
      };

      // Math.round(6 * 2.5 * 1.3) = Math.round(19.5) = 20
      const result = calculateNextReview(initialSrs, RATINGS.EASY, fixedNow);
      expect(result.repetitions).toBe(3);
      expect(result.intervalDays).toBe(20);
      expect(result.easeFactor).toBe(2.65);
      expect(result.status).toBe('learning');
    });

    it('promotes status to review when interval exceeds 21 days', () => {
      const initialSrs = {
        easeFactor: 2.5,
        intervalDays: 10,
        repetitions: 2,
        lapses: 0,
        status: 'learning',
      };

      // Math.round(10 * 2.5 * 1.3) = 33 -> 'review'
      const result = calculateNextReview(initialSrs, RATINGS.EASY, fixedNow);
      expect(result.intervalDays).toBe(33);
      expect(result.status).toBe('review');
    });
  });

  describe('Edge Cases and Input Validation', () => {
    it('throws error when rating is not in [1, 2, 3, 4]', () => {
      expect(() => calculateNextReview({}, 0)).toThrow();
      expect(() => calculateNextReview({}, 5)).toThrow();
      expect(() => calculateNextReview({}, 'invalid')).toThrow();
    });

    it('gracefully handles empty card object and applies defaults', () => {
      const result = calculateNextReview({}, 3, fixedNow);
      expect(result.easeFactor).toBe(2.5);
      expect(result.repetitions).toBe(1);
      expect(result.intervalDays).toBe(1);
      expect(result.lapses).toBe(0);
      expect(result.status).toBe('learning');
      expect(result.dueDate).toBeInstanceOf(Date);
      expect(result.lastReviewedAt).toBeInstanceOf(Date);
    });

    it('accepts full card object with nested srs field', () => {
      const card = {
        _id: 'card123',
        word: 'ubiquitous',
        srs: {
          easeFactor: 2.3,
          intervalDays: 10,
          repetitions: 3,
          lapses: 1,
          status: 'learning',
        },
      };

      const result = calculateNextReview(card, 3, fixedNow);
      expect(result.repetitions).toBe(4);
      expect(result.intervalDays).toBe(23); // Math.round(10 * 2.3) = 23
      expect(result.status).toBe('review');
    });

    it('previewNextIntervals returns accurate projection for all 4 ratings without side effects', () => {
      const initialSrs = {
        easeFactor: 2.5,
        intervalDays: 6,
        repetitions: 2,
        lapses: 1,
        status: 'learning',
      };

      const previews = previewNextIntervals(initialSrs, fixedNow);

      expect(previews[1].intervalDays).toBe(1);
      expect(previews[1].repetitions).toBe(0);

      expect(previews[2].intervalDays).toBe(7); // Math.round(6 * 1.2) = 7.2 -> 7
      expect(previews[2].repetitions).toBe(3);

      expect(previews[3].intervalDays).toBe(15); // Math.round(6 * 2.5) = 15
      expect(previews[3].repetitions).toBe(3);

      expect(previews[4].intervalDays).toBe(20); // Math.round(6 * 2.5 * 1.3) = 20
      expect(previews[4].repetitions).toBe(3);

      // Verify original object was untouched
      expect(initialSrs.repetitions).toBe(2);
      expect(initialSrs.easeFactor).toBe(2.5);
    });
  });
});
