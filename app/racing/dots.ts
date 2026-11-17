// app/racing/dots.ts: animated dot-grid background ("wind field"), same as the SimStats app.
// Every grid point follows a drifting field of layered sine waves: calm = dot, gusty = a short
// dash pointing with the wind. New laps make the field gust (tinted); confetti for a new
// fastest lap. Drawn at 30fps in a handful of batched paths.

const SPACING = 18;
const FPS = 30;
const BUCKETS = 8;

export interface GustOptions {
  color?: string;
  strength?: number;
  duration?: number;
}

export interface DotField {
  gust(opts?: GustOptions): void;
  confetti(): void;
  stop(): void;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Layered sine "noise": wind direction and strength at (x, y, t).
function field(x: number, y: number, t: number): [number, number] {
  const angle =
    Math.sin(x * 0.0061 + t * 0.21) +
    Math.sin(y * 0.0083 - t * 0.17) +
    0.6 * Math.sin((x + y) * 0.0042 + t * 0.11) +
    0.4 * Math.sin((x - y) * 0.011 - t * 0.29);
  const g = Math.sin(x * 0.0035 - y * 0.0021 + t * 0.35) * 0.6 + Math.sin(x * 0.0018 + y * 0.0047 - t * 0.23) * 0.4;
  return [angle * 1.3, Math.max(0, g) ** 2];
}

export function startDotField(canvas: HTMLCanvasElement): DotField {
  const ctx = canvas.getContext("2d")!;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let last = 0;
  let gust: { start: number; dur: number; amp: number; rgb: [number, number, number] } | null = null;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = (now: number) => {
    const t = now / 1000;
    let boost = 0;
    let tint: [number, number, number] | null = null;
    if (gust) {
      const p = (now - gust.start) / gust.dur;
      if (p >= 1) gust = null;
      else {
        boost = Math.sin(Math.PI * p) * gust.amp;
        tint = gust.rgb;
      }
    }
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineWidth = 1.6;
    const paths = Array.from({ length: BUCKETS }, () => new Path2D());
    const tinted = Array.from({ length: BUCKETS }, () => new Path2D());
    const cols = Math.ceil(w / SPACING) + 1;
    const rows = Math.ceil(h / SPACING) + 1;
    const off = SPACING / 2;
    for (let j = 0; j < rows; j++) {
      const y = off + j * SPACING;
      for (let i = 0; i < cols; i++) {
        const x = off + i * SPACING;
        const [a, s0] = field(x, y, t);
        const s = Math.min(1, s0 + boost * (0.08 + s0 * 0.7));
        const len = 0.4 + s * 7;
        const dx = (Math.cos(a) * len) / 2;
        const dy = (Math.sin(a) * len) / 2;
        const b = Math.min(BUCKETS - 1, Math.floor(s * BUCKETS));
        const path = tint && s > 0.45 ? tinted[b] : paths[b];
        path.moveTo(x - dx, y - dy);
        path.lineTo(x + dx, y + dy);
      }
    }
    for (let b = 0; b < BUCKETS; b++) {
      const alpha = 0.1 + (b / (BUCKETS - 1)) * 0.38;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.stroke(paths[b]);
      if (tint) {
        ctx.strokeStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${Math.min(1, alpha + 0.25)})`;
        ctx.stroke(tinted[b]);
      }
    }
  };

  const frame = (now: number) => {
    if (document.visibilityState === "visible" && now - last >= 1000 / FPS) {
      last = now;
      draw(now);
    }
    raf = requestAnimationFrame(frame);
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

  return {
    gust(opts = {}) {
      gust = { start: performance.now(), dur: opts.duration ?? 2600, amp: opts.strength ?? 1, rgb: hexToRgb(opts.color ?? "#ff4f00") };
    },
    confetti,
    stop() {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(confettiRaf);
      window.removeEventListener("resize", resize);
      confettiCanvas?.remove();
    },
  };
}

/** Gust style for each kind of lap event. */
export const LAP_GUSTS: Record<string, GustOptions> = {
  lap: { color: "#ff4f00", strength: 0.5 },
  pb: { color: "#22c06e", strength: 0.75 },
  night_best: { color: "#ff4f00", strength: 0.9 },
  record: { color: "#8f72ff", strength: 1, duration: 3600 },
};
