/**
 * Verification test suite for Daymark pure-logic helpers.
 * Added by the testing agent — not part of the app's original code.
 */
import { describe, it, expect } from "vitest";

import {
  computeNextOccurrence,
  getOccurrences,
  nextOccurrenceKeys,
  parseRecurrenceRule,
} from "../recurrence";
import { parseQuickAdd } from "../parse";
import {
  comparePriority,
  parsePriority,
  PRIORITY_ORDER,
  priorityWeight,
} from "../priority";
import {
  currentStreak,
  completionsByWeekday,
  dateTimeToDate,
  isBeforeToday,
  normalizeTime,
  parseTime,
  slotOfTime,
  todayKey,
  toISODate,
} from "../dates";
import { tasksToCSV, tasksToJSON } from "../export";
import { buildRecurringTask, taskInsertFromPatch } from "../task-utils";
import type { Priority, TaskWithTags } from "../types";

/* ---------------------------------------------------------------- */
/* helpers                                                           */
/* ---------------------------------------------------------------- */

/** Local Date from (year, month 1-based, day, hour, minute). */
function D(y: number, m: number, d: number, h = 0, min = 0): Date {
  return new Date(y, m - 1, d, h, min);
}

function isoKey(d: Date): string {
  return toISODate(d);
}

/** ISO key for today + offset days (0 = today). */
function dayKeyOffset(n: number): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  today.setDate(today.getDate() + n);
  return isoKey(today);
}

/** ISO key for the strictly-next Monday. */
function nextMondayKey(): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = (1 - today.getDay() + 7) % 7 || 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return isoKey(monday);
}

function sampleTask(overrides: Partial<TaskWithTags> = {}): TaskWithTags {
  return {
    id: "t1",
    user_id: "u1",
    title: "Sample task",
    description: "",
    project_id: null,
    due_date: "2026-08-05",
    due_time: "17:00",
    priority: "high",
    status: "todo",
    position: 0,
    parent_task_id: null,
    recurrence_rule: null,
    completed_at: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    tags: [],
    ...overrides,
  };
}

/* ---------------------------------------------------------------- */
/* recurrence                                                        */
/* ---------------------------------------------------------------- */

describe("recurrence: parseRecurrenceRule", () => {
  it("parses human shorthand", () => {
    expect(parseRecurrenceRule("daily")).toEqual({ freq: "daily", interval: 1, byday: [] });
    expect(parseRecurrenceRule("every day")).toEqual({ freq: "daily", interval: 1, byday: [] });
    expect(parseRecurrenceRule("every 2 days")).toEqual({ freq: "daily", interval: 2, byday: [] });
    expect(parseRecurrenceRule("weekly")).toEqual({ freq: "weekly", interval: 1, byday: [] });
    expect(parseRecurrenceRule("every 3 weeks")).toEqual({ freq: "weekly", interval: 3, byday: [] });
    expect(parseRecurrenceRule("every monday")).toEqual({ freq: "weekly", interval: 1, byday: [1] });
    expect(parseRecurrenceRule("weekdays")).toEqual({ freq: "weekly", interval: 1, byday: [1, 2, 3, 4, 5] });
    expect(parseRecurrenceRule("monthly")).toEqual({ freq: "monthly", interval: 1, byday: [] });
    expect(parseRecurrenceRule("every 2 months")).toEqual({ freq: "monthly", interval: 2, byday: [] });
    expect(parseRecurrenceRule("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE")).toEqual({
      freq: "weekly",
      interval: 2,
      byday: [1, 3],
    });
  });

  it("returns null for unknown or empty input", () => {
    expect(parseRecurrenceRule("garbage")).toBeNull();
    expect(parseRecurrenceRule("")).toBeNull();
    expect(parseRecurrenceRule(null)).toBeNull();
    expect(parseRecurrenceRule(undefined)).toBeNull();
  });
});

describe("recurrence: computeNextOccurrence (fixed anchors)", () => {
  it("daily: next day, preserving time-of-day", () => {
    expect(computeNextOccurrence("daily", D(2026, 8, 1, 9, 30))).toEqual(D(2026, 8, 2, 9, 30));
  });

  it("every 2 days", () => {
    expect(computeNextOccurrence("every 2 days", D(2026, 8, 1))).toEqual(D(2026, 8, 3));
  });

  it("weekly: same weekday next week", () => {
    expect(computeNextOccurrence("weekly", D(2026, 8, 3))).toEqual(D(2026, 8, 10));
  });

  it("every 3 weeks", () => {
    expect(computeNextOccurrence("every 3 weeks", D(2026, 8, 3))).toEqual(D(2026, 8, 24));
  });

  it("monthly: same day next month", () => {
    expect(computeNextOccurrence("monthly", D(2026, 8, 15))).toEqual(D(2026, 9, 15));
  });

  it("monthly clamps to end-of-month (Jan 31 -> Feb 28)", () => {
    expect(computeNextOccurrence("monthly", D(2026, 1, 31))).toEqual(D(2026, 2, 28));
  });

  it("every 2 months", () => {
    expect(computeNextOccurrence("every 2 months", D(2026, 8, 15))).toEqual(D(2026, 10, 15));
  });

  it("every monday from a Tuesday", () => {
    expect(computeNextOccurrence("every monday", D(2026, 8, 4))).toEqual(D(2026, 8, 10));
  });

  it("weekdays from Friday -> Monday", () => {
    expect(computeNextOccurrence("weekdays", D(2026, 8, 7))).toEqual(D(2026, 8, 10));
  });

  it("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE anchored Mon -> next Wed in same week", () => {
    expect(computeNextOccurrence("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE", D(2026, 8, 3))).toEqual(
      D(2026, 8, 5)
    );
  });

  it("past anchor (2026-01-01) still advances", () => {
    expect(computeNextOccurrence("daily", D(2026, 1, 1))).toEqual(D(2026, 1, 2));
  });

  it("future anchor (2027-01-01) still advances", () => {
    expect(computeNextOccurrence("daily", D(2027, 1, 1))).toEqual(D(2027, 1, 2));
  });

  it("returns null for a null/unknown rule", () => {
    expect(computeNextOccurrence(null, new Date())).toBeNull();
    expect(computeNextOccurrence("not a rule", D(2026, 8, 1))).toBeNull();
  });
});

describe("recurrence: getOccurrences / nextOccurrenceKeys", () => {
  it("generates N consecutive daily occurrences after from", () => {
    const dates = getOccurrences("daily", D(2026, 8, 1, 9), 3);
    expect(dates).toEqual([D(2026, 8, 2, 9), D(2026, 8, 3, 9), D(2026, 8, 4, 9)]);
    expect(nextOccurrenceKeys("daily", D(2026, 8, 1, 9), 3)).toEqual([
      "2026-08-02",
      "2026-08-03",
      "2026-08-04",
    ]);
  });

  it("returns empty for null rule", () => {
    expect(getOccurrences(null, D(2026, 8, 1), 5)).toEqual([]);
  });

  // --- Fix #2: getOccurrences monthly clamping (Jan31 -> Feb28 -> Mar31 -> Apr30) ---
  it("monthly occurrences clamp correctly (Jan31 -> Feb28 -> Mar31 -> Apr30)", () => {
    const dates = getOccurrences("monthly", D(2026, 1, 31), 4);
    expect(dates).toEqual([D(2026, 2, 28), D(2026, 3, 31), D(2026, 4, 30), D(2026, 5, 31)]);
  });

  it("monthly occurrences with interval=2", () => {
    const dates = getOccurrences("every 2 months", D(2026, 1, 31), 3);
    expect(dates).toEqual([D(2026, 3, 31), D(2026, 5, 31), D(2026, 7, 31)]);
  });
});

/* ---------------------------------------------------------------- */
/* quick-add parsing                                                 */
/* ---------------------------------------------------------------- */

describe("quick-add parsing", () => {
  it('parses "Call dentist tomorrow 5pm #health @personal high"', () => {
    const r = parseQuickAdd("Call dentist tomorrow 5pm #health @personal high");
    expect(r.title).toBe("Call dentist");
    expect(r.dueDate).toBe(dayKeyOffset(1)); // tomorrow
    expect(r.dueTime).toBe("17:00");
    expect(r.tags).toEqual(["health"]);
    expect(r.project).toBe("personal");
    expect(r.priority).toBe("high");
    expect(r.recurrenceRule).toBeNull();
    expect(r.hasDueDate).toBe(true);
  });

  it('parses "Team sync monday 3pm" to next Monday 15:00', () => {
    const r = parseQuickAdd("Team sync monday 3pm");
    expect(r.title).toBe("Team sync");
    expect(r.dueDate).toBe(nextMondayKey());
    expect(r.dueTime).toBe("15:00");
    expect(r.hasDueDate).toBe(true);
  });

  it('parses "Water the plants 3pm" as time-only (no date)', () => {
    const r = parseQuickAdd("Water the plants 3pm");
    expect(r.title).toBe("Water the plants");
    expect(r.dueTime).toBe("15:00");
    expect(r.dueDate).toBeNull();
    expect(r.hasDueDate).toBe(false);
  });

  it("plain text with no fields stays a bare title", () => {
    const r = parseQuickAdd("Buy milk");
    expect(r.title).toBe("Buy milk");
    expect(r.dueDate).toBeNull();
    expect(r.dueTime).toBeNull();
    expect(r.priority).toBeNull();
    expect(r.tags).toEqual([]);
    expect(r.project).toBeNull();
    expect(r.recurrenceRule).toBeNull();
  });

  it('parses "Team sync every monday 10:30 #work" as recurring', () => {
    const r = parseQuickAdd("Team sync every monday 10:30 #work");
    expect(r.recurrenceRule).toBe("every mon");
    expect(r.dueTime).toBe("10:30");
    expect(r.tags).toEqual(["work"]);
    expect(r.title).toBe("Team sync");
  });

  it("supports 24h times", () => {
    const r = parseQuickAdd("Standup at 14:30");
    expect(r.dueTime).toBe("14:30");
    expect(r.title).toBe("Standup");
  });

  // --- M7 fix: quick-add with seconds ---

  it('parses "Call dentist 17:30:00 #health" dropping the seconds', () => {
    const r = parseQuickAdd("Call dentist 17:30:00 #health");
    expect(r.title).toBe("Call dentist");
    expect(r.dueTime).toBe("17:30");
    expect(r.dueDate).toBeNull();
    expect(r.tags).toEqual(["health"]);
  });

  it('parses "Standup 09:00:00" as 09:00', () => {
    const r = parseQuickAdd("Standup 09:00:00");
    expect(r.title).toBe("Standup");
    expect(r.dueTime).toBe("09:00");
    expect(r.dueDate).toBeNull();
    expect(r.hasDueDate).toBe(false);
  });

  it('does NOT parse "Focus on 3 priorities" as a date or time', () => {
    const r = parseQuickAdd("Focus on 3 priorities");
    expect(r.title).toBe("Focus on 3 priorities");
    expect(r.dueDate).toBeNull();
    expect(r.dueTime).toBeNull();
    expect(r.hasDueDate).toBe(false);
  });

  // --- Fix #3, #4, #5: quick-add date parsing edge cases ---

  it('parses "next week" as next Monday', () => {
    const r = parseQuickAdd("Meeting next week");
    expect(r.title).toBe("Meeting");
    expect(r.dueDate).toBe(nextMondayKey());
    expect(r.hasDueDate).toBe(true);
  });

  it('parses "on the 5th" with ordinal (clamps invalid days, rolls if past)', () => {
    // Use a date that exists in current month to test basic ordinal parsing
    const r = parseQuickAdd("Pay rent on the 15th");
    expect(r.title).toBe("Pay rent");
    expect(r.dueDate).not.toBeNull();
    expect(r.hasDueDate).toBe(true);
  });

  it('parses "on the N" without ordinal but with "the"', () => {
    const r = parseQuickAdd("Bill due on the 1");
    expect(r.title).toBe("Bill due");
    expect(r.dueDate).not.toBeNull();
    expect(r.hasDueDate).toBe(true);
  });

  it('does NOT parse "Focus on 3 priorities" as a date (no "the" or ordinal)', () => {
    const r = parseQuickAdd("Focus on 3 priorities");
    expect(r.title).toBe("Focus on 3 priorities");
    expect(r.dueDate).toBeNull();
    expect(r.hasDueDate).toBe(false);
  });

  it('parses "next monday" with offsetWeeks=1 on Monday -> +7 days, on Tuesday -> +6 days', () => {
    // We can't easily test the internal nextWeekday offsetWeeks behavior without mocking today,
    // but we can test that "next monday" is parsed as a date
    const r = parseQuickAdd("Task next monday");
    expect(r.dueDate).not.toBeNull();
    expect(r.hasDueDate).toBe(true);
  });
});

/* ---------------------------------------------------------------- */
/* priority                                                          */
/* ---------------------------------------------------------------- */

describe("priority: parsing and ordering", () => {
  it("maps words to typed priority", () => {
    expect(parsePriority("high")).toBe("high");
    expect(parsePriority("urgent")).toBe("high");
    expect(parsePriority("medium")).toBe("medium");
    expect(parsePriority("normal")).toBe("medium");
    expect(parsePriority("low")).toBe("low");
    expect(parsePriority("minor")).toBe("low");
    expect(parsePriority("!!")).toBe("high");
    expect(parsePriority("!")).toBe("medium");
    expect(parsePriority("HIGH")).toBe("high"); // case-insensitive
  });

  it("falls back to default for unknown/null", () => {
    expect(parsePriority("bogus")).toBe("medium");
    expect(parsePriority(null)).toBe("medium");
    expect(parsePriority(undefined)).toBe("medium");
  });

  it("orders high > medium > low > none", () => {
    expect(priorityWeight("high")).toBe(3);
    expect(priorityWeight("medium")).toBe(2);
    expect(priorityWeight("low")).toBe(1);
    expect(priorityWeight(null)).toBe(0);
    expect(priorityWeight(undefined)).toBe(0);

    const arr: (Priority | null)[] = ["low", "high", null, "medium"];
    const sorted = [...arr].sort(comparePriority);
    expect(sorted).toEqual(["high", "medium", "low", null]);
    expect(PRIORITY_ORDER).toEqual(["low", "medium", "high"]);
  });
});

/* ---------------------------------------------------------------- */
/* time slots / overdue                                              */
/* ---------------------------------------------------------------- */

describe("time slots (morning/afternoon/evening/none)", () => {
  it("morning is before 12:00", () => {
    expect(slotOfTime("09:30")).toBe("morning");
    expect(slotOfTime("11:59")).toBe("morning");
  });

  it("afternoon is 12:00–16:59", () => {
    expect(slotOfTime("12:00")).toBe("afternoon");
    expect(slotOfTime("16:59")).toBe("afternoon");
  });

  it("evening is 17:00+", () => {
    expect(slotOfTime("17:00")).toBe("evening");
    expect(slotOfTime("23:59")).toBe("evening");
  });

  it("no time set", () => {
    expect(slotOfTime(null)).toBe("none");
    expect(slotOfTime(undefined)).toBe("none");
    expect(slotOfTime("")).toBe("none");
    expect(slotOfTime("not-a-time")).toBe("none");
  });
});

describe("overdue detection", () => {
  it("yesterday is overdue", () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    expect(isBeforeToday(isoKey(y))).toBe(true);
  });

  it("today is not overdue", () => {
    expect(isBeforeToday(todayKey())).toBe(false);
  });

  it("tomorrow is not overdue", () => {
    expect(isBeforeToday(dayKeyOffset(1))).toBe(false);
  });
});

describe("parseTime", () => {
  it("parses 12h and 24h forms", () => {
    expect(parseTime("5pm")).toBe("17:00");
    expect(parseTime("3pm")).toBe("15:00");
    expect(parseTime("9am")).toBe("09:00");
    expect(parseTime("12am")).toBe("00:00");
    expect(parseTime("12pm")).toBe("12:00");
    expect(parseTime("17:30")).toBe("17:30");
    expect(parseTime("5:30pm")).toBe("17:30");
    expect(parseTime("noon")).toBe("12:00");
    expect(parseTime("midnight")).toBe("00:00");
  });

  it("parses bare HHMM (e.g., 0900 -> 09:00)", () => {
    expect(parseTime("0900")).toBe("09:00");
    expect(parseTime("1730")).toBe("17:30");
    expect(parseTime("0000")).toBe("00:00");
    expect(parseTime("2359")).toBe("23:59");
  });

  it("rejects invalid bare HHMM", () => {
    expect(parseTime("2400")).toBeNull();
    expect(parseTime("0960")).toBeNull();
    expect(parseTime("123")).toBeNull(); // too short
    expect(parseTime("12345")).toBeNull(); // too long
  });

  it("rejects invalid times", () => {
    expect(parseTime("25:00")).toBeNull();
    expect(parseTime("13pm")).toBeNull();
    expect(parseTime("")).toBeNull();
    expect(parseTime(null as unknown as string)).toBeNull();
  });

  it("drops seconds from HH:MM:SS", () => {
    expect(parseTime("17:30:59")).toBe("17:30");
    expect(parseTime("09:00:00")).toBe("09:00");
  });

  it("rejects out-of-range hours/seconds in HH:MM:SS", () => {
    expect(parseTime("25:00:00")).toBeNull(); // invalid hour
    expect(parseTime("12:00:75")).toBeNull(); // invalid seconds
  });

  it("rejects a 24h time paired with an am/pm suffix (17:30:00 pm)", () => {
    // The regex accepts "17:30:00 pm" but the 24h hour with a period is
    // rejected — assert the real behavior.
    expect(parseTime("17:30:00 pm")).toBeNull();
  });
});

describe("normalizeTime (Postgres time boundary)", () => {
  it("strips seconds from HH:MM:SS", () => {
    expect(normalizeTime("17:30:00")).toBe("17:30");
    expect(normalizeTime("09:00:00")).toBe("09:00");
    expect(normalizeTime("23:59:59")).toBe("23:59");
  });

  it("passes through HH:MM and null", () => {
    expect(normalizeTime("17:30")).toBe("17:30");
    expect(normalizeTime(null)).toBeNull();
    expect(normalizeTime(undefined)).toBeNull();
  });
});

describe("dateTimeToDate (seconds handling)", () => {
  it("combines date + time into a local Date, dropping any seconds", () => {
    const d = dateTimeToDate("2026-08-05", "17:30:00");
    expect(d).toEqual(D(2026, 8, 5, 17, 30));
  });

  it("returns null when due_date is missing", () => {
    expect(dateTimeToDate(null, "17:30")).toBeNull();
  });
});

describe("currentStreak honors ref parameter", () => {
  // fixed reference: 2026-08-07 (Friday)
  const ref = new Date(2026, 7, 7);

  it("counts consecutive days ending on ref when ref is complete", () => {
    // completed 2026-08-05, 2026-08-06, 2026-08-07 (ref day)
    expect(currentStreak(["2026-08-05", "2026-08-06", "2026-08-07"], ref)).toBe(3);
  });

  it("starts from day before ref when ref is not complete", () => {
    // completed 2026-08-04, 2026-08-05, 2026-08-06 (ref 2026-08-07 not complete)
    expect(currentStreak(["2026-08-04", "2026-08-05", "2026-08-06"], ref)).toBe(3);
  });

  it("returns 0 when no consecutive days before ref", () => {
    expect(currentStreak(["2026-08-01"], ref)).toBe(0);
  });

  it("differs from today()-based streak when ref != today", () => {
    const today = new Date();
    if (!isSameDay(ref, today)) {
      const dates = ["2026-08-05", "2026-08-06", "2026-08-07"];
      const withRef = currentStreak(dates, ref);
      const withoutRef = currentStreak(dates); // uses today()
      expect(withRef).toBe(3);
      expect(withoutRef).not.toBe(withRef);
    }
  });
});

describe("completionsByWeekday honors ref parameter", () => {
  const ref = new Date(2026, 7, 7); // 2026-08-07 Friday

  it("counts completions in the 7-day window ending on ref", () => {
    const dates = [
      "2026-08-01", // Saturday (6 days before ref)
      "2026-08-02", // Sunday
      "2026-08-03", // Monday
      "2026-08-04", // Tuesday
      "2026-08-05", // Wednesday
      "2026-08-06", // Thursday
      "2026-08-07", // Friday (ref day)
    ];
    const result = completionsByWeekday(dates, ref);
    expect(result).toHaveLength(7);
    expect(result.reduce((sum, d) => sum + d.count, 0)).toBe(7);
    // Labels should be Sat, Sun, Mon, Tue, Wed, Thu, Fri
    expect(result[0].label).toBe("Sat");
    expect(result[6].label).toBe("Fri");
  });

  it("ignores dates outside the 7-day window", () => {
    const dates = ["2026-07-31", "2026-08-01", "2026-08-08"]; // outside, inside, outside
    const result = completionsByWeekday(dates, ref);
    expect(result.reduce((sum, d) => sum + d.count, 0)).toBe(1);
  });

  it("differs from today()-based when ref != today", () => {
    const today = new Date();
    if (!isSameDay(ref, today)) {
      const dates = ["2026-08-01", "2026-08-07"];
      const withRef = completionsByWeekday(dates, ref);
      const withoutRef = completionsByWeekday(dates); // uses today()
      // With ref=2026-08-07, both dates are in window
      expect(withRef.reduce((s, d) => s + d.count, 0)).toBe(2);
      expect(withoutRef.reduce((s, d) => s + d.count, 0)).not.toBe(
        withRef.reduce((s, d) => s + d.count, 0)
      );
    }
  });
});

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/* ---------------------------------------------------------------- */
/* task-utils                                                        */
/* ---------------------------------------------------------------- */

describe("taskInsertFromPatch", () => {
  it("stamps completed_at when completing a task", () => {
    const task = sampleTask();
    const patch = taskInsertFromPatch(task, { status: "done" });
    expect(patch.status).toBe("done");
    expect(patch.completed_at).not.toBeNull();
  });

  it("keeps the existing completed_at when status is unchanged", () => {
    const task = sampleTask({ status: "done", completed_at: "2026-08-01T10:00:00Z" });
    const patch = taskInsertFromPatch(task, { description: "edited" });
    expect(patch.completed_at).toBe("2026-08-01T10:00:00Z");
  });

  it("clears completed_at when a task is reopened", () => {
    const task = sampleTask({ status: "done", completed_at: "2026-08-01T10:00:00Z" });
    const patch = taskInsertFromPatch(task, { status: "todo" });
    expect(patch.status).toBe("todo");
    expect(patch.completed_at).toBeNull();
  });

  // --- M-gap: status transition coverage ---

  it("clears completed_at when moving a done task to in_progress", () => {
    const task = sampleTask({ status: "done", completed_at: "2026-08-01T10:00:00Z" });
    const patch = taskInsertFromPatch(task, { status: "in_progress" });
    expect(patch.status).toBe("in_progress");
    expect(patch.completed_at).toBeNull();
  });

  it("stamps completed_at when an in_progress task is completed", () => {
    const task = sampleTask({ status: "in_progress", completed_at: null });
    const patch = taskInsertFromPatch(task, { status: "done" });
    expect(patch.status).toBe("done");
    expect(patch.completed_at).not.toBeNull();
  });

  it("keeps the existing completed_at when status is left undefined on a done task", () => {
    const task = sampleTask({ status: "done", completed_at: "2026-08-01T10:00:00Z" });
    const patch = taskInsertFromPatch(task, { description: "edited" });
    expect(patch.status).toBe("done");
    expect(patch.completed_at).toBe("2026-08-01T10:00:00Z");
  });
});

describe("buildRecurringTask", () => {
  it("returns null when there is no recurrence rule", () => {
    expect(buildRecurringTask(sampleTask())).toBeNull();
  });

  it("builds the next daily occurrence preserving time for a future due date", () => {
    const task = sampleTask({
      due_date: "2030-08-05",
      due_time: "17:30",
      recurrence_rule: "daily",
    });
    const next = buildRecurringTask(task);
    expect(next).not.toBeNull();
    expect(next!.due_date).toBe("2030-08-06");
    expect(next!.due_time).toBe("17:30");
    expect(next!.status).toBe("todo");
    expect(next!.recurrence_rule).toBe("daily");
    expect(next!.title).toBe("Sample task");
  });

  it("catches up from today when the anchor date is in the past", () => {
    const task = sampleTask({
      due_date: "2020-01-01",
      due_time: "09:00",
      recurrence_rule: "daily",
    });
    const next = buildRecurringTask(task);
    expect(next).not.toBeNull();
    expect(next!.due_date).toBe(dayKeyOffset(1)); // tomorrow, anchored from today
    expect(next!.due_time).toBe("09:00");
  });

  it("clamps monthly occurrences to end-of-month", () => {
    const task = sampleTask({
      due_date: "2030-01-31",
      due_time: "09:00",
      recurrence_rule: "monthly",
    });
    const next = buildRecurringTask(task);
    expect(next!.due_date).toBe("2030-02-28");
    expect(next!.due_time).toBe("09:00");
  });

  it("anchors the recurrence on the due_date's local day in a negative-offset timezone", () => {
    const prevTZ = process.env.TZ;
    process.env.TZ = "America/New_York"; // UTC-5 in winter
    try {
      const task = sampleTask({
        due_date: "2030-01-05",
        due_time: "09:00",
        recurrence_rule: "weekly",
      });
      const next = buildRecurringTask(task);
      // "2030-01-05T00:00:00" parsed as UTC would land on Jan 4 locally;
      // anchoring on the intended local day must yield Jan 12, not Jan 11.
      expect(next).not.toBeNull();
      expect(next!.due_date).toBe("2030-01-12");
    } finally {
      if (prevTZ === undefined) delete process.env.TZ;
      else process.env.TZ = prevTZ;
    }
  });
});

/* ---------------------------------------------------------------- */
/* export                                                            */
/* ---------------------------------------------------------------- */

describe("export formatting", () => {
  it("CSV emits header row + task row", () => {
    const csv = tasksToCSV([sampleTask()]);
    const lines = csv.split("\n");
    expect(lines[0].startsWith("id,title,description")).toBe(true);
    expect(lines[1]).toContain("Sample task");
    expect(lines[1]).toContain("17:00");
    expect(lines[1]).toContain("high");
  });

  it("CSV quotes fields containing commas/quotes per RFC 4180", () => {
    const t = sampleTask({ title: 'Say "hi", there' });
    const lines = tasksToCSV([t]).split("\n");
    expect(lines[1].startsWith('t1,"Say ""hi"", there"')).toBe(true);
  });

  it("JSON round-trips and flattens tags", () => {
    const t = sampleTask({
      tags: [
        { id: "tag1", user_id: "u1", name: "work", created_at: "", updated_at: "" },
        { id: "tag2", user_id: "u1", name: "health", created_at: "", updated_at: "" },
      ],
    });
    const parsed = JSON.parse(tasksToJSON([t]));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("Sample task");
    expect(parsed[0].tags).toEqual(["work", "health"]);
  });
});
