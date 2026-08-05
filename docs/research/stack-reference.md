# Personal Task Manager — Verified Stack Reference (2026-08-04)

Verified against npm registry (exact `latest` versions), expo.dev docs, supabase.com/docs, nativewind.dev docs, and TanStack docs. Every version below was queried live on 2026-08-04; config snippets are taken from or match official docs. Where a "latest" package version differs from what Expo SDK 57 pins, the SDK-pinned version is what you must install (use `npx expo install`).

---

## (a) Versions table

| Package | Version (npm latest) | Notes |
|---|---|---|
| `expo` | **57.0.10** (SDK 57, released 2026-06-30) | Bundles React Native **0.86.2**, React 19.2.3 |
| `create-expo-app` | 4.0.0 | Use `--template default@sdk-57` |
| `expo-router` | 57.0.10 | |
| `expo-notifications` | 57.0.8 | |
| `expo-secure-store` | 57.0.1 | |
| `expo-font` | 57.0.1 | |
| `expo-splash-screen` | 57.0.5 | |
| `@supabase/supabase-js` | **2.112.0** | v2 is current major |
| `@supabase/ssr` | 0.12.4 | Next.js/SSR only — NOT for Expo |
| `@supabase/auth-helpers-react` | 0.15.0 | **DEPRECATED** (npm `deprecated` flag set) |
| `supabase` (CLI) | 2.111.0 | |
| `nativewind` | **4.2.6** | Requires **Tailwind v3** (see gotcha #2) |
| `tailwindcss` | 4.3.3 (latest overall) | **Do NOT use with NativeWind 4.2.6** — pin `^3.4.17` |
| `@tanstack/react-query` | **5.101.4** | v5 |
| `@tanstack/react-query-persist-client` | 5.101.4 | |
| `@tanstack/query-async-storage-persister` | 5.101.4 | |
| `@react-native-async-storage/async-storage` | 3.1.1 (latest) | **SDK57 pins 2.2.0** — use `npx expo install` |
| `react-native-url-polyfill` | 4.0.0 | Required by supabase-js on native |
| `@expo-google-fonts/space-grotesk` | 0.4.1 | |
| `@expo-google-fonts/inter` | 0.4.2 | |
| `@expo-google-fonts/jetbrains-mono` | 0.4.1 | |
| `react-native-reanimated` | 4.5.1 (SDK57 pin) | Peer dep of NativeWind |
| `react-native-safe-area-context` | ~5.7.0 (SDK57 pin) | Peer dep of NativeWind |
| `typescript` (template devDep) | ~6.0.3 | |

**Rule:** install Expo SDK packages with `npx expo install <pkg>` so versions match the SDK (it reads `expo@57.0.10`'s `bundledNativeModules.json`). Only `nativewind`, `tailwindcss`, TanStack packages, and `react-native-url-polyfill` are safe to install with plain `npm install` (pin the versions above).

---

## (b) Config snippets

### 1. Create the app (Expo SDK 57, TypeScript + Expo Router)

```bash
npx create-expo-app@latest my-app --template default@sdk-57 --yes
cd my-app
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
npm install nativewind tailwindcss@^3.4.17
npx expo install react-native-reanimated react-native-safe-area-context
```

The SDK 57 `default` template ships: TypeScript, Expo Router, typed routes + React Compiler enabled, `src/app/` directory, `src/global.css`, plugins `expo-router` and `expo-splash-screen`, `"web": { "output": "static" }`. `create-expo-app@latest` without `--template` may still scaffold an older SDK during transition windows — always pass `--template default@sdk-57` to pin SDK 57.

### 2. Expo Router conventions (SDK 57)

- Routes live in **`src/app/`** (default template) or `app/` — both are supported.
- `src/app/_layout.tsx` = root layout (fonts, theme providers, `<Stack>` / `<Slot>`).
- **Route groups** `src/app/(tabs)/_layout.tsx` organize screens without adding URL segments; `src/app/(tabs)/index.tsx` becomes `/`.
- **Dynamic routes** `src/app/task/[id].tsx` → `useLocalSearchParams()`.
- Typed routes are enabled in the template (`"experiments": { "typedRoutes": true }`) — `router.push('/task/' + id)` is type-checked.
- Root `_layout.tsx` replaces `App.tsx`; keep non-route code in `src/components|hooks|constants`.

### 3. Supabase client init (session persistence, native vs web)

supabase-js exposes a `Storage` interface of `{ getItem, setItem, removeItem }` (async allowed). Defaults to `localStorage` on web. On native there is no `localStorage`, so you MUST pass a storage adapter. Official docs show both AsyncStorage and a `LargeSecureStore` wrapper around expo-secure-store (SecureStore has a 2048-byte per-value limit on iOS, hence chunking).

`src/lib/supabase.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

// expo-secure-store adapter (official LargeSecureStore pattern — handles iOS 2048-byte limit)
class LargeSecureStore {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'ios') {
      const keys = await SecureStore.getItemAsync(`${key}.chunkkeys`)
      if (keys) {
        const chunks = await Promise.all(JSON.parse(keys).map((k: string) => SecureStore.getItemAsync(k)))
        return chunks.join('')
      }
    }
    return SecureStore.getItemAsync(key)
  }
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'ios' && value.length > 2048) {
      const size = 2048, n = Math.ceil(value.length / size)
      const keys = Array.from({ length: n }, (_, i) => `${key}.${i}`)
      await Promise.all(keys.map((k, i) => SecureStore.setItemAsync(k, value.substring(i * size, (i + 1) * size))))
      await SecureStore.setItemAsync(`${key}.chunkkeys`, JSON.stringify(keys))
    } else {
      await SecureStore.setItemAsync(key, value)
    }
  }
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'ios') {
      const keys = await SecureStore.getItemAsync(`${key}.chunkkeys`)
      if (keys) await Promise.all(JSON.parse(keys).map((k: string) => SecureStore.deleteItemAsync(k)))
      await SecureStore.deleteItemAsync(`${key}.chunkkeys`)
    }
    await SecureStore.deleteItemAsync(key)
  }
}

const storage = Platform.OS === 'web' ? undefined : AsyncStorage // or: new LargeSecureStore()

export const supabase: SupabaseClient = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage,                      // web → localStorage (default); native → AsyncStorage or SecureStore
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,    // required for React Native; harmless for web SPA
    },
  },
)
```

- No auth-helper package for RN: `@supabase/auth-helpers-react` is deprecated, `@supabase/ssr` is Next.js-only. Use raw supabase-js + a `useEffect` on `supabase.auth.getSession()` / `onAuthStateChange`.
- Env vars must use the `EXPO_PUBLIC_` prefix to be inlined.
- `react-native-url-polyfill` is required on native so supabase-js's `URL` APIs work.

### 4. NativeWind v4 (Tailwind v3 — see gotcha #2)

`babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }]],
  }
}
```

`metro.config.js`:

```js
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)
module.exports = withNativeWind(config, { input: './src/global.css' }) // './global.css' if not in src/
```

`src/global.css` (or `global.css` at root):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {} },
}
```

- `app.json`: set `"web": { "bundler": "metro" }` (template already sets it).
- Optional TS: `src/nativewind-env.d.ts` with `/// <reference types="nativewind/types" />`.
- **No user `postcss.config.js`** — NativeWind runs PostCSS internally via its Metro plugin.
- **Dark mode is NOT Tailwind's class strategy.** NativeWind follows the system via RN's `useColorScheme`; `dark:` utilities flip automatically. Set `"userInterfaceStyle": "automatic"` in `app.json`. For a manual toggle, call `colorScheme.set('dark' | 'light')` (from `react-native`'s `useColorScheme`) and persist the choice.

### 5. TanStack Query v5 + simple offline pattern

`npm install @tanstack/react-query @tanstack/react-query-persist-client @tanstack/query-async-storage-persister`

```tsx
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import AsyncStorage from '@react-native-async-storage/async-storage'
// web: createSyncStoragePersister({ storage: window.localStorage })

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // MUST be >= persist maxAge or GC wipes the restored cache
      staleTime: 1000 * 60 * 5,
      networkMode: 'offlineFirst', // serve cached data offline, refetch on reconnect
    },
  },
})

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'tasks-query-cache',
  throttleTime: 1000,
})

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      {children}
    </PersistQueryClientProvider>
  )
}
```

Offline behavior (verified): default `networkMode: 'online'` pauses fetches/retries while offline and auto-resumes on reconnect (plus `refetchOnReconnect` defaults to true). `'offlineFirst'` tries the fetch once (can hit HTTP/local cache) then pauses retries. For MVP mutations, keep it simple: optimistic `useMutation` + `mutationCache`, and let `navigator.onLine` / `onlineManager` gate retries. WatermelonDB is overkill.

### 6. expo-notifications (Android local notifications + actions)

`app.json` plugin:

```json
{
  "plugins": [
    "expo-router",
    [
      "expo-notifications",
      { "defaultChannel": "default", "icon": "./assets/images/notification-icon.png", "color": "#208AEF" }
    ]
  ]
}
```

```ts
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

// Channel first — required on Android 8+; Android 13+ permission prompt won't show until a channel exists
if (Platform.OS === 'android') {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.DEFAULT, // or HIGH for reminders
    vibrationPattern: [0, 250, 250, 250],
  })
}

// Permission
const { status } = await Notifications.requestPermissionsAsync() // iOS only prompts; Android 13+ too

// Action buttons: category + actions, then attach via categoryIdentifier
await Notifications.setNotificationCategoryAsync('task', [
  { identifier: 'complete', buttonTitle: 'Complete' },
  { identifier: 'snooze', buttonTitle: 'Snooze 1hr' },
])

// Schedule
await Notifications.scheduleNotificationAsync({
  content: { title: 'Task due', body: '…', categoryIdentifier: 'task', sound: 'default' },
  trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: 'default' },
  // or TIME_INTERVAL { type: ..., seconds: 3600 }, DAILY { hour, minute }, WEEKLY, repeats
})

// Listen for taps/action presses
const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
  const id = resp.actionIdentifier // 'complete' | 'snooze' | default tap => DEFAULT_ACTION_IDENTIFIER
})
```

Verified caveats:
- No documented minimum interval for `TIME_INTERVAL`/`DATE` triggers on Android in the SDK 57 docs.
- **iOS** repeating time-interval triggers must be `>= 60 seconds`.
- **Android 12+ exact-time alarms** need `android.permission.SCHEDULE_EXACT_ALARM` in `AndroidManifest.xml`; the `expo-notifications` config plugin does **not** add it (per the package changelog). For MVP reminders, omit it (alarms may drift slightly under Doze); if precise on-time delivery matters, add it via a custom config plugin or `expo prebuild`.
- `RECEIVE_BOOT_COMPLETED` (reschedule after reboot) is added automatically.

### 7. Supabase Edge Functions + recurring schedule

**The `supabase functions deploy --schedule` flag no longer exists.** Current CLI options: `--import-map`, `-j/--jobs`, `--no-verify-jwt`, `--project-ref`, `--prune`, `--use-api` (bundle server-side without Docker). Use **Supabase Cron** (built on `pg_cron`) instead. Schedules run every second to yearly; max 8 concurrent jobs, ≤10 min each.

```bash
supabase functions deploy generate-tasks --project-ref <ref> --use-api
```

```sql
-- enable the extension + publish the function URL (Dashboard: Integrations -> Cron, or SQL)
create extension if not exists pg_cron;

select cron.schedule(
  'daily-tasks',                          -- job name
  '0 7 * * *',                            -- cron expression
  $$
  select net.http_post(
    url := 'https://<project-ref>.functions.supabase.co/generate-tasks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SUPABASE_ANON_KEY>'
    ),
    body := '{}'::jsonb
  )
  $$
);

select * from cron.job;                              -- list jobs
select cron.unschedule('daily-tasks');               -- remove job
```

`net.http_post(url, body, params, headers, timeout_milliseconds)` returns a `request_id`; requests fire after the transaction commits; responses live in `net._http_response` for 6h. `pg_net` is enabled via Dashboard → Database → Extensions (search "pg_net"). Alternative simpler MVP: generate recurring tasks inside a `cron.schedule` job that runs plain SQL directly on the `tasks` table (no HTTP hop).

### 8. RLS + triggers (single-user app)

```sql
-- canonical single policy (covers SELECT/INSERT/UPDATE/DELETE)
create policy "users_own_tasks" on public.tasks
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index tasks_user_id_idx on public.tasks (user_id);

-- auto-set user_id on insert, updated_at on insert/update
create or replace function public.set_task_user_and_updated_at()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := (select auth.uid());
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_set_user_and_updated_at
  before insert or update on public.tasks
  for each row execute function public.set_task_user_and_updated_at();
```

Wrap `auth.uid()` in `(select auth.uid())` — it's a documented performance optimization. `auth.uid()` returns NULL for `anon`, and `null = user_id` is false, so `to authenticated` keeps anon out.

### 9. Web build + EAS (EAS out of scope for this phase)

```bash
npx expo export --platform web   # outputs to ./dist (override with --output-dir)
# serve ./dist statically with any static host (e.g. npx serve dist)
```

Template already sets `"web": { "output": "static" }`. `expo export:web` (webpack) is deprecated.

**EAS Build (document only, coding agent should NOT do this):** needs `eas.json` + a `projectId` (`eas build:configure` generates both; it adds `extra.eas.projectId` to `app.json`).

```json
{
  "cli": { "version": ">= 15.0.0", "appVersionSource": "remote" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal", "android": { "buildType": "apk" } },
    "preview": { "distribution": "internal", "android": { "buildType": "apk" } },
    "production": { "android": { "buildType": "app-bundle" } }
  }
}
```

Minimum is `{ "build": { "production": {} } }`; `--profile` defaults to `production`; Android default artifact is `.aab` (use `buildType: "apk"` to sideload).

### 10. Supabase Realtime (postgres_changes)

Works identically on RN native and Expo web (realtime-js uses WebSocket, available in both).

```ts
const channel = supabase
  .channel('task-changes')
  .on(
    'postgres_changes',
    {
      event: '*',                        // 'INSERT' | 'UPDATE' | 'DELETE' | '*'
      schema: 'public',
      table: 'tasks',
      filter: `user_id=eq.${user.id}`,   // narrow to this user
    },
    (payload) => { /* refetch / apply mutation */ },
  )
  .subscribe()

// cleanup: supabase.removeChannel(channel)
```

Required SQL (per table):

```sql
alter publication supabase_realtime add table public.tasks;
```

RLS is evaluated per subscriber, so a subscriber only receives events their policies allow. To receive `old` rows on DELETE set `REPLICA IDENTITY FULL` on the table. Channel name must not be `'realtime'`.

### 11. Google Fonts (Space Grotesk / Inter / JetBrains Mono)

```ts
// src/app/_layout.tsx
import { useFonts, SpaceGrotesk_400Regular, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk'
import { Inter_400Regular } from '@expo-google-fonts/inter'
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono'
import * as SplashScreen from 'expo-splash-screen'

SplashScreen.preventAutoHideAsync()
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular, SpaceGrotesk_700Bold,
    Inter_400Regular, JetBrainsMono_400Regular,
  })
  if (!fontsLoaded && !fontError) return null
  SplashScreen.hideAsync()
  return <Stack /> // <Text style={{ fontFamily: 'SpaceGrotesk_700Bold' }}>
}
```

Verified caveats:
- Each `@expo-google-fonts/*` package (v0.4.x) ships `.ttf` and its own `useFonts` re-export; works in Expo Go and on web.
- **Web:** font config plugins run on native only, so web must load via `useFonts` (it does). Keep the splash visible until fonts load to avoid a FOUT/blank-glyph flash.
- Font family naming differs per platform: Android uses the file name (`SpaceGrotesk_700Bold`), iOS uses the PostScript name (`SpaceGrotesk-Bold`) — `Platform.select` if you reference raw family strings, though `useFonts` mapping keys work cross-platform.
- Only `.otf`/`.ttf` are supported on Android; `.woff`/`.woff2` are iOS/web-only (the Google Fonts packages ship TTF, so fine).

---

## (c) Gotchas (the ones that will waste time if missed)

1. **Expo SDK 57 is current** (expo@57.0.10, RN 0.86.2, React 19.2). Pin with `--template default@sdk-57`; without it, `create-expo-app` can scaffold an older SDK during transition windows. If you must run in the Expo Go store app on a device, verify the SDK it supports before scaffolding.
2. **NativeWind 4.2.6 requires Tailwind CSS v3, NOT v4.** The package's Metro plugin literally throws `"NativeWind only supports Tailwind CSS v3"` when it detects a non-3.x `tailwindcss`. `tailwindcss@4.3.3` is the npm `latest`, but you must `npm install tailwindcss@^3.4.17`. NativeWind v5 (preview) is the Tailwind-v4 migration — do not use pre-release packages. Consequently the global.css uses v3 syntax (`@tailwind base; …`) and there is NO user postcss.config.js.
3. **Use `npx expo install` for every Expo-managed package.** Example: `@react-native-async-storage/async-storage` npm `latest` is 3.1.1 but SDK 57 pins 2.2.0; installing 3.x can break native builds. This applies to `expo-*`, `react-native-reanimated` (4.5.1), `react-native-safe-area-context` (~5.7.0), `react-native-screens`, etc.
4. **supabase-js needs an explicit storage adapter on native** — no `localStorage` exists there. Web defaults to `localStorage`. Set `detectSessionInUrl: false`. Use `EXPO_PUBLIC_` env prefix. `@supabase/auth-helpers-react` is deprecated and `@supabase/ssr` is Next.js-only — there is no RN auth-helper; read the session in a `useEffect`.
5. **`supabase functions deploy --schedule` is gone.** Current CLI (2.111.0) has no scheduling flag; schedule via Supabase Cron / `pg_cron` (`cron.schedule` + `net.http_post`) or the Dashboard → Integrations → Cron UI.
6. **expo-notifications on Android:** create a channel before scheduling and before requesting permission (Android 13+ prompt depends on a channel existing); exact on-time alarms on Android 12+ need `SCHEDULE_EXACT_ALARM` in the manifest, which the config plugin does not add. iOS repeating time-interval triggers must be ≥ 60s.
7. **TanStack Query persistence:** `gcTime` must be ≥ the persister `maxAge` (default 24h), otherwise the garbage collector discards the restored cache. AsyncStorage = `createAsyncStoragePersister`; web = `createSyncStoragePersister`.
8. **Realtime:** tables must be added to the `supabase_realtime` publication, or you get no events. Filter by `user_id=eq.<uid>` and let RLS do the rest.
9. **Fonts:** web loads fonts via `useFonts` only (config plugins are native-only); hold the splash screen until fonts load. Don't use `.woff`/`.woff2` for Android.
10. **Default template layout:** routes are under `src/app/`, so the NativeWind Metro input path is `./src/global.css` (not `./global.css`). Typed routes and React Compiler are already enabled.
