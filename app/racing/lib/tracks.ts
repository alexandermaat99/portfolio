// app/racing/lib/tracks.ts: extra info for competition tracks, and tracks that can be picked for a
// competition before anyone has driven them (SimStats corrects the iRacing ID from the first lap).

export interface TrackInfo {
  name: string;
  layout: string;
  location: string;
  lengthKm: number;
  lengthMi: number;
  turns: number;
  map?: string; // light-background image; shown inverted on the dark site
  logo?: string; // black-on-transparent; shown inverted
  corners?: string;
  history: string;
  tips: string;
}

export const KNOWN_TRACKS = [{ track_id: 403, track_config: "Grand Prix", track_name: "Red Bull Ring" }];

const INFO: TrackInfo[] = [
  {
    name: "Red Bull Ring",
    layout: "Grand Prix",
    location: "Spielberg, Styria, Austria",
    lengthKm: 4.31,
    lengthMi: 2.68,
    turns: 10,
    map: "/racing/tracks/red-bull-ring-map.png",
    logo: "/racing/tracks/red-bull-ring-logo.png",
    corners: "T1 Niki Lauda · T4 Rauch · T9 Jochen Rindt",
    history:
      "Opened in 1969 as the Österreichring and home of the Austrian Grand Prix until 1987. Rebuilt as the shorter A1-Ring " +
      "in the 1990s (F1 from 1997 to 2003), then rebuilt again by Red Bull, which brought Formula 1 back in 2014. In 2020 " +
      "it opened the F1 season with back-to-back races, a first.",
    tips:
      "Short and punchy: three big stops (Turns 1, 3 and 4) are where most of the lap time is, and the fast final two " +
      "corners are easy to run wide. Staying inside the white lines there is what makes a lap count.",
  },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Info for a track by name + layout (so it still matches after SimStats corrects the ID). */
export function trackInfo(trackName: string, layout: string): TrackInfo | undefined {
  const n = norm(trackName);
  return INFO.find((t) => (n.includes(norm(t.name)) || norm(t.name).includes(n)) && norm(t.layout) === norm(layout));
}
