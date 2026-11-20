/**
 * SM-2 Spaced Repetition Algorithm Implementation
 * Tailored for flashcard memorization in GoalCalendar Learn module.
 */

export const RATINGS = {
  AGAIN: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4,
};

/**
 * Calculates next SRS state based on SM-2 algorithm.
 *
 * @param {Object} currentSrs - Current SRS state from Card
 * @param {number} rating - Grade (1: Again, 2: Hard, 3: Good, 4: Easy)
 * @param {Date} [refDate=new Date()] - Date of review
 * @returns {Object} New SRS state
 */
export function calculateNextReview(currentSrs = {}, rating, refDate = new Date()) {
  const numericRating = Number(rating);
  if (![1, 2, 3, 4].includes(numericRating)) {
    throw new Error('Invalid rating. Rating must be 1 (Again), 2 (Hard), 3 (Good), or 4 (Easy).');
  }

  // Extract or default SRS parameters
  const srs = currentSrs?.srs ? currentSrs.srs : currentSrs;
  let easeFactor = typeof srs.easeFactor === 'number' && !isNaN(srs.easeFactor) ? srs.easeFactor : 2.5;
  let intervalDays = typeof srs.intervalDays === 'number' && !isNaN(srs.intervalDays) ? srs.intervalDays : 0;
  let repetitions = typeof srs.repetitions === 'number' && !isNaN(srs.repetitions) ? srs.repetitions : 0;
  let lapses = typeof srs.lapses === 'number' && !isNaN(srs.lapses) ? srs.lapses : 0;
  let status = srs.status || 'new';

  switch (numericRating) {
    case RATINGS.AGAIN: // 1: Again (Forgotten)
      repetitions = 0;
      lapses += 1;
      intervalDays = 1;
      easeFactor = Math.max(1.3, Number((easeFactor - 0.2).toFixed(2)));
      status = 'learning';
      break;

    case RATINGS.HARD: // 2: Hard (Recalled with significant difficulty)
      repetitions += 1;
      intervalDays = Math.max(1, Math.round((intervalDays || 1) * 1.2));
      easeFactor = Math.max(1.3, Number((easeFactor - 0.15).toFixed(2)));
      status = intervalDays >= 21 ? 'review' : 'learning';
      break;

    case RATINGS.GOOD: // 3: Good (Recalled with normal effort)
      repetitions += 1;
      if (repetitions === 1) {
        intervalDays = 1;
      } else if (repetitions === 2) {
        intervalDays = 6;
      } else {
        intervalDays = Math.round(intervalDays * easeFactor);
      }
      status = intervalDays >= 21 ? 'review' : 'learning';
      break;

    case RATINGS.EASY: // 4: Easy (Perfect recall with ease)
      repetitions += 1;
      if (repetitions === 1) {
        intervalDays = 4;
      } else {
        intervalDays = Math.round(intervalDays * easeFactor * 1.3);
      }
      easeFactor = Number((easeFactor + 0.15).toFixed(2));
      status = intervalDays >= 21 ? 'review' : 'learning';
      break;
  }

  const baseTime = refDate instanceof Date && !isNaN(refDate.getTime()) ? refDate.getTime() : Date.now();
  const dueDate = new Date(baseTime + intervalDays * 24 * 60 * 60 * 1000);
  const lastReviewedAt = new Date(baseTime);

  return {
    easeFactor,
    intervalDays,
    repetitions,
    lapses,
    status,
    dueDate,
    lastReviewedAt,
  };
}

/**
 * Preview intervals for all 4 ratings without committing changes.
 * Used by UI to display "+1 day", "+6 days", etc. on review buttons.
 *
 * @param {Object} currentSrs
 * @param {Date} [refDate=new Date()]
 * @returns {Record<number, { intervalDays: number, dueDate: Date }>}
 */
export function previewNextIntervals(currentSrs = {}, refDate = new Date()) {
  return {
    1: calculateNextReview(currentSrs, 1, refDate),
    2: calculateNextReview(currentSrs, 2, refDate),
    3: calculateNextReview(currentSrs, 3, refDate),
    4: calculateNextReview(currentSrs, 4, refDate),
  };
}
