/**
 * Smart quick-add parser — pure, no React Native imports.
 *
 * Understands a single text field, e.g.:
 *   "Call dentist tomorrow 5pm #health @personal high"
 *   "Pay rent on the 1st every month"
 *   "Team sync every monday 10:30 #work"
 *
 * Returns a title plus structured fields. Unknown words stay in the title.
 */

import { addDays, fromISODate, parseTime, todayKey, weekdayName } from "./dates";
import type { Priority } from "./types";
import { parsePriority } from "./priority";

export interface QuickAddResult {
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: Priority | null;
  tags: string[];
  project: string | null;
  recurrenceRule: string | null;
  /** whether a due date was explicitly mentioned */
  hasDueDate: boolean;
}

const WEEKDAY_NUMS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/**
 * Compute the date for a weekday.
 * - offsetWeeks = 0: strictly next occurrence (e.g., "monday" on Monday → next Monday = +7)
 * - offsetWeeks > 0: the target day in the next calendar week, treating today
 *   as the start of the current week (e.g., "next monday" on Monday → +7,
 *   on Tuesday → +6, on Sunday → +1).
 */
function nextWeekday(weekday: number, offsetWeeks = 0): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayDay = today.getDay();

  if (offsetWeeks > 0) {
    // Days until the target weekday, counting from today's week.
    let diff = (weekday - todayDay + 7) % 7;
    // If today IS the target weekday, we mean next week's, not today.
    if (diff === 0) diff = 7;
    return toIso(addDays(today, diff + (offsetWeeks - 1) * 7));
  } else {
    // Plain "monday" - strictly next occurrence
    const diff = (weekday - todayDay + 7) % 7 || 7;
    return toIso(addDays(today, diff));
  }
}

function toIso(d: Date): string {
  return dayKeyFor(d);
}

function dayKeyFor(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Try to parse a compact date like "8/5", "8/5/2026", "aug 5", "5 aug", "2026-08-05". */
function parseExplicitDate(token: string): string | null {
  const t = token.toLowerCase().replace(/[.,]/g, "");
  // 2026-08-05
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return toIso(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  // 8/5 or 8/5/2026
  m = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (m) {
    const year = m[3] ? (Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3])) : new Date().getFullYear();
    return toIso(new Date(year, Number(m[1]) - 1, Number(m[2])));
  }
  // aug 5 / 5 aug
  const monthNames = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  m = t.match(/^([a-z]{3})\s+(\d{1,2})$/);
  if (m) {
    const month = monthNames.indexOf(m[1]);
    if (month >= 0) return toIso(new Date(new Date().getFullYear(), month, Number(m[2])));
  }
  m = t.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3})$/);
  if (m) {
    const month = monthNames.indexOf(m[2]);
    if (month >= 0) return toIso(new Date(new Date().getFullYear(), month, Number(m[1])));
  }
  return null;
}

function extractTags(input: string): { rest: string; tags: string[] } {
  const tags: string[] = [];
  const rest = input.replace(/#([\w-]+)/g, (_m, tag: string) => {
    tags.push(tag);
    return " ";
  });
  return { rest, tags };
}

function extractProject(input: string): { rest: string; project: string | null } {
  let project: string | null = null;
  const rest = input.replace(/@([\w-]+)/g, (_m, proj: string) => {
    project = proj;
    return " ";
  });
  return { rest, project };
}

/** Extract a due time ("5pm", "17:30", "17:30:00", "noon") with an optional "at". */
function extractTime(input: string): { rest: string; time: string | null } {
  // Two optional ":SS" groups so "17:30:00" is fully consumed (not left as
  // ":00" in the title); parseTime drops the seconds → "17:30". The second
  // alternative needs at least one ":SS" so bare numbers like "3" stay text.
  const m = input.match(
    /\b(?:at\s+)?(\d{1,2}(?::\d{2}){0,2}\s*(?:am|pm)|\d{1,2}(?::\d{2}){1,2}|noon|midnight)\b/i
  );
  if (!m) return { rest: input, time: null };
  const parsed = parseTime(m[1]);
  if (!parsed) return { rest: input, time: null };
  const rest = input.replace(m[0], " ");
  return { rest, time: parsed };
}

const RECUR_PATTERNS: { re: RegExp; label: string | null }[] = [
  { re: /\bevery\s+(?:day)\b/i, label: "daily" },
  { re: /\bevery\s+(?:weekday|weekdays)\b/i, label: "weekdays" },
  { re: /\bevery\s+(?:week)\b/i, label: "weekly" },
  { re: /\bevery\s+(?:month)\b/i, label: "monthly" },
  { re: /\bevery\s+(\d+)\s+days?\b/i, label: null },
  { re: /\bevery\s+(\d+)\s+weeks?\b/i, label: null },
  { re: /\bevery\s+(\d+)\s+months?\b/i, label: null },
  { re: /\bevery\s+(sun|mon|tue|wed|thu|fri|sat)(?:day)?\b/i, label: null },
  { re: /\b(daily)\b/i, label: "daily" },
  { re: /\b(weekly)\b/i, label: "weekly" },
  { re: /\b(monthly)\b/i, label: "monthly" },
  { re: /\b(weekdays)\b/i, label: "weekdays" },
];

function extractRecurrence(input: string): { rest: string; rule: string | null } {
  let rule: string | null = null;
  let rest = input;
  for (const { re, label } of RECUR_PATTERNS) {
    const match = rest.match(re);
    if (match) {
      if (label) {
        rule = label;
      } else if (match[1]) {
        const n = Number(match[1]);
        if (Number.isFinite(n)) {
          const unit = match[0].toLowerCase().includes("day")
            ? "days"
            : match[0].toLowerCase().includes("week")
              ? "weeks"
              : "months";
          rule = `every ${n} ${unit}`;
        } else {
          rule = `every ${match[1].toLowerCase()}`;
        }
      }
      rest = rest.replace(match[0], " ");
      break;
    }
  }
  return { rest, rule };
}

const PRIORITY_RE = /\b(high|medium|low|urgent|minor)\b/gi;

function extractPriority(input: string): { rest: string; priority: Priority | null } {
  let priority: Priority | null = null;
  let rest = input.replace(PRIORITY_RE, (m, word: string) => {
    const p = parsePriority(word, null as unknown as Priority);
    if (p) {
      priority = p;
      return " ";
    }
    return m;
  });
  // "!!" or "!" tokens
  const bang = rest.match(/!{1,3}/);
  if (bang) {
    if (!priority) priority = bang[0].length >= 2 ? "high" : "medium";
    rest = rest.replace(bang[0], " ");
  }
  return { rest, priority };
}

/** Extract a due-date mention. Run after time/tags/project. */
function extractDate(input: string): { rest: string; date: string | null } {
  let rest = input;
  let date: string | null = null;

  const patterns: { re: RegExp; compute: (m: RegExpMatchArray) => string | null }[] = [
    {
      re: /\bthe\s+day\s+after\s+tomorrow\b/i,
      compute: () => dayKeyFor(addDays(new Date(), 2)),
    },
    { re: /\bday\s+after\s+tomorrow\b/i, compute: () => dayKeyFor(addDays(new Date(), 2)) },
    { re: /\btomorrow\b/i, compute: () => dayKeyFor(addDays(new Date(), 1)) },
    { re: /\btoday\b/i, compute: () => todayKey() },
    // "next week" → next Monday (start of next week)
    {
      re: /\bnext\s+week\b/i,
      compute: () => nextWeekday(WEEKDAY_NUMS.monday, 1),
    },
    {
      re: /\bnext\s+(sun|mon|tue|wed|thu|fri|sat)(?:day)?\b/i,
      compute: (m) => nextWeekday(WEEKDAY_NUMS[m[1].toLowerCase()], 1),
    },
    { re: /\bin\s+(\d+)\s+days?\b/i, compute: (m) => dayKeyFor(addDays(new Date(), Number(m[1]))) },
    // "on the 5th" or "on 1st" - ordinal or with "the"
    {
      re: /\bon\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/i,
      compute: (m) => {
        const day = Number(m[1]);
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        // Create a date for this month with the given day
        let candidate = new Date(year, month, day);
        // If invalid day (e.g., Feb 31), clamp to last day of month
        if (candidate.getMonth() !== month) {
          candidate = new Date(year, month + 1, 0); // last day of current month
        }
        // If the date is in the past (≤ today), roll to next month
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (candidate <= todayDate) {
          // Next month
          const nextMonth = new Date(year, month + 1, day);
          if (nextMonth.getMonth() !== (month + 1) % 12) {
            nextMonth.setDate(0); // clamp to last day of next month
          }
          candidate = nextMonth;
        }
        return dayKeyFor(candidate);
      },
    },
    // "on the N" (without ordinal) - only when "the" is present
    {
      re: /\bon\s+the\s+(\d{1,2})\b/i,
      compute: (m) => {
        const day = Number(m[1]);
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        let candidate = new Date(year, month, day);
        if (candidate.getMonth() !== month) {
          candidate = new Date(year, month + 1, 0);
        }
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (candidate <= todayDate) {
          const nextMonth = new Date(year, month + 1, day);
          if (nextMonth.getMonth() !== (month + 1) % 12) {
            nextMonth.setDate(0);
          }
          candidate = nextMonth;
        }
        return dayKeyFor(candidate);
      },
    },
    {
      re: /\b(?:on\s+)?(sun|mon|tue|wed|thu|fri|sat)(?:day)?\b/i,
      compute: (m) => nextWeekday(WEEKDAY_NUMS[m[1].toLowerCase()]),
    },
  ];

  for (const { re, compute } of patterns) {
    const m = rest.match(re);
    if (m) {
      date = compute(m);
      rest = rest.replace(m[0], " ");
      break;
    }
  }

  // Explicit compact dates ("8/5", "aug 5") are token-level.
  if (!date) {
    const tokens = rest.split(/\s+/);
    for (const token of tokens) {
      const d = parseExplicitDate(token);
      if (d) {
        date = d;
        rest = rest.replace(token, " ");
        break;
      }
    }
  }

  return { rest, date };
}

/**
 * Parse a quick-add string into structured fields.
 */
export function parseQuickAdd(input: string): QuickAddResult {
  let rest = input.trim();
  const { rest: r1, tags } = extractTags(rest);
  rest = r1;
  const { rest: r2, project } = extractProject(rest);
  rest = r2;
  const { rest: r3, time } = extractTime(rest);
  rest = r3;
  const { rest: r4, rule } = extractRecurrence(rest);
  rest = r4;
  const { rest: r5, priority } = extractPriority(rest);
  rest = r5;
  const { rest: r6, date } = extractDate(rest);
  rest = r6;

  const title = rest.replace(/\s+/g, " ").trim();
  return {
    title,
    dueDate: date,
    dueTime: time,
    priority,
    tags,
    project,
    recurrenceRule: rule,
    hasDueDate: date !== null,
  };
}

/** Convenience: format a parsed result for preview text. */
export function describeParsed(r: QuickAddResult): string {
  const bits: string[] = [];
  if (r.dueDate) {
    const d = fromISODate(r.dueDate);
    bits.push(r.dueTime ? `${weekdayName(d, "short")} ${r.dueTime}` : weekdayName(d, "short"));
  }
  if (r.priority) bits.push(r.priority);
  for (const t of r.tags) bits.push(`#${t}`);
  if (r.project) bits.push(`@${r.project}`);
  if (r.recurrenceRule) bits.push("repeats");
  return bits.join(" · ");
}
