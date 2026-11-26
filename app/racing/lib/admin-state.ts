// app/racing/lib/admin-state.ts: what the admin page gets back from every admin API call.
// Private (emails, paid): only call after checking the admin cookie.
import { buildView, describeOp, fallbackAdmin } from "./admin";
import { loadAdmin } from "./store";

export type AdminState = Awaited<ReturnType<typeof adminState>>;

export async function adminState() {
  const { data, admin, ops, last } = await loadAdmin();
  const view = buildView(admin ?? fallbackAdmin(data), ops);
  return {
    view,
    pending: ops.map((op) => ({ id: op.id, at: op.at, summary: describeOp(op, view) })),
    last,
    synced_at: admin?.updated_at ?? null,
    pc_ready: !!admin, // the PC has sent its private copy (it runs the version that syncs)
    tracks: (data?.records ?? []).map((c) => ({ track_id: c.track_id, track_config: c.track_config, track_name: c.track_name })),
    cars: [...new Set((data?.records ?? []).flatMap((c) => c.cars))],
  };
}

