// app/racing/lib/types.ts
// Shapes of the snapshots the SimStats app (github.com/alexandermaat99/sim-stats) publishes.

export interface Driver {
  id: number;
  name: string;
  color: string;
  archived?: number;
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

export interface RacingData {
  updated_at: number;
  local_url: string | null; // the full app on the home network
  drivers: Driver[];
  session_id: number | null;
  tonight: ComboStandings[];
  recent_laps: Lap[];
  records: ComboStandings[];
  nights: Night[];
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
