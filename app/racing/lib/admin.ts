// app/racing/lib/admin.ts: the organiser's admin page (drivers + competitions from anywhere).
//
// The site can't reach the sim PC, so edits made here are queued as "ops". SimStats picks
// the queue up (GET /api/racing/admin/queue with the publish token), applies it, publishes
// fresh data, then acknowledges, and the ops are dropped. Until then the site shows the
// result of the pending ops on top of the PC's last copy ("overlay").
//
// Keep the op shapes in step with simstats/remote_admin.py.

import type { Competition, CompetitionRow, Driver, RacingData } from "./types";

export type Ref = { id: number } | { ref: string };

export const COMP_FIELDS = [
  "name", "track_id", "track_config", "track_name", "cars", "fee_cents", "payout",
  "practice_start", "practice_end", "practice_laps", "practice_minutes", "practice_bonus_laps", "practice_bonus_minutes",
  "attack_start", "attack_end", "attack_laps", "attack_minutes", "attack_warmup_laps",
] as const;
export type CompFields = {
  name: string;
  track_id: number | null;
  track_config: string;
  track_name: string;
  cars: string[];
  fee_cents: number | null;
  payout: string;
  practice_start: number | null;
  practice_end: number | null;
  practice_laps: number | null;
  practice_minutes: number | null;
  practice_bonus_laps: number | null;
  practice_bonus_minutes: number | null;
  attack_start: number | null;
  attack_end: number | null;
  attack_laps: number | null;
  attack_minutes: number | null;
  attack_warmup_laps: number | null;
};

export type OpInput =
  | { type: "driver.add"; name: string; nickname: string; beginner: boolean; email?: string }
  | { type: "driver.edit"; driver: Ref; name?: string; nickname?: string; beginner?: boolean; email?: string; archived?: boolean }
  | { type: "comp.save"; comp?: Ref; fields: Partial<CompFields> }
  | { type: "comp.entrant"; comp: Ref; driver: Ref; entered?: boolean; paid?: boolean; extra_shots?: number }
  | { type: "comp.archive"; comp: Ref };
export type AdminOp = OpInput & { id: string; at: number };

// What SimStats sends as the private "admin" snapshot (only ever shown to the admin).
export interface AdminDriver {
  id: number;
  name: string;
  nickname: string | null;
  color: string;
  archived: number | boolean;
  email: string | null;
  marked_new: number | boolean;
  beginner: number | boolean;
}
export interface AdminSnapshot {
  updated_at: number;
  drivers: AdminDriver[];
  competitions: (CompFields & {
    id: number;
    archived: number | boolean;
    phase: string;
    entrants: { driver_id: number; paid: boolean; extra_shots: number }[];
  })[];
}
export interface QueueResult {
  at: number;
  errors: { id: string; type: string; summary: string; error: string }[];
}

// -- the merged view (PC data + pending ops) --------------------------------------------

export interface ViewDriver {
  key: string; // "id:5" or "ref:<op id>"
  id: number | null;
  name: string;
  nickname: string | null;
  color: string;
  archived: boolean;
  email: string | null;
  marked_new: boolean;
  beginner: boolean;
  pending: boolean;
}
export interface ViewEntrant {
  driver: string; // driver key
  paid: boolean;
  extra_shots: number;
}
export interface ViewComp {
  key: string;
  id: number | null;
  fields: CompFields;
  entrants: ViewEntrant[];
  pending: boolean;
}
export interface AdminView {
  drivers: ViewDriver[];
  competitions: ViewComp[];
}

export const keyOf = (r: Ref) => ("id" in r ? `id:${r.id}` : `ref:${r.ref}`);
export const refOf = (key: string): Ref => (key.startsWith("id:") ? { id: Number(key.slice(3)) } : { ref: key.slice(4) });

const EMPTY_FIELDS: CompFields = {
  name: "", track_id: null, track_config: "", track_name: "", cars: [], fee_cents: 2000, payout: "100",
  practice_start: null, practice_end: null, practice_laps: null, practice_minutes: null,
  practice_bonus_laps: null, practice_bonus_minutes: null,
  attack_start: null, attack_end: null, attack_laps: 3, attack_minutes: null, attack_warmup_laps: 2,
};

export function buildView(admin: AdminSnapshot | null, ops: AdminOp[]): AdminView {
  const drivers = new Map<string, ViewDriver>();
  for (const d of admin?.drivers ?? []) {
    drivers.set(`id:${d.id}`, {
      key: `id:${d.id}`, id: d.id, name: d.name, nickname: d.nickname, color: d.color, archived: !!d.archived,
      email: d.email, marked_new: !!d.marked_new, beginner: !!d.beginner, pending: false,
    });
  }
  const comps = new Map<string, ViewComp>();
  for (const c of admin?.competitions ?? []) {
    if (c.archived) continue;
    const fields = { ...EMPTY_FIELDS };
    for (const k of COMP_FIELDS) (fields as Record<string, unknown>)[k] = c[k];
    comps.set(`id:${c.id}`, {
      key: `id:${c.id}`, id: c.id, fields, pending: false,
      entrants: c.entrants.map((e) => ({ driver: `id:${e.driver_id}`, paid: !!e.paid, extra_shots: e.extra_shots ?? 0 })),
    });
  }
  for (const op of [...ops].sort((a, b) => a.at - b.at)) {
    if (op.type === "driver.add") {
      drivers.set(`ref:${op.id}`, {
        key: `ref:${op.id}`, id: null, name: op.name, nickname: op.nickname || null, color: "#8d8d86", archived: false,
        email: op.email || null, marked_new: !!op.beginner, beginner: !!op.beginner, pending: true,
      });
    } else if (op.type === "driver.edit") {
      const d = drivers.get(keyOf(op.driver));
      if (!d) continue;
      if (op.name !== undefined) d.name = op.name;
      if (op.nickname !== undefined) d.nickname = op.nickname || null;
      if (op.email !== undefined) d.email = op.email || null;
      if (op.beginner !== undefined) d.marked_new = d.beginner = op.beginner;
      if (op.archived !== undefined) d.archived = op.archived;
      d.pending = true;
    } else if (op.type === "comp.save") {
      if (op.comp) {
        const c = comps.get(keyOf(op.comp));
        if (!c) continue;
        c.fields = { ...c.fields, ...op.fields };
        c.pending = true;
      } else {
        comps.set(`ref:${op.id}`, { key: `ref:${op.id}`, id: null, fields: { ...EMPTY_FIELDS, ...op.fields }, entrants: [], pending: true });
      }
    } else if (op.type === "comp.entrant") {
      const c = comps.get(keyOf(op.comp));
      if (!c) continue;
      const dk = keyOf(op.driver);
      const i = c.entrants.findIndex((e) => e.driver === dk);
      if (op.entered === false) {
        if (i >= 0) c.entrants.splice(i, 1);
      } else {
        const e = i >= 0 ? c.entrants[i] : { driver: dk, paid: false, extra_shots: 0 };
        if (op.paid !== undefined) e.paid = op.paid;
        if (op.extra_shots !== undefined) e.extra_shots = Math.max(0, op.extra_shots);
        if (i < 0) c.entrants.push(e);
      }
      c.pending = true;
    } else if (op.type === "comp.archive") {
      comps.delete(keyOf(op.comp));
    }
  }
  const nameOf = (d: ViewDriver) => (d.nickname || d.name).toLowerCase();
  return {
    drivers: [...drivers.values()].sort((a, b) => nameOf(a).localeCompare(nameOf(b))),
    competitions: [...comps.values()],
  };
}

function parsePayout(text: string): number[] {
  const parts = String(text || "100").replace(/,/g, "/").split("/").map((p) => parseFloat(p)).filter((n) => !isNaN(n));
  return parts.length ? parts : [100];
}

/** Public data with pending changes shown (no emails, no paid list: same as SimStats publishes). */
export function overlayPublic(data: RacingData | null, admin: AdminSnapshot | null, ops: AdminOp[]): RacingData | null {
  if (!data || !ops.length || !admin) return data;
  const view = buildView(admin, ops);
  const publicId = new Map<string, number>();
  let next = -1;
  const drivers: Driver[] = data.drivers.map((d) => {
    const v = view.drivers.find((x) => x.id === d.id);
    return v ? { ...d, name: v.name, nickname: v.nickname, archived: v.archived ? 1 : 0 } : d;
  });
  for (const v of view.drivers) {
    if (v.id != null) publicId.set(v.key, v.id);
    else {
      publicId.set(v.key, next);
      drivers.push({ id: next--, name: v.name, nickname: v.nickname, color: v.color, archived: 0, photo: null });
    }
  }
  const competitions: (Competition & { pending?: boolean })[] = [];
  for (const v of view.competitions) {
    const base = v.id != null ? data.competitions?.find((c) => c.id === v.id) : undefined;
    if (base && !v.pending) {
      competitions.push(base);
      continue;
    }
    const f = v.fields;
    const ids = v.entrants.map((e) => publicId.get(e.driver)).filter((x): x is number => x !== undefined);
    const rows: CompetitionRow[] = ids.map(
      (id) =>
        base?.standings.find((r) => r.driver_id === id) ?? {
          driver_id: id, pos: null, best: null, gap: null, best_car: null, attack_laps_used: 0, attack_laps_over: 0,
          practice_laps_used: 0, practice_seconds_used: 0, practice_over: false,
        },
    );
    const paid = v.entrants.filter((e) => e.paid).length;
    const pool = paid * (f.fee_cents ?? 0);
    competitions.push({
      ...(base ?? {}),
      ...f,
      track_id: f.track_id ?? 0,
      id: v.id ?? -competitions.length - 1,
      track_key: `${f.track_id}|${f.track_config}`,
      phase: base?.phase ?? "upcoming",
      fee_cents: f.fee_cents ?? 0,
      pool_cents: pool,
      paid_count: paid,
      payouts: parsePayout(f.payout).map((p, i) => ({ place: i + 1, percent: p, cents: Math.round((pool * p) / 100) })),
      entrants: rows.length,
      standings: rows,
      pending: true,
    } as Competition & { pending: boolean });
  }
  return { ...data, drivers, competitions };
}

/** One-line description of an op, for the pending list and error messages. */
export function describeOp(op: AdminOp, view: AdminView): string {
  const dn = (r: Ref) => {
    const d = view.drivers.find((x) => x.key === keyOf(r));
    return d ? d.nickname || d.name : "a driver";
  };
  const cn = (r: Ref) => view.competitions.find((x) => x.key === keyOf(r))?.fields.name ?? "a competition";
  switch (op.type) {
    case "driver.add":
      return `Add driver ${op.nickname || op.name}${op.beginner ? " (new to the sim)" : ""}`;
    case "driver.edit":
      return op.archived ? `Remove ${dn(op.driver)}` : `Edit ${dn(op.driver)}`;
    case "comp.save":
      return op.comp ? `Edit ${cn(op.comp)}` : `Create ${op.fields.name || "competition"}`;
    case "comp.entrant":
      if (op.entered === false) return `Remove ${dn(op.driver)} from ${cn(op.comp)}`;
      if (op.extra_shots !== undefined) return `${dn(op.driver)}: ${op.extra_shots} extra shot(s) in ${cn(op.comp)}`;
      if (op.paid !== undefined) return `${dn(op.driver)} ${op.paid ? "paid" : "not paid"} in ${cn(op.comp)}`;
      return `Enter ${dn(op.driver)} in ${cn(op.comp)}`;
    case "comp.archive":
      return `Archive ${cn(op.comp)}`;
  }
}

// -- validation of ops coming from the admin page ------------------------------------------

const isRef = (r: unknown): r is Ref =>
  !!r && typeof r === "object" &&
  (Number.isInteger((r as { id?: unknown }).id) || (typeof (r as { ref?: unknown }).ref === "string" && /^[\w-]{6,64}$/.test((r as { ref: string }).ref)));
const str = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
const optStr = (v: unknown, max: number) => v === undefined || str(v, max);
const optBool = (v: unknown) => v === undefined || typeof v === "boolean";
const numOrNull = (v: unknown) => v === null || (typeof v === "number" && isFinite(v) && v >= 0);

export function validateOp(o: unknown): OpInput | null {
  if (!o || typeof o !== "object") return null;
  const op = o as Record<string, unknown>;
  switch (op.type) {
    case "driver.add":
      return str(op.name, 40) && (op.name as string).trim() && str(op.nickname, 24) && typeof op.beginner === "boolean" && optStr(op.email, 120)
        ? { type: "driver.add", name: (op.name as string).trim(), nickname: (op.nickname as string).trim(), beginner: op.beginner, email: (op.email as string | undefined)?.trim() || undefined }
        : null;
    case "driver.edit":
      return isRef(op.driver) && optStr(op.name, 40) && optStr(op.nickname, 24) && optStr(op.email, 120) && optBool(op.beginner) && optBool(op.archived)
        ? { type: "driver.edit", driver: op.driver, name: op.name as string | undefined, nickname: op.nickname as string | undefined, email: op.email as string | undefined, beginner: op.beginner as boolean | undefined, archived: op.archived as boolean | undefined }
        : null;
    case "comp.save": {
      if (op.comp !== undefined && !isRef(op.comp)) return null;
      const f = op.fields as Record<string, unknown> | undefined;
      if (!f || typeof f !== "object") return null;
      const fields: Record<string, unknown> = {};
      for (const k of COMP_FIELDS) {
        if (!(k in f)) continue;
        const v = f[k];
        if (k === "cars") {
          if (!Array.isArray(v) || v.length > 30 || !v.every((c) => str(c, 80))) return null;
        } else if (k === "name" || k === "track_config" || k === "track_name" || k === "payout") {
          if (!str(v, 80)) return null;
        } else if (!numOrNull(v)) return null;
        fields[k] = v;
      }
      return { type: "comp.save", comp: op.comp as Ref | undefined, fields: fields as Partial<CompFields> };
    }
    case "comp.entrant":
      return isRef(op.comp) && isRef(op.driver) && optBool(op.entered) && optBool(op.paid) &&
        (op.extra_shots === undefined || (Number.isInteger(op.extra_shots) && (op.extra_shots as number) >= 0 && (op.extra_shots as number) < 20))
        ? { type: "comp.entrant", comp: op.comp, driver: op.driver, entered: op.entered as boolean | undefined, paid: op.paid as boolean | undefined, extra_shots: op.extra_shots as number | undefined }
        : null;
    case "comp.archive":
      return isRef(op.comp) ? { type: "comp.archive", comp: op.comp } : null;
  }
  return null;
}
