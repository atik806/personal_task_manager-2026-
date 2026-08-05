/**
 * Database row types — mirror `supabase/migrations/`.
 * Pure TS, no runtime deps.
 */

export type Priority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  color: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  project_id: string | null;
  /** ISO date, e.g. "2026-08-05" */
  due_date: string | null;
  /** HH:MM 24h, e.g. "17:30" */
  due_time: string | null;
  priority: Priority;
  status: TaskStatus;
  /** sort position within a day list */
  position: number;
  parent_task_id: string | null;
  /** RRULE-ish, e.g. "daily", "weekly", "every 2 days", "FREQ=DAILY;INTERVAL=2" */
  recurrence_rule: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TagRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface TaskTagRow {
  task_id: string;
  tag_id: string;
}

export interface AttachmentRow {
  id: string;
  user_id: string;
  task_id: string;
  name: string;
  file_path: string;
  file_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

/** A task joined with its tags, for the UI. */
export interface TaskWithTags extends TaskRow {
  tags: TagRow[];
}

/** Input for creating a task (user_id is set by trigger). */
export type TaskInsert = Omit<TaskRow, "id" | "user_id" | "created_at" | "updated_at">;

/** Input for updating a task. */
export type TaskUpdate = Partial<
  Omit<TaskRow, "id" | "user_id" | "created_at" | "updated_at">
>;

export type ProjectInsert = Omit<ProjectRow, "id" | "user_id" | "created_at" | "updated_at">;
export type ProjectUpdate = Partial<Omit<ProjectRow, "id" | "user_id" | "created_at" | "updated_at">>;

export type TagInsert = Omit<TagRow, "id" | "user_id" | "created_at" | "updated_at">;
