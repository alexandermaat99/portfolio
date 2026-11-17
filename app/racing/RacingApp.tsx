"use client";
// app/racing/RacingApp.tsx: read-only, auto-refreshing view of SimStats data.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import s from "./racing.module.css";
import type {
  ComboStandings,
  DeltaRef,
  Driver,
  Lap,
  LiveEvent,
  Night,
  RacingSnapshot,
  Standing,
} from "./lib/types";

type Tab = "live" | "records" | "nights";
type DeltaMode = "night" | "pb" | "record";

const LIVE_WINDOW = 30; // seconds without an update before we call it offline
const DELTA_MODES: DeltaMode[] = ["night", "pb", "record"];
const DELTA_LABELS: Record<DeltaMode, string> = {
  night: "Fastest tonight",
  pb: "Personal best",
  record: "Track record",
};
const BADGE_LABELS: Partial<Record<LiveEvent["type"], string>> = {
  record: "Track record!",
  night_best: "Fastest tonight",
  pb: "Personal best",
};

// -- formatting ----------------------------------------------------------------

function fmtLap(t: number | null | undefined) {
  if (t == null) return "—";
  const m = Math.floor(t / 60);
  return `${m}:${(t - m * 60).toFixed(3).padStart(6, "0")}`;
}
function fmtTimer(t: number | null | undefined) {
  if (t == null || t < 0) return "0:00.0";
  const m = Math.floor(t / 60);
  const sec = Math.floor((t - m * 60) * 10) / 10;
  return `${m}:${sec.toFixed(1).padStart(4, "0")}`;
}
const fmtGap = (g: number | null) => (g == null ? "" : g === 0 ? "—" : `+${g.toFixed(3)}`);
const fmtDelta = (d: number | null) => (d == null ? "—" : `${d < 0 ? "−" : "+"}${Math.abs(d).toFixed(2)}`);
const fmtClock = (ts: number) =>
  new Date(ts * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const fmtDay = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
const comboTitle = (c: { track_name: string; track_config: string }) =>
  `${c.track_name}${c.track_config ? ` – ${c.track_config}` : ""}`;
const comboKey = (l: { track_id: number; track_config: string; car_id: number }) =>
  `${l.track_id}|${l.track_config}|${l.car_id}`;
const colorVar = (c: string | undefined) => ({ "--c": c ?? "var(--border)" }) as CSSProperties;

// -- component -----------------------------------------------------------------

export default function RacingApp({ initial }: { initial: RacingSnapshot }) {
  const [snap, setSnap] = useState(initial);
  const [fetchedAt, setFetchedAt] = useState(() => (typeof performance !== "undefined" ? performance.now() : 0));
  const [tab, setTab] = useState<Tab>("live");
  const [boardMode, setBoardMode] = useState<"tonight" | "all">("tonight");
  const [deltaMode, setDeltaMode] = useState<DeltaMode>("night");
  const [openNight, setOpenNight] = useState<number | null>(null);
  const [toasts, setToasts] = useState<LiveEvent[]>([]);
  const lastEvent = useRef<number | null>(null);

  const { live, data } = snap;
  const isLive = !!live && live.connected && snap.now - live.updated_at < LIVE_WINDOW;
  const onTrack = isLive && !!live?.car?.on_track;

  // Poll quickly while racing, slowly otherwise.
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await fetch("/api/racing", { cache: "no-store" });
        if (res.ok && !stop) {
          setSnap(await res.json());
          setFetchedAt(performance.now());
        }
      } catch {
        /* keep showing the last snapshot */
      }
      if (!stop) timer = setTimeout(tick, document.visibilityState === "visible" ? (onTrack ? 2000 : 8000) : 30000);
    };
    timer = setTimeout(tick, onTrack ? 2000 : 8000);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [onTrack]);

  // Pop-ups for laps that happen while you're watching (not old ones on load).
  useEffect(() => {
    const events = live?.events ?? [];
    const maxId = events.reduce((m, e) => Math.max(m, e.id), 0);
    if (lastEvent.current === null || maxId < lastEvent.current) {
      lastEvent.current = maxId;
      return;
    }
    const fresh = events.filter((e) => e.id > (lastEvent.current ?? 0));
    lastEvent.current = maxId;
    if (!fresh.length) return;
    setToasts((t) => [...t, ...fresh]);
    const ids = new Set(fresh.map((e) => e.id));
    const timeout = setTimeout(() => setToasts((t) => t.filter((e) => !ids.has(e.id))), 6000);
    return () => clearTimeout(timeout);
  }, [live?.events]);

  // Smoothly running lap timer between polls.
  const timerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!onTrack || live?.car?.lap_time == null) return;
    let frame = 0;
    const age = Math.max(0, snap.now - live.updated_at);
    const base = live.car.lap_time;
    const run = () => {
      if (timerRef.current) {
        timerRef.current.textContent = fmtTimer(base + age + (performance.now() - fetchedAt) / 1000);
      }
      frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [onTrack, live, snap.now, fetchedAt]);

  const driverById = useCallback(
    (id: number | null | undefined): Driver | undefined => data?.drivers.find((d) => d.id === id),
    [data]
  );

  const lastRaced = data?.nights[0]?.ended_at ?? null;

  return (
    <div className={s.root}>
      <header className={s.topbar}>
        <div className={s.brand}>
          <a href="/racing">
            Sim<span>Stats</span>
          </a>
          <Link href="/" className={s.back}>
            by Alex Maat
          </Link>
        </div>
        <div className={s.status}>
          <span className={`${s.dot} ${isLive ? s.dotLive : ""}`} />
          {isLive ? (onTrack ? "Live now" : "Racing tonight") : lastRaced ? `Last raced ${fmtDay(lastRaced)}` : "Offline"}
        </div>
      </header>

      <main className={s.main}>
        <p className={s.intro}>
          Lap times from hot-seat iRacing nights at my place. Friends take turns in one sim rig, and{" "}
          <b>SimStats</b>, an app I built, reads the sim&apos;s telemetry to record every lap, who drove
          it, and whether it was clean.
        </p>

        <nav className={s.tabs} aria-label="Views">
          {(["live", "records", "nights"] as Tab[]).map((t) => (
            <button key={t} className={`${s.tab} ${tab === t ? s.tabOn : ""}`} onClick={() => setTab(t)}>
              {t === "live" ? "Live" : t === "records" ? "Records" : "Nights"}
            </button>
          ))}
        </nav>

        {!data ? (
          <div className={`${s.card} ${s.empty}`}>No laps published yet. Check back after the next race night.</div>
        ) : tab === "live" ? (
          <LiveView
            snap={snap}
            isLive={isLive}
            onTrack={onTrack}
            timerRef={timerRef}
            boardMode={boardMode}
            setBoardMode={setBoardMode}
            deltaMode={deltaMode}
            cycleDelta={() => setDeltaMode(DELTA_MODES[(DELTA_MODES.indexOf(deltaMode) + 1) % DELTA_MODES.length])}
            driverById={driverById}
          />
        ) : tab === "records" ? (
          <RecordsView combos={data.records} />
        ) : (
          <NightsView nights={data.nights} open={openNight} setOpen={setOpenNight} />
        )}

        <p className={s.footer}>
          Updates automatically · <Link href="/">alexandermaat.com</Link>
        </p>
      </main>

      <div className={s.toasts} aria-live="polite">
        {toasts.map((e) => (
          <div key={e.id} className={s.toast} style={colorVar(e.driver?.color)}>
            <div>
              {BADGE_LABELS[e.type] && <div className={s.toastLabel}>{BADGE_LABELS[e.type]}</div>}
              <b>{e.driver?.name ?? "Unassigned"}</b>{" "}
              <span className={s.muted}>· Lap {e.lap.lap_number}</span>
            </div>
            <div className={`${s.t} ${s.num}`}>{fmtLap(e.lap.lap_time)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- live ----------------------------------------------------------------------

function LiveView({
  snap,
  isLive,
  onTrack,
  timerRef,
  boardMode,
  setBoardMode,
  deltaMode,
  cycleDelta,
  driverById,
}: {
  snap: RacingSnapshot;
  isLive: boolean;
  onTrack: boolean;
  timerRef: React.RefObject<HTMLDivElement | null>;
  boardMode: "tonight" | "all";
  setBoardMode: (m: "tonight" | "all") => void;
  deltaMode: DeltaMode;
  cycleDelta: () => void;
  driverById: (id: number | null | undefined) => Driver | undefined;
}) {
  const live = snap.live;
  const data = snap.data!;
  const car = isLive ? live?.car : null;
  const driver = isLive ? driverById(live?.current_driver_id) : undefined;

  // Which track/car to feature: what's on track now, else the latest thing driven.
  const tonightActive = data.session_id != null && data.tonight.length > 0;
  const liveKey = isLive && live?.context ? live.context.key : null;
  const night = tonightActive ? null : data.nights[0];
  const pool: ComboStandings[] = tonightActive ? data.tonight : night?.combos ?? [];
  const featured =
    pool.find((c) => c.key === liveKey) ??
    (liveKey ? data.records.find((c) => c.key === liveKey) : undefined) ??
    pool[0] ??
    data.records[0];
  const combo = (isLive && live?.context) || featured;
  const key = combo ? combo.key : null;
  const nightRows = pool.find((c) => c.key === key)?.standings ?? [];
  const allRows = data.records.find((c) => c.key === key)?.standings ?? [];
  const rows = boardMode === "tonight" ? nightRows : allRows;
  const others = pool.filter((c) => c.key !== key);

  const laps = tonightActive ? data.recent_laps : [];
  const ref: DeltaRef | null | undefined = live?.deltas?.[deltaMode];

  let chip = <span className={s.chip}>Not racing</span>;
  if (isLive && (!car || !car.on_track)) chip = <span className={s.chip}>Driver swap</span>;
  else if (car?.on_track) {
    if (car.on_pit_road) chip = <span className={s.chip}>Pit lane</span>;
    else if (car.flags.reset) chip = <span className={s.chip}>Out lap</span>;
    else if (car.incidents) chip = <span className={`${s.chip} ${s.chipBad}`}>{car.incidents}x · not clean</span>;
    else if (car.flags.off_track) chip = <span className={`${s.chip} ${s.chipBad}`}>Off track</span>;
    else if (car.flags.partial) chip = <span className={s.chip}>Joined mid-lap</span>;
    else chip = <span className={`${s.chip} ${s.chipGood}`}>Clean lap</span>;
  }

  const nowCard = (
    <section className={`${s.card} ${s.now}`} style={{ "--driver": driver?.color ?? "var(--border)" } as CSSProperties}>
      <div className={s.nowTop}>
        <div>
          <div className={`${s.small} ${s.muted}`}>{isLive ? "NOW DRIVING" : "LATEST"}</div>
          <div className={s.driverName}>
            {isLive ? driver?.name ?? "Driver swap…" : night ? night.label : "Tonight"}
          </div>
        </div>
        <div>{chip}</div>
      </div>
      {!isLive && <div className={s.note}>Not racing right now. This shows the most recent session.</div>}
      {combo && (
        <dl className={`${s.comboInfo} ${isLive ? "" : s.stale}`}>
          <div><dt>Track</dt><dd>{combo.track_name}</dd></div>
          <div><dt>Layout</dt><dd>{combo.track_config || "Default"}</dd></div>
          <div><dt>Car</dt><dd>{combo.car_name}</dd></div>
        </dl>
      )}
      {isLive && (
        <>
          <div className={s.timerRow}>
            <div ref={timerRef} className={`${s.timer} ${s.num} ${onTrack ? "" : s.idle}`}>
              {fmtTimer(onTrack ? car?.lap_time : null)}
            </div>
            <button className={s.deltaBox} onClick={cycleDelta} title="Tap to change the reference lap">
              <div className={`${s.delta} ${s.num} ${ref?.delta == null ? s.idle : ref.delta < 0 ? s.ahead : s.behind}`}>
                {ref ? fmtDelta(ref.delta) : "—"}
              </div>
              <div className={s.deltaRef}>
                <span className={s.deltaMode}>{DELTA_LABELS[deltaMode]} ▾</span>
                <br />
                {ref ? `vs ${ref.name} · ${fmtLap(ref.lap_time)}` : "no clean lap yet"}
              </div>
            </button>
          </div>
          <div className={s.progress}>
            <div style={{ width: `${onTrack && car ? (car.lap_pct * 100).toFixed(1) : 0}%` }} />
          </div>
          {car && (
            <div className={`${s.meta} ${s.num}`}>
              <span>Lap <b>{car.lap}</b></span>
              <span className={s.small}>Live with a few seconds&apos; delay</span>
            </div>
          )}
        </>
      )}
    </section>
  );

  const board = (
    <section className={s.card}>
      <h2 className={s.cardTitle}>
        <span>Leaderboard</span>
        <span className={s.seg}>
          <button className={boardMode === "tonight" ? s.segOn : ""} onClick={() => setBoardMode("tonight")}>
            {tonightActive ? "Tonight" : "That night"}
          </button>
          <button className={boardMode === "all" ? s.segOn : ""} onClick={() => setBoardMode("all")}>
            All-time
          </button>
        </span>
      </h2>
      {combo && <div className={s.comboSub}>{comboTitle(combo)} · {combo.car_name}</div>}
      <StandingsTable rows={rows} current={isLive ? live?.current_driver_id : null} showLast={boardMode === "tonight"} />
      {others.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className={`${s.small} ${s.muted}`} style={{ marginBottom: 8 }}>Also driven</div>
          {others.map((c) => (
            <div key={c.key} style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{comboTitle(c)}</div>
              <div className={s.comboSub} style={{ margin: "2px 0 6px" }}>{c.car_name}</div>
              <StandingsTable rows={c.standings} />
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const lapsCard = tonightActive ? (
    <section className={s.card}>
      <h2 className={s.cardTitle}><span>Tonight&apos;s laps</span></h2>
      {laps.length ? (
        <LapList laps={laps} driverById={driverById} colorFor={lapColorer(key, nightRows, allRows)} />
      ) : (
        <div className={s.empty}>Laps show up here as they&apos;re driven.</div>
      )}
    </section>
  ) : null;

  return (
    <div className={s.liveGrid}>
      <div>{nowCard}{board}</div>
      <div>{lapsCard}</div>
    </div>
  );
}

function lapColorer(key: string | null, night: Standing[], all: Standing[]) {
  const record = all[0]?.best ?? null;
  const nightBest = night[0]?.best ?? null;
  const pb = new Map(night.map((r) => [r.driver_id, r.best]));
  return (lap: Lap) => {
    if (!lap.clean || comboKey(lap) !== key) return "";
    if (lap.lap_time === record) return s.tRecord;
    if (lap.lap_time === nightBest) return s.tNight;
    if (lap.driver_id != null && lap.lap_time === pb.get(lap.driver_id)) return s.tPb;
    return "";
  };
}

// -- shared pieces -------------------------------------------------------------

function StandingsTable({
  rows,
  current = null,
  showLast = false,
  showAvg = false,
}: {
  rows: Standing[];
  current?: number | null;
  showLast?: boolean;
  showAvg?: boolean;
}) {
  if (!rows.length) return <div className={s.empty}>No laps yet.</div>;
  return (
    <table className={`${s.board} ${s.num}`}>
      <thead>
        <tr>
          <th />
          <th>Driver</th>
          <th>Best</th>
          <th>Gap</th>
          {showAvg && <th className={s.hideSm} title="Average of best 5 clean laps">Avg 5</th>}
          {showLast && <th className={s.hideSm}>Last</th>}
          <th>Laps</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.driver_id} className={r.pos === 1 && r.best != null ? s.p1 : ""}>
            <td className={s.pos}>{r.best != null ? r.pos : "–"}</td>
            <td className={s.name}>
              <span className={s.nameInner}>
                <span className={s.bar} style={colorVar(r.color)} />
                {r.name}
                {r.driver_id === current && <span className={s.driving}>driving</span>}
              </span>
            </td>
            <td className={s.best}>{fmtLap(r.best)}</td>
            <td className={s.muted}>{fmtGap(r.gap)}</td>
            {showAvg && <td className={`${s.hideSm} ${s.muted}`}>{fmtLap(r.avg5)}</td>}
            {showLast && <td className={`${s.hideSm} ${r.last_clean === false ? s.muted : ""}`}>{fmtLap(r.last)}</td>}
            <td className={s.muted} title={`${r.clean_laps} clean of ${r.laps}`}>
              {r.clean_laps}
              <span className={s.small}>/{r.laps}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LapList({
  laps,
  driverById,
  colorFor,
}: {
  laps: Lap[];
  driverById: (id: number | null | undefined) => Driver | undefined;
  colorFor: (lap: Lap) => string;
}) {
  return (
    <ul className={`${s.laps} ${s.num}`}>
      {laps.map((lap) => {
        const d = driverById(lap.driver_id);
        return (
          <li key={lap.id} className={lap.clean ? "" : s.dirty} style={colorVar(d?.color)}>
            <span className={s.lapBar} />
            <span className={s.who}>{d?.name ?? "Unassigned"}</span>
            <span className={`${s.t} ${colorFor(lap)}`}>{fmtLap(lap.lap_time)}</span>
            <span className={s.lapMeta}>
              Lap {lap.lap_number}
              {lap.incidents > 0 && <span className={`${s.chip} ${s.chipBad}`}>{lap.incidents}x</span>}
              {lap.off_track > 0 && !lap.incidents && <span className={`${s.chip} ${s.chipBad}`}>off track</span>}
              {lap.pit > 0 && <span className={s.chip}>pit</span>}
              {lap.reset > 0 && !lap.pit && <span className={s.chip}>out lap</span>}
            </span>
            <span className={s.lapMetaR}>{fmtClock(lap.recorded_at)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function RecordsView({ combos }: { combos: ComboStandings[] }) {
  if (!combos.length) return <div className={`${s.card} ${s.empty}`}>No records yet.</div>;
  return (
    <div className={s.grid}>
      {combos.map((c) => (
        <section key={c.key} className={s.card}>
          <div className={s.comboHead}>
            <div>
              <h3>{comboTitle(c)}</h3>
              <div className={s.car}>{c.car_name}</div>
            </div>
            <div className={`${s.small} ${s.muted}`} style={{ textAlign: "right" }}>
              {c.laps} laps
              <br />
              {c.nights} night{c.nights === 1 ? "" : "s"}
            </div>
          </div>
          <StandingsTable rows={c.standings} showAvg />
        </section>
      ))}
    </div>
  );
}

function NightsView({
  nights,
  open,
  setOpen,
}: {
  nights: Night[];
  open: number | null;
  setOpen: (id: number | null) => void;
}) {
  if (!nights.length) return <div className={`${s.card} ${s.empty}`}>No race nights yet.</div>;
  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}><span>Race nights</span></h2>
      {nights.map((n) => (
        <div key={n.id}>
          <button className={s.nightBtn} onClick={() => setOpen(open === n.id ? null : n.id)} aria-expanded={open === n.id}>
            <span>
              <span style={{ fontWeight: 700 }}>{n.label}</span>
              <br />
              <span className={`${s.small} ${s.muted}`}>
                {fmtClock(n.started_at)}–{fmtClock(n.ended_at)} · {n.laps} laps · {n.drivers} driver
                {n.drivers === 1 ? "" : "s"}
              </span>
            </span>
            <span className={s.muted}>{open === n.id ? "▾" : "›"}</span>
          </button>
          {open === n.id && (
            <div className={s.nightBody}>
              {n.combos.map((c) => (
                <div key={c.key}>
                  <h4>
                    {comboTitle(c)} <span className={s.muted} style={{ fontWeight: 400 }}>· {c.car_name}</span>
                  </h4>
                  <StandingsTable rows={c.standings} showAvg />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
