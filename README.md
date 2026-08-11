# Daymark — Personal Task Manager

A single-user personal task manager. One codebase for **Android + Web** with
React Native (Expo SDK 57) and a **Supabase** backend. No team features — this
is your own workspace.

> Design language: *clarity under motion* — a calm palette, a vertical
> "Day Spine" timeline, and 150–200 ms micro-interactions.

---

## Stack

| Layer    | Choice                                                          |
| -------- | --------------------------------------------------------------- |
| UI       | React Native 0.86, Expo SDK 57, expo-router (file-based routing) |
| Styling  | NativeWind 4 (Tailwind CSS v3) for layout, theme tokens in code  |
| Data     | Supabase (Postgres) + TanStack Query v5 (offline-first)          |
| Auth     | Supabase Auth (email/password, persistent session)               |
| Notifs   | expo-notifications (local reminders, Android channel + actions)  |
| Export   | CSV / JSON — web Blob download, native share sheet               |

---

## Features

- **Auth** — sign up / sign in / reset password with a persistent session.
- **Tasks** — title, description, due date + time, priority (low/med/high),
  status (todo / in_progress / done), project, tags, subtasks, and manual
  ordering via `position`.
- **Recurring tasks** — natural-language rules (e.g. "every 2 weeks") with a
  next-occurrence helper in `src/lib/recurrence.ts`.
- **Projects** — name, color, archive.
- **Tags** — many-to-many, per-task.
- **Saved views** — Today, Upcoming, Overdue, No due date.
- **Search** — matches title, description, tags, and project.
- **Dashboard** — completed-this-week, streaks, upcoming deadlines.
- **Calendar** — week/month toggle with task chips on their due date.
- **Reminders** — local notifications with a "Complete" and "Snooze 1 hr"
  action; the schedule re-syncs every time your task list changes.
- **Settings** — light / dark / system theme, reminder toggle, CSV & JSON
  export, account (change password, sign out).

---

## Getting started

```bash
npm install
cp .env.example .env        # then fill in your Supabase URL + anon key
npx expo start              # press a for Android, w for web
```

### Web export (static build)

```bash
npx expo export --platform web
# output lands in dist/
```

---

## Supabase backend

1. Create a Supabase project.
2. Push the schema — every table is user-scoped with RLS enforced:

   ```bash
   supabase link --project-ref <your-ref>
   supabase db push
   ```

   See `supabase/migrations/0001_init.sql` for the full DDL (RLS policies,
   `user_id` stamping trigger, `updated_at` trigger, partial indexes).

3. **Optional** — Edge Function companions for recurrence catch-up and push
   reminders. Everything they do is handled on-device, so you can ship without
   them. If you want them, follow `supabase/functions/README.md`.

---

## Project layout

```
src/
  app/            expo-router routes (auth screens + (app) group: today,
                  upcoming, calendar, projects, tags, search, settings)
  components/     DaySpine, TaskItem, TaskDetailSheet, QuickAddSheet, ui/*
  hooks/          use-theme, use-auth
  lib/            pure logic — no react-native imports, except the explicit
                  platform boundary (storage.ts, notifications.ts, supabase.ts)
    dates.ts        date math + formatting + streaks
    recurrence.ts   parse "every N days/weeks/…" + next occurrence
    parse.ts        quick-add smart parsing ("buy milk #groceries tmrw")
    priority.ts     priority ordering + labels
    task-utils.ts   task patch/recurrence helpers
    export.ts       CSV/JSON export (RFC 4180 escaping)
    notifications.ts  local reminder scheduling + notification actions
    supabase.ts     typed client + data access (insert/update/delete) + auth calls
    query.ts        TanStack Query hooks (offlineFirst)
    storage.ts      key-value store (SecureStore native / localStorage web)
    theme.ts        design tokens, fonts, light/dark palettes
    types.ts        shared TypeScript types
supabase/
  migrations/     0001_init.sql, 0002_fixes.sql, 0003_rls_hardening.sql
  functions/      generate-recurring, dispatch-reminders (optional stubs)
```

Pure logic lives in `src/lib` with **zero** React Native imports (except the
three files that are the platform boundary), so it is unit-testable and
web-safe.

---

## Quality gates

```bash
npx tsc --noEmit                  # must exit 0
npx expo export --platform web    # must build
```

---

## Deferred (out of scope for v1)

- Google OAuth (the auth screen renders the button but it's a stub).
- Server-side push while the app is fully terminated (Edge Function stubs
  shipped, not deployed).
- Account deletion (the settings screen intentionally defers it).
- Attachment upload (table exists in the migration; UI deferred).
