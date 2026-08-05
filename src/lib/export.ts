/**
 * Pure export helpers — CSV / JSON serialization with no React Native imports,
 * so they stay unit-testable and run identically on web + native.
 */

import type { TaskWithTags } from "./types";

/** Escape a single CSV field per RFC 4180 (quote + double any inner quotes). */
function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const CSV_HEADERS = [
  "id",
  "title",
  "description",
  "due_date",
  "due_time",
  "priority",
  "status",
  "project_id",
  "parent_task_id",
  "recurrence_rule",
  "completed_at",
  "tags",
  "created_at",
  "updated_at",
] as const;

export function tasksToCSV(tasks: TaskWithTags[]): string {
  const rows = tasks.map((t) =>
    [
      t.id,
      t.title,
      t.description,
      t.due_date,
      t.due_time,
      t.priority,
      t.status,
      t.project_id,
      t.parent_task_id,
      t.recurrence_rule,
      t.completed_at,
      t.tags.map((tag) => tag.name).join("|"),
      t.created_at,
      t.updated_at,
    ]
      .map(csvField)
      .join(",")
  );
  return [CSV_HEADERS.join(","), ...rows].join("\n");
}

export function tasksToJSON(tasks: TaskWithTags[]): string {
  return JSON.stringify(
    tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      due_date: t.due_date,
      due_time: t.due_time,
      priority: t.priority,
      status: t.status,
      project_id: t.project_id,
      parent_task_id: t.parent_task_id,
      recurrence_rule: t.recurrence_rule,
      completed_at: t.completed_at,
      tags: t.tags.map((tag) => tag.name),
      created_at: t.created_at,
      updated_at: t.updated_at,
    })),
    null,
    2
  );
}

/** Trigger a browser download. No-op off-web (native screens handle sharing). */
export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string
): boolean {
  if (typeof document === "undefined") return false;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

/** ISO timestamp suffix for export filenames. */
export function exportStamp(): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(
    now.getHours()
  )}${p(now.getMinutes())}`;
}
