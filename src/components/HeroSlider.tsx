"use client";

import { useEffect, useRef } from "react";

// Frame sequence extracted from the source excavator clip (960x540, 12fps).
// Frames 0..LOOP_START-1 are the approach and play once. From there playback
// bounces between LOOP_START and the last frame — forward, then backward, then
// forward again — so the loader keeps working its bucket and never jumps back
// to the empty approach. Reversing also means there is no wrap seam to hide:
// every step between two shown frames is an adjacent pair.
const FRAME_COUNT = 93;
const LOOP_START = 48;
const FPS = 12;
const REST_FRAME = 0;
// The loader is not centred in the source frame — it sits at 68% across and 52%
// down, holding within a hundredth of that for every frame of the loop. Cropping
// around this point instead of the frame's centre keeps it on screen on phones
// and tablets, where the hero is narrower than the 16:9 footage and the sides
// are what get trimmed. On wide screens there is no width to trim, so the offset
// clamps away and the framing is unchanged.
const FOCUS_X = 0.68;
const FOCUS_Y = 0.52;
// Matches the render's flat backdrop, so the canvas has nothing to fade in from.
const BACKDROP = "#dad3c8";

const frameSrc = (i: number) =>
  `/hero/frames/frame-${String(i).padStart(3, "0")}.webp`;

export default function HeroSlider() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const frames: HTMLImageElement[] = [];
    let current = REST_FRAME;
    let direction = 1;
    let rafId = 0;
    let lastPaint = 0;
    let ready = false;
    let pageVisible = !document.hidden;
    let onScreen = true;

    // Cover-fit: fill the box on the constrained axis, then slide the overflow
    // so FOCUS_X/FOCUS_Y lands in the middle of the box, clamped to the image
    // edges so no blank ground is ever exposed.
    const draw = (index: number) => {
      const img = frames[index];
      if (!img?.naturalWidth) return;

      const dpr = window.devicePixelRatio || 1;
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (!cw || !ch) return;

      if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      const dx = Math.max(cw - dw, Math.min(0, cw / 2 - FOCUS_X * dw));
      const dy = Math.max(ch - dh, Math.min(0, ch / 2 - FOCUS_Y * dh));
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (now - lastPaint < 1000 / FPS) return;
      lastPaint = now;

      let next = current + direction;
      if (next > FRAME_COUNT - 1) {
        direction = -1;
        next = FRAME_COUNT - 2;
      } else if (direction === -1 && next < LOOP_START) {
        direction = 1;
        next = LOOP_START + 1;
      }
      current = next;
      draw(current);
    };

    const shouldRun = () => ready && !reduceMotion && pageVisible && onScreen;

    const sync = () => {
      if (shouldRun() && !rafId) {
        lastPaint = 0;
        rafId = requestAnimationFrame(tick);
      } else if (!shouldRun() && rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    // Frame 0 paints as soon as it lands; the loop waits for the full set so a
    // half-loaded sequence never stutters.
    let settled = 0;
    const count = reduceMotion ? 1 : FRAME_COUNT;
    // A frame that 404s still counts as settled — draw() skips it, so the loop
    // runs a frame short rather than never starting.
    const onSettled = () => {
      if (++settled === count) {
        ready = true;
        sync();
      }
    };
    for (let i = 0; i < count; i++) {
      const img = new Image();
      img.src = frameSrc(i);
      frames[i] = img;
      img.onload = () => {
        if (i === REST_FRAME) draw(REST_FRAME);
        onSettled();
      };
      img.onerror = onSettled;
    }

    const onResize = () => draw(current);
    const onVisibility = () => {
      pageVisible = !document.hidden;
      sync();
    };

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(canvas);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(canvas);

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      frames.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, []);

  return (
    <section className="relative overflow-hidden h-[70vh] min-h-[420px] max-h-[720px]">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="RC backhoe loader raising and lowering its bucket"
        className="absolute inset-0 w-full h-full block"
        style={{ backgroundColor: BACKDROP }}
      />
    </section>
  );
}
