import type { GoalType } from '../types/goal';

/**
 * Format a Date object to YYYY-MM-DD using local calendar values (not UTC).
 * Avoids the notorious UTC shift bug when converting local midnight to UTC.
 */
export const formatLocalDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
export const getTodayLocalDateString = (): string => {
  return formatLocalDate(new Date());
};

/**
 * Formats a date string (ISO or YYYY-MM-DD) into Vietnamese display format DD/MM/YYYY.
 */
export const formatDateVi = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Returns Monday 00:00:00 to Sunday 23:59:59.999 for the current week containing refDate.
 * Properly handles Sunday (day === 0 in JS Date) as the last day of the week.
 */
export const getStartAndEndOfWeek = (refDate = new Date()) => {
  const day = refDate.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const daysUntilSunday = day === 0 ? 0 : 7 - day;

  const start = new Date(refDate);
  start.setDate(refDate.getDate() - daysSinceMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(refDate);
  end.setDate(refDate.getDate() + daysUntilSunday);
  end.setHours(23, 59, 59, 999);

  return {
    start,
    end,
    startStr: formatLocalDate(start),
    endStr: formatLocalDate(end),
  };
};

/**
 * Returns first day 00:00:00 to last day 23:59:59.999 for the current month.
 */
export const getStartAndEndOfMonth = (refDate = new Date()) => {
  const start = new Date(refDate.getFullYear(), refDate.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59, 999);

  return {
    start,
    end,
    startStr: formatLocalDate(start),
    endStr: formatLocalDate(end),
  };
};

/**
 * Returns Jan 1st 00:00:00 to Dec 31st 23:59:59.999 for the current year.
 */
export const getStartAndEndOfYear = (refDate = new Date()) => {
  const start = new Date(refDate.getFullYear(), 0, 1, 0, 0, 0, 0);
  const end = new Date(refDate.getFullYear(), 11, 31, 23, 59, 59, 999);

  return {
    start,
    end,
    startStr: formatLocalDate(start),
    endStr: formatLocalDate(end),
  };
};

/**
 * Calculates accurate start and end dates for postponing a goal to the next period.
 * Completely immune to JavaScript setMonth date overflows (e.g. Jan 31 + 1 month -> Mar 3).
 */
export const getNextPeriodDates = (
  type: GoalType,
  curStartInput: string | Date,
  curEndInput: string | Date
) => {
  const curStart = new Date(curStartInput);
  const curEnd = new Date(curEndInput);
  const duration = curEnd.getTime() - curStart.getTime();

  let nextStart: Date;
  let nextEnd: Date;

  if (type === 'week') {
    nextStart = new Date(curStart);
    nextStart.setDate(curStart.getDate() + 7);
    nextEnd = new Date(curEnd);
    nextEnd.setDate(curEnd.getDate() + 7);
  } else if (type === 'month') {
    // Start on 1st of next month, end on last day of next month
    nextStart = new Date(curStart.getFullYear(), curStart.getMonth() + 1, 1, 0, 0, 0, 0);
    nextEnd = new Date(curStart.getFullYear(), curStart.getMonth() + 2, 0, 23, 59, 59, 999);
  } else if (type === 'quarter') {
    // Shift by 3 full calendar months
    nextStart = new Date(curStart.getFullYear(), curStart.getMonth() + 3, 1, 0, 0, 0, 0);
    nextEnd = new Date(curStart.getFullYear(), curStart.getMonth() + 6, 0, 23, 59, 59, 999);
  } else if (type === 'year') {
    // Next full year
    nextStart = new Date(curStart.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
    nextEnd = new Date(curStart.getFullYear() + 1, 11, 31, 23, 59, 59, 999);
  } else {
    // Custom: shift start to current end + 1 day, preserve duration
    nextStart = new Date(curEnd.getTime() + 86400000);
    nextEnd = new Date(nextStart.getTime() + Math.max(duration, 0));
  }

  return {
    nextStart,
    nextEnd,
    startStr: formatLocalDate(nextStart),
    endStr: formatLocalDate(nextEnd),
  };
};
