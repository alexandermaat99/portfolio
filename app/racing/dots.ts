// app/racing/dots.ts: animated dot-grid background (same as the SimStats app).
// A slight wave sweeps across every so often; coloured ripples for new laps; confetti for
// a new fastest lap. Idle frames aren't redrawn.

const SPACING = 18;
const BASE_ALPHA = 0.11;
const SPEED = 420; // px/s
const WIDTH = 70; // ring thickness, px
const WAVE_SPEED = 260;
const WAVE_WIDTH = 140;
const WAVE_EVERY: [number, number] = [9000, 16000];

export interface RippleOptions {
  color?: string;
  strength?: number;
  rings?: number;
}

interface Ripple {
  kind: "ripple" | "wave";
  x: number;
  y: number;
  dx?: number;
  dy?: number;
  from?: number;
  speed: number;
  width: number;
  start: number;
  strength: number;
  rgb: [number, number, number];
  life: number;
}

export interface DotField {
  ripple(x: number, y: number, opts?: RippleOptions): void;
  confetti(): void;
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
        kind: "ripple",
        speed: SPEED,
        width: WIDTH,
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
          const pos =
            rp.kind === "wave" ? x * rp.dx! + y * rp.dy! - rp.from! : Math.hypot(x - rp.x, y - rp.y);
          const diff = Math.abs(pos - ((now - rp.start) / 1000) * rp.speed);
          if (diff < rp.width) {
            const fade = rp.kind === "wave" ? 1 : Math.max(0, 1 - (now - rp.start) / rp.life);
            const kk = (1 - diff / rp.width) ** 2 * rp.strength * fade;
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

  // A straight wave front crossing the whole screen at a random angle.
  const wave = () => {
    const angle = Math.random() * Math.PI * 2;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const proj = [0, w * dx, h * dy, w * dx + h * dy];
    const from = Math.min(...proj) - WAVE_WIDTH;
    const to = Math.max(...proj) + WAVE_WIDTH;
    ripples.push({
      kind: "wave", x: 0, y: 0, dx, dy, from, speed: WAVE_SPEED, width: WAVE_WIDTH,
      start: performance.now(), strength: 0.32, rgb: [255, 255, 255], life: ((to - from) / WAVE_SPEED) * 1000,
    });
  };
  const scheduleWave = () => {
    const delay = WAVE_EVERY[0] + Math.random() * (WAVE_EVERY[1] - WAVE_EVERY[0]);
    ambientTimer = setTimeout(() => {
      if (document.visibilityState === "visible") wave();
      scheduleWave();
    }, delay);
  };

  // Confetti from both bottom corners, on its own canvas above everything.
  let confettiCanvas: HTMLCanvasElement | null = null;
  let pieces: { x: number; y: number; vx: number; vy: number; w: number; h: number; rot: number; vr: number; color: string; life: number }[] = [];
  let confettiRaf = 0;
  const confetti = () => {
    if (!confettiCanvas) {
      confettiCanvas = document.createElement("canvas");
      confettiCanvas.setAttribute("aria-hidden", "true");
      Object.assign(confettiCanvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", zIndex: "40", pointerEvents: "none" });
      document.body.appendChild(confettiCanvas);
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    confettiCanvas.width = Math.round(w * dpr);
    confettiCanvas.height = Math.round(h * dpr);
    const cctx = confettiCanvas.getContext("2d")!;
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ["#ff4f00", "#ececE6", "#8f72ff", "#22c06e", "#ffc700"];
    for (let i = 0; i < 160; i++) {
      const left = i % 2 === 0;
      const angle = ((left ? -60 : -120) * Math.PI) / 180 + (Math.random() - 0.5) * 0.7;
      const speed = 9 + Math.random() * 9;
      pieces.push({
        x: left ? -10 : w + 10, y: h * 0.85, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        w: 5 + Math.random() * 6, h: 3 + Math.random() * 4, rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4, color: colors[i % colors.length], life: 0,
      });
    }
    if (confettiRaf) return;
    const step = () => {
      cctx.clearRect(0, 0, w, h);
      for (const p of pieces) {
        p.life++;
        p.vy += 0.28;
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        const flip = Math.abs(Math.cos(p.life / 6));
        cctx.save();
        cctx.translate(p.x, p.y);
        cctx.rotate(p.rot);
        cctx.fillStyle = p.color;
        cctx.fillRect(-p.w / 2, (-p.h / 2) * flip, p.w, p.h * flip + 0.5);
        cctx.restore();
      }
      pieces = pieces.filter((p) => p.y < h + 40 && p.life < 400);
      if (pieces.length) confettiRaf = requestAnimationFrame(step);
      else {
        confettiRaf = 0;
        cctx.clearRect(0, 0, w, h);
      }
    };
    confettiRaf = requestAnimationFrame(step);
  };

  resize();
  window.addEventListener("resize", resize);
  raf = requestAnimationFrame(frame);
  scheduleWave();

  return {
    ripple,
    confetti,
    stop() {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(confettiRaf);
      clearTimeout(ambientTimer);
      window.removeEventListener("resize", resize);
      confettiCanvas?.remove();
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
