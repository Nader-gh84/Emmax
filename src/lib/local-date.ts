/**
 * Timezone-aware calendar helpers for the Today page.
 * Server runtimes are often UTC; "today" must follow the user's IANA zone.
 */

export const USER_TIMEZONE_COOKIE = "emax_tz";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_ZONE_RE = /^[A-Za-z0-9_+\-]+(?:\/[A-Za-z0-9_+\-]+)*$/;

export function isValidDateKey(value: string | null | undefined): value is string {
  return Boolean(value && DATE_KEY_RE.test(value));
}

export function isValidTimeZone(value: string | null | undefined): value is string {
  if (!value || !TIME_ZONE_RE.test(value)) return false;
  try {
    Intl.DateTimeFormat("en-CA", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Calendar YYYY-MM-DD for an instant in an IANA time zone. */
export function toZonedDateKey(
  date: Date = new Date(),
  timeZone: string
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Runtime-local calendar key (browser = user local; server = host local).
 * Prefer `toZonedDateKey` once the user time zone is known.
 */
export function toLocalDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseDateKeyUtc(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0));
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const base = parseDateKeyUtc(dateKey);
  base.setUTCDate(base.getUTCDate() + days);
  return `${base.getUTCFullYear()}-${pad2(base.getUTCMonth() + 1)}-${pad2(
    base.getUTCDate()
  )}`;
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

/**
 * UTC instant for a civil date + clock time in `timeZone`
 * (e.g. 2026-08-09 00:00 in America/Vancouver).
 */
export function zonedDateTimeToUtc(
  dateKey: string,
  timeHms: string,
  timeZone: string
): Date {
  if (!isValidDateKey(dateKey)) {
    throw new Error(`Invalid dateKey: ${dateKey}`);
  }
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh = 0, mm = 0, ss = 0] = timeHms.split(":").map(Number);
  let guess = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh, mm, ss);

  for (let i = 0; i < 4; i += 1) {
    const parts = getZonedParts(new Date(guess), timeZone);
    const asUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    const target = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh, mm, ss);
    const delta = target - asUtc;
    if (delta === 0) break;
    guess += delta;
  }

  return new Date(guess);
}

/** Monday dateKey for the week that contains `dateKey` (Mon–Sun weeks). */
export function startOfWeekMondayDateKey(
  dateKey: string,
  timeZone: string
): string {
  const noon = zonedDateTimeToUtc(dateKey, "12:00:00", timeZone);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(noon);
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const offset = map[weekday] ?? 0;
  return addDaysToDateKey(dateKey, -offset);
}

export function dateKeyFromIsoInTimeZone(
  iso: string | null | undefined,
  timeZone: string
): string | null {
  if (!iso) return null;
  if (isValidDateKey(iso)) return iso;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return toZonedDateKey(date, timeZone);
}

export function detectBrowserTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (isValidTimeZone(tz)) return tz;
  } catch {
    // ignore
  }
  return "UTC";
}
