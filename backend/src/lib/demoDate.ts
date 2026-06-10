/** Demo "today" for the Campus360 prototype (June 9, 2026). */
export const DEMO_TODAY = {
  year: 2026,
  month: 5,
  day: 9,
};

export function getDemoTodayStart() {
  return new Date(DEMO_TODAY.year, DEMO_TODAY.month, DEMO_TODAY.day, 0, 0, 0, 0);
}

export function isBeforeDemoToday(date: Date) {
  return date < getDemoTodayStart();
}
