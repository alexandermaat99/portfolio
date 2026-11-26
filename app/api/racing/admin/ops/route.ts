// POST an op from the admin page: queued for the sim PC.
import { randomUUID } from "crypto";
import { isAdmin, sameOrigin } from "../../../../racing/lib/admin-auth";
import { validateOp, type AdminOp } from "../../../../racing/lib/admin";
import { queueAdd, queueList } from "../../../../racing/lib/store";
import { adminState } from "../../../../racing/lib/admin-state";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req) || !(await isAdmin())) return Response.json({ error: "Not logged in" }, { status: 401 });
  const op = validateOp(await req.json().catch(() => null));
  if (!op) return Response.json({ error: "That change didn't look right" }, { status: 400 });
  if ((await queueList()).length >= 200) return Response.json({ error: "Too many changes waiting for the sim PC" }, { status: 429 });
  const last = (await queueList()).at(-1)?.at ?? 0;
  const queued: AdminOp = { ...op, id: randomUUID(), at: Math.max(Date.now() / 1000, last + 0.001) } as AdminOp;
  await queueAdd(queued);
  return Response.json(await adminState(), { headers: { "Cache-Control": "no-store" } });
}
