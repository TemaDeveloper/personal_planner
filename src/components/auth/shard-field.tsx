"use client";

import { useEffect, useRef } from "react";

type Shard = {
  x: number;
  y: number;
  size: number;
  angle: number;
  spin: number;
  kind: 0 | 1 | 2; // 0 = square outline, 1 = line, 2 = filled triangle
  opacity: number;
};

const BASE_COUNT = 30;
const REF_AREA = 1440 * 900;
const SPEED = 0.66; // vertical px/frame
const H_FACTOR = 1.05; // horizontal is slightly faster → diagonal ↙
const RESPAWN_MARGIN = 25;

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

/** Normalize a hex or rgb(a) CSS color string to [r,g,b]. Falls back to warm sand. */
function parseRgb(input: string): [number, number, number] {
  const s = (input || "").trim();
  if (s.startsWith("#")) {
    const hex = s.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    const n = parseInt(full, 16);
    if (!Number.isNaN(n)) return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = s.match(/\d+(?:\.\d+)?/g);
  if (m && m.length >= 3) return [Number(m[0]), Number(m[1]), Number(m[2])];
  return [232, 217, 200];
}

export function ShardField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return; // graceful degradation — page shows plain --bg-page

    const styles = getComputedStyle(document.documentElement);
    const neutral = parseRgb(styles.getPropertyValue("--text-primary"));
    const accent = parseRgb(styles.getPropertyValue("--accent-color") || "#C0613C");
    const [nr, ng, nb] = neutral;
    const [ar, ag, ab] = accent;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let shards: Shard[] = [];
    let rafId = 0;

    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    function countFor(w: number, h: number): number {
      const scale = Math.max(0.5, Math.min(1.6, (w * h) / REF_AREA));
      return Math.round(BASE_COUNT * scale);
    }

    function makeShard(fromTopRight: boolean): Shard {
      return {
        x: fromTopRight ? rand(width * 0.3, width + 40) : rand(-20, width + 40),
        y: fromTopRight ? rand(-40, height * 0.3) : rand(-30, height),
        size: rand(4, 12),
        angle: rand(0, Math.PI * 2),
        spin: rand(-0.05, 0.05),
        kind: (Math.floor(rand(0, 3)) % 3) as 0 | 1 | 2,
        opacity: rand(0.22, 0.65),
      };
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      shards = Array.from({ length: countFor(width, height) }, () => makeShard(false));
    }

    function drawShard(s: Shard) {
      ctx!.save();
      ctx!.translate(s.x, s.y);
      ctx!.rotate(s.angle);
      ctx!.strokeStyle = `rgba(${nr},${ng},${nb},${s.opacity})`;
      ctx!.lineWidth = 1.3;
      if (s.kind === 0) {
        ctx!.strokeRect(-s.size / 2, -s.size / 2, s.size, s.size);
      } else if (s.kind === 1) {
        ctx!.beginPath();
        ctx!.moveTo(-s.size, 0);
        ctx!.lineTo(s.size, 0);
        ctx!.stroke();
      } else {
        ctx!.fillStyle = `rgba(${ar},${ag},${ab},${s.opacity * 0.7})`;
        ctx!.beginPath();
        ctx!.moveTo(0, -s.size);
        ctx!.lineTo(s.size, s.size);
        ctx!.lineTo(-s.size, s.size);
        ctx!.closePath();
        ctx!.fill();
        ctx!.stroke();
      }
      ctx!.restore();
    }

    function paintStatic() {
      ctx!.clearRect(0, 0, width, height);
      for (const s of shards) drawShard(s);
    }

    function step() {
      ctx!.clearRect(0, 0, width, height);
      for (const s of shards) {
        s.x -= SPEED * H_FACTOR;
        s.y += SPEED;
        s.angle += s.spin;
        if (s.x < -RESPAWN_MARGIN || s.y > height + RESPAWN_MARGIN) {
          Object.assign(s, makeShard(true));
        }
        drawShard(s);
      }
      rafId = window.requestAnimationFrame(step);
    }

    resize();

    if (reduceMotion) {
      paintStatic();
    } else {
      rafId = window.requestAnimationFrame(step);
    }

    function onResize() {
      resize();
      if (reduceMotion) paintStatic();
    }

    function onVisibility() {
      if (document.hidden) {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
      } else if (!reduceMotion && rafId === 0) {
        rafId = window.requestAnimationFrame(step);
      }
    }

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
