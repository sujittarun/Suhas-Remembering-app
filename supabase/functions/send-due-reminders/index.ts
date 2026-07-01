// Runs on a Supabase pg_cron schedule (every minute). Finds memories that are
// due and not yet notified, and sends a Web Push notification to every
// registered browser so reminders arrive even if no tab is open.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async () => {
  const nowIso = new Date().toISOString();

  const { data: due, error: dueError } = await supabase
    .from("memories")
    .select("id, text, due_at, notified_for_due_at")
    .eq("done", false)
    .not("due_at", "is", null)
    .lte("due_at", nowIso);

  if (dueError) {
    return new Response(JSON.stringify({ error: dueError.message }), { status: 500 });
  }

  const toNotify = (due ?? []).filter((memory) => memory.notified_for_due_at !== memory.due_at);

  if (toNotify.length === 0) {
    return new Response(JSON.stringify({ sent: 0, memories: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: subscriptions, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (subsError) {
    return new Response(JSON.stringify({ error: subsError.message }), { status: 500 });
  }

  let sent = 0;
  const deadSubscriptionIds = new Set<string>();

  for (const memory of toNotify) {
    const payload = JSON.stringify({
      title: "Suhas Remember Rocket",
      body: memory.text,
      tag: memory.id,
    });

    for (const sub of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent += 1;
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          deadSubscriptionIds.add(sub.id);
        } else {
          console.error("push send failed", sub.id, statusCode, err);
        }
      }
    }

    await supabase.from("memories").update({ notified_for_due_at: memory.due_at }).eq("id", memory.id);
  }

  if (deadSubscriptionIds.size > 0) {
    await supabase.from("push_subscriptions").delete().in("id", [...deadSubscriptionIds]);
  }

  return new Response(
    JSON.stringify({ sent, memories: toNotify.length, prunedSubscriptions: deadSubscriptionIds.size }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
