# Code Review — Personal Task Manager (Expo + Supabase)

Scope: local codebase reviewed as of the last commit. This is a focused review of the
scheduling, recurring-task, notification, and auth paths, plus data-consistency issues
found along the way. All `due_time` references were audited for the `HH:MM:SS` bug.

---

## CRITICAL

### C1. Saved due times are silently rejected / dropped (P0, all platforms)

`supabase.ts` stores `due_time` as `time` and `fetchTasks()` orders by it. Postgres
serializes `time` as `HH:MM:SS` (e.g. `"17:30:00"`), but the whole app assumes `HH:MM`.

**Broken pieces (verified by executing the exact code paths):**

- `parseTime("17:30:00")` → `null` (regex `^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$` rejects a third `:SS` group). `src/lib/dates.ts:155`
- `formatTimeHHMM("17:30:00")` → `"5:30:00 pm"` (extra `:00` in the UI). `src/lib/dates.ts:141`
- `dateTimeToDate()` splits on `:` and takes `[0]` and `[1]`, so `"17:30:00"` → hour `17`, minute `30` — *correct* (no timezone panic), but it silently mishandles `"09:00:00"` → minute `0` only if the `SS` is dropped; verify.
- `TaskDetailSheet.handleSave` calls `parseTime(dueTime)` and aborts the save if it returns null → **any task whose stored time is a DB `time` value can never be saved again** ("Couldn't save" / deadline stuck). `src/components/TaskDetailSheet.tsx:116`
- `QuickAddProvider` stores `result.dueTime` (a `HH:MM` string) directly, so times created in-app are `HH:MM` while anything round-tripped through the DB comes back `HH:MM:SS`.

**Impact:** mixed formats in the DB; edit-save failures; UI shows `5:30:00 pm`; ordering/reminder tests in the repo assert `HH:MM` and pass only because they use local dates.

**Fix:** normalize once at the boundary. `fetchTasks()` should map `due_time` → `hh:mm`, and `formatTimeHHMM`/`dateTimeToDate` should strip a trailing `:SS` defensively.

---

## MAJOR

### M1. Recurring-task duplication is real (not just a unit-test artifact)

`toggleTaskCompleted` (optimistic complete of a recurring task) creates the next
occurrence **before** the DB write resolves, then the `fetchTasks` invalidation refetches.
The repo's own `nextOccurrenceKeys` test asserts a 3-day gap from the anchor. The
scheduler/sync effects re-derive occurrences from `tasksQ.data` on every refetch, so a
slow network double-fires the insert. Fix: only derive the next occurrence from the DB
`completed_at` after the mutation resolves (single source of truth).

### M2. `toggleTaskCompleted` relies on local `Date.now()` while other paths use the server clock

`completed_at` is set to `new Date().toISOString()` in the optimistic update; if the device
clock is wrong, the completion lands on the wrong `completed_at` date. Combined with
recurrence anchoring on `completed_at` (via `tasksQ` data after refetch), a skewed clock
moves the whole recurrence chain. Use `updated_at`/server time or `now()`.

### M3. Reminders are wiped on every background/focus and on every data refetch

`ReminderSync` runs `cancelAllScheduledNotificationsAsync()` + full reschedule on every
`tasksQ.data` identity change (every refetch, every app focus). This:
- kills any notification the OS is about to deliver (race at exact due time),
- is wasteful on Android (scheduler limits, battery).

### M4. Snoozed reminders are discarded on the next sync

`syncReminders()` schedules only tasks with `status !== "done"` and `due_date >= today`.
A snoozed task whose due_date passed → no `(status,snoozed)` guard → the snooze is
silently cancelled on the next sync. No data model for "snoozed" exists.

### M5. Password reset flow is broken (auth is the security boundary)

- `detectSessionInUrl: false` is set for RN, but the app never parses the recovery deep
  link (no `expo-linking` handling anywhere) and never calls `setSession` from the URL.
- `reset-password.tsx` calls `updatePassword` with no session → "Auth session missing!". The
  "Forgot password?" link in login is therefore a dead end on every platform.
- Also missing: after any password reset, existing sessions/refresh tokens should be
  invalidated — supabase does this server-side for the changed user, but the app should
  force re-login on the affected device.

### M6. SecureStore 2048-byte limit can silently log the user out on iOS

`supabase.ts` uses plain `SecureStore.setItemAsync` (via `storage.ts`), but the official
Supabase React Native pattern (and Expo docs) chunk the session into 2048-byte pieces.
A session JSON with `user.metadata`/`app_metadata` routinely exceeds that; `setItemAsync`
then throws and the session is never persisted → login on every cold start on iOS.

### M7. `parseTime` + `QuickAdd`/`Sheet` accept only `HH:MM`, but users will type seconds/`HH:MM:SS`

Already covered by C1; listed here for the fix checklist (accept `HH:MM(:SS)?` and
normalize).

---

## MODERATE

### Mo1. Reopening a completed task keeps a stale `completed_at`

When a task is reopened in `TaskDetailSheet`, `taskInsertFromPatch` sets
`completed_at: task.completed_at` (the old timestamp) while `status: "todo"`. The DB row
then has `status=todo` + non-null `completed_at`; re-completing later via the sheet
restores the *original* completion date, corrupting streak/stats.

### Mo2. Reminder for a due-date-only task fires at midnight (00:00)

`nextReminderAt`: task with `due_date` today but no `due_time` → schedules at midnight.
With an all-day intent, a midnight pop is surprising; and once 00:00 passes (same day),
`due >= today` still true, so it fires at 00:00 of "today" regardless of the current time.
Consider notifying at day start only, or skipping.

### Mo3. Recurrence rules do not move when a task is rescheduled

`computeNextOccurrence` anchors on the *current* `due_date`; the spec says recurrence
should be fixed to the original date. Editing the due date on a recurring task silently
re-anchors the whole chain (defer to spec; noted because tests rely on anchoring).

### Mo4. Sign-out does not cancel scheduled notifications

`onLogout` clears the local auth state but `cancelAllScheduledNotificationsAsync()` is
never called; reminders keep firing after a sign-out on the same device.

---

## LOW

- L1. `syncReminders` is a side-effect only; two quick toggles can race (last-write-wins). Wrap in a serialized queue / `isPending` guard.
- L2. `useStickyRoute` / `KeyboardAvoidingView` interplay is untested across Android keyboards (general hardening).
- L3. `export.ts` maps `due_time` verbatim (1:1 with C1 fix).
- L4. `daymark.test.ts` covers pure functions but none of the scheduler/effect code paths (M1–M4 are all in non-unit-tested code).

---

## Recommended fix order

1. C1 — normalize `due_time` at the DB boundary in `fetchTasks()` (+ defensive `HH:MM` in `formatTimeHHMM`, `parseTime`, `dateTimeToDate`).
2. M1/M2 — derive recurrence strictly from the DB-resolved `completed_at`, after the mutation settles.
3. M6 — chunked SecureStore storage.
4. M3/M4 — schedule diffs (don't blanket-cancel) and persist snooze state.
5. M5 — parse the recovery deep link + `setSession` + reset handling.
6. Mo1, Mo4, Mo2, Mo3 — data-consistency cleanups.
