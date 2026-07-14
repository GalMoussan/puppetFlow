/**
 * Subtle space starfield + occasional falling stars.
 * Fixed behind all UI; pointer-events none.
 *
 * @module components/ui/SpaceBackground
 */

"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
};

type ShootingStar = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  length: number;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let stars: Star[] = [];
    let shooters: ShootingStar[] = [];
    let raf = 0;
    let running = true;
    let dpr = 1;
    let w = 0;
    let h = 0;
    let nextShootAt = performance.now() + rand(2500, 5000);
    let last = performance.now();

    const rebuildStars = () => {
      const count = Math.max(80, Math.floor((w * h) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: rand(0.4, 1.6),
        baseAlpha: rand(0.15, 0.75),
        twinkleSpeed: rand(0.4, 1.8),
        twinklePhase: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildStars();
    };

    const spawnShooter = () => {
      const fromLeft = Math.random() > 0.5;
      const x = fromLeft ? rand(-40, w * 0.45) : rand(w * 0.55, w + 40);
      const y = rand(-30, h * 0.32);
      const speed = rand(420, 720);
      const angle = rand(0.3, 0.65); // downward arc
      shooters.push({
        x,
        y,
        vx: (fromLeft ? 1 : -1) * Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: rand(0.55, 1.1),
        length: rand(70, 130),
      });
    };

    const drawStaticField = () => {
      ctx.clearRect(0, 0, w, h);
      for (const star of stars) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(230, 240, 255, ${star.baseAlpha * 0.7})`;
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const frame = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      ctx.clearRect(0, 0, w, h);

      // Soft deep-space radial wash (very subtle)
      const g = ctx.createRadialGradient(
        w * 0.5,
        h * 0.12,
        0,
        w * 0.5,
        h * 0.45,
        Math.max(w, h) * 0.8
      );
      g.addColorStop(0, "rgba(18, 22, 48, 0.32)");
      g.addColorStop(0.5, "rgba(6, 8, 22, 0.14)");
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Twinkling stars
      for (const star of stars) {
        const tw =
          0.55 +
          0.45 *
            Math.sin(now * 0.001 * star.twinkleSpeed + star.twinklePhase);
        const alpha = star.baseAlpha * tw;
        ctx.beginPath();
        ctx.fillStyle = `rgba(230, 240, 255, ${alpha})`;
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();

        if (star.r > 1.15 && alpha > 0.5) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(160, 220, 255, ${alpha * 0.28})`;
          ctx.arc(star.x, star.y, star.r * 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Every few seconds, a falling star
      if (now >= nextShootAt) {
        spawnShooter();
        nextShootAt = now + rand(2800, 6500);
      }

      shooters = shooters.filter((s) => {
        s.life += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.life >= s.maxLife) return false;

        const t = s.life / s.maxLife;
        const fade =
          t < 0.12 ? t / 0.12 : t > 0.65 ? Math.max(0, 1 - (t - 0.65) / 0.35) : 1;
        const alpha = fade;

        const speed = Math.hypot(s.vx, s.vy) || 1;
        const nx = s.vx / speed;
        const ny = s.vy / speed;
        const tailX = s.x - nx * s.length;
        const tailY = s.y - ny * s.length;

        const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        grad.addColorStop(0, "rgba(120, 200, 255, 0)");
        grad.addColorStop(0.5, `rgba(140, 220, 255, ${0.22 * alpha})`);
        grad.addColorStop(0.85, `rgba(200, 240, 255, ${0.65 * alpha})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * alpha})`;
        ctx.arc(s.x, s.y, 1.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `rgba(34, 211, 238, ${0.3 * alpha})`;
        ctx.arc(s.x, s.y, 3.8, 0, Math.PI * 2);
        ctx.fill();

        return true;
      });

      raf = requestAnimationFrame(frame);
    };

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const startLoop = () => {
      running = true;
      last = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    };

    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(raf);
      drawStaticField();
    };

    const onMotionChange = () => {
      if (mq.matches) stopLoop();
      else startLoop();
    };

    resize();
    window.addEventListener("resize", resize);
    onMotionChange();
    mq.addEventListener?.("change", onMotionChange);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      mq.removeEventListener?.("change", onMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      data-testid="space-background"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
