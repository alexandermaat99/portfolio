// app/racing/lib/store.ts
// Latest SimStats snapshots pushed from the sim PC. Stored in Upstash Redis
// (Vercel Marketplace) via its REST API; falls back to memory for local dev.

import type { RacingData, RacingLive, RacingSnapshot } from "./types";

const KEYS = { live: "racing:live", data: "racing:data" } as const;
export type SnapshotKind = keyof typeof KEYS;

function redisConfig() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(command: (string | number)[]): Promise<unknown> {
  const cfg = redisConfig();
  if (!cfg) throw new Error("Redis not configured");
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis error ${res.status}`);
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (json.error) throw new Error(json.error);
  return json.result;
}

// Dev-only fallback so `npm run dev` works without any cloud setup.
const memory = ((globalThis as { __racingStore?: Map<string, string> }).__racingStore ??= new Map());

export function storageConfigured(): boolean {
  return redisConfig() !== null;
}

export async function saveSnapshot(kind: SnapshotKind, json: string): Promise<void> {
  if (redisConfig()) await redis(["SET", KEYS[kind], json]);
  else if (process.env.NODE_ENV !== "production") memory.set(KEYS[kind], json);
  else throw new Error("Storage not configured");
}

export async function loadSnapshot(): Promise<RacingSnapshot> {
  let raw: (string | null)[];
  if (redisConfig()) {
    raw = ((await redis(["MGET", KEYS.live, KEYS.data])) as (string | null)[]) ?? [null, null];
  } else {
    raw = [memory.get(KEYS.live) ?? null, memory.get(KEYS.data) ?? null];
  }
  const parse = <T,>(s: string | null): T | null => {
    if (!s) return null;
    try {
      return JSON.parse(s) as T;
    } catch {
      return null;
    }
  };
  return {
    live: parse<RacingLive>(raw[0]),
    data: parse<RacingData>(raw[1]),
    now: Date.now() / 1000,
  };
}
