// GET: everything the admin page shows (private: admin only, never cached).
import { isAdmin } from "../../../../racing/lib/admin-auth";
import { adminState } from "../../../../racing/lib/admin-state";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Not logged in" }, { status: 401 });
  return Response.json(await adminState(), { headers: { "Cache-Control": "no-store" } });
}
