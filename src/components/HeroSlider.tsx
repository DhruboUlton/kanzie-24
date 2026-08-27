"use client";

import { useEffect, useRef } from "react";

// Frame sequence extracted from the source excavator clip at 12fps.
// Frames 0..LOOP_START-1 are the approach and play once. From there playback
// bounces between LOOP_START and the last frame — forward, then backward, then
// forward again — so the loader keeps working its bucket and never jumps back
// to the empty approach. Reversing also means there is no wrap seam to hide:
// every step between two shown frames is an adjacent pair.
//
// The cycle spans a whole bucket stroke. Measuring bucket height per frame put
// the lift at 49-69 and the descent at 70-89, so a loop has to cover both —
// matching frames by pixel difference alone reads a rising and a falling pose
// at the same height as identical, and the arm appears to stutter.
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

// Playback begins once this many frames are in hand rather than waiting for the
// whole sequence — at 12fps the loader stays far ahead of the playhead, and
// holding the hero frozen until all 93 had landed was what made the page stall
// on load. Requests are kept to a few at a time so the sequence doesn't crowd
// out the rest of the page.
const START_BUFFER = 12;
const MAX_PARALLEL = 4;
// Intro frames are shown once and then never again, so each is released a few
// frames after the playhead passes it. Without this the sequence would sit in
// memory in full; with it, only the looping tail stays resident.
const RELEASE_TRAIL = 3;

type Frame = ImageBitmap | HTMLImageElement;

const frameWidth = (f: Frame) =>
  "naturalWidth" in f ? f.naturalWidth : f.width;
const frameHeight = (f: Frame) =>
  "naturalHeight" in f ? f.naturalHeight : f.height;

export default function HeroSlider() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // The hero is only ever as wide as the viewport, so a phone gets the small
    // set and anything tablet-sized or larger gets the sharp one. DPR counts,
    // but past 2x the extra pixels cost more than they show.
    const dpr = window.devicePixelRatio || 1;
    const tier =
      window.innerWidth * Math.min(dpr, 2) >= 1000 ? "w1280" : "w640";
    const frameSrc = (i: number) =>
      `/hero/frames/${tier}/frame-${String(i).padStart(3, "0")}.webp`;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const frames: (Frame | null)[] = new Array(FRAME_COUNT).fill(null);
    let current = REST_FRAME;
    let direction = 1;
    let rafId = 0;
    let lastPaint = 0;
    let ready = false;
    let cancelled = false;
    let pageVisible = !document.hidden;
    let onScreen = true;

    // Cover-fit: fill the box on the constrained axis, then slide the overflow
    // so FOCUS_X/FOCUS_Y lands in the middle of the box, clamped to the image
    // edges so no blank ground is ever exposed.
    const draw = (index: number) => {
      const frame = frames[index];
      if (!frame) return;

      const ratio = window.devicePixelRatio || 1;
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (!cw || !ch) return;

      if (canvas.width !== cw * ratio || canvas.height !== ch * ratio) {
        canvas.width = cw * ratio;
        canvas.height = ch * ratio;
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      const fw = frameWidth(frame);
      const fh = frameHeight(frame);
      const scale = Math.max(cw / fw, ch / fh);
      const dw = fw * scale;
      const dh = fh * scale;
      const dx = Math.max(cw - dw, Math.min(0, cw / 2 - FOCUS_X * dw));
      const dy = Math.max(ch - dh, Math.min(0, ch / 2 - FOCUS_Y * dh));
      ctx.drawImage(frame, dx, dy, dw, dh);
    };

    const release = (index: number) => {
      const frame = frames[index];
      if (!frame) return;
      if ("close" in frame) frame.close();
      frames[index] = null;
    };

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (now - lastPaint < 1000 / FPS) return;

      let next = current + direction;
      if (next > FRAME_COUNT - 1) {
        direction = -1;
        next = FRAME_COUNT - 2;
      } else if (direction === -1 && next < LOOP_START) {
        direction = 1;
        next = LOOP_START + 1;
      }
      // If loading hasn't reached this frame yet, hold on the current one
      // rather than skipping ahead — a brief pause reads better than a jump.
      if (!frames[next]) return;

      lastPaint = now;
      current = next;
      draw(current);

      if (current < LOOP_START) {
        const stale = current - RELEASE_TRAIL;
        if (stale >= 0 && stale < LOOP_START) release(stale);
      }
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

    const decodeFrame = async (url: string): Promise<Frame> => {
      const response = await fetch(url);
      const blob = await response.blob();
      if (typeof createImageBitmap === "function") {
        return createImageBitmap(blob);
      }
      const img = new Image();
      const objectUrl = URL.createObjectURL(blob);
      img.src = objectUrl;
      await img.decode();
      URL.revokeObjectURL(objectUrl);
      return img;
    };

    // Frames are pulled in playback order by a few workers at once, so the
    // sequence arrives roughly in the order it's needed.
    let nextToLoad = 0;
    let settled = 0;
    const total = reduceMotion ? 1 : FRAME_COUNT;

    const runWorker = async () => {
      while (!cancelled && nextToLoad < total) {
        const index = nextToLoad++;
        try {
          const frame = await decodeFrame(frameSrc(index));
          if (cancelled) {
            if ("close" in frame) frame.close();
            return;
          }
          // The playhead may already have passed an intro frame that arrived
          // late; drop it instead of letting it linger.
          if (frames[index] === null && (index >= LOOP_START || index >= current)) {
            frames[index] = frame;
          } else if ("close" in frame) {
            frame.close();
          }
          if (index === REST_FRAME) draw(REST_FRAME);
        } catch {
          // A frame that fails to load is left null; playback holds a beat.
        }
        settled++;
        if (!ready && (settled >= START_BUFFER || settled >= total)) {
          ready = true;
          sync();
        }
      }
    };

    for (let i = 0; i < Math.min(MAX_PARALLEL, total); i++) runWorker();

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
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      for (let i = 0; i < frames.length; i++) release(i);
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
