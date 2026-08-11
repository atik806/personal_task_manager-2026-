import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
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
  // Track the last schedule-relevant signature per user so refetches/focus
  // don't wipe + re-create the OS schedule (which would drop due-soon or
  // snoozed notifications).
  const lastSignature = useRef<Map<string, string>>(new Map());

  // Channel/category setup + reschedule when the open task set changes.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      await ensureReminderSetup();
      if (cancelled) return;
      const tasks = tasksQ.data ?? [];
      const signature = scheduleSignature(tasks);
      if (lastSignature.current.get(userId) === signature) return;
      lastSignature.current.set(userId, signature);
      await syncReminders(tasks);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, tasksQ.data]);

  // Respond to the "Complete" and "Snooze 1hr" notification actions — both
  // when tapped live and when the app was cold-started by a notification.
  useEffect(() => {
    if (!userId || !isReminderSupported) return;

    const handleAction = (actionId: string, data: { taskId?: string }) => {
      if (!data.taskId) return;
      const tasks = client.getQueryData<TaskWithTags[]>(queryKeys.tasks(userId)) ?? [];
      const task = tasks.find((t) => t.id === data.taskId);
      if (!task) return;
      if (actionId === "complete") {
        if (task.status !== "done") toggleTask.mutate(task);
      } else if (actionId === "snooze1hr") {
        snoozeReminder(task.id, task.title, 60);
      }
    };

    // Live taps while the app is running.
    const unsubscribe = onReminderAction(handleAction);

    // Cold start: the app may have been opened by tapping a reminder/action.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        handleAction(response.actionIdentifier, (response.notification.request.content.data ?? {}) as {
          taskId?: string;
        });
      })
      .catch(() => {});

    return unsubscribe;
  }, [client, userId, toggleTask]);

  return null;
}

/** Stable signature of the fields that affect the reminder schedule. */
function scheduleSignature(tasks: TaskWithTags[]): string {
  return tasks
    .map((t) => [t.id, t.status, t.due_date ?? "", t.due_time ?? ""].join("|"))
    .sort()
    .join("\n");
}
