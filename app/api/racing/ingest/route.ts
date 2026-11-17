// app/api/racing/ingest/route.ts
// The sim PC POSTs SimStats snapshots here. Protected by a shared secret.

import { timingSafeEqual } from "crypto";
import { savePhoto, saveSnapshot, type SnapshotKind } from "../../../racing/lib/store";

export const dynamic = "force-dynamic";

const MAX_BYTES = 900_000; // stay under Upstash's 1 MB request limit

function authorized(req: Request): boolean {
  const expected = process.env.RACING_INGEST_TOKEN;
  if (!expected) return false;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.text();
  if (body.length > MAX_BYTES) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }
  let parsed: { kind?: string; payload?: unknown };
  try {
    parsed = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const kind = parsed.kind;
  if (kind === "photo") return ingestPhoto(parsed.payload);
  if ((kind !== "live" && kind !== "data") || typeof parsed.payload !== "object" || !parsed.payload) {
    return Response.json({ error: "Expected {kind: 'live'|'data', payload: {...}}" }, { status: 400 });
  }
  try {
    await saveSnapshot(kind as SnapshotKind, JSON.stringify(parsed.payload));
  } catch (e) {
    console.error("racing ingest failed", e);
    // Caller is authenticated (the sim PC), so it's fine to say why.
    const reason = e instanceof Error ? e.message : String(e);
    return Response.json({ error: "Storage unavailable", reason }, { status: 503 });
  }
  return Response.json({ ok: true });
}

async function ingestPhoto(payload: unknown) {
  const p = payload as { driver_id?: unknown; hash?: unknown; data?: unknown } | null;
  if (
    !p ||
    !Number.isInteger(p.driver_id) ||
    typeof p.hash !== "string" ||
    !/^[0-9a-f]{6,40}$/.test(p.hash) ||
    typeof p.data !== "string" ||
    !p.data.startsWith("/9j/") // base64 of a JPEG's FF D8 FF header
  ) {
    return Response.json({ error: "Expected {driver_id, hash, data: base64 JPEG}" }, { status: 400 });
  }
  try {
    await savePhoto(p.driver_id as number, p.hash, p.data);
  } catch (e) {
    console.error("racing photo ingest failed", e);
    const reason = e instanceof Error ? e.message : String(e);
    return Response.json({ error: "Storage unavailable", reason }, { status: 503 });
  }
  return Response.json({ ok: true });
}
