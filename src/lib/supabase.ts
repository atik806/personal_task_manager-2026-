/**
 * Supabase client + typed data helpers.
 *
 * Environment:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY
 *
 * Sessions persist via expo-secure-store (native) / localStorage (web),
 * provided by `authStorage` in storage.ts.
 */

import "react-native-url-polyfill/auto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { authStorage } from "./storage";
import type {
  ProjectInsert,
  ProjectRow,
  ProjectUpdate,
  TagInsert,
  TagRow,
  TaskInsert,
  TaskRow,
  TaskUpdate,
  TaskWithTags,
} from "./types";
import { buildRecurringTask } from "./task-utils";
import { normalizeTime } from "./dates";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-anon-key",
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      // On web this lets supabase-js restore a password-recovery session from
      // the URL hash automatically. On native it's a no-op (no window), where
      // the reset screen handles the deep link explicitly via expo-linking.
      detectSessionInUrl: true,
    },
  }
);

/* ------------------------------------------------------------------ */
/* Tasks                                                               */
/* ------------------------------------------------------------------ */

interface TaskSelectRow extends TaskRow {
  task_tags: { tags: TagRow | null }[];
}

function toTaskWithTags(row: TaskSelectRow): TaskWithTags {
  return {
    ...row,
    // Postgres serializes `time` as "HH:MM:SS"; normalize once at the boundary
    // so the rest of the app only ever sees "HH:MM".
    due_time: normalizeTime(row.due_time),
    tags: (row.task_tags ?? [])
      .map((tt) => tt.tags)
      .filter((t): t is TagRow => t != null),
  };
}

export async function fetchTasks(userId: string): Promise<TaskWithTags[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, task_tags(tags(*))")
    .eq("user_id", userId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("due_time", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toTaskWithTags);
}

export async function insertTask(input: TaskInsert, tagIds: string[] = []): Promise<TaskWithTags> {
  // Defense-in-depth: normalize due_time on the write path so "HH:MM:SS"
  // never reaches the DB (Postgres time columns would round-trip seconds).
  const normalized =
    input.due_time != null ? { ...input, due_time: normalizeTime(input.due_time) } : input;
  const { data, error } = await supabase.from("tasks").insert(normalized).select("*").single();
  if (error) throw error;
  if (tagIds.length) {
    const { error: linkError } = await supabase.from("task_tags").insert(
      tagIds.map((tag_id) => ({ task_id: data.id as string, tag_id }))
    );
    if (linkError) throw linkError;
  }
  return { ...(data as TaskRow), tags: tagIds.map((id) => ({ id } as TagRow)) };
}

export async function updateTask(
  id: string,
  patch: TaskUpdate,
  tagIds?: string[]
): Promise<void> {
  // Normalize due_time on the write path (see insertTask above). Null stays
  // null so callers can still clear a time.
  const normalized =
    patch.due_time != null ? { ...patch, due_time: normalizeTime(patch.due_time) } : patch;
  const { error } = await supabase.from("tasks").update(normalized).eq("id", id);
  if (error) throw error;
  if (tagIds !== undefined) {
    // Use atomic RPC to replace tags (avoids non-transactional delete-then-insert)
    const { error: rpcError } = await supabase.rpc("replace_task_tags", {
      p_task_id: id,
      p_tag_ids: tagIds,
    });
    if (rpcError) throw rpcError;
  }
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleTaskCompleted(task: TaskRow): Promise<void> {
  const completing = task.status !== "done";
  const patch: TaskUpdate = {
    status: completing ? "done" : "todo",
    completed_at: completing ? new Date().toISOString() : null,
  };

  // Server clock: read back the DB's updated_at so completed_at can be
  // reconciled to the server timestamp instead of the device clock.
  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", task.id)
    .select("updated_at");
  if (error) throw error;

  const serverUpdatedAt = (data && data[0]?.updated_at) as string | undefined;
  if (completing && serverUpdatedAt) {
    // Overwrite the device-clock guess with the authoritative server time.
    const { error: clockError } = await supabase
      .from("tasks")
      .update({ completed_at: serverUpdatedAt })
      .eq("id", task.id);
    if (clockError) throw clockError;
  }

  // If completing a recurring task, generate the next occurrence
  if (completing && task.recurrence_rule) {
    const nextTask = buildRecurringTask(task);
    if (nextTask) {
      // Idempotency guard for mutation retries: skip if a next occurrence for
      // this parent + due date already exists (avoids duplicate rows).
      const { data: existing, error: existsError } = await supabase
        .from("tasks")
        .select("id")
        .eq("parent_task_id", task.id)
        .eq("due_date", nextTask.due_date);
      if (existsError) throw existsError;
      if (!existing || existing.length === 0) {
        // We need to get the tag IDs from the completed task to copy them
        const { data: taskTags } = await supabase
          .from("task_tags")
          .select("tag_id")
          .eq("task_id", task.id);
        const tagIds = (taskTags ?? []).map((tt) => tt.tag_id);
        await insertTask(nextTask, tagIds);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

export async function fetchProjects(userId: string): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProjectRow[];
}

export async function insertProject(input: ProjectInsert): Promise<ProjectRow> {
  const { data, error } = await supabase.from("projects").insert(input).select("*").single();
  if (error) throw error;
  return data as ProjectRow;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

export async function updateProject(id: string, patch: ProjectUpdate): Promise<void> {
  const { error } = await supabase.from("projects").update(patch).eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Tags                                                                */
/* ------------------------------------------------------------------ */

export async function fetchTags(userId: string): Promise<TagRow[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TagRow[];
}

/** Get-or-create a tag by name. Returns the tag id. */
export async function ensureTag(userId: string, name: string): Promise<string> {
  const { data: existing, error: findError } = await supabase
    .from("tags")
    .select("id")
    .eq("user_id", userId)
    .eq("name", name)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id;
  const { data, error } = await supabase.from("tags").insert({ name }).select("*").single();
  if (error) throw error;
  return (data as TagRow).id;
}

export async function insertTag(input: TagInsert): Promise<TagRow> {
  const { data, error } = await supabase.from("tags").insert(input).select("*").single();
  if (error) throw error;
  return data as TagRow;
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export function onAuthChange(cb: (event: string, session: unknown) => void) {
  return supabase.auth.onAuthStateChange((event, session) => cb(event, session));
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: process.env.EXPO_PUBLIC_RESET_REDIRECT_URL,
  });
  if (error) throw error;
  return data;
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
