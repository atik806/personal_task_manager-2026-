// Daymark — generate-recurring (server-side companion for recurrence).
//
// The client already computes the next occurrence when a recurring task is
// completed (src/lib/recurrence.ts). This Edge Function is the optional
// server-side companion that catches stragglers — e.g. a recurring task that
// was never completed, or a device that was offline at completion time — and
// materializes the next occurrence rows.
//
// Deploy:    supabase functions deploy generate-recurring
// Schedule:  via Supabase Cron (dashboard → Edge Functions → Schedules), run
//            daily at 00:05 UTC. See supabase/functions/README.md.
//            Do NOT use `supabase functions deploy --schedule`.

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Find recurring, uncompleted tasks whose next occurrence is already due.
    //    (Client-side next-occurrence logic mirrors this — see src/lib/recurrence.ts.)
    const today = new Date().toISOString().slice(0, 10);
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id, user_id, title, description, project_id, priority, due_date, due_time, recurrence_rule, parent_task_id")
      .eq("status", "todo")
      .not("recurrence_rule", "is", null)
      .lte("due_date", today);

    if (error) throw error;

    let created = 0;
    for (const task of tasks ?? []) {
      // TODO(task): parse `recurrence_rule` (FREQ=DAILY / INTERVAL, "every N
      // days", "weekly", …), compute the next due_date, and insert a new task:
      //
      //   const nextDue = nextOccurrence(task.due_date, task.recurrence_rule);
      //   if (nextDue) {
      //     await supabase.from("tasks").insert({
      //       ...pick(task, ["title","description","project_id","priority","due_time","recurrence_rule","parent_task_id"]),
      //       user_id: task.user_id,
      //       due_date: nextDue,
      //       status: "todo",
      //     });
      //     created++;
      //   }
      //
      // Guard: only advance one occurrence per run (idempotent), and skip
      // tasks whose parent is still open if you want subtask chains to wait.
      void task;
      void created;
    }

    return new Response(
      JSON.stringify({ ok: true, generated: created }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
