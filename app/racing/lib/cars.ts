// app/racing/lib/cars.ts: the cars on the rig (the "loadout" for the Cars tab).
// Specs are the road-going facts of each GT3 (engine, layout); in iRacing all GT3s run with
// Balance of Performance, so on-track pace comes from our own laps, not from a spec sheet.

export interface CarSpec {
  name: string; // iRacing's exact car name (matches lap data and competitions)
  engine: string;
  layout: "Front-engine" | "Mid-engine" | "Rear-engine";
  drivetrain: string;
  vibe: string; // one line of personality
}

export const GT3_LINEUP: CarSpec[] = [
  { name: "Audi R8 LMS EVO II GT3", engine: "5.2L V10", layout: "Mid-engine", drivetrain: "RWD", vibe: "The screaming V10 everyone's already comfortable in." },
  { name: "Ford Mustang GT3", engine: "5.4L V8", layout: "Front-engine", drivetrain: "RWD", vibe: "Big American V8 up front. Muscle car manners, race car brakes." },
  { name: "Ferrari 296 GT3", engine: "3.0L twin-turbo V6", layout: "Mid-engine", drivetrain: "RWD", vibe: "Small turbo V6, sharp and modern. Rewards a smooth driver." },
  { name: "Porsche 911 GT3 R (992)", engine: "4.2L flat-six", layout: "Rear-engine", drivetrain: "RWD", vibe: "Engine hanging out the back: brilliant traction, spicy on lift-off." },
  { name: "Mercedes-AMG GT3 2020", engine: "6.2L V8", layout: "Front-engine", drivetrain: "RWD", vibe: "Long-nosed V8 bruiser. Stable, forgiving, loud." },
  { name: "McLaren 720S GT3 EVO", engine: "4.0L twin-turbo V8", layout: "Mid-engine", drivetrain: "RWD", vibe: "Carbon-tub supercar with a turbo kick. Fast, if you can tame it." },
];
