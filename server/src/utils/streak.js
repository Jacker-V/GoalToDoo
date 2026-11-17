/**
 * Calculates consecutive completion streak and whether task is completed today.
 *
 * @param {Array<string>} dateStrings - Array of completion dates in 'YYYY-MM-DD' format
 * @param {Date} [refDate=new Date()] - Reference date (defaults to now)
 * @returns {{ streak: number, isCompletedToday: boolean }}
 */
export const calculateStreak = (dateStrings = [], refDate = new Date()) => {
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
