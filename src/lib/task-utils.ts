/**
 * Task editing helpers.
 * Pure TS — no RN imports.
 */

import type { TaskInsert, TaskRow, TaskUpdate } from "./types";

/**
 * Merge a partial `TaskUpdate` over a current task, producing the full
 * `TaskInsert` shape expected by the shared save mutation. Non-patched
 * fields fall back to the task's current values.
 */
export function taskInsertFromPatch(task: TaskRow, patch: TaskUpdate): TaskInsert {
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
    completed_at: task.completed_at,
  };
}
