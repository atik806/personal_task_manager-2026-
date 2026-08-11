/**
 * Pure date/time helpers. No React Native imports — unit-testable anywhere.
 */

export const DAY_MS = 86_400_000;

/** "2026-08-05" from a Date, local time. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse "2026-08-05" as a local Date at 00:00. */
export function fromISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Date for today at 00:00. */
export function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** "YYYY-MM-DD" for today, local. */
export function todayKey(): string {
  return toISODate(new Date());
}

/** "YYYY-MM-DD" for the given day offset (0 = today). */
export function dayKey(offsetDays: number): string {
  return toISODate(addDays(new Date(), offsetDays));
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameDayKey(a: string, b: string): boolean {
  return a === b;
}

/** Monday-start week. */
export function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  return out;
}

export function endOfWeek(d: Date): Date {
  return addDays(startOfWeek(d), 6);
}

export function isBeforeToday(key: string): boolean {
  return key < todayKey();
}

export function isTodayKey(key: string): boolean {
  return key === todayKey();
}

/**
 * Weekday name, short. `mode` = short ("Mon") or long ("Monday").
 */
export function weekdayName(d: Date, mode: "short" | "long" = "short"): string {
  const names =
    mode === "short"
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return names[d.getDay()];
}

export function monthName(d: Date, mode: "short" | "long" = "short"): string {
  const names =
    mode === "short"
      ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      : [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
  return names[d.getMonth()];
}

/** "Today", "Tomorrow", "Wed, Aug 5" */
export function formatDayLabel(key: string): string {
  if (key === todayKey()) return "Today";
  if (key === dayKey(1)) return "Tomorrow";
  if (key === dayKey(-1)) return "Yesterday";
  const d = fromISODate(key);
  const dayNum = d.getDate();
  return `${weekdayName(d, "short")}, ${monthName(d, "short")} ${dayNum}`;
}

/** "Wednesday, August 5" */
export function formatLongDate(key: string): string {
  const d = fromISODate(key);
  return `${weekdayName(d, "long")}, ${monthName(d, "long")} ${d.getDate()}`;
}

/** "Aug 5, 2026" */
export function formatShortDate(key: string): string {
  const d = fromISODate(key);
  return `${monthName(d, "short")} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "Aug 2026" */
export function formatMonthYear(d: Date): string {
  return `${monthName(d, "long")} ${d.getFullYear()}`;
}

/** 24h "HH:MM" from a Date. */
export function toTimeHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 12h display from "HH:MM", e.g. "17:30" -> "5:30 pm". */
export function formatTimeHHMM(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = mStr ?? "00";
  const period = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${period}`;
}

/**
 * Parse a time string into 24h "HH:MM".
 * Accepts "17:30", "17:30:00", "5pm", "5:30pm", "noon", "midnight", "0900" (bare HHMM).
 * Returns null when unparseable.
 */
export function parseTime(input: string): string | null {
  if (input == null) return null;
  const s = input.trim().toLowerCase();
  if (!s) return null;
  if (s === "noon") return "12:00";
  if (s === "midnight") return "00:00";
  // Accept bare 4-digit HHMM (e.g., "0900" -> "09:00")
  if (/^\d{4}$/.test(s)) {
    const h = Number(s.slice(0, 2));
    const min = Number(s.slice(2, 4));
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
      return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    }
    return null;
  }
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const sec = m[3] ? Number(m[3]) : 0;
  const period = m[4];
  if (h < 0 || h > 23 || min < 0 || min > 59 || sec < 0 || sec > 59) return null;
  if (period) {
    if (h < 1 || h > 12) return null;
    if (period === "pm" && h !== 12) h += 12;
    if (period === "am" && h === 12) h = 0;
  }
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/**
 * Normalize a `time` value to "HH:MM". Postgres serializes `time` columns as
 * "HH:MM:SS"; the app's UI and logic only understand "HH:MM". Returns null
 * when unparseable.
 */
export function normalizeTime(time: string | null | undefined): string | null {
  if (time == null) return null;
  const parsed = parseTime(time);
  return parsed;
}

/**
 * Combine due_date ("YYYY-MM-DD") + due_time ("HH:MM") into a local Date.
 * Returns null if due_date is missing.
 */
export function dateTimeToDate(dueDate: string | null, dueTime: string | null): Date | null {
  if (!dueDate) return null;
  const d = fromISODate(dueDate);
  if (dueTime) {
    const [h, m] = dueTime.split(":").map(Number);
    d.setHours(h ?? 0, m ?? 0, 0, 0);
  }
  return d;
}

/**
 * Which day-part slot a time falls into.
 * Morning: before 12:00 · Afternoon: 12:00–16:59 · Evening: 17:00+ · No time: null input.
 */
export type DaySlot = "morning" | "afternoon" | "evening" | "none";

export function slotOfTime(time: string | null | undefined): DaySlot {
  if (!time) return "none";
  const h = Number(time.split(":")[0]);
  if (Number.isNaN(h)) return "none";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export function slotLabel(slot: DaySlot): string {
  switch (slot) {
    case "morning":
      return "Morning";
    case "afternoon":
      return "Afternoon";
    case "evening":
      return "Evening";
    case "none":
      return "No time";
  }
}

export const SLOT_ORDER: DaySlot[] = ["morning", "afternoon", "evening", "none"];

/**
 * Sort a task's due time; tasks without a time go last.
 */
export function compareTime(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Week grid for the calendar (weeks are Monday-start). Returns consecutive dates.
 */
export function getWeekDates(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * Month grid for the calendar: an array of weeks, each a 7-day array of Dates.
 * Cells outside the month are still included (labelled dimly).
 */
export function getMonthGrid(anchor: Date): Date[][] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(addDays(start, w * 7 + d));
    }
    weeks.push(week);
  }
  return weeks;
}

/** Human reminder label from an offset in minutes ("30 min before", "1 day before"). */
export function formatReminderOffset(offsetMinutes: number): string {
  if (offsetMinutes % 1440 === 0) {
    const days = offsetMinutes / 1440;
    return `${days} day${days === 1 ? "" : "s"} before`;
  }
  if (offsetMinutes < 60) return `${offsetMinutes} min before`;
  const h = offsetMinutes / 60;
  return h % 1 === 0 ? `${h} hr before` : `${offsetMinutes} min before`;
}

/** Number of completed days in a row ending on `ref` (default: today). */
export function currentStreak(completedDates: string[], ref: Date = new Date()): number {
  const set = new Set(completedDates);
  let cursor = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  // If the reference day isn't complete yet, start from the day before.
  if (!set.has(toISODate(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (set.has(toISODate(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Number of tasks completed within the 7 days ending on `ref`, per weekday, for the dashboard chart. */
export function completionsByWeekday(
  completedAtDates: string[],
  ref: Date = new Date()
): { label: string; count: number }[] {
  const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const start = addDays(end, -6);
  const counts = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    counts.set(toISODate(addDays(start, i)), 0);
  }
  for (const date of completedAtDates) {
    if (counts.has(date)) counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([key, count]) => ({
    label: weekdayName(fromISODate(key), "short"),
    count,
  }));
}
