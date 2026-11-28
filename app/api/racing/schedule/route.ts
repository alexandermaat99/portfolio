// GET: the practice schedule (open windows + bookings, names only).
import { loadSchedule } from "../../../racing/lib/schedule";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await loadSchedule(), { headers: { "Cache-Control": "no-store" } });
}
