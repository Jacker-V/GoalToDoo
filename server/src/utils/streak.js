/**
 * Calculates consecutive completion streak and whether task is completed today.
 *
 * @param {Array<string>} dateStrings - Array of completion dates in 'YYYY-MM-DD' format
 * @param {Date} [refDate=new Date()] - Reference date (defaults to now)
 * @returns {{ streak: number, isCompletedToday: boolean }}
 */
export const calculateStreak = (dateStrings = [], refDate = new Date()) => {
  if (!dateStrings || !Array.isArray(dateStrings)) {
    return { streak: 0, isCompletedToday: false };
  }
  const datesSet = new Set(dateStrings);
  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatDate(refDate);
  const isCompletedToday = datesSet.has(todayStr);

  let checkDate = new Date(refDate);
  if (!isCompletedToday) {
    checkDate.setDate(checkDate.getDate() - 1);
    if (!datesSet.has(formatDate(checkDate))) {
      return { streak: 0, isCompletedToday: false };
    }
  }

  let streak = 0;
  while (datesSet.has(formatDate(checkDate))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return { streak, isCompletedToday };
};

/**
 * Calculates the longest consecutive streak of active days in history.
 *
 * @param {Array<string>} dateStrings - Array of completion dates in 'YYYY-MM-DD' format
 * @returns {number}
 */
export const calculateLongestStreak = (dateStrings = []) => {
  if (!dateStrings || !Array.isArray(dateStrings) || dateStrings.length === 0) {
    return 0;
  }

  const uniqueDates = Array.from(
    new Set(dateStrings.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)))
  ).sort();

  if (uniqueDates.length === 0) return 0;

  const parseDateToDays = (str) => {
    const [y, m, d] = str.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / (1000 * 60 * 60 * 24));
  };

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDays = parseDateToDays(uniqueDates[i - 1]);
    const currDays = parseDateToDays(uniqueDates[i]);
    const diff = currDays - prevDays;

    if (diff === 1) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else if (diff > 1) {
      currentStreak = 1;
    }
  }

  return maxStreak;
};

