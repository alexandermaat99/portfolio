"use client";
// app/racing/compete.tsx: read-only view of SimStats competitions (rules, countdown, standings, pool).

import type { CSSProperties, ReactNode } from "react";
import s from "./racing.module.css";
import type { Competition, Driver } from "./lib/types";
import { Avatar, CarLabel, DriverName, TrackIcon } from "./visuals";
import { trackInfo } from "./lib/tracks";
import { rigTzLabel, rigWhen } from "./lib/rigtime";

const PHASE_LABEL: Record<Competition["phase"], string> = {
  upcoming: "Not started",
  practice: "Practice",
  between: "Practice closed",
  attack: "Hot lap",
  finished: "Finished",
};

function fmtLap(t: number | null | undefined) {
  if (t == null) return "—";
  const m = Math.floor(t / 60);
  return `${m}:${(t - m * 60).toFixed(3).padStart(6, "0")}`;
}
const money = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
// Shown on the rig's clock (that's where you'll be), with the zone so it's never ambiguous.
const when = (ts: number | null) => (ts ? `${rigWhen(ts)} ${rigTzLabel(ts)}` : "—");
const limit = (laps: number | null, mins: number | null) =>
  [laps ? `${laps} laps` : "", mins ? `${mins} min` : ""].filter(Boolean).join(" or ") || "unlimited";

// The phase as of right now (the snapshot can be minutes old).
export function phaseNow(c: Competition, now: number): Competition["phase"] {
  if (c.practice_start && c.practice_end && c.practice_start <= now && now < c.practice_end) return "practice";
  if (!c.attack_start || !c.attack_end) return "upcoming"; // dates to be decided
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
    [c.attack_start, "hot lap opens"], [c.attack_end, "hot lap closes"],
  ];
  const next = marks.filter(([t]) => t && t > now).sort((a, b) => (a[0] as number) - (b[0] as number))[0];
  return next ? [next[0] as number, next[1]] : null;
}

export function CompeteView({ comps, drivers, now }: { comps: Competition[]; drivers: Driver[]; now: number }) {
  if (!comps.length)
    return (
      <>
        <div className={`${s.card} ${s.empty}`}>No competition running right now.</div>
        <section className={s.card}>
          <h2 className={s.cardTitle}><span>How competitions work</span></h2>
          <Rules plain />
        </section>
      </>
    );
  return (
    <>
      {comps.map((c) => (
        // Wide screens: rules in their own card beside the competition. Phones: a
        // collapsible row inside the card (the side card is hidden).
        <div key={c.id} className={s.compLayout}>
          <CompCard c={c} drivers={drivers} now={now} />
          <aside className={`${s.card} ${s.rulesSide}`}>
            <h2 className={s.cardTitle}><span>Rules</span></h2>
            <Rules c={c} plain />
          </aside>
          <TrackCard c={c} />
        </div>
      ))}
    </>
  );
}

// The rules, short (drivers are smart), filled in from the competition's settings. The
// card above already shows track, cars, dates and money, so this is just the mechanics.
// Keep in step with SimStats' competition.py: that's what actually scores it.
// The rules: only what isn't obvious. Track, cars, dates and money are on the card.
// Keep in step with SimStats' competition.py: that's what actually scores it.
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const both = (a: string, b: string, sep: string) => [a, b].filter(Boolean).join(sep);

// Practice happens if it has dates, or (while dates are undecided) if it has a limit set.
const hasPractice = (c: Competition) =>
  !!c.practice_start || (!c.attack_start && !!(c.practice_laps || c.practice_minutes));

// "week" / "night" from how long a window is (so a one-night hot lap reads right).
function span(start: number | null, end: number | null) {
  if (!start || !end) return "";
  const days = (end - start) / 86400;
  return days <= 1.5 ? " night" : days >= 5 && days <= 9 ? " week" : "";
}

function Rules({ c, plain = false }: { c?: Competition; plain?: boolean }) {
  const warmups = c?.attack_warmup_laps ?? 0;
  const shots = c ? both(c.attack_laps ? plural(c.attack_laps, "shot") : "", c.attack_minutes ? `${c.attack_minutes} min` : "", " or ") || "unlimited shots" : "a few shots";
  const lead = c ? `1 out-lap${warmups ? ` + ${plural(warmups, "warm-up")}` : ""}` : "an out-lap and a couple of warm-ups";
  const practice = c ? both(c.practice_laps ? plural(c.practice_laps, "lap") : "", c.practice_minutes ? `${c.practice_minutes} min` : "", " or ") : "";
  const bonus = c ? both(c.practice_bonus_laps ? `+${plural(c.practice_bonus_laps, "lap")}` : "", c.practice_bonus_minutes ? `+${c.practice_bonus_minutes} min` : "", " / ") : "";
  const either = c ? !!(c.practice_laps && c.practice_minutes) : true;

  const rules: ReactNode[] = [];
  if (!c || hasPractice(c))
    rules.push(
      <>
        <b>Practice{c ? span(c.practice_start, c.practice_end) : " week"}:</b>{" "}
        {practice ? <>up to {practice}{either ? ", whichever comes first" : ""}.</> : c ? <>as much as you like.</> : <>a set number of laps or minutes, whichever comes first.</>}
        {" "}New to the sim?{" "}
        {c && bonus ? <><b>{bonus}</b> more here, and learn</> : <>Learn</>} the car at Lime Rock or another short track first:
        laps there don&apos;t count.
      </>,
    );
  rules.push(
    <>
      <b>Hot lap{c ? span(c.attack_start, c.attack_end) : " week (or one night together)"}:</b> each time you get in, {lead}{" "}
      {warmups || !c ? "are" : "is"} free. Then <b>{shots}</b>; your best clean one counts.
    </>,
    <>An incident or off-track still uses up the shot.</>,
    <>Tied? No tie-break: both get another shot.</>,
    <>Shoes off in the house. Shoes on the sim are optional.</>,
  );

  const list = (
    <ul className={s.rulesList}>
      {rules.map((r, i) => (
        <li key={i}>{r}</li>
      ))}
    </ul>
  );
  if (plain) return list;
  return (
    <details className={s.rules}>
      <summary>
        <span className={s.rulesLabel}>Rules</span>
        <span className={s.rulesGist}>{lead} · {shots} · best clean lap</span>
      </summary>
      {list}
    </details>
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
          {c.attack_start ? PHASE_LABEL[phase] : "Dates TBD"}
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
          ) : !c.attack_start ? (
            <>
              <b>TBD</b>
              <span>dates not set yet</span>
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
        {hasPractice(c) && (
          <div>
            <dt>Practice</dt>
            <dd>
              {c.practice_start ? `${when(c.practice_start)} → ${when(c.practice_end)}` : "Dates TBD"} · {limit(c.practice_laps, c.practice_minutes)} each
              {c.practice_bonus_laps || c.practice_bonus_minutes
                ? ` · beginners: ${both(c.practice_bonus_laps ? `+${c.practice_bonus_laps} laps` : "", c.practice_bonus_minutes ? `+${c.practice_bonus_minutes} min` : "", " / ")}`
                : ""}
            </dd>
          </div>
        )}
        <div>
          <dt>Hot lap</dt>
          <dd>
            {c.attack_start ? `${when(c.attack_start)} → ${when(c.attack_end)}` : "Dates TBD"} · {limit(c.attack_laps, c.attack_minutes)} each
            {c.attack_warmup_laps ? ` + ${plural(c.attack_warmup_laps, "warm-up lap")} per visit` : ""}, best clean lap counts
          </dd>
        </div>
      </dl>
      <Rules c={c} />

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
                  <td className={s.pos} title={attack && r.tie ? "Tied: both get another shot" : undefined}>
                    {attack && r.pos ? `${r.tie ? "T" : ""}${r.pos}` : "–"}
                  </td>
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
                        {(r.attack_laps_limit ?? c.attack_laps) ? `/${r.attack_laps_limit ?? c.attack_laps}` : ""}
                        {r.attack_laps_over > 0 && <span className={`${s.chip} ${s.chipBad}`} style={{ marginLeft: 6 } as CSSProperties}>+{r.attack_laps_over}</span>}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={s.muted}>
                        {r.practice_laps_used}
                        {(r.practice_laps_limit ?? c.practice_laps) ? `/${r.practice_laps_limit ?? c.practice_laps}` : ""} laps
                        {r.rookie && <span className={s.chip} style={{ marginLeft: 6 } as CSSProperties} title="Beginner: extra practice">new</span>}
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

/** The competition track: map, key facts, a bit of history and where the time is. */
function TrackCard({ c }: { c: Competition }) {
  const t = trackInfo(c.track_name, c.track_config);
  if (!t) return null;
  return (
    <section className={`${s.card} ${s.tcCard}`}>
      <h2 className={s.cardTitle}><span>The track</span><span className={s.small}>{t.layout} layout</span></h2>
      <div className={s.tcGrid}>
        {t.map && (
          // Plain <img> (small, and stays off Vercel's image optimization quota); inverted for the dark theme.
          // eslint-disable-next-line @next/next/no-img-element
          <img className={s.tcMap} src={t.map} alt={`${t.name} track map with corner numbers`} width={1254} height={880} loading="lazy" />
        )}
        <div className={s.tcFacts}>
          {t.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={s.tcLogo} src={t.logo} alt={t.name} width={480} height={270} loading="lazy" />
          )}
          <div className={`${s.tcStats} ${s.num}`}>
            <span><b>{t.lengthKm} km</b>{t.lengthMi} mi</span>
            <span><b>{t.turns}</b>turns</span>
            <span><b>{t.location.split(",")[0]}</b>{t.location.split(",").slice(-1)[0].trim()}</span>
          </div>
          {t.corners && <p className={`${s.small} ${s.muted}`}>{t.corners}</p>}
          <p className={s.tcText}><b>Where the time is.</b> {t.tips}</p>
          <p className={`${s.tcText} ${s.muted}`}>{t.history}</p>
        </div>
      </div>
    </section>
  );
}
