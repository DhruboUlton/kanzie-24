"use client";

import { useEffect, useRef, useState } from "react";
import { PlayCircle, X } from "lucide-react";
import { getEmbedUrl } from "@/lib/video";

const AUTO_OPEN_DELAY_MS = 3000;

type Point = { x: number; y: number };

export default function ProductVideo({ videoUrl }: { videoUrl?: string }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [pos, setPos] = useState<Point | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; origX: number; origY: number } | null>(
    null,
  );
  const embedUrl = videoUrl ? getEmbedUrl(videoUrl) : null;

  useEffect(() => {
    if (!embedUrl || dismissed) return;
    const timer = setTimeout(() => setOpen(true), AUTO_OPEN_DELAY_MS);
    return () => clearTimeout(timer);
    // Only fire the auto-open once per mount — `dismissed` is intentionally
    // excluded so closing it doesn't restart this timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedUrl]);

  function close() {
    setOpen(false);
    setDismissed(true);
  }

  // The nav bar (announcement strip + header) is sticky, not a fixed known
  // height — its own bottom edge is the live boundary the widget can't be
  // dragged above, whether or not the announcement strip has scrolled away.
  function navBottom() {
    const header = document.querySelector("header");
    return header ? header.getBoundingClientRect().bottom : 0;
  }

  function onDragStart(e: React.PointerEvent<HTMLDivElement>) {
    const el = widgetRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onDragMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const el = widgetRef.current;
    if (!drag || !el || drag.pointerId !== e.pointerId) return;

    const nextX = drag.origX + (e.clientX - drag.startX);
    const nextY = drag.origY + (e.clientY - drag.startY);
    const maxX = window.innerWidth - el.offsetWidth;
    const maxY = window.innerHeight - el.offsetHeight;
    const minY = navBottom();

    setPos({
      x: Math.min(Math.max(nextX, 0), Math.max(maxX, 0)),
      y: Math.min(Math.max(nextY, minY), Math.max(maxY, minY)),
    });
  }

  function onDragEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  }

  if (!embedUrl) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDismissed(false);
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-accent transition-colors"
      >
        <PlayCircle size={20} className="text-accent" />
        Watch video
      </button>

      {open && (
        <div
          ref={widgetRef}
          className={`fixed z-40 w-32 sm:w-40 ${pos ? "" : "bottom-4 right-4"}`}
          style={pos ? { left: pos.x, top: pos.y } : undefined}
        >
          {/* Drag handle: the border frame, not the iframe itself — a
              pointerdown that starts inside the iframe's own document
              never bubbles out to this page, so grabbing the video
              wouldn't drag anything. The frame also keeps the iframe's
              own controls (play/mute/etc.) fully clickable. */}
          <div
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            style={{ touchAction: "none" }}
            className="relative p-1.5 rounded-xl bg-black shadow-2xl cursor-grab active:cursor-grabbing"
          >
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={close}
              aria-label="Close video"
              className="absolute top-0 right-0 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 translate-x-1/3 -translate-y-1/3"
            >
              <X size={14} />
            </button>
            <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-black">
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
