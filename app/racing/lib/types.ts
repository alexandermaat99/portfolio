// app/racing/lib/types.ts
// Shapes of the snapshots the SimStats app (github.com/alexandermaat99/sim-stats) publishes.

export interface Driver {
  id: number;
  name: string;
  nickname?: string | null; // shown big; the real name goes underneath
  color: string;
  archived?: number;
  photo?: string | null; // photo hash; image at /api/racing/photo/<id>?v=<hash>
}

/** A track layout (records are per track, any car). */
export interface Combo {
  key: string;
  track_id: number;
  track_name: string;
  track_config: string;
  cars: string[]; // cars driven here, most recent first
  laps?: number;
  nights?: number;
}

export interface Standing {
  pos: number;
  driver_id: number;
  name: string;
  nickname?: string | null;
  color: string;
  best: number | null;
  best_car: string | null; // car the best lap was set in
  gap: number | null;
  avg5: number | null;
  last: number | null;
  last_clean: boolean | null;
  laps: number;
  clean_laps: number;
}

export interface ComboStandings extends Combo {
  standings: Standing[];
}

export interface Lap {
  id: number;
  driver_id: number | null;
  stint: number;
  recorded_at: number;
  lap_number: number;
  lap_time: number;
  track_id: number;
  track_config: string;
  car_id: number;
  track_name: string;
  car_name: string;
  incidents: number;
  off_track: number;
  pit: number;
  reset: number;
  partial: number;
  clean: number;
}

export interface Night {
  id: number;
  label: string;
  started_at: number;
  ended_at: number;
  laps: number;
  drivers: number;
  combos: ComboStandings[];
}

export interface DriverProfile {
  id: number;
  stats: {
    laps: number;
    clean_laps: number;
    clean_pct: number | null;
    seconds: number;
    incidents: number;
    nights: number;
    tracks: number;
    records: number;
    night_wins: number;
    clean_streak: number;
    first_at: number | null;
    last_at: number | null;
    favorite_car: { name: string; laps: number } | null;
    favorite_track: { track_id: number; track_name: string; track_config: string; laps: number } | null;
  };
  badges: { key: string; label: string; tier: "record" | "gold" | "good" | "bad" | "plain" }[];
  profile?: string | null; // AI-written blurb
}

export interface CompetitionRow {
  driver_id: number;
  pos: number | null;
  best: number | null;
  gap: number | null;
  best_car: string | null;
  attack_laps_used: number;
  attack_laps_over: number;
  practice_laps_used: number;
  practice_seconds_used: number;
  practice_over: boolean;
  tie?: boolean; // shares its position: both get another shot
  extra_shots?: number;
  attack_laps_limit?: number | null; // this driver's shots (incl. extra ones)
  rookie?: boolean; // first time on the sim: gets the practice bonus
  practice_laps_limit?: number | null;
  practice_minutes_limit?: number | null;
}

export interface Competition {
  id: number;
  name: string;
  track_id: number;
  track_config: string;
  track_name: string;
  track_key: string;
  cars: string[];
  phase: "upcoming" | "practice" | "between" | "attack" | "finished";
  practice_start: number | null;
  practice_end: number | null;
  practice_laps: number | null;
  practice_minutes: number | null;
  practice_bonus_laps?: number | null; // extra practice for first-timers
  practice_bonus_minutes?: number | null;
  attack_start: number | null; // null until the dates are decided
  attack_end: number | null;
  attack_laps: number | null;
  attack_minutes: number | null;
  attack_warmup_laps?: number; // free laps at the start of each visit
  fee_cents: number;
  pool_cents: number;
  paid_count: number;
  payouts: { place: number; percent: number; cents: number }[];
  entrants: number;
  standings: CompetitionRow[];
}

export interface RacingData {
  updated_at: number;
  local_url: string | null; // the full app on the home network
  track_maps?: Record<string, string>; // track key -> SVG path of the outline (0-100 box)
  driver_stats?: DriverProfile[];
  competitions?: Competition[];
  analysis?: Record<string, TrackAnalysis>;
  recaps?: { stint: number; driver_id: number; session_id: number; track_id: number; track_config: string; created_at: number; text: string }[]; // AI session recaps // track key -> per-driver traces, sectors, history
  drivers: Driver[];
  session_id: number | null;
  tonight: ComboStandings[];
  recent_laps: Lap[];
  records: ComboStandings[];
  nights: Night[];
}

export interface LiveEvent {
  id: number;
  label?: string; // overrides the default pop-up label (e.g. competition lead changes)
  type: "lap" | "record" | "night_best" | "pb";
  at: number;
  driver: { id?: number; name: string; nickname?: string | null; color: string; photo?: string | null } | null;
  lap: { lap_number: number; lap_time: number; clean: number; incidents: number };
}

export interface RacingLive {
  updated_at: number;
  connected: boolean;
  current_driver_id: number | null;
  context: {
    key: string;
    track_id: number;
    track_name: string;
    track_config: string;
    car_name: string;
    session_type: string;
  } | null;
  car: { on_track: boolean; on_pit_road: boolean } | null;
  events: LiveEvent[];
}

export interface RacingSnapshot {
  live: RacingLive | null;
  data: RacingData | null;
  now: number; // server clock, seconds
}

/** Per-track numbers for the Stats tab (simstats/analysis.py). */
export interface TrackAnalysis {
  sector_count: number | null;
  sector_bounds: number[] | null; // lap fraction where each sector starts
  drivers: Record<string, {
    trace?: number[]; // lap time at 0%, 1% ... 100% of their fastest clean lap
    trace_car?: string;
    sectors?: (number | null)[]; // best clean time through each sector
    history: [number, number][]; // recent clean laps: [unix time, lap time], oldest first
  }>;
}
