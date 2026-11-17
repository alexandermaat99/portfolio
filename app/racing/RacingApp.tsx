"use client";
// app/racing/RacingApp.tsx: read-only, auto-refreshing view of SimStats data.
// No live lap timer here; new laps pop up and standings refresh as they're set.

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties } from "react";
import s from "./racing.module.css";
import { Avatar, BrandLogo, CarLabel, DriverName, nick, TrackIcon, TrackMapsContext } from "./visuals";
import type { Combo, ComboStandings, Driver, Lap, LiveEvent, Night, RacingSnapshot, Standing } from "./lib/types";

type Tab = "live" | "records" | "nights";

const DriversContext = createContext<Driver[]>([]);

const LIVE_WINDOW = 30; // seconds without an update before we call it offline
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
const fmtGap = (g: number | null) => (g == null ? "" : g === 0 ? "—" : `+${g.toFixed(3)}`);
const fmtClock = (ts: number) =>
  new Date(ts * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const fmtDay = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
const trackTitle = (c: { track_name: string; track_config: string }) =>
  `${c.track_name}${c.track_config ? ` – ${c.track_config}` : ""}`;
const trackKey = (l: { track_id: number; track_config: string }) => `${l.track_id}|${l.track_config}`;
function CarsList({ cars }: { cars?: string[] }) {
  return (
    <>
      {(cars ?? []).map((c) => (
        <span key={c} className={s.carItem}>
          <CarLabel car={c} />
        </span>
      ))}
    </>
  );
}
const colorVar = (c: string | undefined) => ({ "--c": c ?? "var(--border)" }) as CSSProperties;

// -- component -----------------------------------------------------------------

export default function RacingApp({ initial }: { initial: RacingSnapshot }) {
  const [snap, setSnap] = useState(initial);
  const [tab, setTab] = useState<Tab>("live");
  const [boardMode, setBoardMode] = useState<"tonight" | "all">("tonight");
  const [openNight, setOpenNight] = useState<number | null>(null);
  const [toasts, setToasts] = useState<LiveEvent[]>([]);
  const lastEvent = useRef<number | null>(null);

  const { live, data } = snap;
  const isLive = !!live && live.connected && snap.now - live.updated_at < LIVE_WINDOW;

  // Poll every few seconds while racing (so new laps pop up), slowly otherwise.
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const delay = () => (document.visibilityState !== "visible" ? 30000 : isLive ? 3000 : 15000);
    const tick = async () => {
      try {
        const res = await fetch("/api/racing", { cache: "no-store" });
        if (res.ok && !stop) setSnap(await res.json());
      } catch {
        /* keep showing the last snapshot */
      }
      if (!stop) timer = setTimeout(tick, delay());
    };
    timer = setTimeout(tick, delay());
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [isLive]);

  // Pop up every new lap that's set while you're watching (not old ones on load).
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
    setTimeout(() => setToasts((t) => t.filter((e) => !ids.has(e.id))), 7000);
  }, [live?.events]);

  const driverById = useCallback(
    (id: number | null | undefined): Driver | undefined => data?.drivers.find((d) => d.id === id),
    [data]
  );

  const tonightActive = !!data && data.session_id != null && data.tonight.length > 0;
  const lastRaced = data?.nights[0]?.ended_at ?? null;
  const onTrack = isLive && !!live?.car?.on_track;
  const status = isLive
    ? onTrack
      ? "On track now"
      : "Racing tonight"
    : tonightActive
      ? "Raced tonight"
      : lastRaced
        ? `Last raced ${fmtDay(lastRaced)}`
        : "Offline";

  return (
    <TrackMapsContext.Provider value={data?.track_maps ?? {}}>
    <DriversContext.Provider value={data?.drivers ?? []}>
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
          {status}
        </div>
      </header>

      <main className={s.main}>
        <p className={s.intro}>
          Lap times from hot-seat iRacing nights at my place. Friends take turns in one sim rig, and{" "}
          <b>SimStats</b>, an app I built, reads the sim&apos;s telemetry to record every lap, who drove
          it, and whether it was clean. New laps pop up here as they&apos;re set.
        </p>

        {data?.local_url && (
          <div className={s.localBox}>
            <a className={s.localBtn} href={data.local_url}>
              At the sim rig? Open the full app <span aria-hidden>↗</span>
            </a>
            <span className={s.localNote}>
              Only works on the home Wi-Fi. That&apos;s where drivers are added and laps are edited.
            </span>
          </div>
        )}

        <nav className={s.tabs} aria-label="Views">
          {(["live", "records", "nights"] as Tab[]).map((t) => (
            <button key={t} className={`${s.tab} ${tab === t ? s.tabOn : ""}`} onClick={() => setTab(t)}>
              {t === "live" ? (tonightActive || isLive ? "Tonight" : "Latest") : t === "records" ? "Records" : "Nights"}
            </button>
          ))}
        </nav>

        {!data ? (
          <div className={`${s.card} ${s.empty}`}>No laps published yet. Check back after the next race night.</div>
        ) : tab === "live" ? (
          <LiveView
            snap={snap}
            isLive={isLive}
            tonightActive={tonightActive}
            boardMode={boardMode}
            setBoardMode={setBoardMode}
            driverById={driverById}
          />
        ) : tab === "records" ? (
          <RecordsView tracks={data.records} />
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
            <Avatar driver={e.driver} size="md" />
            <div style={{ flex: 1 }}>
              <div className={s.toastLabel}>{BADGE_LABELS[e.type] ?? "New lap"}</div>
              <b>{e.driver ? nick(e.driver) : "Unassigned"}</b> <span className={s.muted}>· Lap {e.lap.lap_number}</span>
              {!e.lap.clean && <span className={s.muted}> · not clean</span>}
            </div>
            <div className={`${s.t} ${s.num} ${e.lap.clean ? "" : s.muted}`}>{fmtLap(e.lap.lap_time)}</div>
          </div>
        ))}
      </div>
    </div>
    </DriversContext.Provider>
    </TrackMapsContext.Provider>
  );
}

// -- tonight / latest ----------------------------------------------------------

function LiveView({
  snap,
  isLive,
  tonightActive,
  boardMode,
  setBoardMode,
  driverById,
}: {
  snap: RacingSnapshot;
  isLive: boolean;
  tonightActive: boolean;
  boardMode: "tonight" | "all";
  setBoardMode: (m: "tonight" | "all") => void;
  driverById: (id: number | null | undefined) => Driver | undefined;
}) {
  const live = snap.live;
  const data = snap.data!;
  const driver = isLive ? driverById(live?.current_driver_id) : undefined;
  const ctx = isLive ? live?.context ?? null : null;

  // Which track to feature: the one being driven now, else the latest one.
  const night = tonightActive ? null : data.nights[0];
  const pool: ComboStandings[] = tonightActive ? data.tonight : night?.combos ?? [];
  const featured: Combo | undefined =
    pool.find((c) => c.key === ctx?.key) ??
    (ctx ? data.records.find((c) => c.key === ctx.key) : undefined) ??
    pool[0] ??
    data.records[0];
  const key = ctx?.key ?? featured?.key ?? null;
  const title = ctx ?? featured;
  const nightRows = pool.find((c) => c.key === key)?.standings ?? [];
  const allRows = data.records.find((c) => c.key === key)?.standings ?? [];
  const rows = boardMode === "tonight" ? nightRows : allRows;
  const others = pool.filter((c) => c.key !== key);
  const mine = driver ? nightRows.find((r) => r.driver_id === driver.id) : undefined;
  const laps = tonightActive ? data.recent_laps : [];

  let chip = <span className={s.chip}>Not racing</span>;
  if (isLive) {
    const car = live?.car;
    if (!car || !car.on_track) chip = <span className={s.chip}>Driver swap</span>;
    else if (car.on_pit_road) chip = <span className={s.chip}>Pit lane</span>;
    else chip = <span className={`${s.chip} ${s.chipLive}`}>On track</span>;
  }

  const nowCard = (
    <section className={`${s.card} ${s.now}`} style={{ "--driver": driver?.color ?? "var(--border)" } as CSSProperties}>
      <div className={s.nowTop}>
        <div>
          <div className={`${s.small} ${s.muted}`}>{isLive ? "NOW DRIVING" : tonightActive ? "TONIGHT" : "LATEST"}</div>
          <div className={s.driverName}>
            {isLive && driver && <Avatar driver={driver} size="lg" />}
            {isLive ? (driver ? <DriverName driver={driver} size="lg" /> : "Driver swap…") : data.nights[0] ? fmtDay(data.nights[0].started_at) : "—"}
          </div>
        </div>
        <div>{chip}</div>
      </div>
      {!isLive && <div className={s.note}>Not racing right now. This shows the latest session.</div>}
      {title && (
        <dl className={`${s.comboInfo} ${isLive ? "" : s.stale}`}>
          <div><dt>Track</dt><dd><TrackIcon trackKey={key} />{title.track_name}</dd></div>
          <div><dt>Layout</dt><dd>{title.track_config || "Default"}</dd></div>
          <div>
            <dt>Car</dt>
            <dd><CarLabel car={ctx ? ctx.car_name : featured?.cars?.[0]} /></dd>
          </div>
        </dl>
      )}
      {isLive && driver && (
        <div className={`${s.meta} ${s.num}`}>
          <span>Last lap <b>{fmtLap(mine?.last)}</b></span>
          <span>Best tonight <b>{fmtLap(mine?.best)}</b></span>
        </div>
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
      {title && (
        <div className={`${s.comboSub} ${s.boardSub}`}>
          <TrackIcon trackKey={key} />
          <span>{trackTitle(title)} · any car</span>
        </div>
      )}
      <StandingsTable rows={rows} current={isLive && live?.car?.on_track ? live.current_driver_id : null} showLast={boardMode === "tonight"} />
      {others.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className={`${s.small} ${s.muted}`} style={{ marginBottom: 8 }}>Also driven</div>
          {others.map((c) => (
            <div key={c.key} style={{ marginBottom: 12 }}>
              <div className={s.titleRow} style={{ fontWeight: 700, fontSize: "0.9rem" }}><TrackIcon trackKey={c.key} />{trackTitle(c)}</div>
              <div className={s.comboSub} style={{ margin: "2px 0 6px" }}><CarsList cars={c.cars} /></div>
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

// Purple = all-time track record, amber = fastest tonight, green = driver's best tonight.
function lapColorer(key: string | null, night: Standing[], all: Standing[]) {
  const record = all[0]?.best ?? null;
  const nightBest = night[0]?.best ?? null;
  const pb = new Map(night.map((r) => [r.driver_id, r.best]));
  return (lap: Lap) => {
    if (!lap.clean || trackKey(lap) !== key) return "";
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
  const drivers = useContext(DriversContext);
  if (!rows.length) return <div className={s.empty}>No laps yet.</div>;
  const driverOf = (r: Standing) =>
    drivers.find((d) => d.id === r.driver_id) ?? { id: r.driver_id, name: r.name, nickname: r.nickname, color: r.color };
  // Only show which car a best lap was in when drivers used different cars here.
  const mixedCars = new Set(rows.map((r) => r.best_car).filter(Boolean)).size > 1;
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
                <Avatar driver={driverOf(r)} size="sm" />
                <span>
                  <DriverName driver={r} />
                  {r.driver_id === current && <span className={`${s.driving} ${s.drivingBelow}`}>driving</span>}
                  {r.best_car && mixedCars && (
                    <span className={s.bestCar}>
                      <CarLabel car={r.best_car} />
                    </span>
                  )}
                </span>
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
            <span className={s.who}>
              {d && <Avatar driver={d} size="xs" />}
              {d ? <DriverName driver={d} inline /> : "Unassigned"}
            </span>
            <span className={`${s.t} ${colorFor(lap)}`}>{fmtLap(lap.lap_time)}</span>
            <span className={s.lapMeta}>
              <BrandLogo car={lap.car_name} />
              {lap.car_name}
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

function RecordsView({ tracks }: { tracks: ComboStandings[] }) {
  if (!tracks.length) return <div className={`${s.card} ${s.empty}`}>No records yet.</div>;
  return (
    <div className={s.grid}>
      {tracks.map((c) => (
        <section key={c.key} className={s.card}>
          <div className={s.comboHead}>
            <div className={s.titleRow}>
              <TrackIcon trackKey={c.key} large />
              <div>
                <h3>{trackTitle(c)}</h3>
                <div className={s.car}><CarsList cars={c.cars} /></div>
              </div>
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
                  <h4 className={s.titleRow}>
                    <TrackIcon trackKey={c.key} />
                    {trackTitle(c)}
                  </h4>
                  <div className={s.comboSub}><CarsList cars={c.cars} /></div>
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
