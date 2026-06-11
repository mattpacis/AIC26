/** Booking and availability use real current time (server clock). */
export function getTodayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

export function isBeforeToday(date: Date) {
  return date < getTodayStart();
}

export function isPastDateTime(date: Date) {
  return date.getTime() < Date.now();
}

/** @deprecated use getTodayStart() / current date helpers */
export const DEMO_TODAY = {
  get year() {
    return new Date().getFullYear();
  },
  get month() {
    return new Date().getMonth();
  },
  get day() {
    return new Date().getDate();
  },
};

export function getDemoTodayStart() {
  return getTodayStart();
}

export function isBeforeDemoToday(date: Date) {
  return isBeforeToday(date);
}
