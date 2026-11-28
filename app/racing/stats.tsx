"use client";
// app/racing/stats.tsx: the Stats tab. Per track:
//   1. Where's the time? Two drivers' best laps compared around the track (map + gap chart + sectors)
//   2. Theoretical best: best sectors added up, vs each driver's actual best lap
//   3. Progress: clean lap times lap by lap (during a competition's practice week if there is one)
// Data comes from SimStats' "analysis" (simstats/analysis.py): 101-point lap traces, best
// sectors and recent clean laps per driver per track. Colors always follow the driver.

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import s from "./racing.module.css";
import st from "./stats.module.css";
import type { Competition, Driver, RacingData, TrackAnalysis } from "./lib/types";
import { DriverName, TrackIcon } from "./visuals";

const fmtLap = (t: number | null | undefined) => {
  if (t == null) return "—";
  const m = Math.floor(t / 60);
  return m ? `${m}:${(t - m * 60).toFixed(3).padStart(6, "0")}` : t.toFixed(3);
};
const fmtGap = (t: number) => `${t > 0 ? "+" : t < 0 ? "−" : ""}${Math.abs(t).toFixed(3)}`;
const nick = (d: Driver | undefined) => (d ? d.nickname || d.name : "?");

/** Time at a lap fraction from a 101-point trace (linear between the 1% points). */
function timeAt(trace: number[], pct: number): number {
  const x = Math.max(0, Math.min(1, pct)) * (trace.length - 1);
  const i = Math.min(trace.length - 2, Math.floor(x));
  return trace[i] + (trace[i + 1] - trace[i]) * (x - i);
}

export function StatsView({ data, comps, now }: { data: RacingData; comps: Competition[]; now: number }) {
  const analysis = data.analysis ?? {};
  const tracks = data.records.filter((c) => analysis[c.key] && Object.keys(analysis[c.key].drivers).length);
  const compTrack = comps.find((c) => analysis[c.track_key])?.track_key;
  const [key, setKey] = useState<string | null>(null);
  const trackKey = key && analysis[key] ? key : compTrack ?? tracks[0]?.key ?? null;
  if (!trackKey) return <div className={`${s.card} ${s.empty}`}>Stats show up once there are clean laps with timing data.</div>;
  const a = analysis[trackKey];
  const combo = tracks.find((c) => c.key === trackKey);
  const driverOf = (id: number) => data.drivers.find((d) => d.id === id);
  const comp = comps.find((c) => c.track_key === trackKey);

  return (
    <>
      <div className={st.trackBar}>
        <label className={st.trackPick}>
          <TrackIcon trackKey={trackKey} />
          <select value={trackKey} onChange={(e) => setKey(e.target.value)} aria-label="Track">
            {tracks.map((c) => (
              <option key={c.key} value={c.key}>{c.track_name}{c.track_config ? ` – ${c.track_config}` : ""}</option>
            ))}
          </select>
        </label>
        {comp && <span className={`${s.chip} ${s.chipGood}`}>{comp.name} track</span>}
      </div>
      <Compare key={`cmp-${trackKey}`} a={a} trackKey={trackKey} map={data.track_maps?.[trackKey]} driverOf={driverOf} />
      <div className={st.cols}>
        <Theoretical a={a} bests={combo?.standings ?? []} driverOf={driverOf} />
        <Progress key={`prog-${trackKey}`} a={a} driverOf={driverOf} comp={comp} now={now} />
      </div>
    </>
  );
}

// -- 1. where's the time -------------------------------------------------------------------

function Compare({ a, trackKey, map, driverOf }: {
  a: TrackAnalysis; trackKey: string; map?: string; driverOf: (id: number) => Driver | undefined;
}) {
  const withTrace = Object.entries(a.drivers)
    .filter(([, d]) => d.trace)
    .map(([id, d]) => ({ id: Number(id), trace: d.trace as number[] }))
    .sort((x, y) => x.trace[x.trace.length - 1] - y.trace[y.trace.length - 1]);
  const [pick, setPick] = useState<[number | null, number | null]>([null, null]);
  if (withTrace.length < 2)
    return (
      <section className={s.card}>
        <h2 className={s.cardTitle}><span>Where&apos;s the time?</span></h2>
        <div className={s.empty}>Needs clean laps from two drivers on this track.</div>
      </section>
    );
  const ids = withTrace.map((d) => d.id);
  const idA = pick[0] != null && ids.includes(pick[0]) ? pick[0] : ids[0];
  const idB = pick[1] != null && ids.includes(pick[1]) && pick[1] !== idA ? pick[1] : ids.find((i) => i !== idA)!;
  const A = withTrace.find((d) => d.id === idA)!.trace, B = withTrace.find((d) => d.id === idB)!.trace;
  const dA = driverOf(idA), dB = driverOf(idB);
  const lapA = A[A.length - 1], lapB = B[B.length - 1];
  // lead[i] > 0: A is ahead of B at that point of the lap (B has taken longer to get there).
  const lead = A.map((t, i) => B[i] - t);
  const bounds = a.sector_bounds;
  const sectors = bounds
    ? bounds.map((b, k) => {
        const e = k + 1 < bounds.length ? bounds[k + 1] : 1;
        return { k, ta: timeAt(A, e) - timeAt(A, b), tb: timeAt(B, e) - timeAt(B, b) };
      })
    : null;
  const biggest = sectors ? [...sectors].sort((x, y) => Math.abs(y.tb - y.ta) - Math.abs(x.tb - x.ta))[0] : null;
  const faster = lapA <= lapB ? dA : dB;

  const select = (slot: 0 | 1, value: number) => setPick(slot === 0 ? [value, idB === value ? idA : idB] : [idA, value]);
  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}><span>Where&apos;s the time?</span><span className={s.small}>best lap vs best lap</span></h2>
      <div className={st.vs}>
        <DriverSelect value={idA} ids={ids} driverOf={driverOf} onChange={(v) => select(0, v)} lap={lapA} />
        <span className={st.vsWord}>vs</span>
        <DriverSelect value={idB} ids={ids} driverOf={driverOf} onChange={(v) => select(1, v)} lap={lapB} />
      </div>
      <p className={st.headline}>
        <b>{nick(faster)}</b> is <b className={s.num}>{Math.abs(lapA - lapB).toFixed(3)}s</b> faster
        {biggest && Math.abs(biggest.tb - biggest.ta) >= 0.01 && (
          <>
            , with the most time in <b>sector {biggest.k + 1}</b> ({nick(biggest.ta < biggest.tb ? dA : dB)}{" "}
            <span className={s.num}>{Math.abs(biggest.tb - biggest.ta).toFixed(3)}s</span> quicker there)
          </>
        )}
        .
      </p>
      <div className={st.compareGrid}>
        {map ? <TrackGains map={map} trackKey={trackKey} A={A} B={B} dA={dA} dB={dB} /> : null}
        <GapChart lead={lead} bounds={bounds} dA={dA} dB={dB} />
      </div>
      {sectors && (
        <table className={`${st.table} ${s.num} ${st.sectorTable}`}>
          <thead>
            <tr><th>Sector</th><th>{nick(dA)}</th><th>{nick(dB)}</th><th>Difference</th></tr>
          </thead>
          <tbody>
            {sectors.map((x) => {
              const diff = x.tb - x.ta; // > 0: A quicker
              const who = diff > 0 ? dA : dB;
              return (
                <tr key={x.k}>
                  <td>S{x.k + 1}</td>
                  <td className={diff > 0.0005 ? st.win : ""}>{x.ta.toFixed(3)}</td>
                  <td className={diff < -0.0005 ? st.win : ""}>{x.tb.toFixed(3)}</td>
                  <td>
                    {Math.abs(diff) < 0.0005 ? "even" : (
                      <span className={st.who}><i className={st.swatch} style={{ "--c": who?.color } as CSSProperties} />{nick(who)} {Math.abs(diff).toFixed(3)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function DriverSelect({ value, ids, driverOf, onChange, lap }: {
  value: number; ids: number[]; driverOf: (id: number) => Driver | undefined; onChange: (v: number) => void; lap: number;
}) {
  const d = driverOf(value);
  return (
    <label className={st.driverPick} style={{ "--c": d?.color } as CSSProperties}>
      <i className={st.swatch} />
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {ids.map((id) => <option key={id} value={id}>{nick(driverOf(id))}</option>)}
      </select>
      <span className={`${s.num} ${s.muted}`}>{fmtLap(lap)}</span>
    </label>
  );
}

/** The track outline, each 1% stretch painted in the color of whoever is quicker through it. */
function TrackGains({ map, trackKey, A, B, dA, dB }: {
  map: string; trackKey: string; A: number[]; B: number[]; dA?: Driver; dB?: Driver;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pts, setPts] = useState<[number, number][] | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const len = p.getTotalLength();
    setPts(Array.from({ length: 101 }, (_, i) => {
      const q = p.getPointAtLength((len * i) / 100);
      return [q.x, q.y];
    }));
  }, [map]);
  // gain[i] > 0: A quicker through stretch i (i% to i+1%).
  const gain = A.slice(0, -1).map((_, i) => B[i + 1] - B[i] - (A[i + 1] - A[i]));
  const max = Math.max(0.01, ...gain.map(Math.abs));
  return (
    <figure className={st.mapFig} aria-label={`Track map of ${trackKey} colored by who is quicker`}>
      <svg viewBox="-6 -6 112 112" className={st.map} onMouseLeave={() => setHover(null)}>
        <path ref={pathRef} d={map} className={st.mapBase} />
        {pts && gain.map((g, i) => {
          const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
          const who = g >= 0 ? dA : dB;
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={who?.color} strokeWidth={3.2} strokeLinecap="round"
                opacity={0.25 + 0.75 * Math.min(1, Math.abs(g) / max)} />
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={10} />
            </g>
          );
        })}
        {pts && <circle cx={pts[0][0]} cy={pts[0][1]} r={2.6} className={st.startDot} />}
        {pts && hover != null && <circle cx={pts[hover][0]} cy={pts[hover][1]} r={2.4} className={st.hoverDot} />}
      </svg>
      <figcaption className={st.mapCaption}>
        {hover != null ? (
          <span className={s.num}>
            {hover}–{hover + 1}% of the lap: {Math.abs(gain[hover]) < 0.0005 ? "even" : `${nick(gain[hover] > 0 ? dA : dB)} ${Math.abs(gain[hover]).toFixed(3)}s quicker`}
          </span>
        ) : (
          <>
            <Legend items={[dA, dB]} /> <span className={s.muted}>brighter = bigger gain · dot = start/finish</span>
          </>
        )}
      </figcaption>
    </figure>
  );
}

function Legend({ items }: { items: (Driver | undefined)[] }) {
  return (
    <span className={st.legend}>
      {items.map((d, i) => (
        <span key={i} className={st.who}><i className={st.swatch} style={{ "--c": d?.color } as CSSProperties} />{nick(d)}</span>
      ))}
    </span>
  );
}

/** The gap between the two laps all the way round: above the line, A is ahead. */
function GapChart({ lead, bounds, dA, dB }: { lead: number[]; bounds: number[] | null; dA?: Driver; dB?: Driver }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560, H = 220, L = 46, R = 10, T = 14, Bm = 26;
  const ext = Math.max(0.05, ...lead.map(Math.abs)) * 1.1;
  const x = (i: number) => L + ((W - L - R) * i) / (lead.length - 1);
  const y = (v: number) => T + ((H - T - Bm) * (ext - v)) / (2 * ext);
  const line = lead.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `${line}L${x(lead.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const ticks = [-ext / 1.1, 0, ext / 1.1].map((v) => Math.round(v * 100) / 100);
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - L) / (W - L - R)) * (lead.length - 1));
    setHover(i >= 0 && i < lead.length ? i : null);
  };
  const id = `gap${useId().replace(/[^a-zA-Z0-9]/g, "")}`; // stable across server + browser
  return (
    <figure className={st.chartFig}>
      <svg viewBox={`0 0 ${W} ${H}`} className={st.chart} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img"
        aria-label={`Gap between ${nick(dA)} and ${nick(dB)} around the lap`}>
        <defs>
          <clipPath id={`${id}a`}><rect x={0} y={0} width={W} height={y(0)} /></clipPath>
          <clipPath id={`${id}b`}><rect x={0} y={y(0)} width={W} height={H} /></clipPath>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className={v === 0 ? st.zero : st.grid} />
            <text x={L - 6} y={y(v) + 3} className={st.axis} textAnchor="end">{v === 0 ? "0" : `${Math.abs(v).toFixed(2)}s`}</text>
          </g>
        ))}
        {bounds?.slice(1).map((b, k) => (
          <line key={k} x1={x(b * 100)} x2={x(b * 100)} y1={T} y2={H - Bm} className={st.sectorLine} />
        ))}
        {bounds?.map((b, k) => {
          const e = k + 1 < bounds.length ? bounds[k + 1] : 1;
          return <text key={k} x={x(((b + e) / 2) * 100)} y={H - 8} className={st.axis} textAnchor="middle">S{k + 1}</text>;
        })}
        <path d={area} fill={dA?.color} opacity={0.18} clipPath={`url(#${id}a)`} />
        <path d={area} fill={dB?.color} opacity={0.18} clipPath={`url(#${id}b)`} />
        <path d={line} className={st.gapLine} />
        <text x={L + 4} y={T + 10} className={st.axisLabel}>{nick(dA)} ahead ↑</text>
        <text x={L + 4} y={H - Bm - 5} className={st.axisLabel}>{nick(dB)} ahead ↓</text>
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - Bm} className={st.cross} />
            <circle cx={x(hover)} cy={y(lead[hover])} r={4} className={st.hoverDot} />
          </g>
        )}
      </svg>
      <figcaption className={`${st.mapCaption} ${s.num}`}>
        {hover != null ? (
          <>
            {hover}% of the lap:{" "}
            {Math.abs(lead[hover]) < 0.0005 ? "level" : `${nick(lead[hover] > 0 ? dA : dB)} ahead by ${Math.abs(lead[hover]).toFixed(3)}s`}
          </>
        ) : (
          <span className={s.muted}>Gap around the lap · hover for the gap at any point</span>
        )}
      </figcaption>
    </figure>
  );
}

// -- 2. theoretical best ------------------------------------------------------------------------

function Theoretical({ a, bests, driverOf }: {
  a: TrackAnalysis; bests: { driver_id: number; best: number | null }[]; driverOf: (id: number) => Driver | undefined;
}) {
  const n = a.sector_count ?? 0;
  const overall = Array.from({ length: n }, (_, k) =>
    Math.min(...Object.values(a.drivers).map((d) => d.sectors?.[k] ?? Infinity)));
  const rows = Object.entries(a.drivers)
    .map(([id, d]) => {
      const best = bests.find((b) => b.driver_id === Number(id))?.best ?? null;
      const full = d.sectors && d.sectors.length === n && d.sectors.every((t) => t != null);
      const theo = full ? (d.sectors as number[]).reduce((x, y) => x + y, 0) : null;
      return { id: Number(id), best, theo, sectors: d.sectors ?? [] };
    })
    .filter((r) => r.theo != null || r.best != null)
    .sort((x, y) => (x.theo ?? x.best ?? 1e9) - (y.theo ?? y.best ?? 1e9));
  const ultimate = overall.length && overall.every(isFinite) ? overall.reduce((x, y) => x + y, 0) : null;
  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}><span>Theoretical best</span><span className={s.small}>best sectors added up</span></h2>
      {!n ? (
        <div className={s.empty}>No sector times on this track yet.</div>
      ) : (
        <>
          <table className={`${st.table} ${s.num}`}>
            <thead>
              <tr>
                <th>Driver</th>
                {Array.from({ length: n }, (_, k) => <th key={k} className={s.hideSm}>S{k + 1}</th>)}
                <th>Best lap</th><th>Possible</th><th>In hand</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const d = driverOf(r.id);
                return (
                  <tr key={r.id}>
                    <td className={st.nameCell}>{d ? <DriverName driver={d} inline /> : "?"}</td>
                    {Array.from({ length: n }, (_, k) => (
                      <td key={k} className={`${s.hideSm} ${r.sectors[k] != null && r.sectors[k] === overall[k] ? st.purple : s.muted}`}>
                        {r.sectors[k] != null ? (r.sectors[k] as number).toFixed(3) : "—"}
                      </td>
                    ))}
                    <td>{fmtLap(r.best)}</td>
                    <td className={st.strong}>{fmtLap(r.theo)}</td>
                    <td className={s.muted}>{r.best != null && r.theo != null ? fmtGap(r.theo - r.best).replace("−", "") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {ultimate && (
            <p className={`${s.small} ${s.muted}`} style={{ marginTop: 10 }}>
              Everyone&apos;s best sectors combined: <b className={s.num} style={{ color: "var(--ink)" }}>{fmtLap(ultimate)}</b>. Purple = fastest
              anyone has gone through that sector. &ldquo;In hand&rdquo; = how much quicker a driver&apos;s best lap could be with all their best sectors.
            </p>
          )}
        </>
      )}
    </section>
  );
}

// -- 3. progress --------------------------------------------------------------------------------

function stdev(xs: number[]) {
  if (xs.length < 3) return null;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

function Progress({ a, driverOf, comp, now }: {
  a: TrackAnalysis; driverOf: (id: number) => Driver | undefined; comp?: Competition; now: number;
}) {
  const practice = comp?.practice_start && comp.practice_start <= now ? comp : undefined;
  const series = Object.entries(a.drivers)
    .map(([id, d]) => {
      let laps = d.history;
      if (practice) laps = laps.filter(([t]) => t >= practice.practice_start! && t < (practice.practice_end ?? Infinity));
      const best = laps.length ? Math.min(...laps.map(([, v]) => v)) : null;
      // Leave out laps more than 7% off their best (a spin that stayed "clean", traffic...).
      const pts = laps.map(([, v]) => v).filter((v) => best != null && v <= best * 1.07);
      return { id: Number(id), pts, best };
    })
    .filter((r) => r.pts.length >= 2)
    .sort((x, y) => (x.best ?? 0) - (y.best ?? 0));
  const [hover, setHover] = useState<number | null>(null);
  const title = practice ? `Practice progress · ${practice.name}` : "Progress";
  if (!series.length)
    return (
      <section className={s.card}>
        <h2 className={s.cardTitle}><span>{title}</span></h2>
        <div className={s.empty}>Needs a few clean laps per driver{practice ? " this practice week" : ""}.</div>
      </section>
    );
  const W = 560, H = 240, L = 58, R = 12, T = 12, Bm = 26;
  const maxN = Math.max(...series.map((r) => r.pts.length));
  const all = series.flatMap((r) => r.pts);
  const lo = Math.min(...all), hi = Math.max(...all);
  const pad = Math.max(0.2, (hi - lo) * 0.08);
  const y = (v: number) => T + ((H - T - Bm) * (hi + pad - v)) / (hi - lo + 2 * pad);
  const x = (i: number) => L + ((W - L - R) * i) / Math.max(1, maxN - 1);
  const yTicks = [lo, (lo + hi) / 2, hi];
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((((e.clientX - r.left) / r.width) * W - L) / (W - L - R)) * (maxN - 1));
    setHover(i >= 0 && i < maxN ? i : null);
  };
  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}><span>{title}</span><span className={s.small}>clean laps, in order</span></h2>
      <figure className={st.chartFig}>
        <div className={st.legendRow}><Legend items={series.map((r) => driverOf(r.id))} /></div>
        <svg viewBox={`0 0 ${W} ${H}`} className={st.chart} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img"
          aria-label="Lap times lap by lap for each driver">
          {yTicks.map((v, i) => (
            <g key={i}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className={st.grid} />
              <text x={L - 6} y={y(v) + 3} className={st.axis} textAnchor="end">{fmtLap(v)}</text>
            </g>
          ))}
          <text x={L} y={H - 8} className={st.axis}>lap 1</text>
          <text x={W - R} y={H - 8} className={st.axis} textAnchor="end">lap {maxN}</text>
          {series.map((r) => {
            const d = driverOf(r.id);
            const path = r.pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
            return <path key={r.id} d={path} className={st.series} stroke={d?.color} />;
          })}
          {hover != null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - Bm} className={st.cross} />
              {series.map((r) => r.pts[hover] != null && (
                <circle key={r.id} cx={x(hover)} cy={y(r.pts[hover])} r={4} fill={driverOf(r.id)?.color} className={st.ring} />
              ))}
            </g>
          )}
        </svg>
        <figcaption className={`${st.mapCaption} ${s.num}`}>
          {hover != null ? (
            <span className={st.legend}>
              <span className={s.muted}>lap {hover + 1}:</span>
              {series.map((r) => r.pts[hover] != null && (
                <span key={r.id} className={st.who}><i className={st.swatch} style={{ "--c": driverOf(r.id)?.color } as CSSProperties} />{fmtLap(r.pts[hover])}</span>
              ))}
            </span>
          ) : (
            <span className={s.muted}>Lower is faster · laps more than 7% off a driver&apos;s best are left out</span>
          )}
        </figcaption>
      </figure>
      <table className={`${st.table} ${s.num}`} style={{ marginTop: 8 }}>
        <thead><tr><th>Driver</th><th>Laps</th><th>Best</th><th className={s.hideSm}>Last 5 avg</th><th>Consistency</th></tr></thead>
        <tbody>
          {series.map((r) => {
            const d = driverOf(r.id);
            const last = r.pts.slice(-5);
            const sd = stdev(r.pts.slice(-10));
            return (
              <tr key={r.id}>
                <td className={st.nameCell}>{d ? <DriverName driver={d} inline /> : "?"}</td>
                <td className={s.muted}>{r.pts.length}</td>
                <td>{fmtLap(r.best)}</td>
                <td className={`${s.hideSm} ${s.muted}`}>{fmtLap(last.reduce((p, q) => p + q, 0) / last.length)}</td>
                <td className={s.muted} title="Spread of the last 10 clean laps (standard deviation): lower is more consistent">
                  {sd == null ? "—" : `±${sd.toFixed(2)}s`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
