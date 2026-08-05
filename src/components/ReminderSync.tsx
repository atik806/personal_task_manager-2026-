import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { queryKeys, useTasks, useToggleTask } from "../lib/query";
import {
  ensureReminderSetup,
  isReminderSupported,
  onReminderAction,
  snoozeReminder,
  syncReminders,
} from "../lib/notifications";
import type { TaskWithTags } from "../lib/types";

/**
 * Invisible component that keeps local task reminders in sync.
 * Runs inside the authenticated (app) layout — no UI.
 */
export function ReminderSync() {
  const { user } = useAuth();
  const userId = user?.id;
  const tasksQ = useTasks(userId);
  const toggleTask = useToggleTask(userId ?? "");
  const client = useQueryClient();

  // Channel/category setup + reschedule whenever the open task set changes.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      await ensureReminderSetup();
      if (cancelled) return;
      await syncReminders(tasksQ.data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, tasksQ.data]);

  // Respond to the "Complete" and "Snooze 1hr" notification actions.
  useEffect(() => {
    if (!isReminderSupported) return;
    return onReminderAction((actionId, data) => {
      if (!data.taskId) return;
      const tasks = client.getQueryData<TaskWithTags[]>(queryKeys.tasks(userId ?? "")) ?? [];
      const task = tasks.find((t) => t.id === data.taskId);
      if (!task) return;
      if (actionId === "complete") {
        if (task.status !== "done") toggleTask.mutate(task);
      } else if (actionId === "snooze1hr") {
        snoozeReminder(task.id, task.title, 60);
      }
    });
  }, [client, userId, toggleTask]);

  return null;
}
