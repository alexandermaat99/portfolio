// app/racing/lib/rigtime.ts: the sim rig's clock. Practice times are about when you can be at the
// rig, so they're always shown and entered in the rig's timezone, wherever the viewer is.

export const RIG_TZ = "America/Denver";

/** Short label for the rig's timezone right now, e.g. "MST". */
export function rigTzLabel(t = Date.now() / 1000): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: RIG_TZ, timeZoneName: "short" })
    .formatToParts(new Date(t * 1000)).find((p) => p.type === "timeZoneName")?.value ?? "MT";
}

export const rigDay = (t: number) =>
  new Date(t * 1000).toLocaleDateString([], { timeZone: RIG_TZ, weekday: "long", month: "short", day: "numeric" });
export const rigTime = (t: number) =>
  new Date(t * 1000).toLocaleTimeString([], { timeZone: RIG_TZ, hour: "numeric", minute: "2-digit" });
export const rigWhen = (t: number) =>
  new Date(t * 1000).toLocaleString([], { timeZone: RIG_TZ, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** "2026-12-09" + "17:00" in the rig's timezone -> unix seconds. */
export function rigToUnix(date: string, time: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  const offsetAt = (utcMs: number) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: RIG_TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - utcMs; // rig wall clock minus UTC
  };
  let utc = wall - offsetAt(wall);
  utc = wall - offsetAt(utc); // settle across a DST change
  return Math.round(utc / 1000);
}

/** unix seconds -> "YYYY-MM-DDTHH:MM" on the rig's clock (for datetime-local inputs). */
export function unixToRigInput(t: number): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: RIG_TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(t * 1000)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
