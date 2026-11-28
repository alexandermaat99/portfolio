"use client";
// app/racing/cars.tsx: the Cars tab, a "loadout" screen. One card per GT3 on the rig, all the same
// shape so they're easy to compare: photo, specs, a line of personality and five character stats
// (our take, out of 10). Tap a card to pin it and every other card shows ▲/▼ against it.

import { useState } from "react";
import s from "./racing.module.css";
import c from "./cars.module.css";
import { GT3_LINEUP, RATING_LABELS, type Ratings } from "./lib/cars";
import { BrandLogo } from "./visuals";

export function CarsView() {
  const [pinned, setPinned] = useState<string | null>(null);
  const pinnedRatings = pinned ? GT3_LINEUP.find((g) => g.name === pinned)?.ratings : undefined;
  return (
    <>
      <p className={`${s.small} ${s.muted} ${c.intro}`}>
        The GT3s on the rig. Stats are our take on how each one feels, out of 10. iRacing balances GT3s, so lap times end
        up close: pick the one that suits how you drive.
        {pinned ? <> Comparing everything against the <b>{pinned}</b> (tap it again to stop).</> : <> Tap a car to compare the rest against it.</>}
      </p>
      <div className={c.grid}>
        {GT3_LINEUP.map((spec) => {
          const isPinned = pinned === spec.name;
          return (
            <button key={spec.name} type="button" className={`${c.card} ${isPinned ? c.pinned : ""}`}
              onClick={() => setPinned(isPinned ? null : spec.name)} aria-pressed={isPinned}>
              {spec.photo && (
                // Plain <img>: already small, and skips Vercel's image optimization quota.
                // eslint-disable-next-line @next/next/no-img-element
                <img className={c.photo} src={spec.photo} alt={spec.name} width={480} height={270} loading="lazy" />
              )}
              <div className={c.body}>
                <div className={c.head}>
                  <span className={c.logo}><BrandLogo car={spec.name} /></span>
                  <div>
                    <div className={c.name}>{spec.name}</div>
                    <div className={`${s.small} ${s.muted}`}>{spec.engine} · {spec.layout} · {spec.drivetrain}</div>
                  </div>
                </div>
                <p className={c.vibe}>{spec.vibe}</p>
                {spec.ratings && (
                  <div className={c.bars}>
                    {(Object.keys(RATING_LABELS) as (keyof Ratings)[]).map((k) => (
                      <Rating key={k} label={RATING_LABELS[k]} value={spec.ratings![k]} cmp={!isPinned ? pinnedRatings?.[k] : undefined} />
                    ))}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function Rating({ label, value, cmp }: { label: string; value: number; cmp?: number }) {
  const diff = cmp != null ? value - cmp : 0;
  return (
    <div className={c.rating}>
      <span className={c.barLabel}>{label}</span>
      <span className={c.pips} aria-label={`${value} out of 10`}>
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} className={`${i < value ? c.pipOn : ""} ${cmp != null && i === cmp - 1 ? c.pipCmp : ""}`} />
        ))}
      </span>
      <span className={`${s.num} ${c.barValue}`}>
        {value}
        {diff !== 0 && <span className={diff > 0 ? c.up : c.down}>{diff > 0 ? ` ▲${diff}` : ` ▼${-diff}`}</span>}
      </span>
    </div>
  );
}
