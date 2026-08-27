"use client";

import { useEffect, useRef, useState } from "react";

// The hero is two clips rather than one looping file, because the motion is not
// a loop: the camera pushes in through an approach that never comes back, then
// the loader works its bucket in place. hero-intro plays the approach once and
// hands over to hero-loop, which holds the bucket cycle forever.
//
// The bounce is baked into hero-loop rather than driven here. It runs frames
// 91 down to 48 and back up to 92, so playing it end-to-end and repeating
// continues the bounce across the wrap with no seam to hide, and the browser
// loops it natively. It starts on frame 91 because the intro ends on 92 — the
// swap lands on the next frame of the same motion.
//
// This replaced a 93-frame canvas sequence. Frames could not hold their detail
// here: the hero is tall and narrow, so cover-fit scales by height and crops
// ~60% of each frame's width away, which left phones upscaling 3-5x. Video
// carries the full 1080 source height, decodes on the GPU for a fraction of the
// memory, and streams instead of arriving as one burst of requests.
const INTRO_SRC = "/hero/hero-intro.mp4";
const LOOP_SRC = "/hero/hero-loop.mp4";
const POSTER_SRC = "/hero/poster.webp";

// The loader sits at 68% across and 52% down the frame, not at its centre.
// Anchoring the crop there keeps it on screen where the sides get trimmed.
const FOCUS_X = 0.68;
const FOCUS_Y = 0.52;
const VIDEO_W = 1920;
const VIDEO_H = 1080;
const BACKDROP = "#dad3c8";

// object-position percentages line the image's own n% mark up with the box's
// n% mark — they do not centre that point. Writing "68%" therefore parks the
// loader 68% across the box on every screen, which pushes it off the right edge
// of a phone. The percentage that actually centres it depends on how much
// overflow there is to slide, so it has to be solved per size: 79% on a 375px
// phone, 95% on an iPad, 50% on a desktop where there is no width to trim.
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function focalPosition(boxW: number, boxH: number) {
  const scale = Math.max(boxW / VIDEO_W, boxH / VIDEO_H);
  const drawnW = VIDEO_W * scale;
  const drawnH = VIDEO_H * scale;
  const x = drawnW > boxW ? clamp01((boxW / 2 - FOCUS_X * drawnW) / (boxW - drawnW)) : 0.5;
  const y = drawnH > boxH ? clamp01((boxH / 2 - FOCUS_Y * drawnH) / (boxH - drawnH)) : 0.5;
  return `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`;
}

export default function HeroSlider() {
  const sectionRef = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);
  const [loopVisible, setLoopVisible] = useState(false);
  const [objectPosition, setObjectPosition] = useState("50% 50%");

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const measure = () =>
      setObjectPosition(
        focalPosition(section.clientWidth, section.clientHeight),
      );

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const intro = introRef.current;
    const loop = loopRef.current;
    if (!intro || !loop) return;

    // iOS only allows inline autoplay on muted video, and setting it as a React
    // prop alone does not always land the attribute before the first play call.
    intro.muted = true;
    loop.muted = true;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let onScreen = true;
    let pageVisible = !document.hidden;
    let handedOver = false;

    const active = () => (handedOver ? loop : intro);

    // play() rejects when autoplay is blocked; the poster stays up in that case.
    const attempt = (video: HTMLVideoElement) => {
      const played = video.play();
      if (played) played.catch(() => {});
    };

    const sync = () => {
      if (reduceMotion) return;
      const video = active();
      if (onScreen && pageVisible) attempt(video);
      else video.pause();
    };

    // Hand over only once the loop is actually rendering, so the intro's last
    // frame stays up if the loop needs another moment to start.
    const onIntroEnded = () => {
      handedOver = true;
      if (!reduceMotion) attempt(loop);
    };
    const onLoopPlaying = () => setLoopVisible(true);

    intro.addEventListener("ended", onIntroEnded);
    loop.addEventListener("playing", onLoopPlaying);

    const onVisibility = () => {
      pageVisible = !document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { threshold: 0 },
    );
    observer.observe(intro);

    sync();

    return () => {
      intro.removeEventListener("ended", onIntroEnded);
      loop.removeEventListener("playing", onLoopPlaying);
      document.removeEventListener("visibilitychange", onVisibility);
      observer.disconnect();
    };
  }, []);

  const videoClass = "absolute inset-0 w-full h-full object-cover";

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden h-[70vh] min-h-[420px] max-h-[720px]"
      style={{ backgroundColor: BACKDROP }}
    >
      <video
        ref={introRef}
        className={videoClass}
        style={{ objectPosition }}
        src={INTRO_SRC}
        poster={POSTER_SRC}
        muted
        playsInline
        preload="auto"
        aria-label="RC backhoe loader driving into frame"
      />
      <video
        ref={loopRef}
        className={videoClass}
        style={{ objectPosition, opacity: loopVisible ? 1 : 0 }}
        src={LOOP_SRC}
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />
    </section>
  );
}
