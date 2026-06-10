export type CalendarDay = {
  day: number;
  month: number;
  year: number;
  otherMonth: boolean;
};

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function buildCalendarGrid(viewYear: number, viewMonth: number): CalendarDay[] {
  const cells: CalendarDay[] = [];
  const first = new Date(viewYear, viewMonth, 1);
  const startOffset = first.getDay();

  for (let i = 0; i < startOffset; i++) {
    const date = new Date(viewYear, viewMonth, i - startOffset + 1);
    cells.push({
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      otherMonth: true,
    });
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, month: viewMonth, year: viewYear, otherMonth: false });
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    const date = new Date(last.year, last.month, last.day + 1);
    cells.push({
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      otherMonth: true,
    });
  }

  return cells;
}

export function sameCalendarDay(
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number },
) {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function dayKey(day: { year: number; month: number; day: number }) {
  return `${day.year}-${day.month}-${day.day}`;
}

export function formatSelectedDayLabel(day: CalendarDay) {
  return new Date(day.year, day.month, day.day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function matchesIsoOnDay(isoDate: string, day: CalendarDay) {
  const date = new Date(isoDate);
  return sameCalendarDay(
    { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() },
    day,
  );
}
