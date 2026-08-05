/**
 * TanStack Query hooks — data fetching + optimistic mutations.
 *
 * networkMode: "offlineFirst" gives the pragmatic offline UX:
 * reads resolve from cache when offline, writes go through a retrying queue
 * and refetch automatically when connectivity returns.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  deleteProject,
  deleteTag,
  deleteTask,
  fetchProjects,
  fetchTags,
  fetchTasks,
  insertProject,
  insertTask,
  toggleTaskCompleted,
  updateProject,
  updateTask,
} from "./supabase";
import type {
  ProjectInsert,
  ProjectUpdate,
  TagRow,
  TaskInsert,
  TaskRow,
  TaskWithTags,
} from "./types";

export const queryKeys = {
  tasks: (userId: string) => ["tasks", userId] as const,
  projects: (userId: string) => ["projects", userId] as const,
  tags: (userId: string) => ["tags", userId] as const,
};

export function useTasks(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks(userId ?? ""),
    queryFn: () => fetchTasks(userId as string),
    enabled: Boolean(userId),
    networkMode: "offlineFirst",
    staleTime: 15_000,
  });
}

export function useProjects(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects(userId ?? ""),
    queryFn: () => fetchProjects(userId as string),
    enabled: Boolean(userId),
    networkMode: "offlineFirst",
    staleTime: 30_000,
  });
}

export function useTags(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tags(userId ?? ""),
    queryFn: () => fetchTags(userId as string),
    enabled: Boolean(userId),
    networkMode: "offlineFirst",
    staleTime: 30_000,
  });
}

function optimisticTaskUpdate(
  client: ReturnType<typeof useQueryClient>,
  userId: string,
  taskId: string,
  patch: Partial<TaskRow>
) {
  client.setQueryData<TaskWithTags[]>(queryKeys.tasks(userId), (old) =>
    (old ?? []).map((t) => (t.id === taskId ? { ...t, ...patch, tags: t.tags } : t))
  );
}

export function useToggleTask(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (task: TaskRow) => toggleTaskCompleted(task),
    networkMode: "offlineFirst",
    onMutate: async (task) => {
      await client.cancelQueries({ queryKey: queryKeys.tasks(userId) });
      const completing = task.status !== "done";
      optimisticTaskUpdate(client, userId, task.id, {
        status: completing ? "done" : "todo",
        completed_at: completing ? new Date().toISOString() : null,
      });
      return { previous: client.getQueryData(queryKeys.tasks(userId)) };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) client.setQueryData(queryKeys.tasks(userId), ctx.previous);
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: queryKeys.tasks(userId) });
    },
  });
}

export function useSaveTask(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { input: TaskInsert; tagIds: string[]; id?: string }) => {
      if (vars.id) {
        await updateTask(vars.id, vars.input, vars.tagIds);
      } else {
        await insertTask(vars.input, vars.tagIds);
      }
    },
    networkMode: "offlineFirst",
    onSettled: () => {
      client.invalidateQueries({ queryKey: queryKeys.tasks(userId) });
    },
  });
}

export function useDeleteTask(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    networkMode: "offlineFirst",
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: queryKeys.tasks(userId) });
      const previous = client.getQueryData(queryKeys.tasks(userId));
      client.setQueryData<TaskWithTags[]>(queryKeys.tasks(userId), (old) =>
        (old ?? []).filter((t) => t.id !== id)
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) client.setQueryData(queryKeys.tasks(userId), ctx.previous);
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: queryKeys.tasks(userId) });
    },
  });
}

export function useCreateProject(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInsert) => insertProject(input),
    networkMode: "offlineFirst",
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.projects(userId) }),
  });
}

export function useUpdateProject(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: ProjectUpdate }) => updateProject(vars.id, vars.patch),
    networkMode: "offlineFirst",
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.projects(userId) }),
  });
}

export function useDeleteProject(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    networkMode: "offlineFirst",
    onSettled: () => {
      client.invalidateQueries({ queryKey: queryKeys.projects(userId) });
      client.invalidateQueries({ queryKey: queryKeys.tasks(userId) });
    },
  });
}

export function useArchiveProject(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; archived: boolean }) =>
      updateProject(vars.id, { archived: vars.archived }),
    networkMode: "offlineFirst",
    onSettled: () => {
      client.invalidateQueries({ queryKey: queryKeys.projects(userId) });
      client.invalidateQueries({ queryKey: queryKeys.tasks(userId) });
    },
  });
}

export function useCreateTag(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => ensureTagInsert(userId, name),
    networkMode: "offlineFirst",
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.tags(userId) }),
  });
}

export function useDeleteTag(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTag(id),
    networkMode: "offlineFirst",
    onSettled: () => {
      client.invalidateQueries({ queryKey: queryKeys.tags(userId) });
      client.invalidateQueries({ queryKey: queryKeys.tasks(userId) });
    },
  });
}

/** Internal helper: create tag row (used by the mutation above). */
async function ensureTagInsert(userId: string, name: string): Promise<TagRow> {
  const { ensureTag } = await import("./supabase");
  const id = await ensureTag(userId, name);
  return { id, user_id: userId, name, created_at: "", updated_at: "" } as TagRow;
}
