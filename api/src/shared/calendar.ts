// Calendar days are São Paulo days stored as UTC-midnight dates; months are
// month keys (year * 12 + zero-based month); money is summed in cents.
export const APP_TIME_ZONE = 'America/Sao_Paulo';

const calendarFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const toCents = (value: number) => Math.round(value * 100);
export const fromCents = (cents: number) => cents / 100;

/** Calendar day of an instant in the app time zone, as a UTC-midnight date. */
export function toCalendarDate(instant: Date) {
  const parts = calendarFormatter.formatToParts(instant);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type).value);

  return new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
}

export function getToday(now = new Date()) {
  return toCalendarDate(now);
}

export function toNoonUtc(calendarDate: Date) {
  return new Date(
    Date.UTC(
      calendarDate.getUTCFullYear(),
      calendarDate.getUTCMonth(),
      calendarDate.getUTCDate(),
      12,
    ),
  );
}

export function getMonthKey(date: Date) {
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

export function formatMonthKey(monthKey: number) {
  const year = Math.floor(monthKey / 12);
  const month = (monthKey % 12) + 1;

  return `${year}-${String(month).padStart(2, '0')}`;
}

export function parseMonthKey(value: string) {
  const [year, month] = value.split('-').map(Number);

  return year * 12 + (month - 1);
}

export function getMonthStart(monthKey: number) {
  return new Date(Date.UTC(Math.floor(monthKey / 12), monthKey % 12, 1));
}

/** Day of the month, moved to the last day in shorter months. */
export function getDayInMonth(monthKey: number, day: number) {
  const year = Math.floor(monthKey / 12);
  const month = monthKey % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}
