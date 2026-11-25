"use client";
// app/racing/compete.tsx: read-only view of SimStats competitions (rules, countdown, standings, pool).

import type { CSSProperties, ReactNode } from "react";
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
  if (!comps.length)
    return (
      <>
        <div className={`${s.card} ${s.empty}`}>No competition running right now. Here&apos;s how they work:</div>
        <RulesCard />
      </>
    );
  return (
    <>
      {comps.map((c) => (
        <div key={c.id}>
          <CompCard c={c} drivers={drivers} now={now} />
          <RulesCard c={c} />
        </div>
      ))}
    </>
  );
}

// The rules, filled in from the competition's settings (or general wording when none is
// running). Keep in step with SimStats' competition.py: that's what actually scores it.
function allowanceText(laps: number | null, mins: number | null) {
  if (laps && mins) return `${laps} laps or ${mins} minutes of lap time, whichever runs out first`;
  if (laps) return `${laps} laps`;
  if (mins) return `${mins} minutes of lap time (your lap times added up; a lap that would go past the limit doesn't count)`;
  return null;
}

function RulesCard({ c }: { c?: Competition }) {
  const track = c ? `${c.track_name}${c.track_config ? ` (${c.track_config})` : ""}` : "one track, picked for the competition";
  const cars = c ? c.cars.join(", ") : "a short list of allowed cars";
  const attackAllowance = c ? allowanceText(c.attack_laps, c.attack_minutes) : "a set number of laps (or minutes)";
  const practiceAllowance = c ? allowanceText(c.practice_laps, c.practice_minutes) : null;
  const split = c?.payouts.length
    ? c.payouts.map((p) => `${p.percent}% to P${p.place}`).join(", ")
    : "a split announced up front (e.g. 70% to P1, 30% to P2)";
  const fee = c ? money(c.fee_cents) : "the entry fee";

  const rules: [string, ReactNode][] = [
    ["Entry", <>Entry is {fee}. Everyone who pays goes into the pool, which is paid out {split} once the time attack closes.{c ? ` ${c.paid_count} of ${c.entrants} entrant${c.entrants === 1 ? " has" : "s have"} paid so far.` : ""}</>],
    ["Track & cars", <>Only laps at {track} in {c ? <b>{cars}</b> : cars} count. You can switch between the allowed cars. Laps anywhere else, or in any other car, are ignored completely: they don&apos;t count and don&apos;t use up anything.</>],
    ["Practice", c && !c.practice_start
      ? <>There&apos;s no practice window for this one: go straight to the time attack.</>
      : <>{c?.practice_start ? <>Practice runs {when(c.practice_start)} → {when(c.practice_end)}. </> : <>There&apos;s a practice window before the time attack. </>}
          {practiceAllowance ? <>Each driver gets {practiceAllowance} of practice; going over is flagged on the leaderboard. </> : c ? <>Practice is unlimited. </> : <>It may be capped at a set number of laps or minutes. </>}
          Practice laps never count towards the result.</>],
    ["Time attack", <>{c ? <>The time attack runs {when(c.attack_start)} → {when(c.attack_end)}. </> : <>Then there&apos;s a time-attack window (usually a week). </>}
      Each driver gets <b>{attackAllowance ?? "unlimited laps"}</b>: the first laps you drive in the window, in order. Once they&apos;re used up, later laps don&apos;t count, even if they&apos;re faster. So don&apos;t &ldquo;just warm up&rdquo; in an allowed car.</>],
    ["Free laps", <>Out-laps and in-laps (anything that touches pit road), and laps SimStats didn&apos;t see from the start/finish line, don&apos;t use up an attempt.</>],
    ["Clean laps", <>A lap only sets a time if it&apos;s clean: no incident points, never off track, no pit lane, no reset or tow. A lap that isn&apos;t clean still uses up an attempt.</>],
    ["Result", <>Your fastest clean lap that counts is your result, and the fastest wins. On an identical time, whoever set it first is ahead.</>],
    ["Timing", <>SimStats records every lap straight from iRacing; nobody types times in. Laps go to whoever is selected as driving in SimStats, so check it&apos;s you before you leave the pits.</>],
    ["Emails", <>If you&apos;ve given an email you&apos;ll hear when someone knocks you down the order, before each window opens and closes, and when results are final.</>],
    ["Anything else", <>Anything these rules don&apos;t cover (a crash, a dropped connection, a dispute) is the organizer&apos;s call.</>],
  ];
  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}><span>Rules{c ? ` · ${c.name}` : ""}</span></h2>
      <ol className={s.rulesList}>
        {rules.map(([title, body]) => (
          <li key={title}>
            <b className={s.ruleTitle}>{title}</b>
            <span>{body}</span>
          </li>
        ))}
      </ol>
    </section>
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
