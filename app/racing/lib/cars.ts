// app/racing/lib/cars.ts: the cars on the rig (the "loadout" for the Cars tab).
// Specs are the road-going facts of each GT3 (engine, layout); in iRacing all GT3s run with
// Balance of Performance, so on-track pace comes from our own laps, not from a spec sheet.

export interface CarSpec {
  name: string; // iRacing's exact car name (matches lap data and competitions)
  engine: string;
  layout: "Front-engine" | "Mid-engine" | "Rear-engine";
  drivetrain: string;
  vibe: string; // one line of personality
  photo?: string; // /public path, 16:9
  specs: Specs; // from iRacing's user manual for the car
  ratings: Omit<Ratings, "topSpeed" | "acceleration">; // our take on how it feels, out of 10 (not measured: GT3s are balanced for pace). Control = how easy it is to drive at the limit
}

/** Base specs from each car's iRacing user manual (before any Balance of Performance adjustment). */
export interface Specs { bhp: number; torqueNm: number; kgWithDriver: number; wheelbaseMm: number; rpm: number }

export const RATING_LABELS = { topSpeed: "Top speed", acceleration: "Acceleration", braking: "Braking", cornering: "Cornering", control: "Control" } as const;
export type Ratings = Record<keyof typeof RATING_LABELS, number>;

export const GT3_LINEUP: CarSpec[] = [
  { name: "Audi R8 LMS EVO II GT3", photo: "/racing/cars/audi-r8.jpg", engine: "5.2L V10", layout: "Mid-engine", drivetrain: "RWD", vibe: "The screaming V10 everyone's already comfortable in.",
    specs: { bhp: 518, torqueNm: 556, kgWithDriver: 1479, wheelbaseMm: 2700, rpm: 8500 },
    ratings: { braking: 8, cornering: 8, control: 8 } },
  { name: "Ford Mustang GT3", photo: "/racing/cars/ford-mustang.jpg", engine: "5.4L V8", layout: "Front-engine", drivetrain: "RWD", vibe: "Big American V8 up front. Muscle car manners, race car brakes.",
    specs: { bhp: 516, torqueNm: 584, kgWithDriver: 1479, wheelbaseMm: 2777, rpm: 8250 },
    ratings: { braking: 7, cornering: 6, control: 7 } },
  { name: "Ferrari 296 GT3", photo: "/racing/cars/ferrari-296.jpg", engine: "3.0L twin-turbo V6", layout: "Mid-engine", drivetrain: "RWD", vibe: "Small turbo V6, sharp and modern. Rewards a smooth driver.",
    specs: { bhp: 524, torqueNm: 664, kgWithDriver: 1508, wheelbaseMm: 2660, rpm: 8000 },
    ratings: { braking: 8, cornering: 9, control: 6 } },
  { name: "Porsche 911 GT3 R (992)", photo: "/racing/cars/porsche-992.jpg", engine: "4.2L flat-six", layout: "Rear-engine", drivetrain: "RWD", vibe: "Engine hanging out the back: brilliant traction, spicy on lift-off.",
    specs: { bhp: 565, torqueNm: 505, kgWithDriver: 1496, wheelbaseMm: 2507, rpm: 9500 },
    ratings: { braking: 9, cornering: 8, control: 5 } },
  { name: "Mercedes-AMG GT3 2020", photo: "/racing/cars/mercedes-amg.jpg", engine: "6.2L V8", layout: "Front-engine", drivetrain: "RWD", vibe: "Long-nosed V8 bruiser. Stable, forgiving, loud.",
    specs: { bhp: 500, torqueNm: 625, kgWithDriver: 1440, wheelbaseMm: 2630, rpm: 7800 },
    ratings: { braking: 7, cornering: 7, control: 9 } },
  { name: "McLaren 720S GT3 EVO", photo: "/racing/cars/mclaren-720s.jpg", engine: "4.0L twin-turbo V8", layout: "Mid-engine", drivetrain: "RWD", vibe: "Carbon-tub supercar with a turbo kick. Fast, if you can tame it.",
    specs: { bhp: 520, torqueNm: 667, kgWithDriver: 1494, wheelbaseMm: 2696, rpm: 8000 },
    ratings: { braking: 8, cornering: 8, control: 5 } },
];

/** Top speed and acceleration worked out from the manual specs (fixed formula, not opinion):
 *  - Top speed: power-to-weight (bhp per tonne, with driver).
 *  - Acceleration: average of power-to-weight and torque-to-weight (torque pulls out of corners).
 *  Each is a fraction of the best car's figure, cubed to make the small real gaps visible, out of 10.
 *  (iRacing balances GT3s, so differences on track are smaller than on paper.) */
export function specRatings(spec: CarSpec, all: CarSpec[] = GT3_LINEUP): Pick<Ratings, "topSpeed" | "acceleration"> {
  const pw = (c: CarSpec) => c.specs.bhp / c.specs.kgWithDriver;
  const tw = (c: CarSpec) => c.specs.torqueNm / c.specs.kgWithDriver;
  const rel = (f: (c: CarSpec) => number) => f(spec) / Math.max(...all.map(f));
  const score = (x: number) => Math.max(1, Math.min(10, Math.round(10 * x ** 3)));
  return { topSpeed: score(rel(pw)), acceleration: score((rel(pw) + rel(tw)) / 2) };
}

export function allRatings(spec: CarSpec): Ratings {
  return { ...specRatings(spec), ...spec.ratings };
}
