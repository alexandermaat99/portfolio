"use client";
// app/racing/compete.tsx: read-only view of SimStats competitions (rules, countdown, standings, pool).

import type { CSSProperties } from "react";
import s from "./racing.module.css";
import type { Competition, Driver } from "./lib/types";
import { Avatar, CarLabel, DriverName, TrackIcon } from "./visuals";

const PHASE_LABEL: Record<Competition["phase"], string> = {
  upcoming: "Not started",
  practice: "Practice",
  between: "Practice closed",
  attack: "Time attack",
  finished: "Finished",
};

function fmtLap(t: number | null | undefined) {
  if (t == null) return "—";
  const m = Math.floor(t / 60);
  return `${m}:${(t - m * 60).toFixed(3).padStart(6, "0")}`;
}
const money = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
const when = (ts: number | null) =>
  ts ? new Date(ts * 1000).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const limit = (laps: number | null, mins: number | null) =>
  [laps ? `${laps} laps` : "", mins ? `${mins} min` : ""].filter(Boolean).join(" or ") || "unlimited";

// The phase as of right now (the snapshot can be minutes old).
export function phaseNow(c: Competition, now: number): Competition["phase"] {
  if (c.practice_start && c.practice_end && c.practice_start <= now && now < c.practice_end) return "practice";
  if (c.attack_start <= now && now < c.attack_end) return "attack";
  if (now >= c.attack_end) return "finished";
  if (c.practice_end && now >= c.practice_end) return "between";
  return "upcoming";
}

function countdown(ts: number, now: number) {
  const left = Math.max(0, ts - now);
  const d = Math.floor(left / 86400), h = Math.floor((left % 86400) / 3600), m = Math.floor((left % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

function nextDeadline(c: Competition, now: number): [number, string] | null {
  const marks: [number | null, string][] = [
    [c.practice_start, "practice opens"], [c.practice_end, "practice closes"],
    [c.attack_start, "time attack opens"], [c.attack_end, "time attack closes"],
  ];
  const next = marks.filter(([t]) => t && t > now).sort((a, b) => (a[0] as number) - (b[0] as number))[0];
  return next ? [next[0] as number, next[1]] : null;
}

export function CompeteView({ comps, drivers, now }: { comps: Competition[]; drivers: Driver[]; now: number }) {
  if (!comps.length) return <div className={`${s.card} ${s.empty}`}>No competition running right now.</div>;
  return (
    <>
      {comps.map((c) => (
        <CompCard key={c.id} c={c} drivers={drivers} now={now} />
      ))}
    </>
  );
}

function CompCard({ c, drivers, now }: { c: Competition; drivers: Driver[]; now: number }) {
  const phase = phaseNow(c, now);
  const next = nextDeadline(c, now);
  const attack = phase === "attack" || phase === "finished";
  const driverOf = (id: number) => drivers.find((d) => d.id === id);
  return (
    <section className={s.card}>
      <div className={s.compHead}>
        <div className={s.titleRow}>
          <TrackIcon trackKey={c.track_key} large />
          <div>
            <h3 className={s.compName}>{c.name}</h3>
            <div className={s.car}>
              {c.track_name}
              {c.track_config ? ` – ${c.track_config}` : ""}
            </div>
          </div>
        </div>
        <span className={`${s.chip} ${phase === "attack" ? s.chipLive : phase === "practice" ? s.chipGood : ""}`}>
          {PHASE_LABEL[phase]}
        </span>
      </div>

      <div className={`${s.compStrip} ${s.num}`}>
        <div>
          <b>{money(c.pool_cents)}</b>
          <span>pool · {money(c.fee_cents)} entry</span>
        </div>
        <div>
          <b>{c.payouts.map((p) => money(p.cents)).join(" / ")}</b>
          <span>{c.payouts.map((p) => `P${p.place}`).join(" / ")}</span>
        </div>
        <div>
          {next ? (
            <>
              <b>{countdown(next[0], now)}</b>
              <span>until {next[1]}</span>
            </>
          ) : (
            <>
              <b>Done</b>
              <span>{when(c.attack_end)}</span>
            </>
          )}
        </div>
      </div>

      <dl className={s.compRules}>
        <div>
          <dt>Cars</dt>
          <dd>
            {c.cars.map((n) => (
              <span key={n} className={s.carItem}>
                <CarLabel car={n} />
              </span>
            ))}
          </dd>
        </div>
        {c.practice_start && (
          <div>
            <dt>Practice</dt>
            <dd>
              {when(c.practice_start)} → {when(c.practice_end)} · {limit(c.practice_laps, c.practice_minutes)} each
            </dd>
          </div>
        )}
        <div>
          <dt>Time attack</dt>
          <dd>
            {when(c.attack_start)} → {when(c.attack_end)} · {limit(c.attack_laps, c.attack_minutes)} each, best clean lap
            counts
          </dd>
        </div>
      </dl>

      {c.standings.length ? (
        <table className={`${s.board} ${s.num}`}>
          <thead>
            <tr>
              <th />
              <th>Driver</th>
              <th>{attack ? "Best" : "Practice"}</th>
              {attack && <th className={s.hideSm}>Gap</th>}
              <th>{attack ? "Used" : "Time"}</th>
            </tr>
          </thead>
          <tbody>
            {c.standings.map((r) => {
              const d = driverOf(r.driver_id);
              return (
                <tr key={r.driver_id} className={r.pos === 1 && attack ? s.p1 : ""}>
                  <td className={s.pos}>{attack && r.pos ? r.pos : "–"}</td>
                  <td className={s.name}>
                    <span className={s.nameInner}>
                      <Avatar driver={d} size="sm" />
                      <span>
                        {d && <DriverName driver={d} />}
                        {attack && r.best_car && (
                          <span className={s.bestCar}>
                            <CarLabel car={r.best_car} />
                          </span>
                        )}
                      </span>
                    </span>
                  </td>
                  {attack ? (
                    <>
                      <td className={s.best}>{fmtLap(r.best)}</td>
                      <td className={`${s.muted} ${s.hideSm}`}>{r.gap == null ? "" : r.gap === 0 ? "—" : `+${r.gap.toFixed(3)}`}</td>
                      <td className={s.muted}>
                        {r.attack_laps_used}
                        {c.attack_laps ? `/${c.attack_laps}` : ""}
                        {r.attack_laps_over > 0 && <span className={`${s.chip} ${s.chipBad}`} style={{ marginLeft: 6 } as CSSProperties}>+{r.attack_laps_over}</span>}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={s.muted}>
                        {r.practice_laps_used}
                        {c.practice_laps ? `/${c.practice_laps}` : ""} laps
                      </td>
                      <td className={s.muted}>{Math.round(r.practice_seconds_used / 60)}m</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className={s.empty}>No entrants yet.</div>
      )}
      <div className={`${s.small} ${s.muted}`} style={{ marginTop: 10 }}>
        {c.entrants} entrant{c.entrants === 1 ? "" : "s"} · laps count on this track, in an allowed car, inside the window
      </div>
    </section>
  );
}
