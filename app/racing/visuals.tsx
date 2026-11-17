"use client";
// app/racing/visuals.tsx: driver photos, car-maker logos and track outlines.

import { createContext, useContext, type CSSProperties } from "react";
import s from "./racing.module.css";

// -- car-maker logos (Simple Icons, CC0; files in /public/racing/brands) ----------

const BRAND_RULES: [RegExp, string | null][] = [
  [/mercedes|amg/i, "amg"], [/aston martin/i, "astonmartin"], [/\bvw\b|volkswagen/i, "volkswagen"],
  [/chevrolet|chevy|corvette|camaro/i, "chevrolet"], [/mazda|mx-5|miata/i, "mazda"], [/toyota|gr86|supra/i, "toyota"],
  [/acura|nsx/i, "acura"], [/lamborghini|hurac/i, "lamborghini"], [/honda|civic/i, "honda"], [/rolls/i, "rollsroyce"],
  [/alpine/i, null], [/\bbmw\b/i, "bmw"], [/\bkia\b/i, "kia"], [/\bmini\b/i, "mini"], [/\bram\b/i, "ram"], [/\bseat\b/i, "seat"],
];
const BRANDS = ["audi", "bentley", "bugatti", "cadillac", "chrysler", "citroen", "ferrari", "fiat", "ford", "hyundai",
  "infiniti", "jeep", "maserati", "mclaren", "mitsubishi", "nissan", "opel", "peugeot", "polestar", "porsche", "renault",
  "skoda", "subaru", "suzuki", "tesla", "volvo"];

export function brandFor(carName: string | null | undefined): string | null {
  if (!carName) return null;
  for (const [re, slug] of BRAND_RULES) if (re.test(carName)) return slug;
  const lower = carName.toLowerCase();
  return BRANDS.find((b) => lower.includes(b)) ?? null;
}

export function BrandLogo({ car }: { car: string | null | undefined }) {
  const b = brandFor(car);
  if (!b) return null;
  return (
    <span
      className={s.brandLogo}
      style={{ "--logo": `url(/racing/brands/${b}.svg)` } as CSSProperties}
      title={car ?? undefined}
      aria-hidden
    />
  );
}

export function CarLabel({ car }: { car: string | null | undefined }) {
  if (!car) return null;
  return (
    <span className={s.carLabel}>
      <BrandLogo car={car} />
      {car}
    </span>
  );
}

// -- track outlines (drawn by SimStats from a clean lap) --------------------------

export const TrackMapsContext = createContext<Record<string, string>>({});

export function TrackIcon({ trackKey, large = false }: { trackKey: string | null | undefined; large?: boolean }) {
  const maps = useContext(TrackMapsContext);
  const d = trackKey ? maps[trackKey] : undefined;
  if (!d) return null;
  return (
    <svg className={`${s.trackMap} ${large ? s.trackMapLg : ""}`} viewBox="0 0 100 100" aria-hidden>
      <path d={d} />
    </svg>
  );
}

// -- driver names: nickname big, real name small underneath --------------------------

type Named = { name: string; nickname?: string | null };
export const nick = (d: Named | null | undefined) => (d ? d.nickname || d.name : "");

export function DriverName({ driver, size = "md", inline = false }: {
  driver: Named;
  size?: "md" | "lg";
  inline?: boolean;
}) {
  const real = driver.nickname ? driver.name : null;
  return (
    <span className={`${s.dname} ${size === "lg" ? s.dnameLg : ""} ${inline ? s.dnameInline : ""}`}>
      <span>{nick(driver)}</span>
      {real && <span className={s.realname}>{real}</span>}
    </span>
  );
}

// -- driver photos ------------------------------------------------------------------

export function Avatar({
  driver,
  size = "sm",
}: {
  driver: { id?: number; name: string; nickname?: string | null; color: string; photo?: string | null } | null | undefined;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  const cls = `${s.avatar} ${s[`avatar_${size}`]}`;
  const style = { "--c": driver?.color ?? "var(--border)" } as CSSProperties;
  if (!driver) return <span className={cls} style={style} />;
  if (driver.photo && driver.id != null) {
    // eslint-disable-next-line @next/next/no-img-element -- tiny, already-optimized JPEGs
    return <img className={cls} style={style} src={`/api/racing/photo/${driver.id}?v=${driver.photo}`} alt="" />;
  }
  const initials = nick(driver)
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className={cls} style={style}>
      {initials}
    </span>
  );
}
