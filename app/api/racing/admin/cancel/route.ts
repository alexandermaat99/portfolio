// POST {id}: drop a change that hasn't reached the sim PC yet (and anything that needs it).
import { isAdmin, sameOrigin } from "../../../../racing/lib/admin-auth";
import { queueList, queueRemove } from "../../../../racing/lib/store";
import { adminState } from "../../../../racing/lib/admin-state";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req) || !(await isAdmin())) return Response.json({ error: "Not logged in" }, { status: 401 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: unknown };
  if (typeof id !== "string") return Response.json({ error: "Missing id" }, { status: 400 });
  const ops = await queueList();
  const drop = new Set([id]);
  for (const op of ops) if (JSON.stringify(op).includes(`"ref":"${id}"`)) drop.add(op.id); // depends on it
  await queueRemove([...drop]);
  return Response.json(await adminState(), { headers: { "Cache-Control": "no-store" } });
}
