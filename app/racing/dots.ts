// app/racing/dots.ts: animated dot-grid background (same as the SimStats app).
// Ripples wash across the dots: faint ambient ones, bigger coloured ones for new laps,
// and a small one where you tap. Idle frames aren't redrawn.

const SPACING = 18;
const BASE_ALPHA = 0.11;
const SPEED = 420; // px/s
const WIDTH = 70; // ring thickness, px
const AMBIENT_EVERY: [number, number] = [6000, 11000];

export interface RippleOptions {
  color?: string;
  strength?: number;
  rings?: number;
}

interface Ripple {
  x: number;
  y: number;
  start: number;
  strength: number;
  rgb: [number, number, number];
  life: number;
}

export interface DotField {
  ripple(x: number, y: number, opts?: RippleOptions): void;
  stop(): void;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export function startDotField(canvas: HTMLCanvasElement): DotField {
  const ctx = canvas.getContext("2d")!;
  const ripples: Ripple[] = [];
  let w = 0;
  let h = 0;
  let dirty = true;
  let raf = 0;
  let ambientTimer: ReturnType<typeof setTimeout> | undefined;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dirty = true;
  };

  const ripple = (x: number, y: number, opts: RippleOptions = {}) => {
    const start = performance.now();
    for (let i = 0; i < (opts.rings ?? 1); i++) {
      ripples.push({
        x,
        y,
        start: start + i * 260,
        strength: opts.strength ?? 1,
        rgb: opts.color ? hexToRgb(opts.color) : [255, 255, 255],
        life: (Math.hypot(w, h) / SPEED) * 1000 + 400,
      });
    }
    if (ripples.length > 12) ripples.splice(0, ripples.length - 12);
  };

  const draw = (now: number) => {
    for (let i = ripples.length - 1; i >= 0; i--) if (now - ripples[i].start > ripples[i].life) ripples.splice(i, 1);
    const active = ripples.filter((r) => now >= r.start);
    if (!active.length && !dirty) return;
    dirty = active.length > 0;
    ctx.clearRect(0, 0, w, h);
    const cols = Math.ceil(w / SPACING) + 1;
    const rows = Math.ceil(h / SPACING) + 1;
    const off = SPACING / 2;
    ctx.fillStyle = `rgba(255,255,255,${BASE_ALPHA})`;
    const lit: number[] = [];
    for (let j = 0; j < rows; j++) {
      const y = off + j * SPACING;
      for (let i = 0; i < cols; i++) {
        const x = off + i * SPACING;
        let k = 0;
        let rgb: [number, number, number] = [255, 255, 255];
        for (const rp of active) {
          const diff = Math.abs(Math.hypot(x - rp.x, y - rp.y) - ((now - rp.start) / 1000) * SPEED);
          if (diff < WIDTH) {
            const fade = Math.max(0, 1 - (now - rp.start) / rp.life);
            const kk = (1 - diff / WIDTH) ** 2 * rp.strength * fade;
            if (kk > k) {
              k = kk;
              rgb = rp.rgb;
            }
          }
        }
        if (k > 0.02) lit.push(x, y, k, ...rgb);
        else ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
    for (let n = 0; n < lit.length; n += 6) {
      const size = 2 + lit[n + 2] * 2.6;
      ctx.fillStyle = `rgba(${lit[n + 3]},${lit[n + 4]},${lit[n + 5]},${Math.min(1, BASE_ALPHA + lit[n + 2] * 0.85)})`;
      ctx.fillRect(lit[n] - size / 2, lit[n + 1] - size / 2, size, size);
    }
  };

  const frame = (now: number) => {
    draw(now);
    raf = requestAnimationFrame(frame);
  };

  const ambient = () => {
    const delay = AMBIENT_EVERY[0] + Math.random() * (AMBIENT_EVERY[1] - AMBIENT_EVERY[0]);
    ambientTimer = setTimeout(() => {
      if (document.visibilityState === "visible") ripple(Math.random() * w, Math.random() * h, { strength: 0.45 });
      ambient();
    }, delay);
  };

  const onTap = (e: PointerEvent) => ripple(e.clientX, e.clientY, { strength: 0.6 });

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("pointerdown", onTap, { passive: true });
  raf = requestAnimationFrame(frame);
  ambient();

  return {
    ripple,
    stop() {
      cancelAnimationFrame(raf);
      clearTimeout(ambientTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onTap);
    },
  };
}

/** Ripple style for each kind of lap event. */
export const LAP_RIPPLES: Record<string, RippleOptions> = {
  lap: { color: "#ff4f00", strength: 0.9 },
  pb: { color: "#22c06e", strength: 1.1, rings: 2 },
  night_best: { color: "#ff4f00", strength: 1.2, rings: 2 },
  record: { color: "#8f72ff", strength: 1.4, rings: 3 },
};
