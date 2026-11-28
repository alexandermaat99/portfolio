// POST {id, token}: cancel a booking (the booker's token, or the admin cookie).
import { isAdmin, sameOrigin } from "../../../../racing/lib/admin-auth";
import { cancel, loadSchedule } from "../../../../racing/lib/schedule";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "Bad origin" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { id?: unknown; token?: unknown };
  if (typeof body.id !== "string") return Response.json({ error: "Missing booking" }, { status: 400 });
  try {
    await cancel(body.id, typeof body.token === "string" ? body.token : null, await isAdmin());
    return Response.json({ schedule: await loadSchedule() });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Couldn't cancel" }, { status: 403 });
  }
}
