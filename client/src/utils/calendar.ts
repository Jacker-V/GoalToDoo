import { formatLocalDate } from './date';

export interface CalendarDayInfo {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * Returns full grid of days for a month (Monday to Sunday rows).
 * Always returns 35 or 42 days to form complete 5 or 6 weeks.
 */
export const getMonthDays = (year: number, month: number): CalendarDayInfo[] => {
  const todayStr = formatLocalDate(new Date());
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  // JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
  // In Monday-first calendar: Mon=0, Tue=1, ..., Sun=6
  const getMonFirstDayIndex = (d: Date) => {
    const day = d.getDay();
    return day === 0 ? 6 : day - 1;
  };

  const startDayIdx = getMonFirstDayIndex(firstOfMonth);
  const totalMonthDays = lastOfMonth.getDate();

  const days: CalendarDayInfo[] = [];

  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayIdx - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    const dateStr = formatLocalDate(d);
    days.push({
      date: d,
      dateStr,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Current month days
  for (let d = 1; d <= totalMonthDays; d++) {
    const dateObj = new Date(year, month, d);
    const dateStr = formatLocalDate(dateObj);
    days.push({
      date: dateObj,
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // Next month padding to complete 7-day columns (multiple of 7)
  const remaining = (7 - (days.length % 7)) % 7;
  // If we have 35 days and that covers all, fine; if not, we might end up with 35 or 42.
  // We can pad remaining days of current week:
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    const dateStr = formatLocalDate(d);
    days.push({
      date: d,
      dateStr,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Ensure 6 rows (42 days) if it was 35 and there's space, or keep at 35/42
  if (days.length === 35) {
    const lastDayPushed = days[days.length - 1].date;
    const startNext = lastDayPushed.getDate() + 1;
    for (let i = 0; i < 7; i++) {
      const d = new Date(year, month + 1, startNext + i);
      const dateStr = formatLocalDate(d);
      days.push({
        date: d,
        dateStr,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }
  }

  return days;
};

/**
 * Returns Monday to Sunday for the week containing refDate.
 */
export const getWeekDays = (refDate: Date): CalendarDayInfo[] => {
  const todayStr = formatLocalDate(new Date());
  const day = refDate.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  const monday = new Date(refDate);
  monday.setDate(refDate.getDate() - daysSinceMonday);

  const days: CalendarDayInfo[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = formatLocalDate(d);
    days.push({
      date: d,
      dateStr,
      dayNumber: d.getDate(),
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  return days;
};

/**
 * Formats a Date or ISO string to HH:mm
 */
export const formatTimeHHmm = (input?: string | Date | null): string => {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Checks if a targetDateStr (YYYY-MM-DD) falls between [startDate, endDate]
 */
export const isDateWithinInterval = (
  targetDateStr: string,
  startDateStr: string,
  endDateStr: string
): boolean => {
  const target = targetDateStr.split('T')[0];
  const start = startDateStr.split('T')[0];
  const end = endDateStr.split('T')[0];
  return target >= start && target <= end;
};

export const WEEKDAY_LABELS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
export const WEEKDAY_FULL_VI = [
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
  'Chủ Nhật',
];

export const MONTH_NAMES_VI = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];
