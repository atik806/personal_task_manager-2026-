/**
 * Local reminder scheduling via expo-notifications (native only; web no-ops).
 *
 * - Android: dedicated "daymark-reminders" channel + a "TASK_REMINDER" category
 *   with "Complete" and "Snooze 1hr" actions.
 * - Scheduling: a reminder fires at each task's due date/time. Offline-safe —
 *   these are local notifications, no network involved.
 * - The heavy-lifting for recurring tasks / background dispatch is documented in
 *   `supabase/functions/` (Edge Function stubs), per the spec.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { dateTimeToDate } from "./dates";
import type { TaskWithTags } from "./types";

export const REMINDER_CHANNEL_ID = "daymark-reminders";
export const REMINDER_CATEGORY_ID = "TASK_REMINDER";
export const REMINDER_ACTION_COMPLETE = "complete";
export const REMINDER_ACTION_SNOOZE = "snooze1hr";
export const REMINDER_PREF_KEY = "daymark.notifications.enabled";

export const isReminderSupported = Platform.OS === "ios" || Platform.OS === "android";

// Without a handler, expo-notifications silently drops notifications while the
// app is in the foreground. Banner/list + sound keeps due reminders visible.
if (isReminderSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Create the Android channel + shared category once. Safe to call repeatedly. */
export async function ensureReminderSetup(): Promise<void> {
  if (!isReminderSupported) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: "Task reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      sound: "default",
    });
  }

  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY_ID, [
    {
      identifier: REMINDER_ACTION_COMPLETE,
      buttonTitle: "Complete",
      options: { opensAppToForeground: false },
    },
    {
      identifier: REMINDER_ACTION_SNOOZE,
      buttonTitle: "Snooze 1hr",
      options: { opensAppToForeground: false },
    },
  ]);
}

/** Ask for permission if it hasn't been granted yet. Returns true when allowed. */
export async function ensureReminderPermission(): Promise<boolean> {
  if (!isReminderSupported) return false;
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  if (!settings.canAskAgain) return false;
  const request = await Notifications.requestPermissionsAsync();
  return request.granted;
}

interface ReminderSchedule {
  taskId: string;
  at: Date;
}

/** Compute when a task's reminder should fire, or null if it isn't schedulable. */
export function nextReminderAt(task: TaskWithTags, offsetMinutes = 0): Date | null {
  if (task.status === "done") return null;
  const due = dateTimeToDate(task.due_date, task.due_time);
  if (!due) return null;
  const at = new Date(due.getTime() - offsetMinutes * 60_000);
  if (at.getTime() <= Date.now()) return null;
  return at;
}

/** Replace the local schedule so it matches the current open tasks. */
export async function syncReminders(tasks: TaskWithTags[]): Promise<void> {
  if (!isReminderSupported) return;

  await Notifications.cancelAllScheduledNotificationsAsync();
  const enabled = (await getRemindersEnabled()) && (await ensureReminderPermission());
  if (!enabled) return;

  const scheduled: ReminderSchedule[] = [];
  for (const task of tasks) {
    const at = nextReminderAt(task);
    if (at) scheduled.push({ taskId: task.id, at });
  }

  // Cap to a sane window (next 90 days) to avoid runaway schedules.
  const horizon = Date.now() + 90 * 86_400_000;
  for (const item of scheduled) {
    if (item.at.getTime() > horizon) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.taskId ? taskTitleFor(tasks, item.taskId) : "Task due",
        body: item.taskId ? "Tap to view, or use the actions to complete/snooze." : "",
        data: { taskId: item.taskId },
        categoryIdentifier: REMINDER_CATEGORY_ID,
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: item.at,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  }
}

function taskTitleFor(tasks: TaskWithTags[], id: string): string {
  const t = tasks.find((x) => x.id === id);
  return t ? t.title : "Task due";
}

export async function getRemindersEnabled(): Promise<boolean> {
  const { storage } = await import("./storage");
  const raw = await storage.getItem(REMINDER_PREF_KEY);
  return raw === null || raw === "true"; // default on
}

export async function setRemindersEnabled(enabled: boolean): Promise<void> {
  const { storage } = await import("./storage");
  await storage.setItem(REMINDER_PREF_KEY, String(enabled));
}

/** Reschedule a reminder to fire `minutes` from now (used by the Snooze 1hr action). */
export async function snoozeReminder(
  taskId: string,
  taskTitle: string,
  minutes = 60
): Promise<void> {
  if (!isReminderSupported) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: taskTitle,
      body: "Snoozed — reminder set.",
      data: { taskId },
      categoryIdentifier: REMINDER_CATEGORY_ID,
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + minutes * 60_000),
      channelId: REMINDER_CHANNEL_ID,
    },
  });
}

/** Register a handler for the "Complete" / "Snooze 1hr" notification actions. */
export function onReminderAction(
  handler: (actionId: string, data: { taskId?: string }) => void
): () => void {
  if (!isReminderSupported) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    handler(response.actionIdentifier, (response.notification.request.content.data ?? {}) as {
      taskId?: string;
    });
  });
  return () => sub.remove();
}
