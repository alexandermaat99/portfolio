// app/racing/lib/store.ts
// Latest SimStats snapshots pushed from the sim PC. Stored in Upstash Redis
// (Vercel Marketplace) via its REST API; falls back to memory for local dev.

import { overlayPublic, type AdminOp, type AdminSnapshot, type QueueResult } from "./admin";
import type { RacingData, RacingLive, RacingSnapshot } from "./types";

// "admin" holds private data (driver emails, who's paid): only ever served to the admin.
const KEYS = { live: "racing:live", data: "racing:data", admin: "racing:admin" } as const;
const QUEUE = "racing:queue"; // hash: op id -> op JSON (changes waiting for the sim PC)
const QUEUE_RESULT = "racing:queue:last"; // what happened the last time the PC applied the queue
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

const parse = <T,>(s: string | null | undefined): T | null => {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
};

async function getMany(keys: string[]): Promise<(string | null)[]> {
  if (redisConfig()) return ((await redis(["MGET", ...keys])) as (string | null)[]) ?? keys.map(() => null);
  return keys.map((k) => memory.get(k) ?? null);
}

/** Public snapshot: the PC's latest data with pending admin changes shown on top. */
export async function loadSnapshot(): Promise<RacingSnapshot> {
  const [live, data, admin] = await getMany([KEYS.live, KEYS.data, KEYS.admin]);
  const ops = await queueList();
  return {
    live: parse<RacingLive>(live),
    data: overlayPublic(parse<RacingData>(data), parse<AdminSnapshot>(admin), ops),
    now: Date.now() / 1000,
  };
}

/** Everything the admin page needs (private: only call after checking the admin cookie). */
export async function loadAdmin(): Promise<{ data: RacingData | null; admin: AdminSnapshot | null; ops: AdminOp[]; last: QueueResult | null }> {
  const [data, admin, last] = await getMany([KEYS.data, KEYS.admin, QUEUE_RESULT]);
  return { data: parse<RacingData>(data), admin: parse<AdminSnapshot>(admin), ops: await queueList(), last: parse<QueueResult>(last) };
}

// -- the admin queue ----------------------------------------------------------------------

function memoryQueue(): Record<string, string> {
  return parse<Record<string, string>>(memory.get(QUEUE)) ?? {};
}

export async function queueList(): Promise<AdminOp[]> {
  let flat: string[];
  if (redisConfig()) flat = ((await redis(["HGETALL", QUEUE])) as string[] | null) ?? [];
  else flat = Object.entries(memoryQueue()).flat();
  const ops: AdminOp[] = [];
  for (let i = 1; i < flat.length; i += 2) {
    const op = parse<AdminOp>(flat[i]);
    if (op) ops.push(op);
  }
  return ops.sort((a, b) => a.at - b.at);
}

export async function queueAdd(op: AdminOp): Promise<void> {
  if (redisConfig()) await redis(["HSET", QUEUE, op.id, JSON.stringify(op)]);
  else if (process.env.NODE_ENV !== "production") memory.set(QUEUE, JSON.stringify({ ...memoryQueue(), [op.id]: JSON.stringify(op) }));
  else throw new Error("Storage not configured");
}

export async function queueRemove(ids: string[]): Promise<void> {
  if (!ids.length) return;
  if (redisConfig()) await redis(["HDEL", QUEUE, ...ids]);
  else {
    const q = memoryQueue();
    for (const id of ids) delete q[id];
    memory.set(QUEUE, JSON.stringify(q));
  }
}

export async function saveQueueResult(result: QueueResult): Promise<void> {
  if (redisConfig()) await redis(["SET", QUEUE_RESULT, JSON.stringify(result)]);
  else memory.set(QUEUE_RESULT, JSON.stringify(result));
}
