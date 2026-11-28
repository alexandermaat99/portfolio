"use client";
// app/racing/admin/AdminApp.tsx: the organiser's page for drivers + competitions, from anywhere.
// Every change is queued for the sim PC (see lib/admin.ts) and shows here right away.

import Link from "next/link";
import { useState, type CSSProperties, type FormEvent } from "react";
import s from "../racing.module.css";
import a from "./admin.module.css";
import { refOf, type CompFields, type OpInput, type ViewComp, type ViewDriver } from "../lib/admin";
import type { AdminState } from "../lib/admin-state";

const GT3_CARS = ["Mercedes-AMG GT3 2020", "Porsche 911 GT3 R (992)", "Ferrari 296 GT3",
  "Audi R8 LMS EVO II GT3", "Ford Mustang GT3", "McLaren 720S GT3 EVO"];

const ago = (ts: number | null) => {
  if (!ts) return "never";
  const m = Math.round((Date.now() / 1000 - ts) / 60);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 48 * 60 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
};
const toLocal = (ts: number | null) => {
  if (!ts) return "";
  const d = new Date(ts * 1000), p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocal = (v: string) => (v ? new Date(v).getTime() / 1000 : null);
const num = (v: string) => (v.trim() === "" ? null : Math.max(0, Math.round(Number(v))) || 0);

// Email on file? "unknown" = an existing driver before the PC's first sync (it has the emails).
type EmailState = "yes" | "missing" | "unknown";
const emailState = (d: ViewDriver, pcReady: boolean): EmailState =>
  d.email ? "yes" : pcReady || d.id == null ? "missing" : "unknown";

function EmailTag({ state }: { state: EmailState }) {
  if (state === "yes") return <span className={`${s.chip} ${a.tagOk}`} title="Gets coaching and competition emails">email ✓</span>;
  if (state === "missing")
    return <span className={`${s.chip} ${s.chipBad}`} title="No email: won't get coaching or competition emails. Add one with Edit.">no email</span>;
  return <span className={s.chip} title="Not known until the sim PC syncs with this page">email ?</span>;
}

async function call(path: string, body: unknown): Promise<AdminState> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
  return json as AdminState;
}

export default function AdminApp({ initial }: { initial: AdminState }) {
  const [st, setSt] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingComp, setEditingComp] = useState<ViewComp | "new" | null>(null);

  const run = async (fn: () => Promise<AdminState>) => {
    setBusy(true);
    setErr(null);
    try {
      setSt(await fn());
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const send = (op: OpInput) => run(() => call("/api/racing/admin/ops", op));
  const cancel = (id: string) => run(() => call("/api/racing/admin/cancel", { id }));
  const logout = async () => {
    await fetch("/api/racing/admin/logout", { method: "POST" });
    window.location.href = "/racing";
  };

  const drivers = st.view.drivers.filter((d) => !d.archived);
  const removed = st.view.drivers.filter((d) => d.archived);

  return (
    <div className={s.root}>
      <header className={s.topbar}>
        <div className={s.brand}>
          <Link href="/racing">
            <span className={s.wordmark}>SIMSTATS</span>
            <span className={s.model}>ADMIN</span>
          </Link>
        </div>
        <button className={a.linkBtn} onClick={logout}>Log out</button>
      </header>
      <main className={s.main}>
        <section className={`${s.card} ${a.status}`}>
          <div>
            {st.pc_ready ? (
              <>
                <b>Sim PC last synced {ago(st.synced_at)}.</b>{" "}
                <span className={s.muted}>Changes here show on the site right away and reach the PC the next time it&apos;s on.</span>
              </>
            ) : (
              <>
                <b>The sim PC hasn&apos;t synced with this page yet</b>{" "}
                <span className={s.muted}>(it needs one update at home). Changes show on the site right away and wait for the PC. Emails and paid status already saved on the PC show up after it syncs.</span>
              </>
            )}
          </div>
          {st.pending.length > 0 && (
            <ul className={a.pending}>
              {st.pending.map((p) => (
                <li key={p.id}>
                  <span className={s.chip}>waiting</span> {p.summary}
                  <button className={a.linkBtn} disabled={busy} onClick={() => cancel(p.id)}>Undo</button>
                </li>
              ))}
            </ul>
          )}
          {st.last?.errors.length ? (
            <ul className={a.pending}>
              {st.last.errors.map((e) => (
                <li key={e.id} className={a.bad}>
                  <span className={`${s.chip} ${s.chipBad}`}>failed</span> {e.summary}: {e.error}
                </li>
              ))}
            </ul>
          ) : null}
          {err && <div className={a.bad}>{err}</div>}
        </section>

        <div className={a.grid}>
          <section className={s.card}>
            <h2 className={s.cardTitle}>
              <span>Drivers</span>
              <span className={s.small}>
                {(() => {
                  const missing = drivers.filter((d) => emailState(d, st.pc_ready) === "missing").length;
                  return missing ? <span className={a.bad}>{missing} without email · </span> : null;
                })()}
                {drivers.length}
              </span>
            </h2>
            <ul className={a.list}>
              {drivers.map((d) => <DriverRow key={d.key} d={d} busy={busy} send={send} pcReady={st.pc_ready} />)}
            </ul>
            {removed.length > 0 && (
              <details className={a.removed}>
                <summary className={s.muted}>{removed.length} removed</summary>
                <ul className={a.list}>
                  {removed.map((d) => (
                    <li key={d.key} className={a.row}>
                      <span>{d.nickname || d.name}</span>
                      <button className={a.linkBtn} disabled={busy} onClick={() => send({ type: "driver.edit", driver: refOf(d.key), archived: false })}>Restore</button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <AddDriver busy={busy} send={send} />
          </section>

          <section>
            {st.view.competitions.map((c) =>
              editingComp !== "new" && editingComp?.key === c.key ? (
                <CompForm key={c.key} comp={c} st={st} busy={busy} onCancel={() => setEditingComp(null)}
                  onSave={async (fields) => (await send({ type: "comp.save", comp: refOf(c.key), fields })) && setEditingComp(null)} />
              ) : (
                <CompCard key={c.key} c={c} drivers={drivers} busy={busy} send={send} pcReady={st.pc_ready} onEdit={() => setEditingComp(c)} />
              ),
            )}
            {editingComp === "new" ? (
              <CompForm st={st} busy={busy} onCancel={() => setEditingComp(null)}
                onSave={async (fields) => (await send({ type: "comp.save", fields })) && setEditingComp(null)} />
            ) : (
              <button className={`${a.btn} ${a.primary}`} onClick={() => setEditingComp("new")}>New competition</button>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

// -- drivers ---------------------------------------------------------------------------

function DriverRow({ d, busy, send, pcReady }: { d: ViewDriver; busy: boolean; send: (op: OpInput) => Promise<boolean>; pcReady: boolean }) {
  const [open, setOpen] = useState(false);
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    // Only send what changed, so nothing the page can't see (e.g. an email saved on the PC) is overwritten.
    const op: OpInput = { type: "driver.edit", driver: refOf(d.key) };
    const nickname = String(f.get("nickname") || "").trim(), name = String(f.get("name") || "").trim();
    const email = String(f.get("email") || "").trim(), beginner = f.get("beginner") === "on";
    if (nickname !== (d.nickname || "")) op.nickname = nickname;
    if (name !== d.name) op.name = name;
    if (email !== (d.email || "")) op.email = email;
    if (beginner !== d.marked_new) op.beginner = beginner;
    if (Object.keys(op).length === 2) return setOpen(false); // nothing changed
    if (await send(op)) setOpen(false);
  };
  return (
    <li className={a.driver} style={{ "--c": d.color } as CSSProperties}>
      <div className={a.row}>
        <span className={a.dot} />
        <span className={a.who}>
          <b>{d.nickname || d.name}</b> <span className={s.muted}>{d.nickname ? d.name : ""}</span>
          {d.pending && <span className={s.chip}>waiting</span>}
          {d.beginner && <span className={s.chip}>beginner</span>}
          <EmailTag state={emailState(d, pcReady)} />
          {d.email && <span className={a.email}>{d.email}</span>}
        </span>
        <button className={a.linkBtn} onClick={() => setOpen(!open)}>{open ? "Close" : "Edit"}</button>
      </div>
      {open && (
        <form className={a.form} onSubmit={save}>
          <label>Nickname<input name="nickname" defaultValue={d.nickname || ""} maxLength={24} required /></label>
          <label>Name<input name="name" defaultValue={d.name} maxLength={40} required /></label>
          <label>Email <span className={s.muted}>(alerts; never shown publicly)</span><input name="email" type="email" defaultValue={d.email || ""} maxLength={120} /></label>
          <label className={a.check}><input type="checkbox" name="beginner" defaultChecked={d.marked_new} /> New to the sim <span className={s.muted}>(beginner until 5 laps)</span></label>
          <div className={a.actions}>
            <button className={`${a.btn} ${a.primary}`} disabled={busy}>Save</button>
            <button type="button" className={`${a.btn} ${a.danger}`} disabled={busy}
              onClick={() => confirm(`Remove ${d.nickname || d.name}? Their laps and records are kept.`) && send({ type: "driver.edit", driver: refOf(d.key), archived: true })}>
              Remove
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

function AddDriver({ busy, send }: { busy: boolean; send: (op: OpInput) => Promise<boolean> }) {
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const ok = await send({
      type: "driver.add", nickname: String(f.get("nickname") || "").trim(), name: String(f.get("name") || "").trim(),
      beginner: f.get("beginner") === "on", email: String(f.get("email") || "").trim() || undefined,
    });
    if (ok) form.reset();
  };
  return (
    <form className={`${a.form} ${a.add}`} onSubmit={submit}>
      <h3>Add a driver</h3>
      <label>Nickname <span className={s.muted}>(shown big)</span><input name="nickname" maxLength={24} required /></label>
      <label>Name<input name="name" maxLength={40} required /></label>
      <label>Email <span className={s.muted}>(optional)</span><input name="email" type="email" maxLength={120} /></label>
      <label className={a.check}><input type="checkbox" name="beginner" /> New to the sim <span className={s.muted}>(beginner until 5 laps)</span></label>
      <button className={`${a.btn} ${a.primary}`} disabled={busy}>Add driver</button>
    </form>
  );
}

// -- competitions ------------------------------------------------------------------------

function CompCard({ c, drivers, busy, send, pcReady, onEdit }: {
  c: ViewComp; drivers: ViewDriver[]; busy: boolean; send: (op: OpInput) => Promise<boolean>; pcReady: boolean; onEdit: () => void;
}) {
  const f = c.fields;
  const comp = refOf(c.key);
  const entry = (key: string) => c.entrants.find((e) => e.driver === key);
  const paid = c.entrants.filter((e) => e.paid).length;
  const fmt = (ts: number | null) => (ts ? new Date(ts * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}>
        <span>{f.name || "Competition"}</span>
        <span>{c.pending && <span className={s.chip}>waiting</span>}</span>
      </h2>
      <div className={a.meta}>
        <div>{f.track_name}{f.track_config ? ` – ${f.track_config}` : ""}</div>
        <div className={s.muted}>{f.cars.join(", ") || "no cars yet"}</div>
        <div className={s.muted}>
          Practice: {f.practice_start ? `${fmt(f.practice_start)} → ${fmt(f.practice_end)}` : "dates TBD"} · Hot lap:{" "}
          {f.attack_start ? `${fmt(f.attack_start)} → ${fmt(f.attack_end)}` : "dates TBD"}
        </div>
        <div><b>${((paid * (f.fee_cents ?? 0)) / 100).toFixed(0)}</b> <span className={s.muted}>pool · {paid} of {c.entrants.length} paid · ${(f.fee_cents ?? 0) / 100} each · payout {f.payout}</span></div>
      </div>
      <h3 className={a.sub}>Entrants</h3>
      <ul className={a.list}>
        {drivers.map((d) => {
          const e = entry(d.key);
          return (
            <li key={d.key} className={a.row} style={{ "--c": d.color } as CSSProperties}>
              <label className={a.check}>
                <input type="checkbox" checked={!!e} disabled={busy}
                  onChange={(ev) => send({ type: "comp.entrant", comp, driver: refOf(d.key), entered: ev.target.checked })} />
                <span className={a.dot} /> {d.nickname || d.name}
              </label>
              {e && emailState(d, pcReady) === "missing" && (
                <span className={`${a.bad} ${a.noEmail}`} title="Won't get overtake alerts, deadline reminders or coaching emails">no email</span>
              )}
              {e && (
                <span className={a.entryCtl}>
                  <button className={`${a.pill} ${e.paid ? a.pillOn : ""}`} disabled={busy}
                    onClick={() => send({ type: "comp.entrant", comp, driver: refOf(d.key), paid: !e.paid })}>
                    {e.paid ? "paid" : "unpaid"}
                  </button>
                  <span className={s.muted} title="Extra shots (tie shoot-out)">
                    <button className={a.linkBtn} disabled={busy || e.extra_shots === 0}
                      onClick={() => send({ type: "comp.entrant", comp, driver: refOf(d.key), extra_shots: e.extra_shots - 1 })}>−</button>
                    {e.extra_shots ? `+${e.extra_shots} shot` : "shots"}
                    <button className={a.linkBtn} disabled={busy}
                      onClick={() => send({ type: "comp.entrant", comp, driver: refOf(d.key), extra_shots: e.extra_shots + 1 })}>+</button>
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className={a.actions}>
        <button className={a.btn} onClick={onEdit}>Edit</button>
        <button className={`${a.btn} ${a.danger}`} disabled={busy}
          onClick={() => confirm(`Archive ${f.name}? Its laps stay in your records.`) && send({ type: "comp.archive", comp })}>Archive</button>
      </div>
    </section>
  );
}

function CompForm({ comp, st, busy, onSave, onCancel }: {
  comp?: ViewComp; st: AdminState; busy: boolean; onSave: (f: Partial<CompFields>) => void; onCancel: () => void;
}) {
  const f = comp?.fields;
  const [cars, setCars] = useState<string[]>(f?.cars ?? []);
  const [tbd, setTbd] = useState(comp ? !f?.attack_start : true);
  const [other, setOther] = useState("");
  const tracks = st.tracks;
  const allCars = [...new Set([...GT3_CARS, ...st.cars, ...cars])];
  const toggle = (n: string) => setCars(cars.includes(n) ? cars.filter((x) => x !== n) : [...cars, n]);
  const trackKey = (t: { track_id: number | null; track_config: string }) => `${t.track_id}|${t.track_config}`;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = new FormData(e.currentTarget);
    const g = (k: string) => String(v.get(k) ?? "");
    const t = tracks.find((x) => trackKey(x) === g("track"));
    onSave({
      name: g("name").trim(),
      track_id: t?.track_id ?? f?.track_id ?? null, track_config: t?.track_config ?? f?.track_config ?? "", track_name: t?.track_name ?? f?.track_name ?? "",
      cars,
      fee_cents: Math.round(Number(g("fee") || 0) * 100), payout: g("payout").trim() || "100",
      practice_start: tbd ? null : fromLocal(g("practice_start")), practice_end: tbd ? null : fromLocal(g("practice_end")),
      practice_laps: num(g("practice_laps")), practice_minutes: num(g("practice_minutes")),
      practice_bonus_laps: num(g("practice_bonus_laps")), practice_bonus_minutes: num(g("practice_bonus_minutes")),
      attack_start: tbd ? null : fromLocal(g("attack_start")), attack_end: tbd ? null : fromLocal(g("attack_end")),
      attack_laps: num(g("attack_laps")), attack_minutes: num(g("attack_minutes")), attack_warmup_laps: num(g("attack_warmup_laps")) ?? 0,
    });
  };
  const cur = f ? trackKey(f) : tracks[0] ? trackKey(tracks[0]) : "";
  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}><span>{comp ? "Edit competition" : "New competition"}</span></h2>
      <form className={a.form} onSubmit={submit}>
        <label>Name<input name="name" defaultValue={f?.name ?? ""} placeholder="Suzuka Cup" maxLength={40} required /></label>
        <label>Track
          <select name="track" defaultValue={cur}>
            {tracks.map((t) => <option key={trackKey(t)} value={trackKey(t)}>{t.track_name}{t.track_config ? ` – ${t.track_config}` : ""}</option>)}
          </select>
        </label>
        <div className={a.field}>
          <span>Allowed cars</span>
          <div className={a.chips}>
            {allCars.map((n) => (
              <button type="button" key={n} className={`${a.pill} ${cars.includes(n) ? a.pillOn : ""}`} onClick={() => toggle(n)}>{n}</button>
            ))}
          </div>
          <div className={a.inline}>
            <button type="button" className={a.btn} onClick={() => setCars([...new Set([...cars, ...GT3_CARS])])}>All GT3s</button>
            <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Other car (exact iRacing name)" />
            <button type="button" className={a.btn} onClick={() => { if (other.trim()) setCars([...new Set([...cars, other.trim()])]); setOther(""); }}>Add</button>
          </div>
        </div>
        <div className={a.inline}>
          <label>Entry fee ($)<input name="fee" inputMode="decimal" defaultValue={(f?.fee_cents ?? 2000) / 100} /></label>
          <label>Payout %<input name="payout" defaultValue={f?.payout ?? "100"} placeholder="100 or 70/30" /></label>
        </div>
        <label className={a.check}><input type="checkbox" checked={tbd} onChange={(e) => setTbd(e.target.checked)} /> Dates not decided yet</label>
        <fieldset>
          <legend>Practice</legend>
          {!tbd && (
            <div className={a.inline}>
              <label>Opens<input type="datetime-local" name="practice_start" defaultValue={toLocal(f?.practice_start ?? null)} /></label>
              <label>Closes<input type="datetime-local" name="practice_end" defaultValue={toLocal(f?.practice_end ?? null)} /></label>
            </div>
          )}
          <div className={a.inline}>
            <label>Laps<input name="practice_laps" inputMode="numeric" defaultValue={f ? f.practice_laps ?? "" : 30} /></label>
            <label>Minutes<input name="practice_minutes" inputMode="numeric" defaultValue={f?.practice_minutes ?? ""} /></label>
          </div>
          <div className={a.inline}>
            <label>Beginners: + laps<input name="practice_bonus_laps" inputMode="numeric" defaultValue={f ? f.practice_bonus_laps ?? "" : 10} /></label>
            <label>+ minutes<input name="practice_bonus_minutes" inputMode="numeric" defaultValue={f?.practice_bonus_minutes ?? ""} /></label>
          </div>
        </fieldset>
        <fieldset>
          <legend>Hot lap</legend>
          {!tbd && (
            <div className={a.inline}>
              <label>Opens<input type="datetime-local" name="attack_start" defaultValue={toLocal(f?.attack_start ?? null)} /></label>
              <label>Closes<input type="datetime-local" name="attack_end" defaultValue={toLocal(f?.attack_end ?? null)} /></label>
            </div>
          )}
          <div className={a.inline}>
            <label>Shots (laps)<input name="attack_laps" inputMode="numeric" defaultValue={f ? f.attack_laps ?? "" : 3} /></label>
            <label>Warm-ups<input name="attack_warmup_laps" inputMode="numeric" defaultValue={f ? f.attack_warmup_laps ?? 0 : 2} /></label>
            <label>Minutes<input name="attack_minutes" inputMode="numeric" defaultValue={f?.attack_minutes ?? ""} /></label>
          </div>
        </fieldset>
        <div className={a.actions}>
          <button className={`${a.btn} ${a.primary}`} disabled={busy || !cars.length}>{comp ? "Save" : "Create"}</button>
          <button type="button" className={a.btn} onClick={onCancel}>Cancel</button>
        </div>
        {!cars.length && <div className={s.small}>Pick at least one car.</div>}
      </form>
    </section>
  );
}
