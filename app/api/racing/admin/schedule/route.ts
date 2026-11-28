// Admin: open/close practice windows. POST {action: "add", start, end, weeks} | {action: "delete", id}
import { isAdmin, sameOrigin } from "../../../../racing/lib/admin-auth";
import { addWindows, deleteWindow, loadSchedule } from "../../../../racing/lib/schedule";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req) || !(await isAdmin())) return Response.json({ error: "Not logged in" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { action?: unknown; start?: unknown; end?: unknown; count?: unknown; step_days?: unknown; weeks?: unknown; id?: unknown };
  try {
    if (body.action === "add")
      await addWindows(Number(body.start), Number(body.end), Number(body.count ?? body.weeks) || 1, Number(body.step_days) === 1 ? 1 : 7);
    else if (body.action === "delete" && typeof body.id === "string") await deleteWindow(body.id);
    else return Response.json({ error: "Unknown action" }, { status: 400 });
    return Response.json({ schedule: await loadSchedule() });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Couldn't do that" }, { status: 400 });
  }
}
