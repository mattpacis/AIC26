/** Calendar "today" uses the user's local date. */
export function getTodayParts() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate(),
  };
}

export function isBeforeToday(day: { year: number; month: number; day: number }) {
  const candidate = new Date(day.year, day.month, day.day);
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return candidate < todayStart;
}

/** @deprecated use getTodayParts() */
export const DEMO_TODAY = getTodayParts();
