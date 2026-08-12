/**
 * Regression tests for notification scheduling helpers (nextReminderAt,
 * scheduleKey). The module imports expo-notifications + react-native, so both
 * are mocked; Platform.OS is "web" so the import-time setNotificationHandler
 * block is skipped.
 */
import { describe, it, expect, vi } from "vitest";

import { dateTimeToDate } from "../dates";
import { nextReminderAt, scheduleKey } from "../notifications";
import type { TaskWithTags } from "../types";

vi.mock("react-native", () => ({
  Platform: { OS: "web" },
}));

vi.mock("expo-notifications", () => ({
  setNotificationHandler: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
  setNotificationCategoryAsync: vi.fn(),
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
  getAllScheduledNotificationsAsync: vi.fn(),
  cancelAllScheduledNotificationsAsync: vi.fn(),
  cancelScheduledNotificationAsync: vi.fn(),
  addNotificationResponseReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: "date" },
}));

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

/** "YYYY-MM-DD" + "HH:MM" for `now + minutes`. */
function futureDateTime(minutes: number): { date: string; time: string } {
  const d = new Date(Date.now() + minutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

describe("nextReminderAt", () => {
  it("returns null for a done task", () => {
    const task = sampleTask({ status: "done" });
    expect(nextReminderAt(task)).toBeNull();
  });

  it("returns null for an all-day task (due_date with no due_time)", () => {
    const task = sampleTask({ due_time: null });
    expect(nextReminderAt(task)).toBeNull();
  });

  it("returns a Date at due_date + due_time when in the future", () => {
    const { date, time } = futureDateTime(60);
    const task = sampleTask({ due_date: date, due_time: time });
    expect(nextReminderAt(task)).toEqual(dateTimeToDate(date, time));
  });

  it("returns null when due_date is today but due_time is in the past", () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    // A time guaranteed to already have passed today.
    let time = "00:00";
    const earlier = new Date(now.getTime() - 2 * 60_000);
    if (earlier.getDate() === now.getDate()) {
      time = `${pad(earlier.getHours())}:${pad(earlier.getMinutes())}`;
    }
    const task = sampleTask({ due_date: today, due_time: time });
    expect(nextReminderAt(task)).toBeNull();
  });

  it("applies offsetMinutes (due in 60 min, offset 30 -> 30 min before due)", () => {
    const { date, time } = futureDateTime(60);
    const task = sampleTask({ due_date: date, due_time: time });
    const due = dateTimeToDate(date, time)!;
    const at = nextReminderAt(task, 30);
    expect(at!.getTime()).toBe(due.getTime() - 30 * 60_000);
  });

  it("returns null when the offset pushes the reminder into the past", () => {
    const { date, time } = futureDateTime(10);
    const task = sampleTask({ due_date: date, due_time: time });
    expect(nextReminderAt(task, 30)).toBeNull();
  });
});

describe("scheduleKey", () => {
  it("builds the stable due key", () => {
    expect(scheduleKey("t1", "due")).toBe("daymark.due.t1");
  });

  it("builds the stable snooze key", () => {
    expect(scheduleKey("t1", "snooze")).toBe("daymark.snooze.t1");
  });

  it("accepts a task object with an id", () => {
    expect(scheduleKey({ id: "t9" })).toBe("daymark.due.t9");
  });
});
