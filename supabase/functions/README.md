# Edge Functions (reminders & recurrence)

Daymark ships with two optional server-side companions. Everything they do is
already handled on-device (local notifications + next-occurrence logic), so
**you can ship without deploying any Edge Function**. These stubs exist for
installations that want:

- **Recurrence** materialized by the server even when the client was offline,
- **Push** notifications delivered when the app is fully terminated.

## Functions

| Function             | Purpose                                                                 | Suggested cron        |
| -------------------- | ----------------------------------------------------------------------- | --------------------- |
| `generate-recurring` | Materialize next occurrences for recurring tasks that fell behind.       | Daily 00:05 UTC       |
| `dispatch-reminders` | Send Expo push for tasks due in the next 5 minutes (uses push tokens).   | Every 5 minutes       |

## Deploy

```bash
# Link your project first
supabase link --project-ref <your-ref>

supabase functions deploy generate-recurring
supabase functions deploy dispatch-reminders
```

## Schedule (Supabase Cron — required, do NOT use `--schedule`)

`supabase functions deploy --schedule` schedules **every** function with the
same cron and cannot run sub-minute cadences. Instead use Supabase Cron:

1. Supabase dashboard → **Edge Functions → Schedules** → **Create schedule**.
2. Pick the function, choose the cron expression:
   - `generate-recurring` → `0 5 * * *` (daily at 00:05 UTC)
   - `dispatch-reminders` → `*/5 * * * *` (every 5 minutes)
3. Save.

Schedules call the function as an authenticated service-role invocation, so
they can read any user's rows through the `SUPABASE_SERVICE_ROLE_KEY`.

## Wiring notes

- `dispatch-reminders` expects a `push_tokens` table and an `expoPushToken`
  stored per user — see the TODO inside `dispatch-reminders/index.ts`.
- Notification actions (`Complete`, `Snooze 1hr`) are configured in
  `src/lib/notifications.ts`; keep the push `categoryId` in sync.
- Recurrence parsing on the client lives in `src/lib/recurrence.ts`; keep the
  server-side `generate-recurring` logic consistent with it.
