// Minimal backend for Suhas Remember Rocket: a REST API over Deno KV plus a
// once-a-minute cron job that pushes due reminders to registered devices,
// replacing the retired Supabase project (free tier exhausted).
import webpush from "npm:web-push@3.6.7";

const ALLOWED_ORIGINS = new Set([
  "https://sujittarun.github.io",
  "http://localhost:4599",
]);

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const kv = await Deno.openKv();

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://sujittarun.github.io";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(data: unknown, init: ResponseInit, origin: string | null) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin), ...(init.headers ?? {}) },
  });
}

async function listMemories() {
  const memories = [];
  for await (const entry of kv.list({ prefix: ["memories"] })) memories.push(entry.value);
  memories.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return memories;
}

async function listSubscriptions() {
  const subs = [];
  for await (const entry of kv.list({ prefix: ["push_subscriptions"] })) subs.push(entry.value);
  return subs;
}

async function sendDueReminders() {
  const memories = await listMemories();
  const now = Date.now();
  const due = memories.filter((m: any) =>
    m.dueAt && !m.done && new Date(m.dueAt).getTime() <= now && m.notifiedForDueAt !== m.dueAt
  );
  if (due.length === 0) return { sent: 0, memories: 0 };

  const subs = await listSubscriptions();
  let sent = 0;
  const deadEndpoints = new Set<string>();

  for (const memory of due as any[]) {
    const payload = JSON.stringify({ title: "Suhas Remember Rocket", body: memory.text, tag: memory.id });
    for (const sub of subs as any[]) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
        sent += 1;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) deadEndpoints.add(sub.endpoint);
        else console.error("push failed", sub.endpoint, err?.statusCode, err?.message);
      }
    }
    memory.notifiedForDueAt = memory.dueAt;
    await kv.set(["memories", memory.id], memory);
  }

  for (const endpoint of deadEndpoints) await kv.delete(["push_subscriptions", endpoint]);
  return { sent, memories: due.length, prunedSubscriptions: deadEndpoints.size };
}

Deno.cron("send-due-reminders", "* * * * *", async () => {
  await sendDueReminders();
});

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });

  try {
    if (parts[0] === "memories" && req.method === "GET" && parts.length === 1) {
      return json(await listMemories(), { status: 200 }, origin);
    }

    if (parts[0] === "memories" && req.method === "POST" && parts.length === 1) {
      const memory = await req.json();
      if (!memory?.id || !memory?.text) return json({ error: "id and text required" }, { status: 400 }, origin);
      await kv.set(["memories", memory.id], memory);
      return json(memory, { status: 201 }, origin);
    }

    if (parts[0] === "memories" && req.method === "PATCH" && parts.length === 2) {
      const id = parts[1];
      const existing = await kv.get(["memories", id]);
      if (!existing.value) return json({ error: "not found" }, { status: 404 }, origin);
      const patch = await req.json();
      const updated = { ...(existing.value as object), ...patch };
      await kv.set(["memories", id], updated);
      return json(updated, { status: 200 }, origin);
    }

    if (parts[0] === "memories" && req.method === "DELETE" && parts.length === 2) {
      await kv.delete(["memories", parts[1]]);
      return json({ ok: true }, { status: 200 }, origin);
    }

    if (parts[0] === "push-subscriptions" && req.method === "POST" && parts.length === 1) {
      const sub = await req.json();
      if (!sub?.endpoint || !sub?.p256dh || !sub?.auth) return json({ error: "endpoint, p256dh, auth required" }, { status: 400 }, origin);
      await kv.set(["push_subscriptions", sub.endpoint], sub);
      return json({ ok: true }, { status: 201 }, origin);
    }

    if (parts[0] === "cron-run" && req.method === "POST" && parts.length === 1) {
      // Manual trigger for testing/verification only.
      return json(await sendDueReminders(), { status: 200 }, origin);
    }

    return json({ error: "not found" }, { status: 404 }, origin);
  } catch (err) {
    console.error(err);
    return json({ error: "internal error" }, { status: 500 }, origin);
  }
});
