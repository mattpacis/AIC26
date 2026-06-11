import type { CalendarDay } from './calendar';

export function buildSlotStartsAtList(
  day: CalendarDay,
  startTime: string,
  durationMinutes: number,
  intervalMinutes = 30,
): string[] {
  const [hour, minute] = startTime.split(':').map((part) => Number.parseInt(part, 10));
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    durationMinutes <= 0 ||
    intervalMinutes <= 0
  ) {
    return [];
  }

  const start = new Date(day.year, day.month, day.day, hour, minute, 0, 0);
  const slots: string[] = [];

  for (let offset = 0; offset < durationMinutes; offset += intervalMinutes) {
    const slotTime = new Date(start.getTime() + offset * 60_000);
    slots.push(slotTime.toISOString());
  }

  return slots;
}

export function toTimeInputValue(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function slotIsoFromExistingDate(iso: string, timeValue: string) {
  const date = new Date(iso);
  const [hour, minute] = timeValue.split(':').map((part) => Number.parseInt(part, 10));
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute,
    0,
    0,
  ).toISOString();
}
