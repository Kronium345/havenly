// Calendar dates as "YYYY-MM-DD" strings in the guest's own calendar. Formatted here
// rather than with Intl, so web, iOS and Android show the same words.

export type IsoDate = string;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const pad = (n: number) => String(n).padStart(2, "0");

export const isIsoDate = (value: unknown): value is IsoDate =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && toIso(fromIso(value)) === value;

/** Noon local time, so adding days never trips over daylight-saving changes. */
export function fromIso(value: IsoDate) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function toIso(date: Date): IsoDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const today = (): IsoDate => toIso(new Date());

export function addDays(value: IsoDate, days: number): IsoDate {
  const date = fromIso(value);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

export function nightsBetween(checkIn: IsoDate, checkOut: IsoDate) {
  return Math.round((fromIso(checkOut).getTime() - fromIso(checkIn).getTime()) / 86_400_000);
}

/** "Fri 14 Nov" */
export function shortDate(value: IsoDate) {
  const date = fromIso(value);
  return `${WEEKDAYS[date.getDay()].slice(0, 3)} ${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)}`;
}

/** "29 October 2026" (legal pages). */
export function fullDate(value: IsoDate) {
  const date = fromIso(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "Friday 14 November" */
export function longDate(value: IsoDate) {
  const date = fromIso(value);
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "14–17 Nov", "30 Nov – 2 Dec", with the year added when it isn't this year. */
export function dateRange(checkIn: IsoDate, checkOut: IsoDate) {
  const start = fromIso(checkIn);
  const end = fromIso(checkOut);
  const month = (d: Date) => MONTHS[d.getMonth()].slice(0, 3);
  const year = end.getFullYear() !== new Date().getFullYear() ? ` ${end.getFullYear()}` : "";
  const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  return sameMonth
    ? `${start.getDate()}–${end.getDate()} ${month(end)}${year}`
    : `${start.getDate()} ${month(start)} – ${end.getDate()} ${month(end)}${year}`;
}

export function monthTitle(year: number, monthIndex: number) {
  return `${MONTHS[monthIndex]} ${year}`;
}

/** The days to draw for a month, Monday first; `null` pads the first week. */
export function monthGrid(year: number, monthIndex: number): (IsoDate | null)[] {
  const first = new Date(year, monthIndex, 1, 12);
  const lead = (first.getDay() + 6) % 7; // Monday = 0
  const days = new Date(year, monthIndex + 1, 0, 12).getDate();
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => toIso(new Date(year, monthIndex, i + 1, 12))),
  ];
}

export const weekdayInitials = ["M", "T", "W", "T", "F", "S", "S"];
export const weekdayNamesMondayFirst = [...WEEKDAYS.slice(1), WEEKDAYS[0]];
