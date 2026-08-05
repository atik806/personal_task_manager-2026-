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
  isBeforeToday,
  parseTime,
  slotOfTime,
  todayKey,
  toISODate,
} from "../dates";
import { tasksToCSV, tasksToJSON } from "../export";
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

  it("rejects invalid times", () => {
    expect(parseTime("25:00")).toBeNull();
    expect(parseTime("13pm")).toBeNull();
    expect(parseTime("")).toBeNull();
    expect(parseTime(null as unknown as string)).toBeNull();
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
