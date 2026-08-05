/**
 * Recurrence helpers — pure, no React Native imports.
 *
 * This is intentionally "RRULE-ish": it understands a small, documented subset
 * of RFC 5545 plus human shorthand:
 *
 *   - "daily" / "every day"                       FREQ=DAILY;INTERVAL=1
 *   - "every 2 days"                              FREQ=DAILY;INTERVAL=2
 *   - "weekly" / "every week"                     FREQ=WEEKLY;INTERVAL=1
 *   - "every 3 weeks"                             FREQ=WEEKLY;INTERVAL=3
 *   - "weekdays" / "every weekday"                FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
 *   - "every monday" / "every mon"                FREQ=WEEKLY;BYDAY=MO
 *   - "monthly" / "every month"                   FREQ=MONTHLY;INTERVAL=1
 *   - "every 2 months"                            FREQ=MONTHLY;INTERVAL=2
 *   - "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE"        full-ish form
 *
 * Time-of-day is preserved from the anchor date passed to the computation.
 */

import { addDays, startOfWeek, toISODate } from "./dates";

export type RecurFreq = "daily" | "weekly" | "monthly";

export interface ParsedRecurrence {
  freq: RecurFreq;
  interval: number;
  /** 0=Sun .. 6=Sat */
  byday: number[];
}

const WEEKDAY_NAMES: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

const SHORT_WEEKDAYS: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function defaultRule(freq: RecurFreq, interval = 1, byday: number[] = []): ParsedRecurrence {
  return { freq, interval: Math.max(1, Math.floor(interval) || 1), byday };
}

/**
 * Parse a recurrence_rule string. Returns null when not recognized.
 */
export function parseRecurrenceRule(rule: string | null | undefined): ParsedRecurrence | null {
  if (!rule) return null;
  const s = rule.trim();
  if (!s) return null;

  // Full-ish form: FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE
  const freqMatch = s.toUpperCase().match(/\bFREQ=(\w+)/);
  if (freqMatch) {
    const freqRaw = freqMatch[1];
    let freq: RecurFreq;
    if (freqRaw === "DAILY") freq = "daily";
    else if (freqRaw === "WEEKLY") freq = "weekly";
    else if (freqRaw === "MONTHLY") freq = "monthly";
    else return null;
    const intervalMatch = s.toUpperCase().match(/\bINTERVAL=(\d+)/);
    const interval = intervalMatch ? Number(intervalMatch[1]) : 1;
    const bydayMatch = s.toUpperCase().match(/\bBYDAY=([A-Z,]+)/);
    const byday = bydayMatch
      ? bydayMatch[1]
          .split(",")
          .map((d) => WEEKDAY_NAMES[d.trim()])
          .filter((d): d is number => d !== undefined)
      : [];
    return defaultRule(freq, interval, byday);
  }

  const lower = s.toLowerCase();

  // weekdays / every weekday
  if (/^(every )?weekdays?$/.test(lower)) {
    return defaultRule("weekly", 1, [1, 2, 3, 4, 5]);
  }

  // every monday / every mon / monday
  const weekdayMatch = lower.match(/^every\s+(sun|mon|tue|wed|thu|fri|sat)/);
  if (weekdayMatch) {
    return defaultRule("weekly", 1, [SHORT_WEEKDAYS[weekdayMatch[1]]]);
  }
  const bareWeekday = lower.match(/^(sun|mon|tue|wed|thu|fri|sat)$/);
  if (bareWeekday) {
    return defaultRule("weekly", 1, [SHORT_WEEKDAYS[bareWeekday[1]]]);
  }

  // every N days/weeks/months
  const everyMatch = lower.match(/^every\s+(\d+)\s+(day|days|week|weeks|month|months)$/);
  if (everyMatch) {
    const n = Number(everyMatch[1]);
    const unit = everyMatch[2];
    if (unit.startsWith("day")) return defaultRule("daily", n);
    if (unit.startsWith("week")) return defaultRule("weekly", n);
    if (unit.startsWith("month")) return defaultRule("monthly", n);
  }

  // simple keywords
  if (/^daily$/.test(lower) || /^every day$/.test(lower)) return defaultRule("daily", 1);
  if (/^weekly$/.test(lower) || /^every week$/.test(lower)) return defaultRule("weekly", 1);
  if (/^monthly$/.test(lower) || /^every month$/.test(lower)) return defaultRule("monthly", 1);

  return null;
}

/** Human label for a parsed rule ("Daily", "Every 2 days", "Weekly on Mon, Wed"). */
export function recurrenceLabel(rule: string | null | undefined): string {
  const p = parseRecurrenceRule(rule);
  if (!p) return "Does not repeat";
  switch (p.freq) {
    case "daily":
      return p.interval === 1 ? "Daily" : `Every ${p.interval} days`;
    case "weekly":
      if (p.byday.length) {
        const days = p.byday
          .map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
          .join(", ");
        return p.interval === 1 ? `Weekly on ${days}` : `Every ${p.interval} weeks on ${days}`;
      }
      return p.interval === 1 ? "Weekly" : `Every ${p.interval} weeks`;
    case "monthly":
      return p.interval === 1 ? "Monthly" : `Every ${p.interval} months`;
  }
}

/** Count of whole days between two dates (b - a), ignoring time. */
function daysBetween(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86_400_000);
}

/** Does `candidate` (a day) satisfy `rule` anchored at `anchor`? */
function dayMatches(rule: ParsedRecurrence, anchor: Date, candidate: Date): boolean {
  const weekday = candidate.getDay();
  if (rule.byday.length && !rule.byday.includes(weekday)) return false;

  switch (rule.freq) {
    case "daily": {
      const delta = daysBetween(anchor, candidate);
      return delta >= 0 && delta % rule.interval === 0;
    }
    case "weekly": {
      const anchorWeek = startOfWeek(anchor);
      const candWeek = startOfWeek(candidate);
      const weekDelta = Math.round(daysBetween(anchorWeek, candWeek) / 7);
      if (weekDelta < 0 || weekDelta % rule.interval !== 0) return false;
      // Without BYDAY, WEEKLY recurs on the anchor's own weekday
      // (DTSTART + N*interval weeks), not on any day of the matching week.
      if (!rule.byday.length) return candidate.getDay() === anchor.getDay();
      return true;
    }
    case "monthly": {
      const anchorDay = anchor.getDate();
      const monthsDelta =
        (candidate.getFullYear() - anchor.getFullYear()) * 12 +
        (candidate.getMonth() - anchor.getMonth());
      if (monthsDelta < 0 || monthsDelta % rule.interval !== 0) return false;
      const lastDayOfCandMonth = new Date(
        candidate.getFullYear(),
        candidate.getMonth() + 1,
        0
      ).getDate();
      const effectiveDay = Math.min(anchorDay, lastDayOfCandMonth);
      if (candidate.getDate() !== effectiveDay) return false;
      // If a BYDAY is present, the candidate must also land on that weekday.
      if (rule.byday.length && !rule.byday.includes(weekday)) return false;
      return true;
    }
  }
}

/** Next occurrence strictly after `from`, preserving `from`'s time-of-day. */
export function computeNextOccurrence(
  rule: string | null | undefined,
  from: Date,
  maxDaysAhead = 366 * 5
): Date | null {
  const parsed = parseRecurrenceRule(rule);
  if (!parsed) return null;
  const anchor = from;
  const candidate = addDays(anchor, 1);
  for (let i = 0; i < maxDaysAhead; i++) {
    const day = addDays(candidate, i);
    if (dayMatches(parsed, anchor, day)) {
      const out = new Date(day);
      out.setHours(from.getHours(), from.getMinutes(), from.getSeconds(), from.getMilliseconds());
      return out;
    }
  }
  return null;
}

/** Generate the next `count` occurrences after `from`. */
export function getOccurrences(
  rule: string | null | undefined,
  from: Date,
  count = 5
): Date[] {
  const out: Date[] = [];
  if (!rule) return out;
  let cursor = from;
  for (let i = 0; i < count; i++) {
    const next = computeNextOccurrence(rule, cursor);
    if (!next) break;
    out.push(next);
    cursor = next;
  }
  return out;
}

/** ISO date keys of the next `count` occurrences. */
export function nextOccurrenceKeys(rule: string | null | undefined, from: Date, count = 5): string[] {
  return getOccurrences(rule, from, count).map((d) => toISODate(d));
}
