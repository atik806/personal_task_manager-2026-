// Daymark — dispatch-reminders (server-side companion for reminders).
//
// The app schedules *local* notifications itself (src/lib/notifications.ts),
// so reminders work offline and need no backend. This Edge Function is the
// optional companion for installations that want push notifications even when
// the app is fully terminated: it finds tasks whose reminder window is open
// and sends an Expo push to the device's stored expoPushToken.
//
// Deploy:    supabase functions deploy dispatch-reminders
// Schedule:  via Supabase Cron (dashboard → Edge Functions → Schedules), run
//            every 5 minutes. See supabase/functions/README.md.
//            Do NOT use `supabase functions deploy --schedule`.

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const EXPONENT_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Find tasks that are open and due within the reminder window
    //    (e.g. now → now + 5 min), carrying an expo_push_token.
    const windowStart = new Date(Date.now() - 60_000).toISOString();
    const windowEnd = new Date(Date.now() + 5 * 60_000).toISOString();

    // TODO(task): once device push tokens are stored (a `push_tokens` table
    // keyed by user_id), query:
    //
    //   const { data: due, error } = await supabase
    //     .from("tasks")
    //     .select("id, user_id, title, due_date, due_time")
    //     .eq("status", "todo")
    //     .not("due_date", "is", null)
    //     .gte("due_time", windowStart.slice(11, 16))
    //     .lte("due_time", windowEnd.slice(11, 16));
    //
    // 2. For each user with a due task, send an Expo push:
    //
    //   await fetch(EXPONENT_PUSH_URL, {
    //     method: "POST",
    //     headers: { "content-type": "application/json" },
    //     body: JSON.stringify({
    //       to: pushToken,
    //       title: task.title,
    //       body: "Tap to view the task.",
    //       data: { taskId: task.id },
    //       categoryId: "TASK_REMINDER", // matches src/lib/notifications.ts
    //     }),
    //   });
    //
    // 3. Track which tasks were already notified (a `reminders_sent` table)
    //    to keep the function idempotent across 5-minute runs.
    void windowStart;
    void windowEnd;

    return new Response(
      JSON.stringify({ ok: true, pushed: 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
