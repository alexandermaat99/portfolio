"use client";
// app/racing/admin/ScheduleAdmin.tsx: open practice windows (optionally every week) and manage bookings.

import { useEffect, useState, type FormEvent } from "react";
import s from "../racing.module.css";
import a from "./admin.module.css";

interface Win { id: string; start: number; end: number }
interface Booking { id: string; start: number; end: number; name: string }
interface Sched { windows: Win[]; bookings: Booking[] }

import { rigTime as hm, rigToUnix, rigTzLabel, rigWhen as when } from "../lib/rigtime";

async function post(path: string, body: unknown): Promise<Sched> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
  return json.schedule as Sched;
}

export default function ScheduleAdmin() {
  const [sched, setSched] = useState<Sched | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [repeat, setRepeat] = useState("once");
  useEffect(() => {
    fetch("/api/racing/schedule", { cache: "no-store" }).then((r) => r.json()).then(setSched).catch(() => setErr("Couldn't load the schedule"));
  }, []);

  const run = async (fn: () => Promise<Sched>) => {
    setBusy(true); setErr(null);
    try { setSched(await fn()); return true; } catch (e) { setErr(e instanceof Error ? e.message : String(e)); return false; }
    finally { setBusy(false); }
  };

  const add = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget, f = new FormData(form);
    const date = String(f.get("date") || ""), from = String(f.get("from") || ""), to = String(f.get("to") || "");
    if (!date || !from || !to) return setErr("Pick a date, start and end time");
    const start = rigToUnix(date, from);
    let end = rigToUnix(date, to);
    if (end <= start) end += 86400; // past midnight
    const repeat = String(f.get("repeat") || "once");
    let count = 1, step_days = 7;
    if (repeat === "daily") {
      const until = String(f.get("until") || "");
      if (!until) return setErr("Pick the last day");
      count = Math.round((rigToUnix(until, from) - start) / 86400) + 1;
      step_days = 1;
      if (count < 1) return setErr("The last day is before the first");
    } else if (repeat.startsWith("weekly")) count = Number(repeat.slice(6));
    if (await run(() => post("/api/racing/admin/schedule", { action: "add", start, end, count, step_days }))) { form.reset(); setRepeat("once"); }
  };

  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}><span>Practice schedule</span><span className={s.small}>1-hour slots</span></h2>
      <p className={`${s.small} ${s.muted}`} style={{ marginTop: 0 }}>
        Open the times the rig is free; friends book 1-hour slots inside them on /racing/schedule. All times are the rig&apos;s
        local time ({rigTzLabel()}), wherever you are.
      </p>
      <form className={a.form} onSubmit={add}>
        <div className={a.inline}>
          <label>Date<input type="date" name="date" required /></label>
          <label>From<input type="time" name="from" defaultValue="18:00" step={3600} required /></label>
          <label>To<input type="time" name="to" defaultValue="22:00" step={3600} required /></label>
          <label>Repeat
            <select name="repeat" value={repeat} onChange={(e) => setRepeat(e.target.value)}>
              <option value="once">Just this day</option>
              <option value="daily">Every day until…</option>
              <option value="weekly2">Weekly for 2 weeks</option>
              <option value="weekly4">Weekly for 4 weeks</option>
              <option value="weekly8">Weekly for 8 weeks</option>
            </select>
          </label>
          {repeat === "daily" && <label>Last day<input type="date" name="until" required /></label>}
        </div>
        <button className={`${a.btn} ${a.primary}`} disabled={busy}>Open these times</button>
      </form>
      {err && <div className={a.bad}>{err}</div>}
      {sched && (sched.windows.length ? (
        <ul className={a.list}>
          {sched.windows.map((w) => {
            const inside = sched.bookings.filter((b) => b.start >= w.start && b.end <= w.end);
            return (
              <li key={w.id} className={a.driver}>
                <div className={a.row}>
                  <span className={a.who}>
                    <b>{when(w.start)}–{hm(w.end)}</b>
                    <span className={s.muted}>{inside.length} of {Math.floor((w.end - w.start) / 3600)} booked</span>
                  </span>
                  <button className={a.linkBtn} disabled={busy}
                    onClick={() => confirm(inside.length ? `Close this window and cancel ${inside.length} booking(s)?` : "Close this window?")
                      && run(() => post("/api/racing/admin/schedule", { action: "delete", id: w.id }))}>Close</button>
                </div>
                {inside.map((b) => (
                  <div key={b.id} className={a.row} style={{ paddingLeft: 16 }}>
                    <span className={a.who}><span className={s.muted}>{hm(b.start)}</span> {b.name}</span>
                    <button className={a.linkBtn} disabled={busy}
                      onClick={() => confirm(`Remove ${b.name}'s ${hm(b.start)} slot?`) && run(() => post("/api/racing/schedule/cancel", { id: b.id }))}>Remove</button>
                  </div>
                ))}
              </li>
            );
          })}
        </ul>
      ) : <div className={s.empty}>No practice times open yet.</div>)}
    </section>
  );
}
