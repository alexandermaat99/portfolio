// app/racing/lib/types.ts
// Shapes of the snapshots the SimStats app (github.com/alexandermaat99/sim-stats) publishes.

export interface Driver {
  id: number;
  name: string;
  color: string;
  archived?: number;
}

export interface Combo {
  key: string;
  track_id: number;
  track_name: string;
  track_config: string;
  car_id: number;
  car_name: string;
  laps?: number;
  nights?: number;
}

export interface Standing {
  pos: number;
  driver_id: number;
  name: string;
  color: string;
  best: number | null;
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

export interface RacingData {
  updated_at: number;
  drivers: Driver[];
  session_id: number | null;
  tonight: ComboStandings[];
  recent_laps: Lap[];
  records: ComboStandings[];
  nights: Night[];
}

export interface DeltaRef {
  label: string;
  delta: number | null;
  lap_time: number;
  driver_id: number;
  name: string;
  color: string;
}

export interface LiveEvent {
  id: number;
  type: "lap" | "record" | "night_best" | "pb";
  at: number;
  driver: { name: string; color: string } | null;
  lap: { lap_number: number; lap_time: number; clean: number; incidents: number };
}

export interface RacingLive {
  updated_at: number;
  connected: boolean;
  current_driver_id: number | null;
  context: (Combo & { session_type: string }) | null;
  car: {
    on_track: boolean;
    on_pit_road: boolean;
    lap: number;
    lap_time: number | null;
    lap_pct: number;
    incidents: number;
    clean_so_far: boolean;
    flags: { off_track: boolean; pit: boolean; reset: boolean; partial: boolean };
  } | null;
  deltas: Record<"night" | "pb" | "record", DeltaRef | null> | null;
  events: LiveEvent[];
}

export interface RacingSnapshot {
  live: RacingLive | null;
  data: RacingData | null;
  now: number; // server clock, seconds
}
