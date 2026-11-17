export function expandEventOccurrences(event, fromDate, toDate) {
  const recurrence = event.recurrence;
  if (!recurrence || !recurrence.type || recurrence.type === 'none') {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    if (eventStart <= toDate && eventEnd >= fromDate) {
      const raw = event.toJSON ? event.toJSON() : { ...event };
      return [
        {
          ...raw,
          instanceId: raw._id ? raw._id.toString() : 'single',
          isRecurringInstance: false,
          originalId: raw._id,
        },
      ];
    }
    return [];
  }

  const occurrences = [];
  const baseStart = new Date(event.start);
  const baseEnd = new Date(event.end);
  const durationMs = Math.max(0, baseEnd.getTime() - baseStart.getTime());

  const recurrenceEnd = recurrence.endDate ? new Date(recurrence.endDate) : null;
  if (recurrenceEnd && recurrenceEnd < fromDate) {
    return [];
  }

  const effectiveEndLimit = recurrenceEnd && recurrenceEnd < toDate ? recurrenceEnd : toDate;

  if (recurrence.type === 'daily') {
    const interval = Math.max(1, recurrence.interval || 1);
    let curr = new Date(baseStart);

    if (curr < fromDate) {
      const diffMs = fromDate.getTime() - curr.getTime();
      const stepMs = interval * 24 * 60 * 60 * 1000;
      const jumpSteps = Math.floor(diffMs / stepMs);
      if (jumpSteps > 1) {
        curr = new Date(curr.getTime() + (jumpSteps - 1) * stepMs);
      }
    }

    let count = 0;
    while (curr <= effectiveEndLimit && count < 1000) {
      const occEnd = new Date(curr.getTime() + durationMs);
      if (curr <= toDate && occEnd >= fromDate && curr >= baseStart) {
        occurrences.push(createInstance(event, curr, occEnd, baseStart));
      }
      curr = new Date(curr.getTime() + interval * 24 * 60 * 60 * 1000);
      count++;
    }
  } else if (recurrence.type === 'weekdays') {
    let curr = new Date(baseStart);
    if (curr < fromDate) {
      const diffDays = Math.floor((fromDate.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays > 7) {
        const jumpDays = Math.floor(diffDays / 7) * 7;
        curr = new Date(curr.getTime() + jumpDays * 24 * 60 * 60 * 1000);
      }
    }

    let count = 0;
    while (curr <= effectiveEndLimit && count < 1000) {
      const day = curr.getDay();
      if (day >= 1 && day <= 5) {
        const occEnd = new Date(curr.getTime() + durationMs);
        if (curr <= toDate && occEnd >= fromDate && curr >= baseStart) {
          occurrences.push(createInstance(event, curr, occEnd, baseStart));
        }
      }
      curr = new Date(curr.getTime() + 24 * 60 * 60 * 1000);
      count++;
    }
  } else if (recurrence.type === 'weekly') {
    const interval = Math.max(1, recurrence.interval || 1);
    const daysOfWeek =
      Array.isArray(recurrence.daysOfWeek) && recurrence.daysOfWeek.length > 0
        ? recurrence.daysOfWeek
        : [baseStart.getDay()];

    let currWeekStart = new Date(baseStart);
    currWeekStart.setHours(0, 0, 0, 0);
    currWeekStart.setDate(currWeekStart.getDate() - currWeekStart.getDay());

    if (currWeekStart < fromDate) {
      const diffMs = fromDate.getTime() - currWeekStart.getTime();
      const weekStepMs = interval * 7 * 24 * 60 * 60 * 1000;
      const jumpWeeks = Math.floor(diffMs / weekStepMs);
      if (jumpWeeks > 1) {
        currWeekStart = new Date(currWeekStart.getTime() + (jumpWeeks - 1) * weekStepMs);
      }
    }

    let count = 0;
    while (currWeekStart <= effectiveEndLimit && count < 500) {
      for (const targetDay of daysOfWeek) {
        const occStart = new Date(currWeekStart);
        occStart.setDate(currWeekStart.getDate() + targetDay);
        occStart.setHours(
          baseStart.getHours(),
          baseStart.getMinutes(),
          baseStart.getSeconds(),
          baseStart.getMilliseconds()
        );

        if (occStart >= baseStart && occStart <= effectiveEndLimit) {
          const occEnd = new Date(occStart.getTime() + durationMs);
          if (occStart <= toDate && occEnd >= fromDate) {
            occurrences.push(createInstance(event, occStart, occEnd, baseStart));
          }
        }
      }
      currWeekStart = new Date(currWeekStart.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
      count++;
    }
  } else if (recurrence.type === 'monthly') {
    const interval = Math.max(1, recurrence.interval || 1);
    const dayOfMonth = baseStart.getDate();
    const baseYear = baseStart.getFullYear();
    const baseMonth = baseStart.getMonth();

    let step = 0;
    while (step < 240) {
      const targetMonthIndex = baseMonth + step * interval;
      // Calculate target date by clamping to last day of month if overflow
      const targetYear = baseYear + Math.floor(targetMonthIndex / 12);
      const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
      const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const actualDay = Math.min(dayOfMonth, lastDayOfTargetMonth);

      const occStart = new Date(
        targetYear,
        targetMonth,
        actualDay,
        baseStart.getHours(),
        baseStart.getMinutes(),
        baseStart.getSeconds(),
        baseStart.getMilliseconds()
      );

      if (occStart > effectiveEndLimit) {
        break;
      }

      if (occStart >= baseStart) {
        const occEnd = new Date(occStart.getTime() + durationMs);
        if (occStart <= toDate && occEnd >= fromDate) {
          occurrences.push(createInstance(event, occStart, occEnd, baseStart));
        }
      }
      step++;
    }
  } else if (recurrence.type === 'yearly') {
    const interval = Math.max(1, recurrence.interval || 1);
    const dayOfMonth = baseStart.getDate();
    const monthOfYear = baseStart.getMonth();
    const baseYear = baseStart.getFullYear();

    let step = 0;
    while (step < 100) {
      const targetYear = baseYear + step * interval;
      const lastDayOfTargetMonth = new Date(targetYear, monthOfYear + 1, 0).getDate();
      const actualDay = Math.min(dayOfMonth, lastDayOfTargetMonth);

      const occStart = new Date(
        targetYear,
        monthOfYear,
        actualDay,
        baseStart.getHours(),
        baseStart.getMinutes(),
        baseStart.getSeconds(),
        baseStart.getMilliseconds()
      );

      if (occStart > effectiveEndLimit) {
        break;
      }

      if (occStart >= baseStart) {
        const occEnd = new Date(occStart.getTime() + durationMs);
        if (occStart <= toDate && occEnd >= fromDate) {
          occurrences.push(createInstance(event, occStart, occEnd, baseStart));
        }
      }
      step++;
    }
  }

  // Sort occurrences by start date
  occurrences.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return occurrences;
}

function createInstance(event, occStart, occEnd, baseStart) {
  const raw = event.toJSON ? event.toJSON() : { ...event };
  const isBase = occStart.getTime() === baseStart.getTime();
  return {
    ...raw,
    _id: raw._id,
    instanceId: `${raw._id}_${occStart.getTime()}`,
    start: occStart,
    end: occEnd,
    isRecurringInstance: !isBase,
    originalId: raw._id,
  };
}
