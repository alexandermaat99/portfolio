// The sim PC's side of the admin queue (bearer = the publish token).
//   GET  -> {ops}: changes to apply, oldest first
//   POST {results: [{id, ok, error?}]} -> those ops are dropped; failures are kept for the admin page
import { pcAuthorized } from "../../../../racing/lib/admin-auth";
import { buildView, describeOp } from "../../../../racing/lib/admin";
import { loadAdmin, queueList, queueRemove, saveQueueResult } from "../../../../racing/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!pcAuthorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ ops: await queueList() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!pcAuthorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { results?: { id?: unknown; ok?: unknown; error?: unknown }[] };
  const results = (body.results ?? []).filter((r) => typeof r.id === "string");
  const { admin, ops } = await loadAdmin();
  const view = buildView(admin, ops);
  const errors = results
    .filter((r) => !r.ok)
    .map((r) => {
      const op = ops.find((o) => o.id === r.id);
      return { id: r.id as string, type: op?.type ?? "?", summary: op ? describeOp(op, view) : "a change", error: String(r.error ?? "failed").slice(0, 200) };
    });
  await queueRemove(results.map((r) => r.id as string));
  await saveQueueResult({ at: Date.now() / 1000, errors });
  return Response.json({ ok: true });
}
