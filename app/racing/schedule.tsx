"use client";
// app/racing/schedule.tsx: the Schedule tab. Open windows (set by the organiser) split into
// 1-hour slots; tap a free one, pick who you are, and it's yours. Your bookings are remembered in
// this browser (with a cancel token), so you can cancel them yourself.

import { useEffect, useState, type CSSProperties } from "react";
import s from "./racing.module.css";
import c from "./schedule.module.css";
import type { Competition, Driver } from "./lib/types";

interface Win { id: string; start: number; end: number }
interface Booking { id: string; start: number; end: number; name: string; driver_id: number | null }
interface Sched { windows: Win[]; bookings: Booking[] }

const MINE = "racingBookings"; // localStorage: booking id -> cancel token
const SLOT = 3600;
import { rigDay as day, rigTime as time, rigTzLabel } from "./lib/rigtime";

function readMine(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(MINE) || "{}"); } catch { return {}; }
}

async function post(path: string, body: unknown) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
  return json;
}

export function ScheduleView({ drivers, comps = [] }: { drivers: Driver[]; comps?: Competition[] }) {
  const [sched, setSched] = useState<Sched | null>(null);
  const [mine, setMine] = useState<Record<string, string>>({});
  const [picking, setPicking] = useState<number | null>(null); // slot start being booked
  const [who, setWho] = useState<string>("");
  const [other, setOther] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMine(readMine());
    setWho(localStorage.getItem("racingMe") || "");
    let alive = true;
    const load = () => fetch("/api/racing/schedule", { cache: "no-store" }).then((r) => r.json()).then((j) => alive && setSched(j)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // Practice is for the competition: offer its entrants (anyone else can type their name).
  const now0 = Date.now() / 1000;
  const entrantIds = new Set(comps.filter((c) => !c.attack_end || c.attack_end > now0).flatMap((c) => c.standings.map((r) => r.driver_id)));
  const active = drivers.filter((d) => !d.archived && (!entrantIds.size || entrantIds.has(d.id)))
    .sort((x, y) => (x.nickname || x.name).localeCompare(y.nickname || y.name));
  const nick = (d: Driver) => d.nickname || d.name;

  const doBook = async (start: number) => {
    const d = active.find((x) => String(x.id) === who);
    const name = d ? nick(d) : other.trim();
    setBusy(true); setErr(null);
    try {
      const out = await post("/api/racing/schedule/book", { start, name, driver_id: d && d.id > 0 ? d.id : undefined });
      const next = { ...readMine(), [out.booking.id]: out.token };
      localStorage.setItem(MINE, JSON.stringify(next));
      localStorage.setItem("racingMe", who);
      setMine(next); setSched(out.schedule); setPicking(null);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  const doCancel = async (id: string) => {
    if (!confirm("Cancel this booking?")) return;
    setBusy(true); setErr(null);
    try {
      const out = await post("/api/racing/schedule/cancel", { id, token: mine[id] });
      const next = { ...readMine() }; delete next[id];
      localStorage.setItem(MINE, JSON.stringify(next));
      setMine(next); setSched(out.schedule);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  if (!sched) return <div className={`${s.card} ${s.empty}`}>Loading the schedule…</div>;
  const now = Date.now() / 1000;
  // Windows -> hourly slots, grouped by day.
  const days = new Map<string, { start: number; booking?: Booking }[]>();
  for (const w of sched.windows) {
    for (let t = w.start; t + SLOT <= w.end; t += SLOT) {
      if (t + SLOT <= now) continue;
      const k = day(w.start); // a late window stays under the day it starts, even past midnight
      if (!days.has(k)) days.set(k, []);
      days.get(k)!.push({ start: t, booking: sched.bookings.find((b) => b.start === t) });
    }
  }
  const driverColor = (b: Booking) => drivers.find((d) => d.id === b.driver_id)?.color;

  return (
    <>
      <p className={`${s.small} ${s.muted} ${c.intro}`}>
        Book an hour on the sim for practice. Tap a free slot and pick who you are. One driver per slot, up to 3 upcoming
        slots each. You can cancel your own bookings from this device. Times are the rig&apos;s local time ({rigTzLabel()}).
      </p>
      {err && <div className={`${s.card} ${c.err}`}>{err}</div>}
      {!days.size ? (
        <div className={`${s.card} ${s.empty}`}>No practice times open right now. Check back soon.</div>
      ) : (
        [...days.entries()].map(([label, slots]) => (
          <section key={label} className={s.card}>
            <h2 className={s.cardTitle}><span>{label}</span><span className={s.small}>{slots.filter((x) => !x.booking).length} open</span></h2>
            <ul className={c.slots}>
              {slots.map(({ start, booking }) => {
                const isMine = booking && mine[booking.id];
                return (
                  <li key={start} className={`${c.slot} ${booking ? c.taken : c.free} ${isMine ? c.mine : ""}`}
                    style={{ "--c": booking ? driverColor(booking) ?? "var(--muted)" : undefined } as CSSProperties}>
                    <span className={`${c.time} ${s.num}`}>{time(start)}–{time(start + SLOT)}</span>
                    {booking ? (
                      <span className={c.who}>
                        <i className={c.dot} /> {booking.name}
                        {isMine && <button className={c.link} disabled={busy} onClick={() => doCancel(booking.id)}>Cancel</button>}
                      </span>
                    ) : picking === start ? (
                      <span className={c.form}>
                        <select value={who} onChange={(e) => setWho(e.target.value)} aria-label="Who's driving">
                          <option value="">Who are you?</option>
                          {active.map((d) => <option key={d.id} value={String(d.id)}>{nick(d)}</option>)}
                          <option value="other">Someone else…</option>
                        </select>
                        {who === "other" && <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Your name" maxLength={24} />}
                        <button className={c.book} disabled={busy || !who || (who === "other" && !other.trim())} onClick={() => doBook(start)}>Book</button>
                        <button className={c.link} onClick={() => setPicking(null)}>Back</button>
                      </span>
                    ) : (
                      <button className={c.open} onClick={() => { setPicking(start); setErr(null); }}>Open · book it</button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
