// app/racing/lib/schedule.ts: booking practice time on the sim (one rig, one driver at a time).
// The organiser opens windows on the admin page ("Tue 6-10pm"); anyone with the link books a free
// 1-hour slot inside a window under their name. A slot is claimed atomically, so two people can't
// get the same hour. Lives entirely on the website (Upstash); the sim PC isn't involved.

import { randomBytes, randomUUID, timingSafeEqual } from "crypto";
import { hashAll, hashDel, hashSet, hashSetNew } from "./store";

export const SLOT = 3600; // seconds
const WINDOWS = "racing:sched:windows"; // id -> Window
const BOOKINGS = "racing:sched:bookings"; // id -> Booking (with its cancel token)
const SLOTS = "racing:sched:slots"; // slot start (unix s) -> booking id
const MAX_UPCOMING_PER_NAME = 3;

export interface Window { id: string; start: number; end: number }
export interface Booking { id: string; start: number; end: number; name: string; driver_id: number | null; created_at: number; token?: string }
export type PublicBooking = Omit<Booking, "token">;

const parseAll = <T,>(h: Record<string, string>): T[] =>
  Object.values(h).flatMap((v) => { try { return [JSON.parse(v) as T]; } catch { return []; } });

export async function loadSchedule(now = Date.now() / 1000): Promise<{ windows: Window[]; bookings: PublicBooking[] }> {
  const [w, b] = await Promise.all([hashAll(WINDOWS), hashAll(BOOKINGS)]);
  const windows = parseAll<Window>(w).filter((x) => x.end > now).sort((a, z) => a.start - z.start);
  const bookings = parseAll<Booking>(b).filter((x) => x.end > now).sort((a, z) => a.start - z.start)
    .map(({ token: _t, ...rest }) => { void _t; return rest; });
  return { windows, bookings };
}

/** Open one window, or the same window every week for `weeks` weeks. */
export async function addWindows(start: number, end: number, weeks = 1): Promise<number> {
  if (!(end - start >= SLOT) || end - start > 16 * 3600) throw new Error("A window needs to be 1 to 16 hours long");
  if (end < Date.now() / 1000) throw new Error("That window is already over");
  const n = Math.max(1, Math.min(12, Math.floor(weeks)));
  for (let i = 0; i < n; i++) {
    const w: Window = { id: randomUUID(), start: start + i * 7 * 86400, end: end + i * 7 * 86400 };
    await hashSet(WINDOWS, w.id, JSON.stringify(w));
  }
  return n;
}

/** Close a window; bookings inside it are cancelled too (returns how many). */
export async function deleteWindow(id: string): Promise<number> {
  const w = parseAll<Window>(await hashAll(WINDOWS)).find((x) => x.id === id);
  if (!w) return 0;
  const inside = parseAll<Booking>(await hashAll(BOOKINGS)).filter((b) => b.start >= w.start && b.end <= w.end);
  await hashDel(BOOKINGS, ...inside.map((b) => b.id));
  await hashDel(SLOTS, ...inside.map((b) => String(b.start)));
  await hashDel(WINDOWS, id);
  return inside.length;
}

export async function book(start: number, name: string, driverId: number | null): Promise<{ booking: PublicBooking; token: string }> {
  const now = Date.now() / 1000;
  name = name.trim().slice(0, 24);
  if (!name) throw new Error("Pick who's driving");
  if (!Number.isInteger(start) || start + SLOT <= now) throw new Error("That slot has already passed");
  const windows = parseAll<Window>(await hashAll(WINDOWS));
  if (!windows.some((w) => start >= w.start && start + SLOT <= w.end && (start - w.start) % SLOT === 0))
    throw new Error("That time isn't open");
  const mine = parseAll<Booking>(await hashAll(BOOKINGS)).filter((b) => b.end > now && b.name.toLowerCase() === name.toLowerCase());
  if (mine.length >= MAX_UPCOMING_PER_NAME) throw new Error(`${name} already has ${MAX_UPCOMING_PER_NAME} upcoming slots`);
  const token = randomBytes(16).toString("hex");
  const b: Booking = { id: randomUUID(), start, end: start + SLOT, name, driver_id: driverId, created_at: now, token };
  if (!(await hashSetNew(SLOTS, String(start), b.id))) throw new Error("That slot's already taken");
  await hashSet(BOOKINGS, b.id, JSON.stringify(b));
  const { token: _t, ...pub } = b;
  void _t;
  return { booking: pub, token };
}

/** Cancel with the token the booker got back (kept in their browser), or as the admin. */
export async function cancel(id: string, token: string | null, admin: boolean): Promise<void> {
  const b = parseAll<Booking>(await hashAll(BOOKINGS)).find((x) => x.id === id);
  if (!b) return;
  if (!admin) {
    const ok = !!token && !!b.token && token.length === b.token.length && timingSafeEqual(Buffer.from(token), Buffer.from(b.token));
    if (!ok) throw new Error("Only the person who booked it (or the organiser) can cancel");
  }
  await hashDel(BOOKINGS, id);
  await hashDel(SLOTS, String(b.start));
}
