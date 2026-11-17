// app/racing/lib/store.ts
// Latest SimStats snapshots pushed from the sim PC. Stored in Upstash Redis
// (Vercel Marketplace) via its REST API; falls back to memory for local dev.

import type { RacingData, RacingLive, RacingSnapshot } from "./types";

const KEYS = { live: "racing:live", data: "racing:data" } as const;
export type SnapshotKind = keyof typeof KEYS;
const photoKey = (driverId: number) => `racing:photo:${driverId}`;

// Upstash via the Vercel Marketplace names its variables KV_REST_API_URL / _TOKEN or
// UPSTASH_REDIS_REST_URL / _TOKEN, optionally with a custom prefix, so match by suffix.
const URL_SUFFIXES = ["KV_REST_API_URL", "UPSTASH_REDIS_REST_URL", "REDIS_REST_URL"];
const TOKEN_SUFFIXES = ["KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN", "REDIS_REST_TOKEN"];

function findEnv(suffixes: string[]): string | undefined {
  for (const suffix of suffixes) {
    if (process.env[suffix]) return process.env[suffix];
    const key = Object.keys(process.env).find((k) => k.endsWith(suffix) && !k.includes("READ_ONLY"));
    if (key && process.env[key]) return process.env[key];
  }
  return undefined;
}

function redisConfig() {
  const url = findEnv(URL_SUFFIXES);
  const token = findEnv(TOKEN_SUFFIXES);
  return url && token ? { url, token } : null;
}

/** Names (never values) of storage-looking env vars, to explain misconfiguration. */
export function storageEnvNames(): string[] {
  return Object.keys(process.env).filter((k) => /KV_|UPSTASH|REDIS/.test(k)).sort();
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
  if (!res.ok) throw new Error(`Redis responded ${res.status}`);
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
  else throw new Error(`Storage not configured (storage env vars found: ${storageEnvNames().join(", ") || "none"})`);
}

/** Driver photos are stored separately (and uploaded only when they change). */
export async function savePhoto(driverId: number, hash: string, base64Jpeg: string): Promise<void> {
  const value = JSON.stringify({ hash, data: base64Jpeg });
  if (redisConfig()) await redis(["SET", photoKey(driverId), value]);
  else if (process.env.NODE_ENV !== "production") memory.set(photoKey(driverId), value);
  else throw new Error("Storage not configured");
}

export async function loadPhoto(driverId: number): Promise<{ hash: string; data: string } | null> {
  const raw = redisConfig()
    ? ((await redis(["GET", photoKey(driverId)])) as string | null)
    : memory.get(photoKey(driverId)) ?? null;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
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
