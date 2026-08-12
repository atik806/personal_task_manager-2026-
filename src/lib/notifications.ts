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

/** Storage key for the persisted snooze map ({ [taskId]: ISO fire time }). */
export const SNOOZE_STORAGE_KEY = "daymark.reminder.snoozes";

/** Notification data payload: every scheduled reminder is identifiable. */
export interface ReminderData {
  taskId?: string;
  kind?: "due" | "snooze";
  /** The task's due anchor (ISO) for "due" reminders. */
  anchor?: string;
}

/**
 * Stable identifier for a task's scheduled notification. Passing the same
 * identifier on schedule/cancel lets syncReminders diff precisely instead of
 * nuking the whole OS schedule. `kind` defaults to "due".
 */
export function scheduleKey(task: { id: string } | string, kind: "due" | "snooze" = "due"): string {
  const taskId = typeof task === "string" ? task : task.id;
  return `daymark.${kind}.${taskId}`;
}

const NOTIF_PREFIX = "daymark.";

/**
 * Compute when a task's reminder should fire, or null if it isn't schedulable.
 * All-day tasks (due_date with no due_time) do NOT schedule a reminder — a
 * 00:00 midnight alarm is surprising. Tasks with a due_time keep normal
 * behavior.
 */
export function nextReminderAt(task: TaskWithTags, offsetMinutes = 0): Date | null {
  if (task.status === "done") return null;
  if (!task.due_time) return null;
  const due = dateTimeToDate(task.due_date, task.due_time);
  if (!due) return null;
  const at = new Date(due.getTime() - offsetMinutes * 60_000);
  if (at.getTime() <= Date.now()) return null;
  return at;
}

interface DesiredNotification {
  identifier: string;
  fireAt: Date;
  taskId: string;
  kind: "due" | "snooze";
  title: string;
  anchor?: string;
}

async function readSnoozes(): Promise<Record<string, string>> {
  const { storage } = await import("./storage");
  const raw = await storage.getItem(SNOOZE_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function scheduleNotification(item: DesiredNotification): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: item.identifier,
    content: {
      title: item.title,
      body:
        item.kind === "snooze"
          ? "Snoozed — reminder set."
          : "Tap to view, or use the actions to complete/snooze.",
      data: {
        taskId: item.taskId,
        kind: item.kind,
        ...(item.anchor ? { anchor: item.anchor } : {}),
      },
      categoryIdentifier: REMINDER_CATEGORY_ID,
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: item.fireAt,
      channelId: REMINDER_CHANNEL_ID,
    },
  });
}

/** Serialize syncReminders calls so concurrent invocations run sequentially. */
let syncQueue: Promise<void> = Promise.resolve();

/**
 * Reconcile the local schedule so it matches the current open tasks + snoozes.
 *
 * Instead of cancelAll + reschedule (which drops snoozed/due-soon
 * notifications and can race an about-to-fire alert), this diffs against
 * `getAllScheduledNotificationsAsync`: it cancels only identifiers that are no
 * longer wanted or whose fire time changed, and schedules only the missing
 * ones. Persisted snoozes whose fire time is still in the future are
 * re-registered. Concurrent calls are serialized via a module-level queue.
 */
export async function syncReminders(tasks: TaskWithTags[]): Promise<void> {
  if (!isReminderSupported) return;

  const run = async (): Promise<void> => {
    const enabled = (await getRemindersEnabled()) && (await ensureReminderPermission());
    if (!enabled) {
      // Reminders off: clear the schedule + persisted snoozes.
      await Notifications.cancelAllScheduledNotificationsAsync();
      const { storage } = await import("./storage");
      await storage.removeItem(SNOOZE_STORAGE_KEY);
      return;
    }

    // Desired schedule: a "due" reminder per open, schedulable task.
    const desired = new Map<string, DesiredNotification>();
    const horizon = Date.now() + 90 * 86_400_000;
    for (const task of tasks) {
      const at = nextReminderAt(task);
      if (!at || at.getTime() > horizon) continue;
      const due = dateTimeToDate(task.due_date, task.due_time);
      desired.set(scheduleKey(task.id), {
        identifier: scheduleKey(task.id),
        fireAt: at,
        taskId: task.id,
        kind: "due",
        title: task.title,
        anchor: due ? due.toISOString() : undefined,
      });
    }

    // Re-register persisted snoozes whose fire time is still in the future,
    // dropping (and not re-persisting) expired ones.
    const { storage } = await import("./storage");
    const snoozes = await readSnoozes();
    const pendingSnoozes: Record<string, string> = {};
    const now = Date.now();
    for (const [taskId, iso] of Object.entries(snoozes)) {
      const fireAt = new Date(iso);
      if (fireAt.getTime() <= now) continue;
      pendingSnoozes[taskId] = iso;
      desired.set(scheduleKey(taskId, "snooze"), {
        identifier: scheduleKey(taskId, "snooze"),
        fireAt,
        taskId,
        kind: "snooze",
        title: tasks.find((t) => t.id === taskId)?.title ?? "Task due",
      });
    }
    await storage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(pendingSnoozes));

    // Current OS schedule, keyed by identifier → fire time.
    const current = await Notifications.getAllScheduledNotificationsAsync();
    const currentFireAt = new Map<string, Date>();
    for (const n of current) {
      const trigger = n.trigger as { date?: Date | string | number } | null;
      if (trigger && typeof trigger === "object" && trigger.date != null) {
        const d = trigger.date instanceof Date ? trigger.date : new Date(trigger.date);
        if (!Number.isNaN(d.getTime())) currentFireAt.set(n.identifier, d);
      }
    }

    // Cancel identifiers that are no longer wanted, or whose fire time changed.
    for (const n of current) {
      const data = (n.content?.data ?? {}) as ReminderData;
      // Ours = stable identifier, or a legacy pre-identifier reminder that
      // still carries a taskId payload. Legacy ones are always retired and
      // re-scheduled under the stable identifier if still wanted below.
      const isOurs = n.identifier.startsWith(NOTIF_PREFIX) || Boolean(data.taskId);
      if (!isOurs) continue;

      const want = n.identifier.startsWith(NOTIF_PREFIX) ? desired.get(n.identifier) : undefined;
      if (!want) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      } else {
        const existing = currentFireAt.get(n.identifier);
        if (existing && Math.abs(existing.getTime() - want.fireAt.getTime()) > 1000) {
          await Notifications.cancelScheduledNotificationAsync(n.identifier);
          await scheduleNotification(want);
          desired.delete(n.identifier);
        }
      }
    }

    // Schedule the missing ones.
    for (const want of desired.values()) {
      if (currentFireAt.has(want.identifier)) continue;
      await scheduleNotification(want);
    }
  };

  const next = syncQueue.then(run, run);
  syncQueue = next.catch(() => {});
  return next;
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
  const fireAt = new Date(Date.now() + minutes * 60_000);
  // Persist the snooze so a later syncReminders diff re-registers it instead
  // of dropping it when the schedule is reconciled.
  const snoozes = await readSnoozes();
  snoozes[taskId] = fireAt.toISOString();
  const { storage } = await import("./storage");
  await storage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(snoozes));
  await scheduleNotification({
    identifier: scheduleKey(taskId, "snooze"),
    fireAt,
    taskId,
    kind: "snooze",
    title: taskTitle,
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
