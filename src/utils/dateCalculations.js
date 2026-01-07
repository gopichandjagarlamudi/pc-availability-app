/**
 * Core date calculation logic for the availability collection system
 * Week structure: Sunday to Saturday
 * Collection cycle: Always collect for 2 weeks, 2 weeks in advance
 */

/**
 * Get the Sunday of the week containing the given date
 */
export function getWeekStartDate(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day; // Sunday is 0
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the Saturday of the week containing the given date
 */
export function getWeekEndDate(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = 6 - day; // Saturday is 6
  d.setDate(d.getDate() + diff);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Calculate which week number (1-based) since a reference date
 * Week 1 starts on the Sunday of the week containing Jan 1, 2026
 * (For 2026, that's Sun Dec 28, 2025.)
 */
export function getWeekNumber(date = new Date()) {
  // Reference: Sunday of the week containing Jan 1, 2026
  // This matches the documented example timeline where "Week 1" is Dec 28 - Jan 3.
  // Use the numeric Date constructor to avoid timezone shifts from parsing YYYY-MM-DD as UTC.
  const referenceDate = new Date(2025, 11, 28); // Dec 28, 2025 (local time)
  const weekStart = getWeekStartDate(date);

  const diffTime = weekStart - referenceDate;
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));

  return diffWeeks + 1;
}

/**
 * Check if current date is in an odd week (1, 3, 5, 7...)
 */
export function isOddWeek(date = new Date()) {
  const weekNum = getWeekNumber(date);
  return weekNum % 2 === 1;
}

/**
 * Get the collection period dates based on current date
 * Returns { start, end, weekNumbers } for the 2-week period to collect
 */
export function getCollectionPeriod(date = new Date()) {
  const currentWeekNum = getWeekNumber(date);

  // If in odd week (1, 3, 5...), collect for weeks N+2 and N+3
  // If in even week (2, 4, 6...), still collecting for same period as previous odd week
  const baseWeek = currentWeekNum % 2 === 1 ? currentWeekNum : currentWeekNum - 1;
  const targetWeekStart = baseWeek + 2;
  const targetWeekEnd = baseWeek + 3;

  // Calculate the actual dates
  const referenceDate = new Date(2025, 11, 28); // Dec 28, 2025 (local time)
  const startDate = new Date(referenceDate);
  startDate.setDate(startDate.getDate() + (targetWeekStart - 1) * 7);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 13); // 14 days total
  endDate.setHours(23, 59, 59, 999);

  return {
    start: startDate,
    end: endDate,
    weekNumbers: [targetWeekStart, targetWeekEnd],
    cycleId: `W${targetWeekStart}-${targetWeekEnd}`
  };
}

/**
 * Get the deadline for the current submission period
 * Deadline is Saturday 11:59 PM of the current odd week
 */
export function getSubmissionDeadline(date = new Date()) {
  const currentWeekNum = getWeekNumber(date);
  const oddWeekNum = currentWeekNum % 2 === 1 ? currentWeekNum : currentWeekNum - 1;

  const referenceDate = new Date(2025, 11, 28); // Dec 28, 2025 (local time)
  const oddWeekStart = new Date(referenceDate);
  oddWeekStart.setDate(oddWeekStart.getDate() + (oddWeekNum - 1) * 7);

  const deadline = new Date(oddWeekStart);
  deadline.setDate(deadline.getDate() + 6); // Saturday
  deadline.setHours(23, 59, 59, 999);

  return deadline;
}

/**
 * Check if the submission form should be locked
 * Locks after Saturday 11:59 PM of odd weeks
 */
export function isSubmissionLocked(date = new Date()) {
  const deadline = getSubmissionDeadline(date);
  return date > deadline;
}

/**
 * Get the next submission open date (Sunday of next odd week)
 */
export function getNextSubmissionOpenDate(date = new Date()) {
  const currentWeekNum = getWeekNumber(date);

  // Find the next odd week
  let nextOddWeek;
  if (currentWeekNum % 2 === 1) {
    // Currently in odd week, next is in 2 weeks
    nextOddWeek = currentWeekNum + 2;
  } else {
    // Currently in even week, next is in 1 week
    nextOddWeek = currentWeekNum + 1;
  }

  const referenceDate = new Date(2025, 11, 28); // Dec 28, 2025 (local time)
  const nextOpenDate = new Date(referenceDate);
  nextOpenDate.setDate(nextOpenDate.getDate() + (nextOddWeek - 1) * 7);
  nextOpenDate.setHours(0, 0, 0, 0);

  return nextOpenDate;
}

/**
 * Generate array of dates for the collection period
 */
export function getCollectionDates(date = new Date()) {
  const { start, end } = getCollectionPeriod(date);
  const dates = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Format date for display (e.g., "Sun Jan 11")
 */
export function formatDateDisplay(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return `${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Format date for storage (YYYY-MM-DD)
 */
export function formatDateStorage(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date for display with year (e.g., "Jan 11, 2026")
 */
export function formatDateFull(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
