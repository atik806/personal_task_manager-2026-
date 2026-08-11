/**
 * Task editing helpers.
 * Pure TS — no RN imports.
 */

import type { TaskInsert, TaskRow, TaskUpdate } from "./types";
import { computeNextOccurrence } from "./recurrence";
import { today, toISODate } from "./dates";

/**
 * Merge a partial `TaskUpdate` over a current task, producing the full
 * `TaskInsert` shape expected by the shared save mutation. Non-patched
 * fields fall back to the task's current values.
 */
export function taskInsertFromPatch(task: TaskRow, patch: TaskUpdate): TaskInsert {
  // When status changes to "done" and completed_at is not set, set it to now.
  let completed_at = task.completed_at;
  if (patch.status === "done" && task.completed_at === null) {
    completed_at = new Date().toISOString();
  } else if (patch.status !== undefined && patch.status !== "done") {
    // Reopening (or moving to in_progress) must clear a stale completion so
    // streaks/stats aren't credited for a task that is no longer done.
    completed_at = null;
  }
  return {
    title: patch.title ?? task.title,
    description: patch.description ?? task.description,
    project_id: patch.project_id !== undefined ? patch.project_id : task.project_id,
    due_date: patch.due_date !== undefined ? patch.due_date : task.due_date,
    due_time: patch.due_time !== undefined ? patch.due_time : task.due_time,
    priority: patch.priority ?? task.priority,
    status: patch.status ?? task.status,
    position: task.position,
    parent_task_id: task.parent_task_id,
    recurrence_rule:
      patch.recurrence_rule !== undefined ? patch.recurrence_rule : task.recurrence_rule,
    completed_at,
  };
}

/**
 * Given a just-completed task with a parseable recurrence_rule, compute the next
 * occurrence and return a TaskInsert for the new task. Returns null when there's
 * no recurrence rule or no next occurrence.
 *
 * Anchor rules:
 * - If the task has a due_date and it's not in the past, use that as anchor.
 * - Otherwise use today as the anchor (preserving due_time).
 * - If the task has no due_date, treat today as the anchor (preserving due_time).
 */
export function buildRecurringTask(task: TaskRow): TaskInsert | null {
  if (!task.recurrence_rule) return null;

  // Determine anchor date
  const todayDate = today();
  let anchor: Date;

  if (task.due_date) {
    const dueDate = new Date(task.due_date + "T00:00:00");
    // Use due_date as anchor if it's not in the past, otherwise use today
    if (dueDate >= todayDate) {
      anchor = dueDate;
    } else {
      anchor = todayDate;
    }
  } else {
    anchor = todayDate;
  }

  // Preserve due_time from the original task
  if (task.due_time) {
    const [h, m] = task.due_time.split(":").map(Number);
    anchor.setHours(h, m, 0, 0);
  }

  const next = computeNextOccurrence(task.recurrence_rule, anchor);
  if (!next) return null;

  const nextDateKey = toISODate(next);
  const nextTime = task.due_time ? task.due_time : (next.getHours() === 0 && next.getMinutes() === 0 ? null : `${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`);

  return {
    title: task.title,
    description: task.description,
    project_id: task.project_id,
    due_date: nextDateKey,
    due_time: nextTime,
    priority: task.priority,
    status: "todo",
    position: task.position,
    parent_task_id: task.parent_task_id,
    recurrence_rule: task.recurrence_rule,
    completed_at: null,
  };
}
