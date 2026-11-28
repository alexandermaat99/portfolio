"use client";
// app/racing/cars.tsx: the Cars tab, a "loadout" screen. One card per car with its specs and
// stat bars worked out from our own laps (Pace, Clean, Popularity), plus its best lap at each
// track. Tap a card to pin it and every other card shows how it compares.

import { useState, type CSSProperties } from "react";
import s from "./racing.module.css";
import c from "./cars.module.css";
import { GT3_LINEUP, type CarSpec } from "./lib/cars";
import type { CarStat, RacingData } from "./lib/types";
import { BrandLogo, DriverName, TrackIcon } from "./visuals";

const fmtLap = (t: number | null | undefined) => {
  if (t == null) return "—";
  const m = Math.floor(t / 60);
  return m ? `${m}:${(t - m * 60).toFixed(3).padStart(6, "0")}` : t.toFixed(3);
};

interface Bars { pace: number | null; clean: number | null; popularity: number | null; gapPct: number | null }

function bars(stat: CarStat | undefined, maxLaps: number): Bars {
  if (!stat) return { pace: null, clean: null, popularity: null, gapPct: null };
  const gaps = stat.tracks.filter((t) => t.record).map((t) => ((t.best - (t.record as number)) / (t.record as number)) * 100);
  const gapPct = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;
  return {
    // 0% off the track records = 100; every 1% slower costs 20 points.
    pace: gapPct == null ? null : Math.max(5, Math.round(100 - gapPct * 20)),
    clean: stat.laps ? Math.round((stat.clean_laps / stat.laps) * 100) : null,
    popularity: maxLaps ? Math.max(3, Math.round((stat.laps / maxLaps) * 100)) : null,
    gapPct,
  };
}

/** Before the PC sends per-car stats: each car's best laps from the records (no lap counts). */
function fallbackStats(data: RacingData): CarStat[] {
  const by = new Map<string, CarStat>();
  for (const combo of data.records) {
    const record = combo.standings[0]?.best ?? null;
    for (const r of combo.standings) {
      if (!r.best_car || r.best == null) continue;
      const cs = by.get(r.best_car) ?? { car: r.best_car, laps: 0, clean_laps: 0, drivers: 0, seconds: 0, tracks: [] };
      const prev = cs.tracks.find((t) => t.track_key === combo.key);
      if (!prev || r.best < prev.best)
        cs.tracks = [...cs.tracks.filter((t) => t.track_key !== combo.key),
          { track_key: combo.key, track_name: combo.track_name, best: r.best, driver_id: r.driver_id, record }];
      by.set(r.best_car, cs);
    }
  }
  return [...by.values()];
}

export function CarsView({ data }: { data: RacingData }) {
  const stats = data.cars ?? fallbackStats(data);
  const hasCounts = !!data.cars;
  const maxLaps = Math.max(0, ...stats.map((x) => x.laps));
  const others: CarSpec[] = stats
    .filter((x) => !GT3_LINEUP.some((g) => g.name === x.car))
    .map((x) => ({ name: x.car, engine: "", layout: "Front-engine", drivetrain: "", vibe: "" }));
  const [pinned, setPinned] = useState<string | null>(null);
  const pinnedBars = pinned ? bars(stats.find((x) => x.car === pinned), maxLaps) : null;
  const driverOf = (id: number | null) => data.drivers.find((d) => d.id === id);

  const card = (spec: CarSpec, owned: boolean) => {
    const st = stats.find((x) => x.car === spec.name);
    const b = bars(st, maxLaps);
    const isPinned = pinned === spec.name;
    return (
      <button key={spec.name} type="button" className={`${c.card} ${isPinned ? c.pinned : ""}`}
        onClick={() => setPinned(isPinned ? null : spec.name)} aria-pressed={isPinned}>
        <div className={c.head}>
          <span className={c.logo}><BrandLogo car={spec.name} /></span>
          <div>
            <div className={c.name}>{spec.name}</div>
            {spec.engine && <div className={`${s.small} ${s.muted}`}>{spec.engine} · {spec.layout} · {spec.drivetrain}</div>}
            {!owned && <div className={`${s.small} ${s.muted}`}>Also driven here</div>}
          </div>
        </div>
        {spec.vibe && <p className={c.vibe}>{spec.vibe}</p>}
        <div className={c.bars}>
          <Bar label="Pace" value={b.pace} cmp={!isPinned ? pinnedBars?.pace : undefined}
            note={b.gapPct == null ? "no clean laps yet" : b.gapPct < 0.005 ? "holds track records" : `avg ${b.gapPct.toFixed(1)}% off records`} />
          <Bar label="Clean" value={hasCounts ? b.clean : null} cmp={!isPinned ? pinnedBars?.clean : undefined}
            note={hasCounts ? (st ? `${st.clean_laps} of ${st.laps} laps` : "no laps yet") : "after the PC update"} />
          <Bar label="Popularity" value={hasCounts ? b.popularity : null} cmp={!isPinned ? pinnedBars?.popularity : undefined}
            note={hasCounts ? (st ? `${st.laps} laps · ${st.drivers} driver${st.drivers === 1 ? "" : "s"}` : "untouched") : "after the PC update"} />
        </div>
        {st && st.tracks.length > 0 && (
          <ul className={c.tracks}>
            {[...st.tracks].sort((x, y) => x.track_name.localeCompare(y.track_name)).map((t) => {
              const d = driverOf(t.driver_id);
              const rec = t.record != null && t.best - t.record < 0.0005;
              return (
                <li key={t.track_key}>
                  <TrackIcon trackKey={t.track_key} />
                  <span className={c.trackName}>{t.track_name}</span>
                  <span className={`${s.num} ${rec ? c.record : ""}`}>{fmtLap(t.best)}</span>
                  <span className={`${s.small} ${s.muted}`}>{d ? <DriverName driver={d} inline /> : ""}</span>
                </li>
              );
            })}
          </ul>
        )}
      </button>
    );
  };

  return (
    <>
      <p className={`${s.small} ${s.muted} ${c.intro}`}>
        The GT3s on the rig. Bars come from our own laps: <b>Pace</b> is how close the car&apos;s best laps are to the track
        records, <b>Clean</b> is the share of clean laps driven in it, <b>Popularity</b> is how much it&apos;s been driven.
        {pinned ? <> Comparing everything against the <b>{pinned}</b> (tap it again to stop).</> : <> Tap a car to compare the rest against it.</>}
      </p>
      <div className={c.grid}>{GT3_LINEUP.map((g) => card(g, true))}</div>
      {others.length > 0 && (
        <>
          <h2 className={`${s.cardTitle} ${c.othersTitle}`}><span>Other cars driven here</span></h2>
          <div className={c.grid}>{others.map((o) => card(o, false))}</div>
        </>
      )}
    </>
  );
}

function Bar({ label, value, note, cmp }: { label: string; value: number | null; note: string; cmp?: number | null }) {
  const diff = value != null && cmp != null ? value - cmp : null;
  return (
    <div className={c.bar}>
      <div className={c.barTop}>
        <span className={c.barLabel}>{label}</span>
        <span className={`${s.num} ${c.barValue}`}>
          {value == null ? "—" : value}
          {diff != null && diff !== 0 && <span className={diff > 0 ? c.up : c.down}>{diff > 0 ? ` ▲${diff}` : ` ▼${-diff}`}</span>}
        </span>
      </div>
      <div className={c.track} aria-hidden>
        <div className={c.fill} style={{ width: `${value ?? 0}%` } as CSSProperties} />
        {cmp != null && <div className={c.marker} style={{ left: `${cmp}%` } as CSSProperties} />}
      </div>
      <div className={`${s.small} ${s.muted} ${c.note}`}>{note}</div>
    </div>
  );
}
