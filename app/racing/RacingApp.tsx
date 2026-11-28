"use client";
// app/racing/RacingApp.tsx: read-only, auto-refreshing view of SimStats data.
// No live lap timer here; new laps pop up and standings refresh as they're set.

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import s from "./racing.module.css";
import { LAP_GUSTS, startDotField, type DotField } from "./dots";
import { CompeteView } from "./compete";
import { StatsView } from "./stats";
import { Avatar, BrandLogo, CarLabel, DriverName, nick, TrackIcon, TrackMapsContext } from "./visuals";
import type { Combo, ComboStandings, Driver, Lap, LiveEvent, RacingSnapshot, Standing } from "./lib/types";
import { TAB_COOKIE, tabPath, type Tab } from "./lib/tabs";


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

export default function RacingApp({ initial, initialTab = "live" }: { initial: RacingSnapshot; initialTab?: Tab }) {
  const [snap, setSnap] = useState(initial);
  // The open tab lives in the path (/racing/stats) and a cookie; the server reads them,
  // so the page arrives already on the right tab (no flash on refresh).
  const [tab, setTabState] = useState<Tab>(initialTab);
  const setTab = (t: Tab) => {
    setTabState(t);
    document.cookie = `${TAB_COOKIE}=${t}; path=/racing; max-age=31536000; samesite=lax`;
    window.history.replaceState(window.history.state, "", tabPath(t));
  };
  const [boardMode, setBoardMode] = useState<"tonight" | "all">("tonight");
  const [toasts, setToasts] = useState<LiveEvent[]>([]);
  const lastEvent = useRef<number | null>(null);

  // Animated dot grid (static CSS grid if the visitor prefers reduced motion).
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dots = useRef<DotField | null>(null);
  const [dotsLive, setDotsLive] = useState(false);
  useEffect(() => {
    if (!canvasRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    dots.current = startDotField(canvasRef.current);
    setDotsLive(true);
    return () => dots.current?.stop();
  }, []);

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
    // New laps make the dot field gust, tinted by the best kind of lap in this batch.
    const order = ["record", "night_best", "pb", "lap"];
    const top = order.find((k) => fresh.some((e) => e.type === k)) ?? "lap";
    dots.current?.gust(LAP_GUSTS[top]);
    // Confetti for a new fastest lap (of the night, or ever).
    if (fresh.some((e) => e.type === "night_best" || e.type === "record")) dots.current?.confetti();
    const ids = new Set(fresh.map((e) => e.id));
    setTimeout(() => setToasts((t) => t.filter((e) => !ids.has(e.id))), 7000);
  }, [live?.events]);

  // Competitions (shown in their own tab) and a pop-up when someone takes the lead.
  const comps = useMemo(() => data?.competitions ?? [], [data?.competitions]);
  const leaders = useRef<Record<number, number | null> | null>(null);
  useEffect(() => {
    const now: Record<number, number | null> = {};
    for (const c of comps) now[c.id] = c.standings.find((r) => r.pos === 1)?.driver_id ?? null;
    const before = leaders.current;
    leaders.current = now;
    if (!before) return; // first load: nothing to announce
    const fresh: LiveEvent[] = [];
    for (const c of comps) {
      const lead = now[c.id];
      if (lead == null || before[c.id] === undefined || before[c.id] === lead) continue;
      const d = data?.drivers.find((x) => x.id === lead);
      const row = c.standings.find((r) => r.driver_id === lead);
      fresh.push({
        id: -Date.now() - c.id, type: "record", at: Date.now() / 1000, label: `Leads ${c.name}`,
        driver: d ? { id: d.id, name: d.name, nickname: d.nickname, color: d.color, photo: d.photo } : null,
        lap: { lap_number: 0, lap_time: row?.best ?? 0, clean: 1, incidents: 0 },
      });
    }
    if (!fresh.length) return;
    setToasts((t) => [...t, ...fresh]);
    dots.current?.confetti();
    const ids = new Set(fresh.map((e) => e.id));
    setTimeout(() => setToasts((t) => t.filter((e) => !ids.has(e.id))), 8000);
  }, [comps, data?.drivers]);

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
    <div className={`${s.root} ${dotsLive ? s.dotsLive : ""}`}>
      <canvas ref={canvasRef} className={s.dotCanvas} aria-hidden />
      <header className={s.topbar}>
        <div className={s.brand}>
          <Link href="/racing" onClick={(e) => { e.preventDefault(); setTab("live"); window.scrollTo(0, 0); }}>
            <span className={s.wordmark}>SIMSTATS</span>
            <span className={s.model}>SS-1</span>
          </Link>
        </div>
        <div className={s.status}>
          <span className={`${s.dot} ${isLive ? s.dotLive : ""}`} />
          {status}
        </div>
      </header>

      <main className={s.main}>
        <p className={s.intro}>
          iRacing nights at my place, timed by <b>SimStats</b>.
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
          {(["live", "records", "stats", "drivers", "compete"] as Tab[]).map((t, i) => (
            <button key={t} className={`${s.tab} ${tab === t ? s.tabOn : ""}`} onClick={() => setTab(t)}>
              <span className={s.k}>0{i + 1}</span>
              {t === "live" ? (tonightActive || isLive ? "Tonight" : "Latest") : t === "records" ? "Records" : t === "stats" ? "Stats" : t === "drivers" ? "Drivers" : "Compete"}
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
        ) : tab === "drivers" ? (
          <DriversView data={data} />
        ) : tab === "compete" ? (
          <CompeteView comps={comps} drivers={data.drivers} now={snap.now} />
        ) : (
          <StatsView data={data} comps={comps} now={snap.now} />
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
              <div className={s.toastLabel}>{e.label ?? BADGE_LABELS[e.type] ?? "New lap"}</div>
              <b>{e.driver ? nick(e.driver) : "Unassigned"}</b>{" "}
              {e.lap.lap_number > 0 && <span className={s.muted}>· Lap {e.lap.lap_number}</span>}
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
      <h2 className={s.cardTitle}><span>Tonight&apos;s laps</span>{laps.length > 0 && <span className={s.small}>{laps.length}</span>}</h2>
      {laps.length ? (
        <PagedLaps laps={laps} driverById={driverById} colorFor={lapColorer(key, nightRows, allRows)} />
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

// Tonight's laps, newest first, 9 to a page.
const LAPS_PER_PAGE = 9;
function PagedLaps(props: { laps: Lap[]; driverById: (id: number | null | undefined) => Driver | undefined; colorFor: (lap: Lap) => string }) {
  const { laps } = props;
  const pages = Math.max(1, Math.ceil(laps.length / LAPS_PER_PAGE));
  const [want, setPage] = useState(0);
  const page = Math.min(want, pages - 1);
  const from = page * LAPS_PER_PAGE;
  const shown = laps.slice(from, from + LAPS_PER_PAGE);
  return (
    <>
      <LapList {...props} laps={shown} />
      {pages > 1 && (
        <div className={`${s.pager} ${s.num}`}>
          <span className={s.seg}>
            <button onClick={() => setPage(0)} disabled={page === 0} aria-label="Newest laps">«</button>
            <button onClick={() => setPage(page - 1)} disabled={page === 0} aria-label="Newer laps">‹ Newer</button>
          </span>
          <span className={s.muted}>
            {from + 1}–{from + shown.length} of {laps.length}
          </span>
          <span className={s.seg}>
            <button onClick={() => setPage(page + 1)} disabled={page >= pages - 1} aria-label="Older laps">Older ›</button>
            <button onClick={() => setPage(pages - 1)} disabled={page >= pages - 1} aria-label="Oldest laps">»</button>
          </span>
        </div>
      )}
    </>
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

// -- drivers: profile per driver ------------------------------------------------

const fmtDuration = (sec: number) => {
  if (!sec) return "0m";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};

function DriversView({ data }: { data: NonNullable<RacingSnapshot["data"]> }) {
  const [open, setOpen] = useState<number | null>(null);
  const profiles = (data.driver_stats ?? [])
    .map((p) => ({ ...p, driver: data.drivers.find((d) => d.id === p.id) }))
    .filter((p) => p.driver && p.stats.laps > 0)
    .sort((a, b) => b.stats.records - a.stats.records || b.stats.night_wins - a.stats.night_wins || b.stats.laps - a.stats.laps);
  if (!profiles.length) return <div className={`${s.card} ${s.empty}`}>No drivers yet.</div>;
  const badgeClass = { record: s.badgeRecord, gold: s.badgeGold, good: s.badgeGood, bad: s.badgeBad, plain: "" };
  const pipClass = { record: s.pipRecord, gold: s.pipGold, good: s.pipGood, bad: s.pipBad, plain: "" };
  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}>
        <span>Drivers</span>
        <span className={s.muted}>{profiles.length}</span>
      </h2>
      <ul className={s.driverList}>
        {profiles.map(({ driver, stats: st, badges, id }) => {
          const isOpen = open === id;
          return (
            <li key={id} className={s.dlItem} style={colorVar(driver!.color)}>
              <button className={s.dlRow} onClick={() => setOpen(isOpen ? null : id)} aria-expanded={isOpen}>
                <Avatar driver={driver} size="md" />
                <span className={s.dlName}>
                  <DriverName driver={driver!} />
                </span>
                <span className={`${s.dlMeta} ${s.num}`}>
                  {st.favorite_car && <BrandLogo car={st.favorite_car.name} />}
                  {st.laps} laps
                  {st.records > 0 && <span className={s.dlRec}>{st.records} rec</span>}
                </span>
                <span className={s.dlPips}>
                  {badges.slice(0, 5).map((b) => (
                    <i key={b.key} className={`${s.pip} ${pipClass[b.tier]}`} title={b.label} />
                  ))}
                </span>
                <span className={s.dlChev}>{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div className={s.profileDetail}>
                  <div className={s.profileSub}>
                    First lap {st.first_at ? fmtDay(st.first_at) : "—"} · last raced {st.last_at ? fmtDay(st.last_at) : "—"}
                  </div>
                  {badges.length > 0 && (
                    <div className={s.badges}>
                      {badges.map((b) => (
                        <span key={b.key} className={`${s.badge} ${badgeClass[b.tier]}`}>{b.label}</span>
                      ))}
                    </div>
                  )}
                  <div className={s.statGrid}>
                    {[
                      ["Laps", st.laps],
                      ["Clean", st.clean_pct == null ? "—" : `${Math.round(st.clean_pct * 100)}%`],
                      ["Nights", st.nights],
                      ["Tracks", st.tracks],
                      ["Records", st.records],
                      ["Night wins", st.night_wins],
                      ["Driven", fmtDuration(st.seconds)],
                      ["Streak", st.clean_streak],
                    ].map(([label, value]) => (
                      <div key={label} className={s.stat}>
                        <div className={`${s.statV} ${s.num}`}>{value}</div>
                        <div className={s.statL}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <dl className={s.favs}>
                    <div>
                      <dt>Favorite car</dt>
                      <dd>
                        {st.favorite_car ? (
                          <>
                            <CarLabel car={st.favorite_car.name} />
                            <span className={s.favN}>{st.favorite_car.laps} laps</span>
                          </>
                        ) : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Favorite track</dt>
                      <dd>
                        {st.favorite_track ? (
                          <>
                            <TrackIcon trackKey={`${st.favorite_track.track_id}|${st.favorite_track.track_config}`} />
                            {trackTitle(st.favorite_track)}
                            <span className={s.favN}>{st.favorite_track.laps} laps</span>
                          </>
                        ) : "—"}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}


