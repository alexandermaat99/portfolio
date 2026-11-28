// POST {start, name, driver_id?}: book a free 1-hour slot. Returns a token for cancelling it.
import { sameOrigin } from "../../../../racing/lib/admin-auth";
import { book, loadSchedule } from "../../../../racing/lib/schedule";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "Bad origin" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { start?: unknown; name?: unknown; driver_id?: unknown };
  try {
    const out = await book(Number(body.start), typeof body.name === "string" ? body.name : "",
      Number.isInteger(body.driver_id) ? (body.driver_id as number) : null);
    return Response.json({ ...out, schedule: await loadSchedule() });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Couldn't book that" }, { status: 400 });
  }
}
