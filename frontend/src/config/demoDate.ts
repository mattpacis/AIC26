/** Demo "today" for the Campus360 prototype (June 9, 2026). */
export const DEMO_TODAY = {
  year: 2026,
  month: 5,
  day: 9,
};

export function isBeforeDemoToday(day: {
  year: number;
  month: number;
  day: number;
}) {
  const candidate = new Date(day.year, day.month, day.day);
  const today = new Date(DEMO_TODAY.year, DEMO_TODAY.month, DEMO_TODAY.day);
  return candidate < today;
}
