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
      detectSessionInUrl: false,
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
  const { data, error } = await supabase.from("tasks").insert(input).select("*").single();
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
  const { error } = await supabase.from("tasks").update(patch).eq("id", id);
  if (error) throw error;
  if (tagIds) {
    const { error: delError } = await supabase
      .from("task_tags")
      .delete()
      .eq("task_id", id);
    if (delError) throw delError;
    if (tagIds.length) {
      const { error: linkError } = await supabase.from("task_tags").insert(
        tagIds.map((tag_id) => ({ task_id: id, tag_id }))
      );
      if (linkError) throw linkError;
    }
  }
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleTaskCompleted(task: TaskRow): Promise<void> {
  const completing = task.status !== "done";
  await updateTask(task.id, {
    status: completing ? "done" : "todo",
    completed_at: completing ? new Date().toISOString() : null,
  });
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
